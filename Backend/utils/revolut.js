const REVOLUT_API_URL =
  process.env.REVOLUT_API_URL ||
  "https://sandbox-merchant.revolut.com/api/orders";

async function createRevolutOrder({
  amount,
  currency,
  customerEmail,
  customerName,
  merchantOrderExtRef,
}) {
  const requestBody = {
    amount,
    currency,
    merchant_order_ext_ref: merchantOrderExtRef,
    customer: {
      email: customerEmail,
      full_name: customerName,
    },
    capture_mode: "automatic",
    success_url: `https://karskkaffe.dk/order-success?orderId=${merchantOrderExtRef}`,
    cancel_url: "https://karskkaffe.dk/checkout",
  };

  console.log("========================================");
  console.log("=== REVOLUT ORDER CREATION START ===");
  console.log("========================================");

  console.log("Revolut API URL:", REVOLUT_API_URL);
  console.log("Revolut mode:", REVOLUT_API_URL.includes("sandbox") ? "SANDBOX" : "PRODUCTION");

  console.log("Secret key exists:", !!process.env.REVOLUT_SECRET_KEY);
  console.log(
    "Secret key prefix:",
    process.env.REVOLUT_SECRET_KEY
      ? process.env.REVOLUT_SECRET_KEY.substring(0, 6) + "..."
      : "MISSING"
  );

  console.log("API version:", "2026-04-20");

  console.log(
    "Request body:",
    JSON.stringify(requestBody, null, 2)
  );

  console.log("Sending request to Revolut...");

  let response;

  try {
    response = await fetch(REVOLUT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.REVOLUT_SECRET_KEY}`,
        "Revolut-Api-Version": "2026-04-20",
      },
      body: JSON.stringify(requestBody),
    });
  } catch (fetchError) {
    console.error("!!! FETCH FAILED !!!");
    console.error("Fetch error:", fetchError);
    console.error("Message:", fetchError.message);
    console.error("Stack:", fetchError.stack);
    throw fetchError;
  }

  console.log("Revolut response received");
  console.log("HTTP status:", response.status);
  console.log("HTTP status text:", response.statusText);
  console.log(
    "Response OK:",
    response.ok
  );

  console.log(
    "Response headers:",
    Object.fromEntries(response.headers.entries())
  );

  const responseText = await response.text();

  console.log("Revolut raw response:");
  console.log(responseText);

  if (!response.ok) {
    console.error("========================================");
    console.error("=== REVOLUT ORDER CREATION FAILED ===");
    console.error("========================================");
    console.error("Status:", response.status);
    console.error("Response:", responseText);

    throw new Error(
      `Revolut order creation failed: ${response.status} ${responseText}`
    );
  }

  let responseJson;

  try {
    responseJson = JSON.parse(responseText);
  } catch (parseError) {
    console.error("!!! FAILED TO PARSE REVOLUT RESPONSE AS JSON !!!");
    console.error(parseError);
    throw parseError;
  }

  console.log("========================================");
  console.log("=== REVOLUT ORDER CREATION SUCCESS ===");
  console.log("========================================");
  console.log("Revolut order ID:", responseJson.id);
  console.log("Full Revolut response:", JSON.stringify(responseJson, null, 2));

  return responseJson;
}

module.exports = { createRevolutOrder };