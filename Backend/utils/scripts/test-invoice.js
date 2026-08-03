const fs = require("fs");
const path = require("path");

const { generateInvoicePdf } = require("../invoice"); // adjust path if necessary

async function run() {
  const order = {
    orderID: "03AUG26AX0000",

    createdAt: new Date(),

    billingAddress: {
      firstName: "John",
      lastName: "Doe",
      address: "Example Street 15",
      postalCode: "6400",
      city: "Sønderborg",
      country: "Denmark",
      email: "john@example.com",
    },

    cartItems: [
      {
        name: "Brasilien Diamond",
        quantity: 2,
        price: 109,

        options: {
          Roast: "Medium",
          Grind: "Whole Beans",
          Size: "250 g",
        },
      },

      {
        name: "Nordlys Blend",
        quantity: 1,
        price: 139,

        options: {
          Roast: "Dark",
          Grind: "Filter",
          Size: "500 g",
        },
      },
    ],

    shippingCost: 39,

    discount: { code: "Welcome10", amount: 35 },

    totalAmount: 396,
  };

  const pdf = await generateInvoicePdf(order);

  const out = path.join(__dirname, "Invoice-Test.pdf");

  fs.writeFileSync(out, pdf);

  console.log("Invoice written to:");
  console.log(out);
}

run().catch(console.error);
