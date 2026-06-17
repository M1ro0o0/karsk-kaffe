import { useEffect, useState } from "react";
import "../css/ShippingSelector.css";
import { useLanguage } from "../context/LanguageContext";
import { useCart } from "../context/CartContext";

export default function ShippingSelector({ onChange, onPickupRequired }) {
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(true);

  const { isOver1kg } = useCart();

  const logoModules = import.meta.glob("../assets/shipping/*.png", {
    eager: true,
  });

  const providerLogos = {};
  Object.entries(logoModules).forEach(([path, module]) => {
    const fileName = path.split("/").pop().split(".")[0];
    providerLogos[fileName] = module.default;
  });

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
    if (!selectedMethod) return;

    // Resolve correct numeric price based on weight
    const rawPrice = isOver1kg
      ? selectedMethod.price.over1kg
      : selectedMethod.price.under1kg;

    const numericPrice = Number(rawPrice) || 0;

    onChange?.({
      provider: selectedProvider,
      method: selectedMethod,
      shippingPrice: numericPrice,
    });

    // If this method requires a pickup point, notify parent to open map
    if (selectedMethod.id === "shop")  {
      onPickupRequired?.({
        provider: selectedProvider,
        method: selectedMethod,
      });
    }
  }, [selectedProvider, selectedMethod, isOver1kg]);

  if (loading) return <div>Loading shipping options...</div>;

  return (
    <div className="shipping-selector">
      <h2 className="shipping-title">Delivery method</h2>

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
            <img
              src={providerLogos[provider.id]}
              alt={provider.name}
              className="provider-logo"
            />
          </button>
        ))}
      </div>

      {/* Methods */}
      {selectedProvider && (
        <div className="shipping-methods">
          {selectedProvider.methods.map((method) => {
            const price = isOver1kg
              ? method.price.over1kg
              : method.price.under1kg;

            return (
              <button
                key={method.id}
                className={`method-btn ${
                  selectedMethod?.id === method.id ? "active" : ""
                }`}
                onClick={() => setSelectedMethod(method)}
              >
                <span className="method-name">{method.name}</span>
                <span className="method-price">{price} kr</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {selectedMethod && (
        <div className="shipping-summary">
          <strong>Shipping:</strong>{" "}
          {isOver1kg
            ? selectedMethod.price.over1kg
            : selectedMethod.price.under1kg}{" "}
          kr
        </div>
      )}
    </div>
  );
}
