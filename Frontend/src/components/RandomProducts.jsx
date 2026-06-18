import { API_URL } from "../config";
import "../css/RandomProducts.css";

import React, { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import ProductCard from "./ProductCard";

function RandomProducts({ apiUrl, count = 4, currentProductId = null }) {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        setProducts(data);

        // Select random products ONCE
        const shuffled = [...data].sort(() => 0.5 - Math.random());
        const selected = currentProductId
          ? shuffled.filter(p => p.id !== currentProductId).slice(0, count)
          : shuffled.slice(0, count);

        setSelectedProducts(selected);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [apiUrl, count, currentProductId]);

  if (loading) return <p>{t.product.loading}...</p>;

  return (
    <div className="random-products-container">
      {selectedProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default RandomProducts;