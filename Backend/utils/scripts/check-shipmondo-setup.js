/**
 * Run this against your Shipmondo sandbox before your first real test:
 *
 *   node scripts/check-shipmondo-setup.js
 *
 * It checks every entry in DELIVERY_METHODS (utils/shipmondo.js) against Shipmondo's real
 * /products list for Denmark: does the product_code actually exist, and are all of that
 * product's *required* services included in serviceCodes. Fixes nothing by itself — it just
 * tells you what's wrong so you can correct DELIVERY_METHODS by hand.
 *
 * Make sure SHIPMONDO_BASE_URL, SHIPMONDO_API_USER, and SHIPMONDO_API_KEY in your .env point
 * at the sandbox before running this the first time.
 */

require("dotenv").config();

const { getCarriers } = require("../shipmondo");

getCarriers()
  .then(() => {
    console.log(
      "\nDone. ✓ lines are good to go, ✗ lines need fixing in DELIVERY_METHODS.",
    );
  })
  .catch((err) => {
    console.error("\nCould not validate Shipmondo setup:", err.message);
    process.exit(1);
  });
