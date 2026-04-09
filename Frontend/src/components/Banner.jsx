import "../css/Banner.css";

import { useEffect, useState } from "react";

import banner1 from "../assets/Banner1.png";
import banner2 from "../assets/Banner2.png";
import banner3 from "../assets/Banner3.png";

const images = [banner1, banner2, banner3];

function Banner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 6000); // change every 6 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="banner">
      {images.map((image, index) => (
  <img
    key={index}
    src={image}
    className={index === current ? "active" : ""}
    alt="banner"
  />
))}
      <div className="banner-overlay">
        <h1>Premium Coffee</h1>
        <p>From small farmers to your cup</p>
      </div>
    </div>
  );
}

export default Banner;