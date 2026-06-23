function SpilledCoffeeIllustration() {
  return (
    <svg
      className="error-illustration"
      viewBox="0 0 680 360"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="340" cy="280" rx="160" ry="20" fill="#8F5445" opacity="0.15" />
      <path
        d="M180 270C180 270 220 290 280 288C340 286 380 268 420 272C460 276 480 290 500 282"
        fill="none"
        stroke="#8F5445"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M200 260C220 275 260 282 300 280C340 278 370 262 410 264C440 266 460 276 480 270"
        fill="#C7A9A2"
        opacity="0.6"
      />
      <g transform="translate(230,150) rotate(-18)">
        <path
          d="M0 60C0 80 20 95 50 95C80 95 100 80 100 60L95 20H5Z"
          fill="#8F5445"
        />
        <ellipse cx="50" cy="20" rx="48" ry="10" fill="#6e4536" />
        <path
          d="M100 35C115 35 125 45 125 57C125 69 115 79 100 79"
          fill="none"
          stroke="#8F5445"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
      <circle cx="150" cy="130" r="5" fill="#C7A9A2" />
      <circle cx="500" cy="150" r="4" fill="#8F5445" opacity="0.4" />
      <circle cx="470" cy="200" r="3" fill="#C7A9A2" />
      <circle cx="160" cy="190" r="3" fill="#8F5445" opacity="0.4" />
    </svg>
  );
}

export default SpilledCoffeeIllustration;
