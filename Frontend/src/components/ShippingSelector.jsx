import { API_URL } from "../config";
import "../css/ShippingSelector.css";

import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useCart } from "../context/CartContext";
import MapModal from "./MapModal";

export default function ShippingSelector({ onChange, postalCode }) {
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(true);

  const [pickupPoint, setPickupPoint] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);

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
        const res = await fetch(`${API_URL}/api/shipping/options`);
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

  const requiresPickupPoint = selectedMethod?.id === "shop";

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
      pickupPoint: selectedMethod.id === "shop" ? pickupPoint : null,
    });

    // If this method requires a pickup point, open the map automatically
    if (selectedMethod.id === "shop" && !pickupPoint) {
      setMapOpen(true);
    }
  }, [selectedProvider, selectedMethod, isOver1kg, pickupPoint]);

  const handlePickupConfirm = (point) => {
    setPickupPoint(point);
    setMapOpen(false);
  };

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
              setPickupPoint(null);
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
                onClick={() => {
                  setSelectedMethod(method);
                  if (method.id !== "shop") setPickupPoint(null);
                }}
              >
                <span className="method-name">{method.name}</span>
                <span className="method-price">{price} kr</span>
              </button>
            );
          })}
        </div>
      )}

      {/* PICKUP POINT DISPLAY — above the price summary */}
      {requiresPickupPoint && (
        <div className="checkout-pickup">
          {pickupPoint ? (
            <div className="checkout-pickup-selected">
              <strong>Pickup point:</strong> {pickupPoint.name},{" "}
              {pickupPoint.address}, {pickupPoint.postal_code}{" "}
              {pickupPoint.city}
              <button
                className="checkout-pickup-change"
                onClick={() => setMapOpen(true)}
              >
                Change
              </button>
            </div>
          ) : (
            <div className="checkout-pickup-warning-row">
              <p className="checkout-pickup-warning">
                ⚠ Please select a pickup point to continue.
              </p>
              <button
                className="checkout-pickup-open"
                onClick={() => setMapOpen(true)}
              >
                Select pickup point
              </button>
            </div>
          )}
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

      {/* MAP MODAL */}
      {mapOpen && (
        <MapModal
          provider={selectedProvider}
          method={selectedMethod}
          postalCode={postalCode}
          onConfirm={handlePickupConfirm}
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  );
}
