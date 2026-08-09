import { API_URL } from "../config";
import SEO from "../components/seo/SEO";

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

import CoffeeProduct from "../components/products/CoffeeProduct";
import SimpleProduct from "../components/products/SimpleProduct";
import BoxProduct from "../components/products/BoxProduct";
import RandomProducts from "../components/RandomProducts";
import ProductStructuredData from "../components/seo/ProductStructuredData";

const productComponents = {
  coffee: CoffeeProduct,
  simple: SimpleProduct,
  box: BoxProduct,
};

function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);

  const { lang, t } = useLanguage();

  useEffect(() => {
    fetch(`${API_URL}/api/products/${id}?lang=${lang}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
      });
  }, [id, lang]);

  console.log(product);

  if (!product)
    return <p style={{ textAlign: "center" }}>{t.product.loading}...</p>;

  const Component = productComponents[product.type] || SimpleProduct;

  return (
    <>
      <SEO
        title={`${product.name} – Karsk Kaffe`}
        description={product.description}
        canonical={`/product/${product.id}`}
        image={product.image}
      />

      <ProductStructuredData product={product} />

      <Component product={product} />

      <h2 style={{ textAlign: "center" }}>{t.product.like}</h2>

      <RandomProducts apiUrl={`${API_URL}/api/products/`} count={4} />
    </>
  );
}

export default ProductPage;
