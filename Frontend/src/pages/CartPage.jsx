import "../css/CartPage.css";

import { useCart } from "../context/CartContext";
import { FaTrashAlt } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { getVATAmount } from "../utils/pricing.js";
import { useLanguage } from "../context/LanguageContext";
import { useState } from "react";

export default function CartPage() {
  const { t } = useLanguage();
  const { cart, updateQuantity, removeFromCart, clearCart, totalPrice } = useCart();
  
  const navigate = useNavigate();
  
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState("");
  
  const finalprice = totalPrice - getVATAmount(totalPrice, discount/100);


  const applyCode = async () => {
    try {
      const res = await fetch(
        "https://karsk-kaffe.onrender.com/api/discount/validate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }
      );

      const data = await res.json();

      if (!data.valid) {
        if (data.error === "NOT_FOUND") setError(t.cart.errCode1);
        else if (data.error === "ALREADY_USED") setError(t.cart.errCode2);
        else if (data.error === "EXPIRED") setError(t.cart.errCode3);
        else if (data.error === "EMPTY_CODE") setError(t.cart.errCode4);
        else setError(t.cart.errCode5);

        setDiscount(0);
        return;
      }

      setError("");
      setDiscount(data.discount);
    } catch (err) {
      console.error(err);
      setError(t.cart.errCode0);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="cart-empty">
        <h2>{t.cart.empty}</h2>
        <h3>{t.cart.empty2}</h3>
      </div>
    );
  }

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
              onChange={(e) =>
                updateQuantity(index, Number(e.target.value))
              }
            />

            <button onClick={() => removeFromCart(index)}>
              <FaTrashAlt />
            </button>
          </div>
        </div>
      ))}

      {/* DISCOUNT SECTION */}
      <div className="discount-code">
        <input
          className="discount-code-input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Discount code"
        />

        <button className="discount-code-button" onClick={applyCode}>
          {t.cart.apply}
        </button>
      </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="cart-summary">
        {discount > 0 && <p>{t.cart.discount}: {discount}% (-{getVATAmount(totalPrice, discount/100)} kr)</p>}   
        <h2 className="total-price">
          {t.cart.total} {finalprice}
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