const express = require("express");

const shippingConfig = require("./../data/shipping-prices.json");
const { findServicePoints, getCarrierCode } = require("./../utils/shipmondo");

function shippingRoutes() {
  const router = express.Router();

  const shippingProviders = shippingConfig.providers;

  // GET all shipping providers and methods
  router.get("/options", (req, res) => {
    res.json(shippingProviders);
  });

  // ======================
  // SHIPMONDO PICKUP POINTS
  // Delegates entirely to shipmondo.js — that file already owns the Shipmondo base URL
  // (with its production fallback), auth, and the provider -> carrier_code mapping (via
  // getCarrierCode, sourced from the same DELIVERY_METHODS table createShipment() uses).
  // This route's only job is HTTP validation + response shaping for the frontend.
  // ======================

  // GET pickup points for a given carrier + postal code
  router.get("/pickup-points", async (req, res) => {
    const { carrier, postal_code } = req.query;

    if (!carrier || !postal_code) {
      return res.status(400).json({
        error: "Missing required query params: carrier, postal_code",
      });
    }

    if (!/^\d{4}$/.test(postal_code)) {
      return res.status(400).json({
        error: "postal_code must be a 4-digit Danish postal code",
      });
    }

    let carrierCode;

    try {
      carrierCode = getCarrierCode(carrier);
    } catch (err) {
      return res.status(400).json({
        error: `Unknown carrier "${carrier}"`,
      });
    }

    try {
      const points = await findServicePoints({
        carrierCode,
        countryCode: "DK",
        zipcode: postal_code,
      });

      // Normalize Shipmondo's raw response to what the frontend map expects.
      const normalized = points.map((point) => ({
        id: point.id,
        name: point.name || point.company_name,
        address: point.address,
        postal_code: point.zipcode,
        city: point.city,
        latitude: point.latitude,
        longitude: point.longitude,
        opening_hours: point.opening_hours || [],
        distance: point.distance,
      }));

      res.json(normalized);
    } catch (err) {
      console.error("Pickup points error:", err);
      res.status(502).json({ error: "Failed to fetch pickup points from Shipmondo" });
    }
  });

  return router;
}

module.exports = shippingRoutes;