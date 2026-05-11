import "../../css/BoxProduct.css";

import { useState, useEffect } from "react";
import { useCart } from "../../context/CartContext";
import { useLocation } from "react-router-dom";
import {
  getDiscountedPrice,
  getDiscountPercent
} from "../../utils/pricing";
import { useLanguage } from "../../context/LanguageContext";
import ReactMarkdown from "react-markdown";

function BoxProduct({ product }) {

  const { addToCart } = useCart();
  const { t } = useLanguage();

  const maxChars = 200;

  const location = useLocation();
  const cartOptions = location.state?.options;

  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState(
    cartOptions?.message || ""
  );

  const [stock, setStock] = useState(null);

  // FETCH STOCK
  useEffect(() => {

    const fetchStock = async () => {

      try {

        const res = await fetch(
          "https://karsk-kaffe.onrender.com/api/stock-check",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              productId: product.id
            })
          }
        );

        const data = await res.json();

        console.log("STOCK RESPONSE:", data);

        setStock(data.stock);

      } catch (err) {

        console.error("STOCK FETCH ERROR:", err);

      }
    };

    if (product?.id) {
      fetchStock();
    }

  }, [product.id]);

  return (
    <div className="product-page">

      <img
        src={product.image}
        alt={product.name}
        className="product-image"
      />

      <div className="product-info">

        <div className="title">

          <h1>{product.name}</h1>

          {product.discount < 1 && (
            <div className="discount-product">
              <span>
                -{getDiscountPercent(product.discount)}%
              </span>
            </div>
          )}

        </div>

        <strong className="price-estimate">

          {product.discount < 1
            ? `${getDiscountedPrice(
                product.prices[0].price,
                product.discount
              )} kr`
            : `${product.prices[0].price} kr`}

        </strong>

        <div className="description">

          <h3>{t.product.description}</h3>

          <ReactMarkdown>
            {product.description}
          </ReactMarkdown>

          {product.items && product.items.length > 0 && (
            <div className="product-items">

              <h3>{t.product.contains}</h3>

              <ul>
                {product.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>

            </div>
          )}

        </div>

        {/* OPTIONS */}
        <div className="product-options">

          <label>

            {t.product.customMessage}

            <textarea
              placeholder={t.product.customMessage}
              value={message}
              onChange={(e) =>
                setMessage(e.target.value)
              }
              maxLength={maxChars}
            />

          </label>

          <div className="char-counter">
            {message.length}/{maxChars}
          </div>

        </div>

        {/* PRICE */}
        <div className="price-box">

          {product.discount < 1 ? (
            <>
              <span className="price-old">
                {product.prices[0].price} kr
              </span>

              <span className="price">
                {getDiscountedPrice(
                  product.prices[0].price,
                  product.discount
                )}{" "}
                kr
              </span>
            </>
          ) : (
            <span className="price">
              {product.prices[0].price} kr
            </span>
          )}

          <p>*{t.product.VAT}</p>

        </div>

        {/* QUANTITY + CART */}
        <div className="quantity-selector">

          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => {

              const value = Number(e.target.value);

              setQuantity(value > 0 ? value : 1);

            }}
          />

          <button
            className="add-to-cart"
            disabled={
              stock === null ||
              stock < 2
            }
            onClick={() =>
              addToCart({
                id: product.id,
                name: product.name,
                price: product.prices?.[0]?.price,
                options: {
                  message,
                },
                quantity,
                image: product.image,
              })
            }
          >

            {stock !== null && stock < 2
              ? t.product.stock
              : t.product.addToCart}

          </button>

        </div>

      </div>
    </div>
  );
}

export default BoxProduct;