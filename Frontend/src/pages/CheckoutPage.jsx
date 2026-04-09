import "../css/CheckoutPage.css";

import { useCart } from "../context/CartContext";
import { useState } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AddressForm from "../components/AddressForm";
import { getVATAmount } from "../utils/pricing.js"
import { useLanguage } from "../context/LanguageContext";

function CheckoutPage() {
  const { cart, totalPrice, clearCart } = useCart();

  const { t } = useLanguage();

  const [billingAddress, setBillingAddress] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneCode: "+45",
    phoneNumber: "",
    address: "",
    postalCode: "",
    city: "",
    country: "Danmark"
  });

  const [shippingAddress, setShippingAddress] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phonecode: "+45",
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

  const isValidPostcodeDK = (postcode) =>
  /^\d{4}$/.test(postcode);
  const isAddressValid = (data) =>
  data.firstName &&
  data.lastName &&
  data.email &&
  idata.phoneNumber &&
  data.address &&
  isValidPostcodeDK(data.postalCode) &&
  data.city &&
  data.country;

  const isDisabled =
  !isAddressValid(billingAddress) ||
  (!sameAsBilling && !isAddressValid(shippingAddress)) ||
  cartItems.length === 0;

  const handleSubmit = () => {
    const order = {
      items: cartItems,
      total: totalPrice,
      billingAddress,
      shippingAddress,
      createdAt: new Date().toISOString(),
    };
    console.log("ORDER:", order);
    clearCart();
    alert("Order placed successfully!");
  };

  const navigate = useNavigate();

  useEffect(() => {
    if (cart.length === 0) {
      navigate("/");
    }
  }, [cart, navigate]);

  return (
    <div className="page checkout">
      <h1>{t.checkout.title}</h1>

      {/* ORDER SUMMARY */}
      <div className="checkout-section">
        <h2>{t.checkout.order}</h2>

        {cart.map((item) => (
          <div key={item.cartId} className="checkout-item">
            <img src={item.image} alt={item.name} />
            <div>
              <strong>{item.name}</strong>
              <p>
                {Object.entries(item.options).map(([key, value]) => (
              <span key={key}>
                <strong> {key}:</strong> {value} 
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

        <h3 className="total-price">{t.cart.total}: {totalPrice} kr</h3>
        <h4 className="vat">{t.cart.VAT}(25%): {getVATAmount(totalPrice)} kr</h4> 
      </div>

      <AddressForm
        title="bill"
        data={billingAddress}
        onChange={setBillingAddress}
        disabled={false}
      />

      <div className="checkout-checkbox">
        <label>
          <input
            type="checkbox"
            value="true"
            checked={sameAsBilling}
            onChange={(e) => setSameAsBilling(e.target.checked)}
          />
          {t.checkout.shipadd}
        </label>
      </div>

      <div>
        <AddressForm
        title="ship"
        data={shippingAddress}
        onChange={setShippingAddress}
        disabled={sameAsBilling}
      />
      </div>

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
