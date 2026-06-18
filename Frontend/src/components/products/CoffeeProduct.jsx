import { API_URL } from "../../config";
import "../../css/CoffeeProduct.css";

import { useState, useEffect } from "react";
import { useCart } from "../../context/CartContext";
import { useLocation } from "react-router-dom";
import {
  getDiscountedPrice,
  getDiscountPercent
} from "../../utils/pricing";
import { useLanguage } from "../../context/LanguageContext";
import ReactMarkdown from "react-markdown";

function CoffeeProduct({ product }) {

  const { addToCart } = useCart();
  const { t } = useLanguage();

  const location = useLocation();
  const cartOptions = location.state?.options || {};

  const [quantity, setQuantity] = useState(1);

  // OPTIONS
  const [selectedOptions, setSelectedOptions] = useState({
    ...cartOptions,
    size: cartOptions.size || "",
  });

  // STOCK
  const [stock, setStock] = useState(null);

  // CHECK IF ALL OPTIONS ARE SELECTED
  const allOptionsSelected = Boolean(
    quantity > 0 &&
    selectedOptions.size &&
    Object.keys(product.options || {}).every(
      (type) => selectedOptions[type]
    )
  );

  // FIND SELECTED PRICE
  const selectedPriceObj =
    product.prices.find(
      (p) => p.label === selectedOptions.size
    );

  const basePrice =
    selectedPriceObj?.price || 0;

  const finalPrice =
    getDiscountedPrice(
      basePrice,
      product.discount
    );

  // FETCH STOCK
  useEffect(() => {

    // RESET STOCK IF OPTIONS NOT COMPLETE
    if (!allOptionsSelected) {
      setStock(null);
      return;
    }

    const fetchStock = async () => {

      try {

        // CLEAR OLD STOCK WHILE LOADING
        setStock(null);

        const res = await fetch(
          `${API_URL}/api/stock-check`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              productId: product.id,
              selectedOptions,
            }),
          }
        );

        const data = await res.json();

        console.log("STOCK RESPONSE:", data);

        setStock(data.stock);

      } catch (err) {

        console.error("STOCK FETCH ERROR:", err);

        setStock(0);

      }
    };

    fetchStock();

  }, [
    selectedOptions,
    allOptionsSelected,
    product.id
  ]);

  return (
    <div className="product-page">

      {/* IMAGE */}
      <img
        src={product.image}
        alt={product.name}
        className="product-image"
      />

      <div className="product-info">

        {/* TITLE */}
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

          <ReactMarkdown>
            {product.description}
          </ReactMarkdown>

        </div>

        {/* OPTIONS */}
        <div className="product-options">

          {/* SIZE */}
          <label>

            {t.product.size}:

            <select
              value={selectedOptions.size || ""}
              onChange={(e) =>
                setSelectedOptions((prev) => ({
                  ...prev,
                  size: e.target.value,
                }))
              }
            >

              <option value="">
                {t.product.select} {t.product.size}
              </option>

              {product.prices.map((p, index) => (
                <option
                  key={index}
                  value={p.label}
                >
                  {p.label}
                </option>
              ))}

            </select>

          </label>

          {/* OTHER OPTIONS */}
          {Object.entries(product.options || {}).map(
            ([type, values]) => (

              <label key={type}>

                {t.product[type] || type}:

                <select
                  value={selectedOptions[type] || ""}
                  onChange={(e) =>
                    setSelectedOptions((prev) => ({
                      ...prev,
                      [type]: e.target.value,
                    }))
                  }
                >

                  <option value="">
                    {t.product.select}{" "}
                    {t.product[type] || type}
                  </option>

                  {values.map((v, index) => (
                    <option
                      key={index}
                      value={v}
                    >
                      {v}
                    </option>
                  ))}

                </select>

              </label>
            )
          )}

        </div>

        {/* FINAL PRICE */}
        {allOptionsSelected && (
          <div className="price-box">

            {product.discount < 1 ? (
              <>
                <span className="price-old">
                  {basePrice} kr
                </span>

                <span className="price">
                  {finalPrice} kr
                </span>
              </>
            ) : (
              <span className="price">
                {basePrice} kr
              </span>
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
            onChange={(e) => {

              const value = Number(e.target.value);

              setQuantity(
                value > 0 ? value : 1
              );
            }}
          />

          <button
            className="add-to-cart"
            disabled={
              !allOptionsSelected ||
              stock === null ||
              stock < 3
            }
            onClick={() =>
              addToCart({
                id: product.id,
                name: product.name,
                price: finalPrice,
                selectedPrice: selectedPriceObj,
                options: selectedOptions,
                quantity,
                image: product.image,
              })
            }
          >

            {
              stock !== null && stock < 3
                  ? t.product.stock
                  : t.product.addToCart
            }

          </button>

        </div>

      </div>
    </div>
  );
}

export default CoffeeProduct;