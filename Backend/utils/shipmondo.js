/**
 * Shipmondo RESTful API (v3) integration.
 *
 * Docs:
 *  - Create shipment: https://shipmondo.dev/docs/api/create-shipment
 *  - Service points:  https://shipmondo.dev/docs/api/service-points  (parcel-shop delivery)
 *  - Parties:         https://shipmondo.dev/docs/api/parties
 *  - Auth:            https://shipmondo.dev/docs/api/auth
 *  - Sandbox:         https://shipmondo.dev/docs/sandbox
 *
 * Set SHIPMONDO_BASE_URL=https://sandbox.shipmondo.com/api/public/v3 while testing.
 */

const SHIPMONDO_BASE_URL =
  process.env.SHIPMONDO_BASE_URL || "https://app.shipmondo.com/api/public/v3";

// "compact_pdf" is Shipmondo's confirmed API value for the "Compact" label format.
//
// IMPORTANT for your 10x15cm stock specifically: "compact" is carrier/product-dependent and
// isn't always 10x15cm — Shipmondo's docs confirm some carriers produce 10x19cm labels under
// the same "compact" name. Check the actual label size for each carrier you enable before
// printing to your 10x15cm stickers for it.
const LABEL_FORMAT = process.env.SHIPMONDO_LABEL_FORMAT || "compact_pdf";

// You don't have your own carrier agreements, so this should stay false — you're booking
// against Shipmondo's own bundled agreements, which is the default here and needs no .env entry.
const OWN_AGREEMENT = process.env.SHIPMONDO_OWN_AGREEMENT === "false";

function authHeader() {
  const creds = `${process.env.SHIPMONDO_API_USER}:${process.env.SHIPMONDO_API_KEY}`;
  return `Basic ${Buffer.from(creds).toString("base64")}`;
}

async function shipmondoRequest(path, options = {}) {
  return fetch(`${SHIPMONDO_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

// TODO: fill in your real sender/return address (Settings > Company info in Shipmondo).
const SENDER = {
  type: "sender",
  name: "Karsk Kaffe",
  address1: process.env.SHIPMONDO_SENDER_ADDRESS1,
  postal_code: process.env.SHIPMONDO_SENDER_ZIP,
  city: process.env.SHIPMONDO_SENDER_CITY,
  country_code: "DK",
  email: "orders@karskkaffe.dk",
  phone: process.env.SHIPMONDO_SENDER_PHONE,
};

/**
 * One entry per delivery option your checkout lets customers pick. `key` is whatever value you
 * store on order.shipping.method (e.g. from a radio group: GLS home / GLS parcel shop / dao
 * parcel shop / PostNord parcel shop / Bring home ...).
 *
 * TODO: productCode is account-specific — fill these in with real values from:
 *   node -e "require('./shipmondo').listAvailableProducts('DK').then(ps => console.table(ps.map(p => ({code:p.code, name:p.name, carrier:p.carrier.code}))))"
 * validateShippingSetup() (below) will refuse to run until every configured method has a code.
 */
const DELIVERY_METHODS = {
  gls_home: {
    productCode: "GLSDK_HD",
    serviceCodes: "EMAIL_NT",
    servicePoint: false,
  },
  gls_parcelshop: {
    productCode: "GLSDK_SD",
    serviceCodes: "EMAIL_NT",
    servicePoint: true,
    carrierCode: "gls",
  },
  dao_home: { productCode: "DAO_STH", serviceCodes: "", servicePoint: false },
  dao_parcelshop: {
    productCode: "DAO_STS",
    serviceCodes: "",
    servicePoint: true,
    carrierCode: "dao",
  },
  postnord_home: {
    productCode: "PDK_MH",
    serviceCodes: "",
    servicePoint: false,
  },
  postnord_parcelshop: {
    productCode: "PDK_MC",
    serviceCodes: "",
    servicePoint: true,
    carrierCode: "pdk",
  },
  bring_home: { productCode: "BRI_HDP", serviceCodes: "", servicePoint: false },
  bring_parcelshop: {
    productCode: "BRI_PP",
    serviceCodes: "",
    servicePoint: true,
    carrierCode: "bring",
  },
};

function resolveDeliveryMethod(order) {
  const key = order.shipping?.method;
  const method = DELIVERY_METHODS[key];

  if (!method) {
    throw new Error(
      `Unknown delivery method "${key}" on order ${order.id}. Valid keys: ${Object.keys(DELIVERY_METHODS).join(", ")}`,
    );
  }
  if (!method.productCode) {
    throw new Error(
      `DELIVERY_METHODS["${key}"] has no productCode configured yet — see the TODO in shipmondo.js.`,
    );
  }
  return method;
}

/*--------------------------------------------------
    WEIGHT
    Mirrors CartContext.getTotalWeight() exactly, so the weight the customer's delivery
    price was quoted against at checkout is the same weight booked with Shipmondo — no
    drift between the two calculations.
--------------------------------------------------*/

const PACKAGING_WEIGHT_G = 200;

function totalWeightGrams(order) {
  const productWeight = order.cartItems.reduce((sum, item) => {
    const weight = item.selectedPrice?.weight ?? item.weight ?? null;

    if (weight === null) {
      // Should not happen if cartItems is a snapshot of the real cart (same shape
      // CartContext.getTotalWeight() reads from) — but don't silently ship a wrong
      // weight if a line item is somehow missing it.
      console.warn(
        `Order ${order.id}: cart item "${item.name}" has no weight/selectedPrice.weight — treating as 0g. Check that this order's cartItems snapshot matches the live cart shape.`,
      );
    }

    return sum + (weight ?? 0) * item.quantity;
  }, 0);

  return productWeight + PACKAGING_WEIGHT_G;
}

