import { useEffect, useState } from "react";
import "./../css/WelcomePopup.css";

export default function WelcomePopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="welcome-overlay">
      <div className="welcome-popup">
        <button
          className="welcome-close"
          onClick={() => setShow(false)}
          aria-label="Close"
        >
          ×
        </button>

        <div className="chalk-decoration top-left">✦</div>
        <div className="chalk-decoration top-right">☕</div>

        <h2>
          <span>⚠</span> Advarsel / Warning <span>⚠</span>
        </h2>

        <div className="chalk-line" />

        <p className="danish-text">
          🛠️ Hjemmesiden er under opbygning,
          <br />
          så den virker ikke endnu.
        </p>

        <p className="english-text">
          🛠️ The website is under construction,
          <br />
          thus it is not working yet.
        </p>

        <div className="chalk-line bottom-line" />

        <div className="chalk-coffee">
          Karsk Kaffe
        </div>
      </div>
    </div>
  );
}