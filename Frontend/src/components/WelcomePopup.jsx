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

        <p className="english-text">
          Website is undergoing E2E testing
          <br />
          It's still not fully operational
          <br />
          !!PLEASE DO NOT MAKE ORDERS YET!!
        </p>

        <div className="chalk-line bottom-line" />

        <div className="chalk-coffee">Karsk Kaffe</div>
      </div>
    </div>
  );
}