function receiverParty(order) {
  return {
    type: "receiver",
    name: order.customerName,
    attention: order.customerName,
    address1: order.shippingAddress.address,
    postal_code: order.shippingAddress.postalCode,
    city: order.shippingAddress.city,
    country_code: order.shippingAddress.countryCode || "DK",
    email: order.customerEmail,
    phone: order.shippingAddress.phone || order.customerPhone || null,
  };
}

/* =========================================================
   PRODUCTS — discovery + weight-interval validation
   ========================================================= */

const productCache = new Map(); // productCode -> product, per process lifetime

async function listAvailableProducts(countryCode = "DK") {
  const res = await shipmondoRequest(`/products?country_code=${countryCode}`);
  if (!res.ok)
    throw new Error(
      `Could not fetch Shipmondo products (${res.status}): ${await res.text()}`,
    );
  const body = await res.json();
  const products = Array.isArray(body) ? body : body.products;
  for (const p of products) productCache.set(p.code, p);
  return products;
}

async function getProduct(productCode, countryCode = "DK") {
  if (!productCache.has(productCode)) await listAvailableProducts(countryCode);
  const product = productCache.get(productCode);
  if (!product)
    throw new Error(
      `Product code "${productCode}" was not found for country ${countryCode}.`,
    );
  return product;
}

async function checkWeightFits(productCode, weightGrams, countryCode = "DK") {
  const product = await getProduct(productCode, countryCode);
  const intervals = product.weight_intervals || [];
  const fits = intervals.some(
    (i) => weightGrams > i.from_weight && weightGrams <= i.to_weight,
  );

  if (!fits) {
    const max = intervals.length
      ? Math.max(...intervals.map((i) => i.to_weight))
      : null;
    throw new Error(
      `Order weight ${weightGrams}g doesn't fit any weight interval for "${product.name}" (${productCode})` +
        (max ? ` — max supported is ${max}g.` : "."),
    );
  }
  return true;
}

/* =========================================================
   LABEL RETRIEVAL
   ========================================================= */

async function fetchShipmentLabel(shipmentId, labelFormat = LABEL_FORMAT) {
  const res = await shipmondoRequest(
    `/shipments/${shipmentId}/labels?label_format=${labelFormat}`,
  );
  if (!res.ok)
    throw new Error(
      `Shipmondo fetchShipmentLabel failed (${res.status}): ${await res.text()}`,
    );

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("pdf") || contentType.includes("octet-stream")) {
    return Buffer.from(await res.arrayBuffer());
  }

  const data = await res.json();
  const base64 = data.label_base64 ?? data.base64 ?? data.pdf_base64 ?? null;
  if (!base64)
    throw new Error(
      `Shipmondo label response had no recognizable PDF field: ${JSON.stringify(data)}`,
    );
  return Buffer.from(base64, "base64");
}

/* =========================================================
   SERVICE POINTS (parcel shops)
   ========================================================= */

async function findServicePoints({ carrierCode, countryCode = "DK", zipcode }) {
  const params = new URLSearchParams({
    carrier_code: carrierCode,
    country_code: countryCode,
    zipcode,
  });
  const res = await shipmondoRequest(`/pickup_points?${params}`);
  if (!res.ok)
    throw new Error(
      `Shipmondo findServicePoints failed (${res.status}): ${await res.text()}`,
    );
  return res.json();
}

