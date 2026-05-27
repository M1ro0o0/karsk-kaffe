import { useEffect, useState } from "react";
import "../css/ShippingSelector.css";
import { useLanguage } from "../context/LanguageContext";

export default function ShippingSelector({
  cartTotal = 0,
  onChange,
}) {
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShipping = async () => {
      try {
        const res = await fetch("/api/shipping/options");
        const data = await res.json();
        setProviders(data);
      } catch (err) {
        console.error("Failed to load shipping options:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchShipping();
  }, []);

  useEffect(() => {
    const shippingPrice = selectedMethod?.price || 0;

    onChange?.({
      provider: selectedProvider,
      method: selectedMethod,
      shippingPrice,
      total: cartTotal + shippingPrice,
    });
  }, [selectedProvider, selectedMethod, cartTotal]);

  if (loading) return <div>Loading shipping options...</div>;

  return (
    <div className="shipping-selector">
      <h3 className="shipping-title">Delivery method</h3>

      {/* Providers */}
      <div className="shipping-providers">
        {providers.map((provider) => (
          <button
            key={provider.id}
            className={`provider-btn ${
              selectedProvider?.id === provider.id ? "active" : ""
            }`}
            onClick={() => {
              setSelectedProvider(provider);
              setSelectedMethod(null);
            }}
          >
            {provider.name}
          </button>
        ))}
      </div>

      {/* Methods */}
      {selectedProvider && (
        <div className="shipping-methods">
          {selectedProvider.methods.map((method) => (
            <button
              key={method.id}
              className={`method-btn ${
                selectedMethod?.id === method.id ? "active" : ""
              }`}
              onClick={() => setSelectedMethod(method)}
            >
              {method.name} — {method.price} kr
            </button>
          ))}
        </div>
      )}

      {/* Summary */}
      {selectedMethod && (
        <div className="shipping-summary">
          <strong>Shipping:</strong> {selectedMethod.price} kr
          <br />
          <strong>Total:</strong> {cartTotal + selectedMethod.price} kr
        </div>
      )}
    </div>
  );
}