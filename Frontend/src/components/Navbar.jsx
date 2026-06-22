import "../css/Navbar.css";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useEffect, useState } from "react";
import { FaShoppingCart, FaBars, FaTimes } from "react-icons/fa";
import { useLanguage } from "../context/LanguageContext";

function Navbar() {
  const { totalItems } = useCart();
  const { lang, setLang, t } = useLanguage();
  const [bounce, setBounce] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // Mobile menu state
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mobileLangOpen, setMobileLangOpen] = useState(false);

  useEffect(() => {
    if (totalItems > 0) {
      setBounce(true);
      const timer = setTimeout(() => setBounce(false), 300);
      return () => clearTimeout(timer);
    }
  }, [totalItems]);

  // Close mobile menu whenever a link is tapped
  const closeMobileMenu = () => {
    setMobileOpen(false);
    setMobileProductsOpen(false);
    setMobileLangOpen(false);
  };

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to="/" className="logo" onClick={closeMobileMenu}>
        <img src="/logos/karsk-kaffe-colour.svg" alt="Logo" />
      </Link>

      {/* Main links group (desktop) */}
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

      {/* Right side: language + cart (desktop) */}
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
              <button onClick={() => setLang("da")}>DA</button>
              <button onClick={() => setLang("en")}>EN</button>
              <button onClick={() => setLang("sk")}>SK</button>
              <button onClick={() => setLang("pl")}>PL</button>
            </div>
          )}
        </div>

        <Link to="/cart" className={`cart-icon ${bounce ? "bounce" : ""}`}>
          <FaShoppingCart />
          {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
        </Link>
      </div>

      {/* Mobile-only controls: cart + hamburger */}
      <div className="nav-mobile-controls">
        <Link to="/cart" className={`cart-icon ${bounce ? "bounce" : ""}`} onClick={closeMobileMenu}>
          <FaShoppingCart />
          {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
        </Link>

        <button
          className="hamburger-btn"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {/* Mobile slide-down menu */}
      {mobileOpen && (
        <div className="mobile-menu">
          <Link to="/" className="mobile-link" onClick={closeMobileMenu}>
            {t.navbar.home}
          </Link>

          <button
            className="mobile-link mobile-dropdown-trigger"
            onClick={() => setMobileProductsOpen((prev) => !prev)}
          >
            {t.navbar.prod} <span className="arrow">{mobileProductsOpen ? "▴" : "▾"}</span>
          </button>

          {mobileProductsOpen && (
            <div className="mobile-submenu">
              <Link to="/category/coffee" className="mobile-link" onClick={closeMobileMenu}>
                {t.navbar.coffee}
              </Link>
              <Link to="/category/gift" className="mobile-link" onClick={closeMobileMenu}>
                {t.navbar.gift}
              </Link>
              <Link to="/category/discounted" className="mobile-link" onClick={closeMobileMenu}>
                {t.navbar.discounted}
              </Link>
            </div>
          )}

          <Link to="/about" className="mobile-link" onClick={closeMobileMenu}>
            {t.navbar.about}
          </Link>

          <button
            className="mobile-link mobile-dropdown-trigger"
            onClick={() => setMobileLangOpen((prev) => !prev)}
          >
            {lang.toUpperCase()} <span className="arrow">{mobileLangOpen ? "▴" : "▾"}</span>
          </button>

          {mobileLangOpen && (
            <div className="mobile-submenu">
              <button onClick={() => { setLang("da"); closeMobileMenu(); }}>DA</button>
              <button onClick={() => { setLang("en"); closeMobileMenu(); }}>EN</button>
              <button onClick={() => { setLang("sk"); closeMobileMenu(); }}>SK</button>
              <button onClick={() => { setLang("pl"); closeMobileMenu(); }}>PL</button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
