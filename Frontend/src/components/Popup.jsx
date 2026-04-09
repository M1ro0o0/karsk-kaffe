import { useEffect, useState } from "react";

export default function WelcomePopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div style={overlayStyle}>
      <div style={popupStyle}>
        <button onClick={() => setShow(false)}>X</button>
        <h2>⚠️Advarsel/Warning⚠️</h2>
        <p>🛠️Hjemmesiden er under opbygning, så den virker ikke endnu🛠️</p>
        <p>🛠️The website is under construction, thus it is not working yet🛠️</p>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  zIndex: 1000,
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const popupStyle = {
  background: "white",
  padding: "30px",
  borderRadius: "12px",
  textAlign: "center",
};