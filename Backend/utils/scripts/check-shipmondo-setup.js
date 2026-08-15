const { validateShippingSetup } = require("../shipmondo");

validateShippingSetup()
  .then(() =>
    console.log(
      "\nDone. ✓ lines are good to go, ✗ lines need fixing in DELIVERY_METHODS.",
    ),
  )
  .catch((err) => {
    console.error("\nCould not validate Shipmondo setup:", err.message);
    process.exit(1);
  });