/* =========================================================
   CREATE SHIPMENT
   ========================================================= */

/**
 * Books a shipment for the order's chosen delivery method (order.shipping.method) and, for
 * parcel-shop methods, its chosen service point (order.shipping.servicePointId). Validates the
 * weight against the product's weight_intervals first.
 *
 * @param {object} order
 * @returns {Promise<{shipmentId: string, trackingNumber: string|null, trackingUrl: string|null, labelPdfBuffer: Buffer|null, raw: object}>}
 */
async function createShipment(order) {
  const method = resolveDeliveryMethod(order);
  const weightGrams = totalWeightGrams(order);

  await checkWeightFits(method.productCode, weightGrams);

  const payload = {
    own_agreement: OWN_AGREEMENT,
    product_code: method.productCode,
    service_codes: method.serviceCodes,
    reference: `Order ${order.id}`,
    label_format: LABEL_FORMAT,
    parties: [SENDER, receiverParty(order)],
    parcels: [{ weight: weightGrams }],
  };

  if (method.servicePoint) {
    if (!order.shipping?.servicePointId) {
      throw new Error(
        `Order ${order.id} uses parcel-shop method "${order.shipping?.method}" but has no ` +
          `shipping.servicePointId — look one up with findServicePoints() at checkout.`,
      );
    }
    payload.service_point_id = order.shipping.servicePointId;
  }

  const res = await shipmondoRequest(`/shipments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      `Shipmondo createShipment failed (${res.status}): ${await res.text()}`,
    );
  }

  const shipment = await res.json();

  const embeddedBase64 =
    shipment.label_base64 ??
    shipment.parcels?.[0]?.label_base64 ??
    shipment.label?.base64 ??
    null;
  let labelPdfBuffer = embeddedBase64
    ? Buffer.from(embeddedBase64, "base64")
    : null;

  if (!labelPdfBuffer) {
    try {
      labelPdfBuffer = await fetchShipmentLabel(shipment.id);
    } catch (err) {
      console.error(
        `Shipmondo shipment ${shipment.id} was created, but its label could not be fetched:`,
        err,
      );
    }
  }

  return {
    shipmentId: shipment.id,
    trackingNumber:
      shipment.parcels?.[0]?.package_no ?? shipment.package_no ?? null,
    trackingUrl:
      shipment.tracking_url ?? shipment.parcels?.[0]?.tracking_url ?? null,
    labelPdfBuffer,
    raw: shipment,
  };
}

/* =========================================================
   SETUP VALIDATION — run manually, not part of the order flow
   ========================================================= */

async function validateShippingSetup(countryCode = "DK") {
  const configured = Object.entries(DELIVERY_METHODS).filter(
    ([, m]) => m.productCode,
  );
  if (configured.length === 0) {
    throw new Error(
      "No delivery methods configured yet — fill in productCode for each entry in DELIVERY_METHODS.",
    );
  }

  for (const [key, method] of configured) {
    const product = await getProduct(method.productCode, countryCode);
    const configuredServices = new Set(
      (method.serviceCodes || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    const missing = (product.required_services || []).filter(
      (s) => !configuredServices.has(s.code),
    );

    if (missing.length > 0) {
      console.warn(
        `✗ "${key}" (${method.productCode}) is missing required service(s): ${missing.map((s) => s.code).join(", ")}`,
      );
    } else {
      console.log(
        `✓ "${key}" — "${product.name}" (${method.productCode}) via ${product.carrier.name}`,
      );
    }
  }
}

async function dumpProducts(countryCode = "DK") {
  const products = await listAvailableProducts(countryCode);
  for (const p of products) {
    console.log(
      `${p.code}  —  ${p.name}  (${p.carrier?.name})` +
        (p.required_services?.length
          ? `  [required: ${p.required_services.map((s) => s.code).join(", ")}]`
          : ""),
    );
  }
  return products;
}

async function getCarriers() {
  const res = await shipmondoRequest("/carrierssender_country_code=DK&receiver_country_code=DK");

  if (!res.ok) {
    throw new Error(
      `Shipmondo get carriers failed (${res.status}): ${await res.text()}`,
    );
  }

  const carriers = await res.json();

  console.log(JSON.stringify(carriers, null, 2));

  return carriers;
}

module.exports = {
  createShipment,
  fetchShipmentLabel,
  findServicePoints,
  listAvailableProducts,
  checkWeightFits,
  validateShippingSetup,
  dumpProducts,
  getCarriers,
  totalWeightGrams,
};
