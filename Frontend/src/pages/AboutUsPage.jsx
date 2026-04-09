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
        <h1>{t.about.aboutUs}</h1>
        <p className="hero-sub">{t.about.hero}</p>
      </section>

      <div className="about-container">

        {/* OUR STORY */}
        <section className="about-section centered">
          <h2>{t.about.aboutKarsk}</h2>
          <p>{t.about.founded}</p>
          <p>{t.about.believe}</p>
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
            <h2>{t.about.rostaryPartner}</h2>
            <p>{t.about.rostaryPart1}</p>
            <p>{t.about.rostaryPart2}</p>
            <p>{t.about.rostaryPart3}</p>

            <div className="card-grid">
              <div className="info-card">{t.about.arabica}</div>
              <div className="info-card">{t.about.robusta}</div>
              <div className="info-card">{t.about.blends}</div>
            </div>

            <p>{t.about.afterWordsRoast}</p>
          </div>
        </section>

        {/* WHY NOT Eco */}
        <section className="about-section centered">
          <h2>{t.about.whyNoEco}</h2>
          <p>{t.about.farmers}</p>
          <p>{t.about.fees}</p>
          <p>{t.about.invest}</p>
          <p>{t.about.ourBelieve}</p>
        </section>

        {/* WHY DENMARK - VALUE CARDS */}
        <section className="about-section centered">
          <h2>{t.about.whyDK}</h2>
          <p>{t.about.DKDes}</p>

          <div className="card-grid">
            <div className="value-card">{t.about.transparent}</div>
            <div className="value-card">{t.about.fair}</div>
            <div className="value-card">{t.about.quality}</div>
            <div className="value-card">{t.about.rich}</div>
          </div>
        </section>

        {/* MISSION */}
        <section className="mission">
          <h2>{t.about.ourMission}</h2>
          <p>{t.about.mission}</p>
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
