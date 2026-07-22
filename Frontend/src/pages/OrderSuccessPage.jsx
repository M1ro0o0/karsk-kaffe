import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { API_URL } from "../config";
import "../css/OrderSuccessPage.css";

const STATUS_STEPS = ["paid", "packaged", "shipped", "delivered"];

const STATUS_LABELS = {
  paid: "Payment confirmed",
  packaged: "Order packaged",
  shipped: "Shipped",
  delivered: "Delivered",
};

function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const [status, setStatus] = useState("checking"); // checking | paid | pending | error
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!orderId) {
      navigate("/");
      return;
    }

    let attempts = 0;
    const maxAttempts = 6;

    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/orders/${orderId}/status`);
        if (!res.ok) throw new Error("Order not found");
        const data = await res.json();

        if (STATUS_STEPS.includes(data.status)) {
          setStatus("paid"); // "paid" here just means "confirmed, ready to display" — actual step shown below
          setOrder(data);
          clearCart();
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 2000);
        } else {
          setStatus("pending");
        }
      } catch (err) {
        setStatus("error");
      }
    };

    checkStatus();
  }, [orderId, navigate, clearCart]);

  const currentStepIndex = order ? STATUS_STEPS.indexOf(order.status) : -1;

  return (
    <div className="page order-success">
      {status === "checking" && <p>Confirming your payment...</p>}

      {status === "paid" && order && (
        <>
          <h1>Thank you for your order!</h1>
          <p className="order-number">Order #{order.id}</p>
          <p>Hi {order.customerName}, your payment of {order.totalAmount} kr was successful.</p>

          <div className="order-status-tracker">
            {STATUS_STEPS.map((step, index) => (
              <div
                key={step}
                className={`status-step ${index <= currentStepIndex ? "active" : ""}`}
              >
                <span className="status-dot" />
                <span className="status-label">{STATUS_LABELS[step]}</span>
              </div>
            ))}
          </div>

          {order.cartItems && order.cartItems.length > 0 && (
  <div className="order-overview">
    <h2>Order summary</h2>
    {order.cartItems.map((item) => (
      <div key={item.id + JSON.stringify(item.options)} className="order-overview-item">
        <img src={item.image} alt={item.name} />
        <div>
          <strong>{item.name}</strong>
          <p>
            {Object.entries(item.options || {}).map(([key, value]) => (
              <span key={key}>
                <strong>{key}:</strong> {value}{" "}
              </span>
            ))}
          </p>
          <p>
            {item.quantity} × {item.selectedPrice?.price ?? item.price} kr
          </p>
        </div>
      </div>
    ))}

    {order.discountCode && (
      <p className="order-overview-discount">Discount applied: {order.discountCode}</p>
    )}

    <p className="order-overview-shipping">Shipping: {order.shippingCost} kr</p>

    <h3 className="order-overview-total">Total: {order.totalAmount} kr</h3>
  </div>
)}

          {order.trackingURL && (
            <p>
              <a href={order.trackingURL} target="_blank" rel="noreferrer">
                Track your delivery
              </a>
            </p>
          )}

          <p>A confirmation email with your invoice is on its way.</p>
        </>
      )}

      {status === "pending" && (
        <>
          <h1>Payment received!</h1>
          <p>We're just finalizing your order confirmation — you'll receive an email shortly.</p>
        </>
      )}

      {status === "error" && (
        <>
          <h1>Something went wrong</h1>
          <p>We couldn't confirm your order. Please contact us if you were charged.</p>
        </>
      )}
    </div>
  );
}

export default OrderSuccessPage;