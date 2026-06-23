import { Component } from "react";
import ErrorPage from "../pages/ErrorPage";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught a crash:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          code="500"
          title="Something went wrong"
          message="An unexpected error occurred. Please try refreshing the page or come back later."
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
