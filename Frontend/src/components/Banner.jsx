import "../css/Banner.css";

import { useEffect, useState } from "react";

const imageModules = import.meta.glob("../assets/Banner/*.{png,jpg,jpeg}", {
  eager: true,
  import: "default",
});

const images = Object.values(imageModules);

function Banner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!images.length) return;

    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  if (!images.length) return null;

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
    </div>
  );
}

export default Banner;