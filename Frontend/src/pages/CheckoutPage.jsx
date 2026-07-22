import "../css/CheckoutPage.css";

import { useCart } from "../context/CartContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AddressForm from "../components/AddressForm";
import { getVATAmount } from "../utils/pricing.js";
import { useLanguage } from "../context/LanguageContext";
import ShippingSelector from "../components/ShippingSelector";
import { API_URL } from "../config";

function CheckoutPage() {
  const {
    cart,
    clearCart,
    productsTotal,
    discountAmount,
    finalTotal,
    shippingPrice,
    setShippingPrice,
    discount,
    isOver1kg,
    orderNote,
  } = useCart();

  const { t } = useLanguage();
  const navigate = useNavigate();

  const [shippingData, setShippingData] = useState(null);
  const [pickupPoint, setPickupPoint] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

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
  // SHIPPING SELECTION
  // =========================
  const handleShippingChange = ({ provider, method, shippingPrice, pickupPoint }) => {
    setShippingData({ provider, method });
    setShippingPrice(shippingPrice);
    setPickupPoint(pickupPoint || null);
  };

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

  const requiresPickupPoint = shippingData?.method?.id === "shop";

  const isDisabled =
    !isAddressValid(billingAddress) ||
    (!sameAsBilling && !isAddressValid(shippingAddress)) ||
    cart.length === 0 ||
    !shippingData?.method ||
    (requiresPickupPoint && !pickupPoint);

  // =========================
  // SUBMIT ORDER
  // =========================
  const handleSubmit = async () => {
    setCheckoutError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cart,
          discountCode: discount.code || null,
          shippingCost: shippingPrice,
          customerEmail: billingAddress.email,
          customerName: `${billingAddress.firstName} ${billingAddress.lastName}`,
          billingAddress,
          shippingAddress: sameAsBilling ? billingAddress : shippingAddress,
          shippingMethod: shippingData,
          pickupPoint: pickupPoint || null,
          orderNote,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      // Redirect to Revolut's hosted payment page.
      // Cart is intentionally NOT cleared here — only after payment actually
      // succeeds, on the success/return page, not just because checkout started.
      window.location.href = data.checkoutUrl;

    } catch (err) {
      console.error("Checkout error:", err);
      setCheckoutError(err.message || "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Redirect if empty cart
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

      {/* SHIPPING ADDRESS */}
      <AddressForm
        title="ship"
        data={shippingAddress}
        onChange={setShippingAddress}
        disabled={sameAsBilling}
      />

      {/* SHIPPING SELECTOR (pickup point UI + map now live inside this) */}
      <ShippingSelector
        onChange={handleShippingChange}
        postalCode={billingAddress.postalCode}
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
                {item.quantity} × {item.price} kr ({item.quantity * item.price} kr)
              </p>
              <p className="vat">
                {t.cart.VAT}(25%): {getVATAmount(item.price) * item.quantity} kr
              </p>
            </div>
          </div>
        ))}

        <h3 className="total-price">
          {t.cart.subtotal}: {productsTotal} kr
        </h3>

        {discount.percent > 0 && (
          <h4 className="checkout-discount">
            {t.cart.discount}: [{discount.code}] -{discountAmount} kr
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

        {orderNote && orderNote.trim() !== "" && (
          <div className="checkout-order-note">
            <strong>{t.cart.noteLabel || "Note for your order"}:</strong>
            <p>{orderNote}</p>
          </div>
        )}
      </div>

      <div className="checkout-notice">
        <p className="checkout-warning">{t.checkout.warning}</p>
        <p className="checkout-terms">{t.checkout.terms}</p>
      </div>

      {checkoutError && (
        <p className="checkout-error" style={{ color: "red" }}>
          {checkoutError}
        </p>
      )}

      {/* PLACE ORDER */}
      <button
        className="checkout-button"
        disabled={isDisabled || isSubmitting}
        onClick={handleSubmit}
      >
        {isSubmitting ? "..." : t.checkout.placeOrder}
      </button>
    </div>
  );
}

export default CheckoutPage;