import { API_URL } from "../config";
import "../css/CartPage.css";

import { useCart } from "../context/CartContext";
import { FaTrashAlt } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { getVATAmount } from "../utils/pricing.js";
import { useLanguage } from "../context/LanguageContext";
import { useState } from "react";

export default function CartPage() {

  const { t } = useLanguage();

  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,

    // NEW FROM CONTEXT
    discount,
    applyDiscount,
    clearDiscount,

    productsTotal,
    discountAmount,
    discountedProductsTotal,
    finalTotal,

    // ORDER NOTE
    orderNote,
    setOrderNote,
  } = useCart();

  const navigate = useNavigate();

  // local input only
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const maxNoteChars = 300;

  // =========================
  // APPLY DISCOUNT CODE
  // =========================
  const applyCode = async () => {

    try {

      const res = await fetch(
        `${API_URL}/api/discount/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ code })
        }
      );

      const data = await res.json();

      if (!data.valid) {

        setError(t.cart.errCode5);
        return;
      }

      setError("");

      // APPLY TO CONTEXT (IMPORTANT)
      applyDiscount(code, data.discount);

      setCode("");

    } catch (err) {

      console.error(err);
      setError(t.cart.errCode0);
    }
  };

  // =========================
  // EMPTY CART
  // =========================
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

      <button
        onClick={clearCart}
        className="clear-cart"
      >
        {t.cart.clear}
      </button>

      {/* ================= CART ITEMS ================= */}
      {cart.map((item, index) => (
        <div
          className="cart-item"
          key={
            item.id +
            JSON.stringify(item.options)
          }
        >

          <div className="cart-item-image">

            <Link
              to={`/product/${item.id}`}
              state={{
                fromCart: true,
                options: item.options
              }}
            >
              <img
                src={item.image}
                alt={item.name}
              />
            </Link>

          </div>

          <div className="cart-item-info">

            <Link
              to={`/product/${item.id}`}
              state={{
                fromCart: true,
                options: item.options
              }}
            >
              <h3>{item.name}</h3>
            </Link>

            {Object.entries(item.options || {}).map(
              ([key, value]) => (
                <div key={key}>
                  <strong>{key}:</strong> {value}
                </div>
              )
            )}

            <p className="cart-price">
              {item.price * item.quantity} kr
              {" "}({t.cart.pPerPcs} {item.price} kr)
            </p>

            <h6>
              {t.cart.VAT}(25%):{" "}
              {getVATAmount(item.price) * item.quantity}
            </h6>

          </div>

          <div className="cart-item-actions">

            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) =>
                updateQuantity(
                  index,
                  Number(e.target.value)
                )
              }
            />

            <button
              onClick={() =>
                removeFromCart(index)
              }
            >
              <FaTrashAlt />
            </button>

          </div>

        </div>
      ))}

      {/* ================= DISCOUNT ================= */}
      <div className="discount-code">

        <input
          className="discount-code-input"
          value={code}
          onChange={(e) =>
            setCode(e.target.value)
          }
          placeholder="Discount code"
          disabled={discount.percent > 0}
        />

        <button
          className="discount-code-button"
          onClick={applyCode}
          disabled={discount.percent > 0}
        >
          {t.cart.apply}
        </button>

      </div>

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {/* ================= ORDER NOTE ================= */}
      <div className="order-note">
        <label htmlFor="order-note-textarea">
          {t.cart.noteLabel || "Note for your order (optional)"}
        </label>

        <textarea
          id="order-note-textarea"
          placeholder={
            t.cart.notePlaceholder ||
            "Any preferences or notes for your order..."
          }
          value={orderNote}
          maxLength={maxNoteChars}
          onChange={(e) => setOrderNote(e.target.value)}
        />

        <div className="char-counter">
          {orderNote.length}/{maxNoteChars}
        </div>
      </div>

      {/* ================= SUMMARY ================= */}
      <div className="cart-summary">

        {/* ACTIVE DISCOUNT */}
        {discount.percent > 0 && (
          <div className="discount-code-message">

            <p>[{discount.code}]</p>

            <p>
              {t.cart.discount}:{" "}
              {discount.percent}% (-
              {discountAmount} kr)
            </p>

            <button onClick={clearDiscount}>
              X
            </button>

          </div>
        )}

        <h2 className="total-price">
          {t.cart.total} {finalTotal}
        </h2>

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
