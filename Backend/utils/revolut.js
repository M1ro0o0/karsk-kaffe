async function createRevolutOrder({ amount, currency, customerEmail, customerName, merchantOrderExtRef }) {
  const requestBody = {
    amount,
    currency,
    merchant_order_ext_ref: merchantOrderExtRef,
    customer: { email: customerEmail, full_name: customerName },
    capture_mode: "automatic",
    success_url: `https://karskkaffe.dk/order-success?orderId=${merchantOrderExtRef}`,
    cancel_url: "https://karskkaffe.dk/checkout"
  };

  console.log("=== REVOLUT ORDER REQUEST ===", JSON.stringify(requestBody, null, 2));

  const response = await fetch(REVOLUT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.REVOLUT_SECRET_KEY}`,
      "Revolut-Api-Version": "2026-04-20"
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Revolut order creation failed: ${response.status} ${errorBody}`);
  }

  return response.json();
}