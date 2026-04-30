import "../css/AboutUsPage.css";
import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { Link } from "react-router-dom";

function About() {
  const { t } = useLanguage();

  return (
    <div className="about">

      {/* HERO */}
      <section className="about-hero">
        <p className="hero-sub">{t.about.slogan}</p>
      </section>

      <div className="about-container">

        {/* OUR STORY */}
        <section className="about-section centered">
          <h2>{t.about.subtitle1}</h2>
          <p>{t.about.text11}</p>
          <p>{t.about.text12}</p>
        </section>

        {/* ROASTERY - 2 COLUMN */}
        <section className="about-section about-roastery">
          {/* Left Images */}
          <div className="about-images">
            <img src="/images/Roastery.jpg" alt="Roastery" className="roastery" />
            
            <div className="detva-container">
              <img src="/images/Detva.jpg" alt="Detva Panorama" className="detva" />
              <img src="/images/Folk.jpg" alt="Detva Folk" className="folk-overlay" />
            </div>
          </div>

          {/* Right Text */}
          <div className="about-text">
            <h2>{t.about.subtitle2}</h2>
            <p>{t.about.text21}</p>
            <p>{t.about.text22}</p>
            <p>{t.about.text23}</p>

            <h3>{t.about.subtitle3}</h3>
            <div className="card-grid">
              <div className="info-card">{t.about.text31}</div>
              <div className="info-card">{t.about.text32}</div>
              <div className="info-card">{t.about.text33}</div>
            </div>

            <p>{t.about.text34}</p>
          </div>
        </section>

        {/*FREISNA KAVA*/}
        <section className="about-section about-roastery">
          {/* Left Images */}
          <div className="about-images">
            <img src="/images/Frisna.jpg" alt="Frisna Kava Team" className="roastery" />
            <img src="/images/Master.jpg" alt="Rasting Master" className="roastery" />
            <img src="/images/Colombia.jpg" alt="Colombia" className="roastery" />
          </div>

          {/* Right Text */}
          <div className="about-text">
            <h2>{t.about.subtitle4}</h2>
            <p>{t.about.text41}</p>
            <p>{t.about.text42}</p>
            <p>{t.about.text43}</p>
            <p>{t.about.text44}</p>
            <p>{t.about.text45}</p>
            <p>{t.about.text46}</p>
          </div>

        </section>

        {/* WHY NOT Eco */}
        <section className="about-section centered">
          <h2>{t.about.subtitle5}</h2>
          <p>{t.about.text51}</p>
          <p>{t.about.text52}</p>
          <p>{t.about.text53}</p>
          <p>{t.about.text54}</p>
        </section>

        {/* WHY DENMARK - VALUE CARDS */}
        <section className="about-section centered">
          <h2>{t.about.subtitle6}</h2>
          <p>{t.about.text61}</p>
        </section>

        {/* MISSION */}
        <section className="mission">
          <h2>{t.about.subtitle7}</h2>
          <p>{t.about.text71}</p>
        </section>

        {/* CTA */}
        <section className="about-section centered">
          <h2>{t.about.contact}</h2>
          <p>{t.about.contText}</p>
          <Link to="/contact" className="cta-button">
            {t.about.contact}
          </Link>
        </section>

      </div>
    </div>
  );
}

export default About;
