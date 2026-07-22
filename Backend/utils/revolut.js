const REVOLUT_API_URL = "https://merchant.revolut.com/api/orders"; // sandbox: https://sandbox-merchant.revolut.com/api/orders

async function createRevolutOrder({ amount, currency, customerEmail, customerName, merchantOrderExtRef }) {
  const response = await fetch(REVOLUT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.REVOLUT_SECRET_KEY}`,
      "Revolut-Api-Version": "2026-04-20"
    },
    body: JSON.stringify({
      amount,
      currency,
      merchant_order_ext_ref: merchantOrderExtRef,
      customer: {
        email: customerEmail,
        full_name: customerName
      },
      capture_mode: "automatic"
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Revolut order creation failed: ${response.status} ${errorBody}`);
  }

  return response.json();
}

module.exports = { createRevolutOrder };