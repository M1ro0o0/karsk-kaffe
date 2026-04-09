import "../../css/SimpleProduct.css";

import { useState } from "react";
import { useCart } from "../../context/CartContext";
import { getDiscountedPrice, getDiscountPercent } from "../../utils/pricing";
import { useLanguage } from "../../context/LanguageContext";

function SimpleProduct({ product }) {
  const { addToCart } = useCart();
  const { lang, t } = useLanguage();
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="product-page">
      <img src={product.image} alt={product.translations[lang].name} />

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
            ? `${getDiscountedPrice(product.price, product.discount)} kr`
            : ` ${product.price} kr`}
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

        {/* PRICE */}
        <div className="price-box">
          {product.discount < 1 ? (
            <>
              <span className="price-old">{product.price} kr</span>
              <span className="price">
                {getDiscountedPrice(product.price, product.discount)} kr
              </span>
            </>
          ) : (
            <span className="price">{product.price} kr</span>
          )}
          <p>*{t.product.VAT}</p>
        </div>

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
            onClick={() =>
              addToCart({
                id: product.id,
                name: product.translations[lang].name,
                price: product.price,
                options: {},
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

export default SimpleProduct;
