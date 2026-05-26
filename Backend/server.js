require("dotenv").config();

const express =
  require("express");

const cors =
  require("cors");

const {
  createClient
} = require(
  "@supabase/supabase-js"
);

/*--------------------
        ROUTES
--------------------*/

const stockRoutes =
  require("./routes/stock");

const productRoutes =
  require("./routes/products");

const discountRoutes =
  require("./routes/discount");

const shippingRoutes =
  require("./routes/shipping");

/*--------------------
        APP
--------------------*/

const app = express();

/*--------------------
      MIDDLEWARE
--------------------*/

app.use(cors());

app.use(express.json());

/*--------------------
      DATABASE
--------------------*/

const supabase =
  createClient(
    process.env.SUPABASE_URL,
    process.env
      .SUPABASE_SERVICE_ROLE_KEY
  );

/*--------------------
        ROUTES
--------------------*/

// PRODUCTS
app.use(
  "/api/products",
  productRoutes(
    supabase
  )
);

// STOCK
app.use(
  "/api",
  stockRoutes(
    supabase
  )
);

// DISCOUNTS
app.use(
  "/api/discount",
  discountRoutes(
    supabase
  )
);

// SHIPPING
/*app.use(
  "/api/shipping",
  shippingRoutes(
    supabase
  )
);*/

/*--------------------
      HEALTH CHECK
--------------------*/

app.get("/", (req, res) => {

  res.json({
    status: "OK",
    message:
      "Backend running"
  });

});

/*--------------------
    GLOBAL ERRORS
--------------------*/

app.use(
  (
    err,
    req,
    res,
    next
  ) => {

    console.error(
      "UNHANDLED ERROR:",
      err
    );

    res.status(500).json({
      error:
        "Internal server error"
    });
  }
);

/*--------------------
        SERVER
--------------------*/

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );

});