import "../css/Home.css";

import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import Popup from "../components/Popup";
import Banner from "../components/Banner";

function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("https://karsk-kaffe.onrender.com/api/products")
      .then(res => res.json())
      .then(data => setProducts(data));
  }, []);

  return (
     <div>

<Popup/>
<Banner/>

      <div className="products-container">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

export default Home;
