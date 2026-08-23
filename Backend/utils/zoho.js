/**
 * Zoho Inventory API integration.
 * Docs: https://www.zoho.com/inventory/api/v1/salesorders/
 * Auth: OAuth 2.0, refresh-token flow — https://www.zoho.com/inventory/api/v1/oauth/
 *
 * Data center: Denmark-based orgs are usually on the EU data center (zoho.eu),
 * which is why the base URLs below are hardcoded to .eu. If your org ever moves,
 * swap "zoho.eu" / "zohoapis.eu" below.
 */

const fetch = require("node-fetch");

const { computeSku } = require("./sku");
const { getZohoIdForSku } = require("./zoho-sku-lookup");

const ZOHO_ACCOUNTS_BASE = process.env.ZOHO_ACCOUNT_BASE;
const ZOHO_API_BASE = process.env.ZOHO_API_BASE;
const ORG_ID = process.env.ZOHO_ORG_ID;

/*--------------------------------------------------
    AUTH
--------------------------------------------------*/

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getZohoAccessToken() {

  if (cachedToken && Date.now() < cachedTokenExpiry) {
    return cachedToken;
  }

  const response = await fetch(
    `${ZOHO_ACCOUNTS_BASE}/oauth/v2/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        refresh_token: process.env.ZOHO_REFRESH_TOKEN
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("ZOHO TOKEN ERROR:", data);
    throw new Error("Failed to get Zoho access token");
  }

  cachedToken = data.access_token;
  // refresh 60s early so we never fire a request with an about-to-expire token
  cachedTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken;
}

/**
 * Generic authenticated request helper for anything not already covered
 * by getItem below.
 */
async function zohoRequest(path, options = {}) {

  const token = await getZohoAccessToken();
  const separator = path.includes("?") ? "&" : "?";
  const url = `${ZOHO_API_BASE}${path}${separator}organization_id=${ORG_ID}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok || (typeof data.code !== "undefined" && data.code !== 0)) {
    console.error(`ZOHO API ERROR on ${path}:`, data);
    throw new Error(`Zoho API error on ${path}: ${JSON.stringify(data)}`);
  }

  return data;
}

/*--------------------------------------------------
    ITEMS (used by stock.js — unchanged behavior)
--------------------------------------------------*/

async function getItem(itemId) {

  const token = await getZohoAccessToken();

  const response = await fetch(
    `${ZOHO_API_BASE}/items/${itemId}?organization_id=${ORG_ID}`,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("ZOHO ITEM ERROR:", data);
    throw new Error("Failed to fetch Zoho item");
  }

  return data.item;
}

/*--------------------------------------------------
    CONTACTS
--------------------------------------------------*/

async function findOrCreateContact(order) {

  const search = await zohoRequest(
    `/contacts?email=${encodeURIComponent(order.customerEmail)}`
  );

  if (search.contacts && search.contacts.length > 0) {
    return search.contacts[0].contact_id;
  }

  const created = await zohoRequest(`/contacts`, {
    method: "POST",
    body: JSON.stringify({
      contact_name: order.customerName,
      email: order.customerEmail,
      billing_address: {
        address: order.shippingAddress.address,
        zip: order.shippingAddress.postalCode,
        city: order.shippingAddress.city,
        country: "Denmark"
      }
    })
  });

  return created.contact.contact_id;
}

/*--------------------------------------------------
    SALES ORDERS
--------------------------------------------------*/

/**
 * Zoho matches line items by item_id, not by product name — so each cart item needs its SKU
 * resolved to a ZohoID via the same path stock.js uses (computeSku -> ZohoInventory table).
 * Cart items are shaped like:
 *   { id: "CF-BR", name: "...", options: { size, roast, grind }, quantity, selectedPrice: {...} }
 * where `id` is the productId and `options` is the same selectedOptions shape stock-check uses.
 *
 * If a SKU can't be computed (bad/missing option data) or has no ZohoInventory mapping, that
 * line is still sent to Zoho — but as a plain named line item with no stock link, and a warning
 * is logged, rather than failing the whole order.
 */
