import { Link } from "react-router-dom";
import "../css/ErrorPage.css";
import SpilledCoffeeIllustration from "../components/SpilledCoffeeIllustration";

function ErrorPage({
  code = "404",
  title = "Page not found",
  message = "The page you're looking for doesn't exist or may have been moved.",
}) {
  return (
    <div className="error-page">
      <div className="error-content">
        <SpilledCoffeeIllustration />

        <div className="error-code">{code}</div>

        <h1 className="error-title">{title}</h1>

        <p className="error-message">{message}</p>

        <div className="error-actions">
          <Link to="/" className="error-home-btn">
            Back to homepage
          </Link>

          <Link to="/contact" className="error-contact-link">
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ErrorPage;
