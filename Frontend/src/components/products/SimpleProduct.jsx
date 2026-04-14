import "../../css/SimpleProduct.css";

import { useState } from "react";
import { useCart } from "../../context/CartContext";
import { getDiscountedPrice, getDiscountPercent } from "../../utils/pricing";
import { useLanguage } from "../../context/LanguageContext";

function SimpleProduct({ product }) {
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const [quantity, setQuantity] = useState(1);

  const basePrice = product.prices?.[0]?.price || 0;
  const finalPrice = getDiscountedPrice(basePrice, product.discount);

  return (
    <div className="product-page">
      <img src={product.image} alt={product.translation?.name} />

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
          {finalPrice} kr
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

        {/* PRICE BOX */}
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
                name: product.translation?.name,
                price: finalPrice,
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