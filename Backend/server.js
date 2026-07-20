require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

/*--------------------
        ROUTES
--------------------*/

const stockRoutes = require("./routes/stock");
const productRoutes = require("./routes/products");
const discountRoutes = require("./routes/discount");
const shippingRoutes = require("./routes/shipping");
const contactRoutes = require("./routes/contact");
const checkoutRoutes = require("./routes/checkout");
const webhookRoutes = require("./routes/webhooks");

/*--------------------
        APP
--------------------*/

const app = express();

/*--------------------
      DATABASE
--------------------*/

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/*--------------------
      MIDDLEWARE
--------------------*/

app.use(cors({
  origin: [
    "https://karskkaffe.dk",
    "https://www.karskkaffe.dk"
  ],
  credentials: true
}));

// IMPORTANT: webhook route needs RAW body for signature verification,
// so it must be mounted BEFORE express.json() and use its own raw parser.
// If this were mounted after express.json(), req.body would already be
// parsed into an object, and signature verification would fail.
app.use("/api/webhooks", express.raw({ type: "application/json" }), webhookRoutes(supabase));

// Normal JSON parsing for every other route, mounted after the webhook route
app.use(express.json());

/*--------------------
        ROUTES
--------------------*/

// PRODUCTS
app.use("/api/products", productRoutes(supabase));

// STOCK
app.use("/api", stockRoutes(supabase));

// DISCOUNTS
app.use("/api/discount", discountRoutes(supabase));

// SHIPPING
app.use("/api/shipping", shippingRoutes(supabase));

// CONTACT
app.use("/api/contact", contactRoutes());

// CHECKOUT
app.use("/api/checkout", checkoutRoutes(supabase));

/*--------------------
      HEALTH CHECK
--------------------*/

app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Backend running. And you should be too, fatso",
  });
});

/*--------------------
    GLOBAL ERRORS
--------------------*/

app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err);
  res.status(500).json({
    error: "Internal server error",
  });
});

/*--------------------
        SERVER
--------------------*/

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});