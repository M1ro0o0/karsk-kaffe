import { API_URL } from "../config";
import "../css/Home.css";
import SEO from "../components/seo/SEO";

import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import Popup from "../components/Popup";
import Banner from "../components/Banner";
import { useLanguage } from "../context/LanguageContext";

function Home() {
  const [products, setProducts] = useState([]);
  const { lang } = useLanguage();

  useEffect(() => {
    fetch(`${API_URL}/api/products?lang=${lang}`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          console.error("API error:", data);
          setProducts([]);
          return;
        }

        setProducts(data);
      })
      .catch((err) => console.error(err));
  }, [lang]);

  return (
    <div>
      <SEO
        title="Karsk Kaffe – Kaffe fra Slovakiet"
        description="Kvalitetskaffe fra Slovakiet til Danmark – friskristet kaffe og nøje udvalgte kaffebønner."
        canonical="/"
      />

      <Popup />
      <Banner />

      <div className="products-container">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

export default Home;
