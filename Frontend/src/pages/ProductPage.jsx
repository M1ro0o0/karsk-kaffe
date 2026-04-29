import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

import CoffeeProduct from "../components/products/CoffeeProduct";
import SimpleProduct from "../components/products/SimpleProduct";
import BoxProduct from "../components/products/BoxProduct";
import RandomProducts from "../components/RandomProducts";

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
    fetch(`/api/products/${id}?lang=${lang}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
      });
  }, [id, lang]);

  //console.log(product.type);

  if (!product)
    return <p style={{ textAlign: "center" }}>{t.product.loading}...</p>;

  const Component = productComponents[product.type] || SimpleProduct;

  return (
    <>
      <Component product={product} />

      <h2 style={{ textAlign: "center" }}>{t.product.like}</h2>

      <RandomProducts apiUrl="/api/products/" count={4} />
    </>
  );
}

export default ProductPage;
