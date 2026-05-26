const express = require("express");

function shippingRoutes() {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.json({
      message: "Shipping routes working",
    });
  });

  return router;
}

module.exports = shippingRoutes;