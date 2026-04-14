import "../../css/CoffeeProduct.css";

import { useState } from "react";
import { useCart } from "../../context/CartContext";
import { useLocation } from "react-router-dom";
import { getDiscountedPrice, getDiscountPercent } from "../../utils/pricing";
import { useLanguage } from "../../context/LanguageContext";

function CoffeeProduct({ product }) {
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const location = useLocation();
  const cartOptions = location.state?.options || {};

  const [quantity, setQuantity] = useState(1);

  // ✅ dynamic options state
  const [selectedOptions, setSelectedOptions] = useState({
    ...cartOptions,
    size: cartOptions.size || "",
  });

  const allOptionsSelected =
    Object.values(selectedOptions).every(v => v) && quantity > 0;

  // ✅ find selected price
  const selectedPriceObj = product.prices.find(
    p => p.label === selectedOptions.size
  );

  const basePrice = selectedPriceObj?.price || 0;
  const finalPrice = getDiscountedPrice(basePrice, product.discount);

  return (
    <div className="product-page">
      <img
        src={product.image}
        alt={product.translation?.name}
        className="product-image"
      />

      <div className="product-info">
        <div className="title">
          <h1>{product.translation?.name}</h1>

          {product.discount < 1 && (
            <div className="discount-product">
              <span>-{getDiscountPercent(product.discount)}%</span>
            </div>
          )}
        </div>

        {/* PRICE ESTIMATE */}
        <strong className="price-estimate">
          {product.discount < 1
            ? `${t.product.newPriceFrom} ${getDiscountedPrice(
                product.prices?.[0]?.price || 0,
                product.discount
              )} kr`
            : `${t.product.priceFrom} ${product.prices?.[0]?.price || 0} kr`}
        </strong>

        {/* DESCRIPTION */}
        <div className="description">
          <h3>{t.product.description}</h3>
          <ul>
            {Object.entries(product.translation?.description || {}).map(
              ([key, value]) => (
                <li key={key}>
                  <strong>{t.labels[key]}:</strong> {value}
                </li>
              )
            )}
          </ul>
        </div>

        {/* OPTIONS (DYNAMIC) */}
        <div className="product-options">
          {/* SIZE (from prices) */}
          <label>
            {t.product.size}:
            <select
              value={selectedOptions.size || ""}
              onChange={(e) =>
                setSelectedOptions(prev => ({
                  ...prev,
                  size: e.target.value,
                }))
              }
            >
              <option value="">
                {t.product.select} {t.product.size}
              </option>

              {product.prices.map((p, index) => (
                <option key={index} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          {/* OTHER OPTIONS (dynamic) */}
          {Object.entries(product.options || {}).map(([type, values]) => (
            <label key={type}>
              {t.product[type] || type}:
              <select
                value={selectedOptions[type] || ""}
                onChange={(e) =>
                  setSelectedOptions(prev => ({
                    ...prev,
                    [type]: e.target.value,
                  }))
                }
              >
                <option value="">
                  {t.product.select} {t.product[type] || type}
                </option>

                {values.map((v, index) => (
                  <option key={index} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {/* PRICE */}
        {allOptionsSelected && (
          <div className="price-box">
            {product.discount < 1 ? (
              <>
                <span className="price-old">{basePrice} kr</span>
                <span className="price">{finalPrice} kr</span>
              </>
            ) : (
              <span className="price">{basePrice} kr</span>
            )}
            <p>*{t.product.VAT}</p>
          </div>
        )}

        {/* CART */}
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
                name: product.translation?.name,
                price: finalPrice,
                selectedPrice: selectedPriceObj,
                options: selectedOptions,
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