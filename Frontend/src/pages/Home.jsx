import "../css/Home.css";

import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import Popup from "../components/Popup";
import Banner from "../components/Banner";
import { useLanguage } from "../context/LanguageContext";

function Home() {
  const [products, setProducts] = useState([]);
  const { language } = useLanguage();

  useEffect(() => {
    fetch("https://karsk-kaffe.onrender.com/api/products")
      .then(res => res.json())
      .then(data => {
        const mapped = data.map(product => ({
          ...product,
          translation: product.translations?.[language] || product.translations?.en
        }));

        setProducts(mapped);
      });
  }, [language]);

  return (
    <div>
      <Popup />
      <Banner />

      <div className="products-container">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

export default Home;
