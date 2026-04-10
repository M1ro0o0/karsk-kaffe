import "../css/CartPage.css";

import { useCart } from "../context/CartContext";
import { FaTrashAlt } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { getVATAmount } from "../utils/pricing.js";
import { useLanguage } from "../context/LanguageContext";
import { useState } from "react";

const applyCode = async (code) => {
  const res = await fetch("https://karsk-kaffe.onrender.com/api/discount/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  const data = await res.json();

  if (!data.valid) {
    if (data.error === "NOT_FOUND") setError("Code does not exist");
    if (data.error === "ALREADY_USED") setError("Code already used");
    if (data.error === "EXPIRED") setError("Code expired");
    if (data.error === "EMPTY_CODE") setError("Enter a code");
    return;
  }

  setDiscount(data.discount);
  setError("");
};

export default function CartPage() {
  const { t } = useLanguage();

  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState("");

  const { cart, updateQuantity, removeFromCart, clearCart, totalPrice } =
    useCart();

  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        <h2>{t.cart.empty}</h2>
        <h3>{t.cart.empty2}</h3>
      </div>
    );
  }

  const navigate = useNavigate();

  return (
    <div className="cart-page">
      <h1>{t.cart.cart}</h1>

      <button onClick={clearCart} className="clear-cart">
        {t.cart.clear}
      </button>

      {cart.map((item, index) => (
        <div className="cart-item" key={item.id + JSON.stringify(item.options)}>
          <div className="cart-item-image">
            <Link
              to={`/product/${item.id}`}
              state={{
                fromCart: true,
                options: item.options,
              }}
              className="cart-item-image-link"
            >
              <img src={item.image} alt={item.name} />
            </Link>
          </div>

          <div className="cart-item-info">
            <Link
              to={`/product/${item.id}`}
              state={{
                fromCart: true,
                options: item.options,
              }}
              className="cart-item-name-link"
            >
              <h3>{item.name}</h3>
            </Link>

            {Object.entries(item.options).map(([key, value]) => (
              <div key={key}>
                <strong>{key}:</strong> {value}
              </div>
            ))}

            <p className="cart-price">
              {item.price * item.quantity} kr ({t.cart.pPerPcs} {item.price} kr)
            </p>
            <h6>
              {t.cart.VAT}(25%): {getVATAmount(item.price) * item.quantity}
            </h6>
          </div>

          <div className="cart-item-actions">
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateQuantity(index, Number(e.target.value))}
            />

            <button onClick={() => removeFromCart(index)}>
              <FaTrashAlt />
            </button>
          </div>
        </div>
      ))}

      <div className="discount-code">
        <input
          className="discount-code-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Discount code"
        />
        <button className="discount-code-button" onClick={() => applyCode(code)}>
          Apply
        </button>

        {error && <p style={{ color: "red" }}>{error}</p>}
        {discount > 0 && <p>Discount: {discount}%</p>}
      </div>

      <div className="cart-summary">
        <h2 className="total-price">
          {t.cart.total} {totalPrice} kr
        </h2>
        <h4 className="vat">
          {t.cart.VAT}(25%): {getVATAmount(totalPrice)} kr
        </h4>

        <button
          className="proceed-to-checkout-button"
          disabled={cart.length === 0}
          onClick={() => navigate("/checkout")}
        >
          {t.cart.proceed}
        </button>
      </div>
    </div>
  );
}
