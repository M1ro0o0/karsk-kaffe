/**
 * Shipmondo RESTful API (v3) integration.
 *
 * API documentation:
 * https://shipmondo.dev/docs/api/
 */

const SHIPMONDO_BASE_URL =
  process.env.SHIPMONDO_BASE_URL ||
  "https://sandbox.shipmondo.com/api/public/v3";

const LABEL_FORMAT =
  process.env.SHIPMONDO_LABEL_FORMAT || "compact_pdf";

const OWN_AGREEMENT =
  process.env.SHIPMONDO_OWN_AGREEMENT === "true";

/* =========================================================
   AUTHENTICATION
========================================================= */

function authHeader() {
  const user = process.env.SHIPMONDO_API_USER;
  const key = process.env.SHIPMONDO_API_KEY;

  const creds = `${user}:${key}`;

  return `Basic ${Buffer.from(creds).toString("base64")}`;
}

async function shipmondoRequest(path, options = {}) {
  return fetch(`${SHIPMONDO_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

/* =========================================================
   SENDER
========================================================= */

const SENDER = {
  type: "sender",
  name: "Karsk Kaffe",
  address1: process.env.SHIPMONDO_SENDER_ADDRESS1,
  postal_code: process.env.SHIPMONDO_SENDER_ZIP,
  city: process.env.SHIPMONDO_SENDER_CITY,
  country_code: "DK",
  email: "orders@karskkaffe.dk",
  phone: process.env.SHIPMONDO_SENDER_PHONE,
};

/* =========================================================
   DELIVERY METHODS
========================================================= */

const DELIVERY_METHODS = {
  gls_home: {
    productCode: "GLSDK_HD",
    serviceCodes: "EMAIL_NT,SMS_NT",
    servicePoint: false,
  },

  gls_parcelshop: {
    productCode: "GLSDK_SD",
    serviceCodes: "EMAIL_NT,SMS_NT",
    servicePoint: true,
    carrierCode: "gls",
  },

  dao_home: {
    productCode: "DAO_STH",
    serviceCodes: "EMAIL_NT,SMS_NT",
    servicePoint: false,
  },

  dao_parcelshop: {
    productCode: "DAO_STS",
    serviceCodes: "EMAIL_NT,SMS_NT",
    servicePoint: true,
    carrierCode: "dao",
  },

  postnord_home: {
    productCode: "PDK_MH",
    serviceCodes: "EMAIL_NT,SMS_NT",
    servicePoint: false,
  },

  postnord_parcelshop: {
    productCode: "PDK_MC",
    serviceCodes: "EMAIL_NT,SMS_NT",
    servicePoint: true,
    carrierCode: "pdk",
  },

  bring_home: {
    productCode: "BRI_HDP",
    serviceCodes: "EMAIL_NT,SMS_NT",
    servicePoint: false,
  },

  bring_parcelshop: {
    productCode: "BRI_PP",
    serviceCodes: "EMAIL_NT,SMS_NT",
    servicePoint: true,
    carrierCode: "bring",
  },
};

/* =========================================================
   DELIVERY METHOD HELPERS
========================================================= */

function resolveDeliveryMethodKey(providerId, methodTypeId) {
  if (!providerId || !methodTypeId) {
    throw new Error(
      `Missing providerId ("${providerId}") or methodTypeId ("${methodTypeId}") when resolving delivery method.`,
    );
  }

  const key = `${providerId}_${methodTypeId}`;

  if (!DELIVERY_METHODS[key]) {
    throw new Error(
      `No delivery method configured for provider "${providerId}" + type "${methodTypeId}".`,
    );
  }

  return key;
}

function resolveDeliveryMethod(order) {
  const key = order.shippingMethod;
  const method = DELIVERY_METHODS[key];

  if (!method) {
    throw new Error(
      `Unknown delivery method "${key}" on order ${order.id}.`,
    );
  }

  if (!method.productCode) {
    throw new Error(
      `DELIVERY_METHODS["${key}"] has no productCode configured.`,
    );
  }

  return method;
}

function getCarrierCode(providerId) {
  const method =
    DELIVERY_METHODS[`${providerId}_parcelshop`];

  if (!method?.carrierCode) {
    throw new Error(
      `No carrierCode configured for provider "${providerId}".`,
    );
  }

  return method.carrierCode;
}

/* =========================================================
   WEIGHT
========================================================= */

const PACKAGING_WEIGHT_G = 200;

function totalWeightGrams(order) {
  const productWeight = order.cartItems.reduce((sum, item) => {
    const weight =
      item.selectedPrice?.weight ??
      item.weight ??
      null;

    if (weight === null) {
      console.warn(
        `Order ${order.id}: cart item "${item.name}" has no weight.`,
      );
    }

    return sum + (weight ?? 0) * item.quantity;
  }, 0);

  return productWeight + PACKAGING_WEIGHT_G;
}

/* =========================================================
   RECEIVER
========================================================= */

function receiverParty(order) {
  return {
    type: "receiver",
    name: order.customerName,
    attention: order.customerName,
    address1: order.shippingAddress.address,
    postal_code: order.shippingAddress.postalCode,
    city: order.shippingAddress.city,
    country_code:
      order.shippingAddress.countryCode || "DK",
    email: order.customerEmail,
    phone:
      order.shippingAddress.phone ||
      order.customerPhone ||
      null,
  };
}

/* =========================================================
   PRODUCTS
========================================================= */

const productCache = new Map();

async function listAvailableProducts(countryCode = "DK") {
  const res = await shipmondoRequest(
    `/products?country_code=${countryCode}`,
  );

  if (!res.ok) {
    throw new Error(
      `Could not fetch Shipmondo products (${res.status}): ${await res.text()}`,
    );
  }

  const body = await res.json();

  const products = Array.isArray(body)
    ? body
    : body.products;

  for (const product of products) {
    productCache.set(product.code, product);
  }

  return products;
}

async function getProduct(
  productCode,
  countryCode = "DK",
) {
  if (!productCache.has(productCode)) {
    await listAvailableProducts(countryCode);
  }

  const product = productCache.get(productCode);

  if (!product) {
    throw new Error(
      `Product code "${productCode}" was not found for country ${countryCode}.`,
    );
  }

  return product;
}

async function checkWeightFits(
  productCode,
  weightGrams,
  countryCode = "DK",
) {
  const product = await getProduct(
    productCode,
    countryCode,
  );

  const intervals =
    product.weight_intervals || [];

  const fits = intervals.some(
    (interval) =>
      weightGrams > interval.from_weight &&
      weightGrams <= interval.to_weight,
  );

  if (!fits) {
    const max = intervals.length
      ? Math.max(
          ...intervals.map(
            (interval) => interval.to_weight,
          ),
        )
      : null;

    throw new Error(
      `Order weight ${weightGrams}g doesn't fit any weight interval for "${product.name}" (${productCode})` +
        (max
          ? ` — max supported is ${max}g.`
          : "."),
    );
  }

  return true;
}

