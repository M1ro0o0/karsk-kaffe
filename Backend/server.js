require('dotenv').config();

const { createClient } = require("@supabase/supabase-js");
const nodemailer = require("nodemailer");
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

/*--------------------
      Database
--------------------*/

//Clent creations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/*---------------------
      Functions
---------------------*/

function formatOptions(optionsArray) {
  const grouped = {};

  (optionsArray || []).forEach(opt => {
    if (!grouped[opt.type]) {
      grouped[opt.type] = [];
    }

    grouped[opt.type].push(opt.value);
  });

  return grouped;
}

function formatProduct(product) {
  const translations = {};

  product.product_translations.forEach((t) => {
    translations[t.language] = {
      name: t.name,
      description: t.description,
      shortDescription: t.short_description,
    };
  });

  return {
    id: product.id,
    type: product.type,
    image: product.image,
    discount: product.base_discount,

    prices: product.product_prices.map(p => ({
      label: p.label,
      price: p.price
    })),

    tags: product.product_tags.map(t => t.tags.name),

    translations,

    options: formatOptions(product.product_options)
  };
}

function formatProductCard(product, lang = "en") {
  const translations = product.ProductTranslation || [];

  const translation = translations.find(
    (t) => t.language === lang
  );

  return {
    id: product.id,
    image: product.image,
    discount: product.baseDiscount,
    name: translation?.name || "No name",
    price: product.ProductPrices?.[0]?.price || 0,
  };
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
    discount: data.discount
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
      invoice: invoice
    })
    .eq("code", code);

  if (error) {
    return res.status(500).send(error.message);
  }

  res.send({ success: true });
});

function getProducts()
{
    const rawData = fs.readFileSync(productsPath);
    return JSON.parse(rawData);
}


//Email bullshit

/*console.log("Step 1: after imports");

const { getLocale } = require('./locales');

console.log("Step 2: locales loaded");

app.use(cors({
  origin: "*", // for testing
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

const productsPath = path.join(__dirname,'data', 'products.json');

console.log("Step 3: path set");



function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getRecipient(type){
    switch (type)
    {
        case "orders":
            return "return@karskkaffe.dk";
        case "wholesale":
            return "business@karskkaffe.dk";
        case "general":
        case "support":
            return "info@karskkaffe.dk";
        default:
            return "info@karskkaffe.dk";
    }
}

function getFooter(email) {
  return `
    <br><br>

    <p>Med venlig hilsen | Kind Regards</p>

    <p>
      <strong>Automatic Reply</strong><br>
      Customer Service | Karsk Kaffe<br>
      Slovak-roasted specialty coffee for Denmark
    </p>

    <img src="cid:logo" style="max-width:200px; margin:10px 0;" />

    <p>
      📧 ${email}<br>
      🌍 www.karskkaffe.dk<br>
      📱 +45 XX XX XX XX
    </p>

    <p>CVR: 46 27 60 43</p>
  `;
}


const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

console.log("Step 4: transporter created");

app.post("/api/contact", async (req, res) => {
  console.log("Sending test email...");

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Test",
      text: "Test"
    });

    console.log("Email sent");

    res.json({ success: true });

  } catch (err) {
    console.error("EMAIL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});*/

//Product retrieving
app.get("/api/products", async (req, res) => {
  console.log("🔥 /api/products HIT");
  const lang = req.query.lang || "en";

  try {
    const { data, error } = await supabase
  .from("Products")
  .select(`
    id,
    image,
    baseDiscount,
    ProductPrices(price),
    ProductTranslation(name, language)
  `);
  
   console.log(JSON.stringify(product, null, 2));

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return res.status(500).json(error);
    }


    const formatted = data.map(p => formatProductCard(p, lang));

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

    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_prices(*),
        product_translations(*),
        product_options(*),
        product_tags(
          tags(name)
        )
      `)
      .eq("id", id)
      .limit(1);

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
