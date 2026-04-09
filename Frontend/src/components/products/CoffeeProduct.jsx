import "../../css/CoffeeProduct.css";

import { useState } from "react";
import { useCart } from "../../context/CartContext";
import { Link, useLocation } from "react-router-dom";
import { getDiscountedPrice, getDiscountPercent } from "../../utils/pricing";
import { useLanguage } from "../../context/LanguageContext";

function PriceIndex(size) {
  if (!size) return null;

  switch (size) {
    case "100g":
      return 0;
    case "250g":
      return 1;
    case "500g":
      return 2;
    case "1000g":
      return 3;
    default:
      return null;
  }
}

function CoffeeProduct({ product }) {
  const { addToCart } = useCart();
  const { lang, t } = useLanguage();
  const location = useLocation();
  const cartOptions = location.state?.options;

  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState(cartOptions?.size || "");
  const [grind, setGrind] = useState(cartOptions?.grind || "");
  const [roast, setRoast] = useState(cartOptions?.roast || "");

  const allOptionsSelected = size && grind && roast && quantity > 0;

  return (
    <div className="product-page">
      <img src={product.image} alt={product.translations[lang].name} className="product-image" />

      <div className="product-info">
        <div className="title">
          <h1>{product.translations[lang].name}</h1>

          {product.discount < 1 && (
            <div className="discount-product">
              <span>-{getDiscountPercent(product.discount)}%</span>
            </div>
          )}
        </div>

        <strong className="price-estimate">
          {product.discount < 1
            ? `${t.product.newPriceFrom} ${getDiscountedPrice(
                product.price[0],
                product.discount,
              )} kr`
            : `${t.product.priceFrom} ${product.price[0]} kr`}
        </strong>

        <div className="description">
          <h3>{t.product.description}</h3>
          <ul>
            {Object.entries(product.translations[lang].description).map(([key, value]) => (
              <li key={key}>
                <strong>{t.labels[key]}:</strong> {value}
              </li>
            ))}
          </ul>
        </div>

        {/* OPTIONS */}
        <div className="product-options">
          <label>
            {t.product.grind}:
            <select value={grind} onChange={(e) => setGrind(e.target.value)}>
              <option value="">
                {t.product.select} {t.product.grind}
              </option>
              {product.translations[lang].availableGrinds.map((g, index) => (
                <option key={index} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t.product.size}:
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              <option value="">
                {t.product.select} {t.product.size}
              </option>
              <option value="100g">100g</option>
              <option value="250g">250g</option>
              <option value="500g">500g</option>
              <option value="1000g">1000g</option>
            </select>
          </label>

          <label>
            {t.product.roast}:
            <select value={roast} onChange={(e) => setRoast(e.target.value)}>
              <option value="">
                {t.product.select} {t.product.roast}
              </option>
              {product.translations[lang].availableRoasts.map((r, index) => (
                <option key={index} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* PRICE */}
        {allOptionsSelected && (
          <div className="price-box">
            {product.discount < 1 ? (
              <>
                <span className="price-old">
                  {product.price[PriceIndex(size)]} kr
                </span>
                <span className="price">
                  {getDiscountedPrice(
                    product.price[PriceIndex(size)],
                    product.discount,
                  )}{" "}
                  kr
                </span>
              </>
            ) : (
              <span className="price">
                {product.price[PriceIndex(size)]} kr
              </span>
            )}
            <p>*{t.product.VAT}</p>
          </div>
        )}

        {/* QUANTITY + CART */}
        <div className="quantity-selector">
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />

          <button
            className="add-to-cart"
            disabled={!allOptionsSelected}
            onClick={() =>
              addToCart({
                id: product.id,
                name: product.translations[lang].name,
                price: getDiscountedPrice(
                  product.price[PriceIndex(size)],
                  product.discount,
                ),
                options: {
                  grind,
                  roast,
                  size,
                },
                quantity,
                image: product.image,
              })
            }
          >
            {t.product.addToCart}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CoffeeProduct;