/* =========================================================
   LABEL
========================================================= */

async function fetchShipmentLabel(
  shipmentId,
  labelFormat = LABEL_FORMAT,
) {
  const res = await shipmondoRequest(
    `/shipments/${shipmentId}/labels?label_format=${labelFormat}`,
  );

  if (!res.ok) {
    throw new Error(
      `Shipmondo fetchShipmentLabel failed (${res.status}): ${await res.text()}`,
    );
  }

  const contentType =
    res.headers.get("content-type") || "";

  if (
    contentType.includes("pdf") ||
    contentType.includes("octet-stream")
  ) {
    return Buffer.from(await res.arrayBuffer());
  }

  const data = await res.json();

  const base64 =
    data.label_base64 ??
    data.base64 ??
    data.pdf_base64 ??
    null;

  if (!base64) {
    throw new Error(
      `Shipmondo label response had no recognizable PDF field.`,
    );
  }

  return Buffer.from(base64, "base64");
}

/* =========================================================
   SERVICE POINTS
========================================================= */

async function findServicePoints({
  carrierCode,
  countryCode = "DK",
  zipcode,
}) {
  const params = new URLSearchParams({
    carrier_code: carrierCode,
    country_code: countryCode,
    zipcode,
  });

  const res = await shipmondoRequest(
    `/pickup_points?${params}`,
  );

  const body = await res.text();

  if (!res.ok) {
    throw new Error(
      `Shipmondo findServicePoints failed (${res.status}): ${body}`,
    );
  }

  return JSON.parse(body);
}

/* =========================================================
   CREATE SHIPMENT
========================================================= */

async function createShipment(order) {
  const method = resolveDeliveryMethod(order);
  const weightGrams = totalWeightGrams(order);

  await checkWeightFits(
    method.productCode,
    weightGrams,
  );

  const payload = {
    own_agreement: OWN_AGREEMENT,
    product_code: method.productCode,
    service_codes: method.serviceCodes,
    reference: `Order ${order.id}`,
    label_format: LABEL_FORMAT,
    parties: [
      SENDER,
      receiverParty(order),
    ],
    parcels: [
      {
        weight: weightGrams,
      },
    ],
  };

  if (method.servicePoint) {
    if (!order.pickupPoint?.id) {
      throw new Error(
        `Order ${order.id} uses parcel-shop method "${order.shippingMethod}" but has no pickupPoint.id.`,
      );
    }

    payload.service_point_id =
      order.pickupPoint.id;
  }

  const res = await shipmondoRequest(
    `/shipments`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    throw new Error(
      `Shipmondo createShipment failed (${res.status}): ${await res.text()}`,
    );
  }

  const shipment = await res.json();

  const embeddedBase64 =
    shipment.label_base64 ??
    shipment.parcels?.[0]?.label_base64 ??
    shipment.label?.base64 ??
    null;

  let labelPdfBuffer = embeddedBase64
    ? Buffer.from(embeddedBase64, "base64")
    : null;

  if (!labelPdfBuffer) {
    try {
      labelPdfBuffer =
        await fetchShipmentLabel(shipment.id);
    } catch (err) {
      console.error(
        `Shipmondo shipment ${shipment.id} was created, but its label could not be fetched:`,
        err,
      );
    }
  }

  return {
    shipmentId: shipment.id,

    trackingNumber:
      shipment.parcels?.[0]?.package_no ??
      shipment.package_no ??
      null,

    trackingUrl:
      shipment.tracking_url ??
      shipment.parcels?.[0]?.tracking_url ??
      null,

    labelPdfBuffer,

    raw: shipment,
  };
}

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createShipment,
  fetchShipmentLabel,
  findServicePoints,
  listAvailableProducts,
  checkWeightFits,
  totalWeightGrams,
  resolveDeliveryMethodKey,
  getCarrierCode,
  DELIVERY_METHODS,
};