async function lineItemsFromOrder(order, supabase) {

  // Only needed for coffee products, but cheap enough to fetch once up front and reuse for
  // every line item rather than querying per item.
  const {
    data: optionsFromDb,
    error: optionsError
  } = await supabase
    .from("ProductOptions")
    .select("*");

  if (optionsError) {
    throw new Error(`Failed to load ProductOptions for Zoho line items: ${JSON.stringify(optionsError)}`);
  }

  const lineItems = [];

  for (const item of order.cartItems) {

    let sku = null;
    let zohoItemId = null;

    try {
      sku = computeSku(item.id, item.options, optionsFromDb);
      zohoItemId = await getZohoIdForSku(supabase, sku);
    } catch (err) {
      console.warn(
        `Could not compute SKU for cart item "${item.name}" (productId "${item.id}") on order ${order.id}: ${err.message}`
      );
    }

    if (sku && !zohoItemId) {
      console.warn(
        `No ZohoInventory mapping for SKU "${sku}" (order ${order.id}) — sending as a plain named line item (no stock deduction).`
      );
    }

    lineItems.push({
      ...(zohoItemId ? { item_id: zohoItemId } : { name: item.name }),
      rate: item.selectedPrice?.price ?? item.price,
      quantity: item.quantity
    });
  }

  return lineItems;
}

async function buildSalesOrderPayload(order, supabase) {

  const contactId = await findOrCreateContact(order);
  const lineItems = await lineItemsFromOrder(order, supabase);

  const payload = {
    customer_id: contactId,
    reference_number: String(order.id),
    date: (order.createdAt || new Date().toISOString()).slice(0, 10),
    line_items: lineItems,
    shipping_charge: order.shippingCost || 0
  };

  // Assuming `discount` is a flat currency amount, not a percentage — Zoho expects
  // a "%" suffix for percentage discounts, so double-check this against how you
  // populate the column before relying on it.
  if (order.discount) {
    payload.discount = order.discount.amount;
    payload.discount_type = "entity_level";
  }

  return { contactId, payload };
}

async function createSalesOrder(order, supabase) {

  const { payload } = await buildSalesOrderPayload(order, supabase);

  const result = await zohoRequest(`/salesorders`, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  const salesOrder = result.salesorder;

  await zohoRequest(`/salesorders/${salesOrder.salesorder_id}/status/confirmed`, {
    method: "POST"
  });

  return salesOrder;
}

async function voidSalesOrder(zohoOrderID) {
  await zohoRequest(`/salesorders/${zohoOrderID}/status/void`, {
    method: "POST"
  });
}

/**
 * @param {object} order - must include zohoOrderID and invoiceNumber
 */
async function finalizeSalesOrder(order, supabase, { trackingNumber } = {}) {

  if (!order.zohoOrderID) {
    throw new Error(`Order ${order.id} has no zohoOrderID — cannot finalize a reservation that doesn't exist.`);
  }

  const { payload } = await buildSalesOrderPayload(order, supabase);

  // Zoho's Update endpoint requires salesorder_number even though we're not
  // changing it, and we don't store it separately — so fetch it live.
  const current = await zohoRequest(`/salesorders/${order.zohoOrderID}`);

  const notesLines = [`Invoice: ${order.invoiceNumber}`];
  if (trackingNumber) {
    notesLines.push(`Tracking: ${trackingNumber}`);
  }

  await zohoRequest(`/salesorders/${order.zohoOrderID}`, {
    method: "PUT",
    body: JSON.stringify({
      ...payload,
      salesorder_number: current.salesorder.salesorder_number,
      notes: notesLines.join(" | ")
    })
  });
}

module.exports = {
  getZohoAccessToken,
  getItem,
  createSalesOrder,
  voidSalesOrder,
  finalizeSalesOrder
};