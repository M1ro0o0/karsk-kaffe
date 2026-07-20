const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function calculateOrderTotal(cartItems, discountCode, shippingCost = 0) {
  // 1. Fetch real product + price data — never trust cart's own price/finalPrice fields
  const productIds = [...new Set(cartItems.map((item) => item.id))];
  const priceIds = [...new Set(cartItems.map((item) => item.selectedPrice?.id))];

  const { data: products, error: productsError } = await supabase
    .from("Products")
    .select("id, baseDiscount, active")
    .in("id", productIds);
  if (productsError) throw new Error(`Failed to fetch products: ${productsError.message}`);

  const { data: prices, error: pricesError } = await supabase
    .from("ProductPrices")
    .select("id, productID, label, price")
    .in("id", priceIds);
  if (pricesError) throw new Error(`Failed to fetch prices: ${pricesError.message}`);

  // 2. Recalculate subtotal from real DB values only
  let subtotal = 0;

  for (const item of cartItems) {
    const product = products.find((p) => p.id === item.id);
    if (!product) throw new Error(`Product ${item.id} not found`);
    if (!product.active) throw new Error(`Product ${item.id} is no longer available`);

    const priceRow = prices.find(
      (p) => p.id === item.selectedPrice?.id && p.productID === item.id
    );
    if (!priceRow) throw new Error(`Price option for product ${item.id} not found`);

    const quantity = Number(item.quantity) || 0;
    if (quantity <= 0) throw new Error(`Invalid quantity for product ${item.id}`);

    subtotal += priceRow.price * product.baseDiscount * quantity;
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
      const expired = codeRow.expiresAt && new Date(codeRow.expiresAt) < new Date();
      const outOfUses = codeRow.usesLeft !== null && codeRow.usesLeft <= 0;
      if (expired || outOfUses) throw new Error("Discount code is no longer valid");
    }

    if (codeRow.type === "single-use" && codeRow.usedAt) {
      throw new Error("Discount code has already been used");
    }

    discountPercent = codeRow.discount;
    discountCodeRow = codeRow;
  }

  const discountedSubtotal = subtotal * (1 - discountPercent / 100);
  const total = discountedSubtotal + shippingCost;

  return {
    totalInMinorUnits: Math.round(total * 100), // for Revolut
    subtotal,
    discountedSubtotal,
    total,
    discountCodeRow // returned so checkout route can call /redeem after payment succeeds
  };
}

module.exports = { calculateOrderTotal };