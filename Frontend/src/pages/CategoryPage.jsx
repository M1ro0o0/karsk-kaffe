import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useLanguage } from "../context/LanguageContext";
import "../css/CategoryPage.css";

function CategoryPage() {
  const { tag } = useParams();
  const { t } = useLanguage();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://karsk-kaffe.onrender.com/api/products`) 
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredProducts = products.filter((product) =>
    product.tags?.some(
      (item) => item.toLowerCase() === tag.toLowerCase()
    )
  );

  if (loading) return <p className="loading">{t.product.loading}...</p>;

  return (
    <div className="category-page">
      <h1 className="category-title">
        {tag.charAt(0).toUpperCase() + tag.slice(1)}
      </h1>

      <div className="category-grid">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        ) : (
          <p>No products found.</p>
        )}
      </div>
    </div>
  );
}

export default CategoryPage;
