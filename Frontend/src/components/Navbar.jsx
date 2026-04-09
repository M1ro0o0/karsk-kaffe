import "../css/Navbar.css";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useEffect, useState } from "react";
import { FaShoppingCart } from "react-icons/fa";
import { useLanguage } from "../context/LanguageContext";

function Navbar() {
  const { totalItems } = useCart();
  const { lang, setLang, t } = useLanguage();
  const [bounce, setBounce] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    if (totalItems > 0) {
      setBounce(true);
      const timer = setTimeout(() => setBounce(false), 300);
      return () => clearTimeout(timer);
    }
  }, [totalItems]);

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to="/" className="logo">
        <img src="/logos/karsk-kaffe-colour.svg" alt="Logo" />
      </Link>

      {/* Main links group */}
      <div className="nav-group main-links">
        <Link to="/">{t.navbar.home}</Link>
        <div 
          className="dropdown"
          onMouseEnter={() => setLangOpen(true)}
          onMouseLeave={() => setLangOpen(false)}
        >
          <div className="dropdown-trigger">
            {t.navbar.prod} <span className="arrow">▾</span>
          </div>
          <div className="dropdown-menu">
            <Link to="/category/coffee" className="dropdown-item">{t.navbar.coffee}</Link>
            <Link to="/category/gift" className="dropdown-item">{t.navbar.gift}</Link>
            <Link to="/category/discounted" className="dropdown-item">{t.navbar.discounted}</Link>
          </div>
        </div>
        <Link to="/about">{t.navbar.about}</Link>
      </div>

      {/* Right side: language + cart */}
      <div className="nav-group nav-right">
        <div 
          className="dropdown"
          onMouseEnter={() => setLangOpen(true)}
          onMouseLeave={() => setLangOpen(false)}
        >
          <button className="dropbtn">
            {lang.toUpperCase()} ▼
          </button>
          {langOpen && (
            <div className="dropdown-menu">
              <button onClick={() => setLang("en")}>EN</button>
              <button onClick={() => setLang("da")}>DA</button>
              <button onClick={() => setLang("sk")}>SK</button>
            </div>
          )}
        </div>

        <Link to="/cart" className={`cart-icon ${bounce ? "bounce" : ""}`}>
          <FaShoppingCart />
          {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
