require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const nodemailer = require("nodemailer");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const app = express();
const fetch = require("node-fetch");

app.use(cors());
app.use(express.json());

/*--------------------
      Database
--------------------*/

//Clent creations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/*---------------------
      Functions
---------------------*/

function formatOptions(optionsArray) {
  const grouped = {};

  (optionsArray || []).forEach((opt) => {
    if (!grouped[opt.type]) {
      grouped[opt.type] = [];
    }

    grouped[opt.type].push(opt.value);
  });

  return grouped;
}

function formatProduct(product, lang = "en") {
  const translations = product.ProductTranslation || [];

  const translation = translations.find((t) => t.language === lang);

  const selections = product.ProductContent || [];

  const selection =
    selections.find((t) => t.language === lang) || selections[0];

  return {
    id: product.id,
    type: product.type,
    image: product.image,
    discount: product.baseDiscount,
    prices: product.ProductPrices || [],
    name: translation?.name,
    description: translation?.description,
    items: selection?.items?.products || [],
    options: formatOptions(product.ProductOptions || []),
  };
}

function formatProductCard(product, lang = "en") {
  const translations = product.ProductTranslation || [];

  const translation = translations.find((t) => t.language === lang);

  return {
    id: product.id,
    image: product.image,
    discount: product.baseDiscount,
    name: translation?.name || "No name",
    price: product.ProductPrices?.[0]?.price || 0,
    isMultiprice: (product.ProductPrices?.length || 0) > 1,
  };
}

async function getZohoAccessToken() {
  const response = await fetch("https://accounts.zoho.eu/oauth/v2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN
    })
  });

  const data = await response.json();
  return data.access_token;
}

function buildSku(productId, selectedOptions, optionsFromDb) {
  const getCode = (type, value) => {
  if (!value) {
    throw new Error(`Missing selected option value for ${type}`);
  }

  const match = optionsFromDb.find(opt =>
    opt.type &&
    opt.value &&
    opt.type.trim().toLowerCase() === type.trim().toLowerCase() &&
    opt.value.trim().toLowerCase() === value.trim().toLowerCase()
  );

  if (!match) {
    throw new Error(`No matching option for ${type}: ${value}`);
  }

  return match.code;
};

  // weight comes directly from frontend
  const weight = selectedOptions.weight;

  // these come from DB option codes
  const roast = getCode("roast", selectedOptions.roast);
  const grind = getCode("grind", selectedOptions.grind);

  return `${productId}-${weight}-${roast}:${grind}`;
}

async function getItem(itemId) {
  const token = await getZohoAccessToken();

  const res = await fetch(
    `https://www.zohoapis.eu/inventory/v1/items/${itemId}?organization_id=${process.env.ZOHO_ORG_ID}`,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`
      }
    }
  );

  const data = await res.json();
  return data.item;
}

/*--------------
      APIs
--------------*/

//Validation
app.post("/api/discount/validate", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.json({ valid: false, error: "EMPTY_CODE" });
  }

  const { data, error } = await supabase
    .from("DiscountCodes")
    .select("*")
    .eq("code", code)
    .single();

  if (error || !data) {
    return res.json({ valid: false, error: "NOT_FOUND" });
  }

  // expired check (if you have it)
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return res.json({ valid: false, error: "EXPIRED" });
  }

  // single-use check
  if (data.type === "single" && data.used) {
    return res.json({ valid: false, error: "ALREADY_USED" });
  }

  return res.json({
    valid: true,
    discount: data.discount,
  });
});

//Redeem
app.post("/api/discount/redeem", async (req, res) => {
  const { code, invoice } = req.body;

  const { data } = await supabase
    .from("discount_codes")
    .select("*")
    .eq("code", code)
    .single();

  if (!data) {
    return res.status(400).send("Invalid code");
  }

  if (data.type === "single" && data.used) {
    return res.status(400).send("Already used");
  }

  const { error } = await supabase
    .from("discount_codes")
    .update({
      used: true,
      used_at: new Date().toISOString(),
      invoice: invoice,
    })
    .eq("code", code);

  if (error) {
    return res.status(500).send(error.message);
  }

  res.send({ success: true });
});

app.post("/api/resolve-sku", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("ProductOptions")
      .select("*");

    console.log(data);

    if (error) {
      console.error(error);
      return res.status(500).json(error);
    }

    res.json(data);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: err.message
    });
  }
});

//Product retrieving
app.get("/api/products", async (req, res) => {
  const lang = req.query.lang || "en";

  try {
    const { data, error } = await supabase
      .from("Products")
      .select(
        `
    id,
    image,
    baseDiscount,
    ProductPrices(price),
    ProductTranslation(name, language)
  `,
      )
      .eq("active", true);

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return res.status(500).json(error);
    }

    const formatted = data.map((p) => formatProductCard(p, lang));

    res.json(formatted);
  } catch (err) {
    console.error("SERVER CRASH:", err);
    res.status(500).json({ error: err.message });
  }
});

//particular product retrieve
app.get("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const lang = req.query.lang || "en";

    const { data, error } = await supabase
      .from("Products")
      .select(
        `
    id,
    image,
    type,
    baseDiscount,
    ProductPrices(label, price),
    ProductTranslation(name, language, description),
    ProductOptions(type, value),
    ProductContent(language, items)
  `,
      )
      .eq("active", true)
      .eq("id", id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Product not found" });
    }

    const formatted = formatProduct(data, lang);
    res.json(formatted);

    console.log(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

app.get("/api/stock/:sku", async (req, res) => {
  const { sku } = req.params;

  // 1. get zoho_item_id from DB
  const { data: product } = await supabase
    .from("ZohoInventory")
    .select("ZohoID")
    .eq("ProductSKU", sku)
    .single();

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  // 2. get Zoho token
  const token = await getZohoAccessToken();

  // 3. call Zoho
  const response = await fetch(
    `https://www.zohoapis.eu/inventory/v1/items/${product.ZohoID}?organization_id=${process.env.ZOHO_ORG_ID}`,
    {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`
      }
    }
  );

  const data = await response.json();

  // 4. return only stock
  res.json({
    sku,
    stock: data.item?.available_stock ?? 0
  });
});

app.post("/debug/sku", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const { productId, selectedOptions } = req.body;

    const { data: optionsFromDb, error } = await supabase
      .from("ProductOptions")
      .select("type, value, code");

    if (error) {
      console.error("SUPABASE ERROR:", error);

      return res.status(500).json({
        error: error.message
      });
    }

    console.log("OPTIONS FROM DB:", optionsFromDb);

    console.log("SELECTED OPTIONS:", selectedOptions);
    console.log("OPTIONS FROM DB:", optionsFromDb);

    const sku = buildSku(
      productId,
      selectedOptions,
      optionsFromDb
    );

    console.log("GENERATED SKU:", sku);

    return res.json({ sku });

  } catch (err) {
    console.error("FULL ERROR:", err);

    return res.status(500).json({
      message: err.message,
      stack: err.stack
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
