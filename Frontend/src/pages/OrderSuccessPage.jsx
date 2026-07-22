import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { API_URL } from "../config";
//import "../css/OrderSuccessPage.css";

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
    const maxAttempts = 6; // ~12 seconds of polling, webhook usually lands within a few seconds

    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/orders/${orderId}/status`);
        if (!res.ok) throw new Error("Order not found");
        const data = await res.json();

        if (data.status === "paid") {
          setStatus("paid");
          setOrder(data);
          clearCart(); // only clear once genuinely confirmed paid
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 2000); // retry every 2s while webhook may still be processing
        } else {
          setStatus("pending"); // webhook hasn't landed yet — reassure, don't alarm
        }
      } catch (err) {
        setStatus("error");
      }
    };

    checkStatus();
  }, [orderId, navigate, clearCart]);

  return (
    <div className="page order-success">
      {status === "checking" && <p>Confirming your payment...</p>}

      {status === "paid" && (
        <>
          <h1>Thank you for your order!</h1>
          <p>Hi {order.customerName}, your payment of {order.totalAmount} kr was successful.</p>
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