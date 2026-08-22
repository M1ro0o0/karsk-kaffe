// test-zoho-reservation.js
// Run: node test-zoho-reservation.js
// Use a SKU you don't mind seeing temporarily reserved — not a live bestseller.

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const {
  createSalesOrder,
  voidSalesOrder,
  finalizeSalesOrder,
  getItem,
} = require("./../zoho");
const { getZohoIdForSku } = require("./../zoho-sku-lookup");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const TEST_SKU = "BO-DG-4:100"; // <-- replace with a real SKU from your ZohoInventory table

async function checkStock(sku) {
  const zohoId = await getZohoIdForSku(supabase, sku);
  if (!zohoId) throw new Error(`No ZohoInventory mapping for SKU ${sku}`);
  const item = await getItem(zohoId);
  return (
    item.available_for_sale_stock ??
    item.available_stock ??
    item.stock_on_hand ??
    0
  );
}

async function run() {
  const testOrder = {
    id: `TEST-${Date.now()}`,
    createdAt: new Date().toISOString(),
    customerEmail: "test@karskkaffe.dk",
    customerName: "Test Buyer",
    cartItems: [
      {
        id: TEST_SKU,
        name: "Test product",
        options: {},
        quantity: 1,
        selectedPrice: { price: 50 },
      },
    ],
    shippingAddress: {
      address: "Test St 1",
      postalCode: "6700",
      city: "Esbjerg",
    },
    shippingCost: 0,
  };

  console.log("1. Stock before reservation:", await checkStock(TEST_SKU));

  const salesOrder = await createSalesOrder(testOrder, supabase);
  console.log(
    "2. Created + confirmed SO:",
    salesOrder.salesorder_id,
    "status:",
    salesOrder.status,
  );

  console.log(
    "3. Stock after reservation (should be lower):",
    await checkStock(TEST_SKU),
  );

  testOrder.zohoOrderID = salesOrder.salesorder_id;
  testOrder.invoiceNumber = "TEST-INV-0001";

  await finalizeSalesOrder(testOrder, supabase, {
    trackingNumber: "TEST-TRACK-123",
  });
  console.log(
    "4. Finalized — check this SO in the Zoho UI, notes field should show invoice + tracking.",
  );

  await voidSalesOrder(salesOrder.salesorder_id);
  console.log("5. Voided.");

  console.log(
    "6. Stock after void (should match step 1):",
    await checkStock(TEST_SKU),
  );
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exitCode = 1; // was process.exit(1)
});
