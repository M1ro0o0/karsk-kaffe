/**
 * Test-creates a sandbox shipment for one delivery method at a time.
 *
 * Usage:
 *   node test-shipment.js <delivery_method_key> [zipcode]
 *
 * Examples:
 *   node test-shipment.js gls_home
 *   node test-shipment.js gls_parcelshop 2100
 *   node test-shipment.js dao_home
 *   node test-shipment.js dao_parcelshop 2100
 *   node test-shipment.js postnord_home
 *   node test-shipment.js postnord_parcelshop 2100
 *   node test-shipment.js bring_home
 *   node test-shipment.js bring_parcelshop 2100
 *
 * zipcode defaults to 2100 (Copenhagen Ø) and is only used for parcel-shop
 * methods, to look up a real service_point_id via findServicePoints().
 */

require("dotenv").config();
const fs = require("fs");
const {
  createShipment,
  findServicePoints,
} = require("./shipmondo");

const DELIVERY_METHODS_REQUIRING_SERVICE_POINT = new Set([
  "gls_parcelshop",
  "dao_parcelshop",
  "postnord_parcelshop",
  "bring_parcelshop",
]);

const CARRIER_CODE_BY_METHOD = {
  gls_parcelshop: "gls",
  dao_parcelshop: "dao",
  postnord_parcelshop: "pdk",
  bring_parcelshop: "bring",
};

async function main() {
  const methodKey = process.argv[2];
  const zipcode = process.argv[3] || "2100";

  if (!methodKey) {
    console.error("Usage: node test-shipment.js <delivery_method_key> [zipcode]");
    process.exit(1);
  }

  const order = {
    id: `TEST-${methodKey}-${Date.now()}`,
    customerName: "Test Customer",
    customerEmail: "test@example.com",
    customerPhone: "12345678",
    shippingAddress: {
      address: "Testvej 1",
      postalCode: zipcode,
      city: "København Ø",
      countryCode: "DK",
      phone: "12345678",
    },
    shipping: { method: methodKey },
    cartItems: [{ name: "Test Bag", quantity: 1, weight: 500 }],
  };

  if (DELIVERY_METHODS_REQUIRING_SERVICE_POINT.has(methodKey)) {
    const carrierCode = CARRIER_CODE_BY_METHOD[methodKey];
    console.log(`Looking up service points for carrier "${carrierCode}" near ${zipcode}...`);
    const points = await findServicePoints({ carrierCode, zipcode });
    const list = Array.isArray(points) ? points : points.pickup_points || points.service_points;
    if (!list || list.length === 0) {
      throw new Error(`No service points found for carrier "${carrierCode}" near ${zipcode}.`);
    }
    order.shipping.servicePointId = list[0].id;
    console.log(`Using service point: ${list[0].name || list[0].id} (id: ${list[0].id})`);
  }

  console.log(`Creating shipment for delivery_method="${methodKey}"...`);
  const result = await createShipment(order);

  console.log("--- Result ---");
  console.log("delivery_method:", methodKey);
  console.log("shipmentId:", result.shipmentId);
  console.log("trackingNumber:", result.trackingNumber);
  console.log("trackingUrl:", result.trackingUrl);

  if (result.labelPdfBuffer) {
    const filename = `label-${methodKey}.pdf`;
    fs.writeFileSync(filename, result.labelPdfBuffer);
    console.log(`Label saved to ${filename}`);
  } else {
    console.log("No label was returned/fetched.");
  }
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});