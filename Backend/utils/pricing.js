const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function calculateOrderTotal(cartItems, discountCode, shippingCost = 0) {
  const productIds = [...new Set(cartItems.map((item) => item.id))];

  const { data: products, error: productsError } = await supabase
    .from("Products")
    .select("id, baseDiscount, active")
    .in("id", productIds);
  if (productsError)
    throw new Error(`Failed to fetch products: ${productsError.message}`);

  const { data: prices, error: pricesError } = await supabase
    .from("ProductPrices")
    .select("id, productID, label, price")
    .in("productID", productIds);
  if (pricesError)
    throw new Error(`Failed to fetch prices: ${pricesError.message}`);

  let subtotal = 0;

  // Server-computed cart, with each item's price overwritten by the authoritative
  // DB-derived unit price. The caller should persist THIS array on the order (not the
  // raw client cartItems) so that everything downstream — the invoice PDF and the Zoho
  // sales order line items, both of which read item.selectedPrice?.price ?? item.price —
  // reflects what was actually charged, not whatever the client happened to send.
  const pricedItems = [];

  for (const item of cartItems) {
    const product = products.find((p) => p.id === item.id);
    if (!product) throw new Error(`Product ${item.id} not found`);
    if (!product.active)
      throw new Error(`Product ${item.id} is no longer available`);

    // Match by productID + label, since cart items don't carry the ProductPrices row id
    const priceRow = prices.find(
      (p) =>
        p.productID === item.id &&
        String(p.label) === String(item.selectedPrice?.label),
    );
    if (!priceRow)
      throw new Error(
        `Price option for product ${item.id}, label ${item.selectedPrice?.label} not found`,
      );

    const quantity = Number(item.quantity) || 0;
    if (quantity <= 0)
      throw new Error(`Invalid quantity for product ${item.id}`);

    const unitPrice = priceRow.price * product.baseDiscount;
    subtotal += unitPrice * quantity;

    pricedItems.push({
      ...item,
      price: unitPrice,
      selectedPrice: item.selectedPrice
        ? { ...item.selectedPrice, price: unitPrice }
        : item.selectedPrice,
    });
  }

  // 3. Apply discount code (percentage off subtotal only — shipping untouched)
  let discountPercent = 0;
  let discountCodeRow = null;

  if (discountCode) {
    const { data: codeRow, error: codeError } = await supabase
      .from("DiscountCodes")
      .select("*")
      .eq("code", discountCode)
      .single();

    if (codeError || !codeRow) throw new Error("Invalid discount code");
    if (!codeRow.isValid) throw new Error("Discount code is no longer valid");

    if (codeRow.type === "limited") {
      const expired =
        codeRow.expiresAt && new Date(codeRow.expiresAt) < new Date();
      const outOfUses = codeRow.usesLeft !== null && codeRow.usesLeft <= 0;
      if (expired || outOfUses)
        throw new Error("Discount code is no longer valid");
    }

    if (codeRow.type === "single-use" && codeRow.usedAt) {
      throw new Error("Discount code has already been used");
    }

    discountPercent = codeRow.discount;
    discountCodeRow = codeRow;
  }

  const discountAmount = subtotal * (discountPercent / 100);
  const discountedSubtotal = subtotal - discountAmount;
  const total = discountedSubtotal + shippingCost;

  return {
    totalInMinorUnits: Math.round(total * 100), // for Revolut
    subtotal,
    discountAmount,
    discountedSubtotal,
    total,
    discountCodeRow, // returned so checkout route can call /redeem after payment succeeds
    pricedItems, // authoritative cart items — persist these on the order instead of the raw client cartItems
  };
}

/**
 * Marks a discount code as used once its order has actually been paid for — never at checkout
 * time, since a reservation can still be abandoned or fail payment. Called from
 * order-process.js right after an order is marked "paid" (which only ever runs once per order,
 * since processOrder() short-circuits on order.status === "paid").
 *
 * - "single-use" codes: stamp usedAt so calculateOrderTotal()'s `codeRow.usedAt` check rejects
 *   it on the next attempt.
 * - "limited" codes: decrement usesLeft (floored at 0) so calculateOrderTotal()'s
 *   `usesLeft <= 0` check rejects it once exhausted.
 * - anything else (e.g. unlimited/standing codes): no-op.
 *
 * Never throws — a redemption-bookkeeping failure shouldn't block the rest of order
 * fulfillment. Logs loudly instead, since a silently-unredeemed code is a real (if minor)
 * revenue leak worth noticing.
 *
 * @param {object} supabase
 * @param {string} code
 */
async function redeemDiscountCode(supabase, code) {
  if (!code) return;

  const { data: codeRow, error } = await supabase
    .from("DiscountCodes")
    .select("*")
    .eq("code", code)
    .single();

  if (error || !codeRow) {
    console.error(`Could not find discount code "${code}" to redeem:`, error);
    return;
  }

  const updates = {};

  if (codeRow.type === "single-use") {
    updates.usedAt = new Date().toISOString();
  }

  if (codeRow.type === "limited" && codeRow.usesLeft !== null) {
    updates.usesLeft = Math.max(0, Number(codeRow.usesLeft) - 1);
  }

  if (Object.keys(updates).length === 0) {
    return;
  }

  const { error: updateError } = await supabase
    .from("DiscountCodes")
    .update(updates)
    .eq("code", code);

  if (updateError) {
    console.error(`Failed to redeem discount code "${code}":`, updateError);
  }
}

module.exports = { calculateOrderTotal, redeemDiscountCode };
