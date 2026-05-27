const express = require("express");

function shippingRoutes() {
  const router = express.Router();

  // Temporary hardcoded shipping configuration
  const shippingProviders = [
    {
      id: "gls",
      name: "GLS",
      methods: [
        {
          id: "home",
          name: "Home Delivery",
          price: {
            under1kg: 60,
            over1kg: 68,
          },
        },
        {
          id: "shop",
          name: "Pakkeshop",
          price: {
            under1kg: 35,
            over1kg: 40,
          },
        },
      ],
    },

    {
      id: "dao",
      name: "DAO",
      methods: [
        {
          id: "home",
          name: "Home Delivery",
          price: {
            under1kg: 43,
            over1kg: 53,
          },
        },
        {
          id: "shop",
          name: "Pakkeshop",
          price: {
            under1kg: 39,
            over1kg: 47,
          },
        },
      ],
    },

    {
      id: "bring",
      name: "Bring",
      methods: [
        {
          id: "home",
          name: "Home Delivery",
          price: {
            under1kg: 112,
            over1kg: 115,
          },
        },
        {
          id: "shop",
          name: "Pakkeshop",
          price: {
            under1kg: 38,
            over1kg: 47,
          },
        },
      ],
    },

    {
      id: "postnord",
      name: "PostNord",
      methods: [
        {
          id: "home",
          name: "Home Delivery",
          price: {
            under1kg: 59,
            over1kg: 80,
          },
        },
        {
          id: "shop",
          name: "Pakkeshop",
          price: {
            under1kg: 38,
            over1kg: 51,
          },
        },
      ],
    },
  ];

  // GET all shipping providers and methods
  router.get("/options", (req, res) => {
    res.json(shippingProviders);
  });

  return router;
}

module.exports = shippingRoutes;
