const express = require("express");

const shippingConfig = require("./../data/shipping-prices.json");


function shippingRoutes() {
  const router = express.Router();

  // Temporary hardcoded shipping configuration
  const shippingProviders = shippingConfig.providers;

  // GET all shipping providers and methods
  router.get("/options", (req, res) => {
    res.json(shippingProviders);
  });

  // ======================
  // SHIPMONDO PICKUP POINTS
  // ======================

  // Map our internal provider IDs to Shipmondo's carrier_code values
  const carrierCodeMap = {
    gls: "gls",
    dao: "dao",
    bring: "bring",
    postnord: "pdk",
  };

  const SHIPMONDO_BASE_URL = process.env.SHIPMONDO_BASE_URL;

  const getShipmondoAuthHeader = () => {
    const user = process.env.SHIPMONDO_API_USER;
    const key = process.env.SHIPMONDO_API_KEY;

    if (!user || !key) {
      throw new Error("Shipmondo API credentials are not configured");
    }

    const encoded = Buffer.from(`${user}:${key}`).toString("base64");
    return `Basic ${encoded}`;
  };

  // GET pickup points for a given carrier + postal code
  router.get("/pickup-points", async (req, res) => {
    const { carrier, postal_code } = req.query;

    if (!carrier || !postal_code) {
      return res.status(400).json({
        error: "Missing required query params: carrier, postal_code",
      });
    }

    const carrierCode = carrierCodeMap[carrier];

    if (!carrierCode) {
      return res.status(400).json({
        error: `Unknown carrier "${carrier}"`,
      });
    }

    if (!/^\d{4}$/.test(postal_code)) {
      return res.status(400).json({
        error: "postal_code must be a 4-digit Danish postal code",
      });
    }

    try {
      const params = new URLSearchParams({
        carrier_code: carrierCode,
        country_code: "DK",
        zipcode: postal_code,
      });

      const response = await fetch(
        `${SHIPMONDO_BASE_URL}/pickup_points?${params}`,
        {
          method: "GET",
          headers: {
            Authorization: getShipmondoAuthHeader(),
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Shipmondo API error:", response.status, errorText);

        return res.status(502).json({
          error: "Failed to fetch pickup points from Shipmondo",
        });
      }

      const data = await response.json();

      // Normalize the response to match what the frontend map expects
      const normalized = data.map((point) => ({
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
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}

module.exports = shippingRoutes;
