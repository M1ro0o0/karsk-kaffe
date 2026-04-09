import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ProductPage from "./pages/ProductPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import AboutUs from "./pages/AboutUsPage";
import CategoryPage from "./pages/CategoryPage";
import Contact from "./pages/Contact";
import LegalPage from "./pages/LegalPage";



function App() {
  return (
    <>
      <Navbar  />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs/>} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/category/:tag" element={<CategoryPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/legal" element={<LegalPage />} />

        </Routes>
      <Footer/>
    </>
  );
}

export default App;
