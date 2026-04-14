import "../css/ProductCard.css";

import { Link } from "react-router-dom";
import { getDiscountedPrice, getDiscountPercent } from "../utils/pricing.js";
import { useLanguage } from "../context/LanguageContext";

function ProductCard({ product }) {
  const { t } = useLanguage();

  // ✅ get first price safely
  const firstPrice = product.prices?.[0]?.price || 0;
  const hasMultiplePrices = product.prices?.length > 1;

  const finalPrice = getDiscountedPrice(firstPrice, product.discount);

  return (
    <Link to={`/product/${product.id}`} className="product-link">
      <div className="product-card">
        
        <div className="product-image-wrapper">
          <img src={product.image} alt={product.translation?.name} />

          {product.discount < 1 && (
            <span className="discount">
              -{getDiscountPercent(product.discount)}%
            </span>
          )}
        </div>

        {/* ✅ NAME */}
        <h3>{product.translation?.name}</h3>

        {/* ✅ PRICE */}
        <strong className="price-estimate">
          {hasMultiplePrices ? (
            <>
              {product.discount < 1
                ? t.product.newPriceFrom
                : t.product.priceFrom}{" "}
              {finalPrice} kr
            </>
          ) : (
            <>{finalPrice} kr</>
          )}
        </strong>

        <div className="popup">
          <p id="msg">{t.product.clickMore}</p>
        </div>
      </div>
    </Link>
  );
}

export default ProductCard;