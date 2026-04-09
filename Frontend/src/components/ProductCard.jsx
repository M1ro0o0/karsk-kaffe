import "../css/ProductCard.css";

import { Link } from "react-router-dom";
import { getDiscountedPrice, getDiscountPercent } from "../utils/pricing.js";
import { useLanguage } from "../context/LanguageContext";


function ProductCard({ product }) {
  const { lang, t } = useLanguage();
  return (
    <Link to={`/product/${product.id}`} className="product-link">
      <div className="product-card">
        <div className="product-image-wrapper">
  <img src={product.image} alt={product.translations[lang].name} />

  {product.discount < 1 && (
    <span className="discount">
      -{getDiscountPercent(product.discount)}%
    </span>
  )}
</div>

        <h3>{product.translations[lang].name}</h3>
        {product.discount < 1 ? (
          <strong className="price-estimate">
            {product.price.length > 1 ? (
              <>
                {t.product.newPriceFrom} {getDiscountedPrice(product.price[0], product.discount)} kr
              </>
            ) : (
              <>
              {getDiscountedPrice(product.price, product.discount)} kr
              </>
            )}
          </strong>
        ) : (
          <strong className="price-estimate">
            {product.price.length > 1 ? (
              <>
                {t.product.priceFrom} {getDiscountedPrice(product.price[0], product.discount)} kr
              </>
            ) : (
              <>
              {getDiscountedPrice(product.price, product.discount)} kr
              </>
            )}
          </strong>
        )}

        <div className="popup">
          <p id="msg">{t.product.clickMore}</p>
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;
