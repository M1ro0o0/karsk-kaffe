import "../css/CheckoutPage.css";

import { useCart } from "../context/CartContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AddressForm from "../components/AddressForm";
import { getVATAmount } from "../utils/pricing.js";
import { useLanguage } from "../context/LanguageContext";

function CheckoutPage() {
  const {
    cart,
    clearCart,

    // NEW CART CONTEXT VALUES
    productsTotal,
    discountAmount,
    finalTotal,
    shippingPrice,
    setShippingPrice,
    discount,
  } = useCart();

  const { t } = useLanguage();
  const navigate = useNavigate();

  const { getTotalWeight } = useCart();
  const totalWeight = getTotalWeight();
  const isOver1kg = totalWeight > 1000;

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);

  // =========================
  // ADDRESSES
  // =========================
  const [billingAddress, setBillingAddress] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneCode: "+45",
    phoneNumber: "",
    address: "",
    postalCode: "",
    city: "",
    country: "Danmark",
  });

  const [shippingAddress, setShippingAddress] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneCode: "+45",
    phoneNumber: "",
    address: "",
    postalCode: "",
    city: "",
    country: "Danmark",
  });

  const [sameAsBilling, setSameAsBilling] = useState(true);

  useEffect(() => {
    if (sameAsBilling) {
      setShippingAddress({ ...billingAddress });
    }
  }, [sameAsBilling, billingAddress]);

  // =========================
  // VALIDATION
  // =========================
  const isValidPostcodeDK = (postcode) => /^\d{4}$/.test(postcode);

  const isAddressValid = (data) =>
    data.firstName &&
    data.lastName &&
    data.email &&
    data.phoneNumber &&
    data.address &&
    isValidPostcodeDK(data.postalCode) &&
    data.city &&
    data.country;

  const isDisabled =
    !isAddressValid(billingAddress) ||
    (!sameAsBilling && !isAddressValid(shippingAddress)) ||
    cart.length === 0;

  // =========================
  // SUBMIT ORDER
  // =========================
  const handleSubmit = () => {
    const order = {
      items: cart,

      productsTotal,
      discount: discount,
      discountAmount,
      shippingPrice,
      finalTotal,

      billingAddress,
      shippingAddress,

      createdAt: new Date().toISOString(),
    };

    console.log("ORDER:", order);

    clearCart();
    setShippingPrice(0);

    alert("Order placed successfully!");
  };

  // redirect if empty cart
  useEffect(() => {
    if (cart.length === 0) {
      navigate("/");
    }
  }, [cart, navigate]);

  // =========================
  // UI
  // =========================
  return (
    <div className="page checkout">
      <h1>{t.checkout.title}</h1>

      {/* BILLING */}
      <AddressForm
        title="bill"
        data={billingAddress}
        onChange={setBillingAddress}
        disabled={false}
      />

      {/* SAME AS BILLING */}
      <div className="checkout-checkbox">
        <label>
          <input
            type="checkbox"
            checked={sameAsBilling}
            onChange={(e) => setSameAsBilling(e.target.checked)}
          />

          {t.checkout.shipadd}
        </label>
      </div>

      {/* SHIPPING */}
      <AddressForm
        title="ship"
        data={shippingAddress}
        onChange={setShippingAddress}
        disabled={sameAsBilling}
      />

      {/* ORDER SUMMARY */}
      <div className="checkout-section">
        <h2>{t.checkout.order}</h2>

        {cart.map((item) => (
          <div
            key={item.id + JSON.stringify(item.options)}
            className="checkout-item"
          >
            <img src={item.image} alt={item.name} />

            <div>
              <strong>{item.name}</strong>

              <p>
                {Object.entries(item.options || {}).map(([key, value]) => (
                  <span key={key}>
                    <strong>{key}:</strong> {value}{" "}
                  </span>
                ))}
              </p>

              <p className="total-price">
                {item.quantity} × {item.price} kr ({item.quantity * item.price}{" "}
                kr)
              </p>

              <p className="vat">
                {t.cart.VAT}(25%): {getVATAmount(item.price) * item.quantity} kr
              </p>
            </div>
          </div>
        ))}

        {/* TOTALS */}
        <h3 className="total-price">
          {t.cart.subtotal}: {productsTotal} kr
        </h3>

        {discount.percent > 0 && (
          <h4 className="discount">
            {t.cart.discount}: -{discountAmount} kr
          </h4>
        )}

        <h4 className="shipping">
          {t.cart.ship}: {shippingPrice} kr
        </h4>

        <h2 className="final-total">
          {t.cart.total}: {finalTotal} kr
        </h2>

        <h4 className="vat">
          {t.cart.VAT}(25%): {getVATAmount(finalTotal)} kr
        </h4>
      </div>

      <div className="checkout-notice">
        <p className="checkout-warning">{t.checkout.warning}</p>

        <p className="checkout-terms">{t.checkout.terms}</p>
      </div>

      {/* PLACE ORDER */}
      <button
        className="checkout-button"
        disabled={isDisabled}
        onClick={handleSubmit}
      >
        {t.checkout.placeOrder}
      </button>
    </div>
  );
}

export default CheckoutPage;
