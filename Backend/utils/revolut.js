import fetch from "node-fetch"; // skip this import if your Node version has fetch built-in (Node 18+)

//const REVOLUT_API_URL = "https://merchant.revolut.com/api/orders"; //Production
const REVOLUT_API_URL = "https://sandbox-merchant.revolut.com/api/orders"; //Testing

export async function createRevolutOrder({ amount, currency, customerEmail, customerName }) {
  const response = await fetch(REVOLUT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.REVOLUT_SECRET_KEY}`,
      "Revolut-Api-Version": "2026-04-20"
    },
    body: JSON.stringify({
      amount, // in minor units, e.g. 4999 = 49.99
      currency, // e.g. "DKK"
      customer: {
        email: customerEmail,
        full_name: customerName
      },
      capture_mode: "AUTOMATIC"
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Revolut order creation failed: ${response.status} ${errorBody}`);
  }

  return response.json(); // includes checkout_url, id, etc.
}
