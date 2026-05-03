import "../css/Footer.css";

import React from "react";
import { useLanguage } from "../context/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="footer">
      <div className="container">
        <div className="rights">
          <img src="/logos/karsk-kaffe-colour.svg" alt="Logo" />
          <p>
            © {new Date().getFullYear()} {t.footer.rights}
          </p>
        </div>

        <div className="links">
            <a href="/legal?doc=Terms">Terms & Conditions</a>
          <a href="/legal?doc=Privacy">Privacy Policy</a>
          <a href="/legal?doc=Shipping">Shipping Policy</a>
          <a href="/legal?doc=Cookies">Cookies Policy</a>
          
          <a href="/contact">Contact</a>
        </div>

        <div>
          <h5>Karsk Kaffe</h5>
          <h6>CVR: 46 27 60 43</h6>
          <p>Ellegårdvej 18, 6400 Sønderborg</p>
          <p>+45 32 33 11 88</p>
          <p>info@karskkaffe.dk</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
