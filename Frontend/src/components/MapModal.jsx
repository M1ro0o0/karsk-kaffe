import { API_URL } from "../config";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../css/Map.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const selectedIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [1, -40],
  shadowSize: [46, 46],
  className: "marker-selected",
});

// Re-centers the map whenever the given center coordinates change
function RecenterMap({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  return null;
}

export default function MapModal({ provider, method, postalCode: initialPostalCode, onConfirm, onClose }) {
  const [pickupPoints, setPickupPoints] = useState([]);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [postalCode, setPostalCode] = useState(initialPostalCode || "");
  const [searchedPostalCode, setSearchedPostalCode] = useState("");

  const defaultCenter = [55.6761, 12.5683];

  const fetchPickupPoints = async (zip) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        carrier: provider?.id || "",
        postal_code: zip,
      });

      const res = await fetch(`${API_URL}/api/shipping/pickup-points?${params}`);
      if (!res.ok) throw new Error("Failed to fetch pickup points");

      const data = await res.json();
      setPickupPoints(data);
      setSearchedPostalCode(zip);
    } catch (err) {
      console.error(err);
      setError("Could not load pickup points. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch if postal code is provided
  useEffect(() => {
    if (initialPostalCode?.length === 4) {
      fetchPickupPoints(initialPostalCode);
    }
  }, []);

  // Prevent background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (postalCode.length === 4) fetchPickupPoints(postalCode);
  };

  const handleConfirm = () => {
    if (selectedPoint) onConfirm(selectedPoint);
  };

  const mapCenter =
    pickupPoints.length > 0
      ? [pickupPoints[0].latitude, pickupPoints[0].longitude]
      : defaultCenter;

  return (
    <div className="map-modal-backdrop" onClick={onClose}>
      <div className="map-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="map-header">
          <h2>
            Select a pickup point
            {provider && <span className="map-provider-name"> — {provider.name}</span>}
          </h2>
          <button className="map-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Postal code search */}
        <form className="map-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Enter postal code (e.g. 2100)"
            value={postalCode}
            maxLength={4}
            onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
          />
          <button type="submit" disabled={postalCode.length !== 4}>
            Search
          </button>
        </form>

        {/* Map */}
        <div className="map-container">
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <RecenterMap center={mapCenter} />

            {pickupPoints.map((point) => (
              <Marker
                key={point.id}
                position={[point.latitude, point.longitude]}
                /*icon={selectedPoint?.id === point.id ? selectedIcon : undefined}*/
                eventHandlers={{ click: () => setSelectedPoint(point) }}
              >
                <Popup>
                  <strong>{point.name}</strong><br />
                  {point.address}<br />
                  {point.postal_code} {point.city}<br />
                  <button
                    className="map-select-btn"
                    onClick={() => setSelectedPoint(point)}
                  >
                    Select this point
                  </button>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Status */}
        {loading && <p className="map-status">Loading pickup points...</p>}
        {error && <p className="map-status map-error">{error}</p>}
        {!loading && !error && searchedPostalCode && pickupPoints.length === 0 && (
          <p className="map-status">No pickup points found for {searchedPostalCode}.</p>
        )}

        {/* Selected point + confirm */}
        <div className="map-footer">
          {selectedPoint ? (
            <div className="map-selected-summary">
              <div className="map-selected-info">
                <strong>{selectedPoint.name}</strong>
                <span>{selectedPoint.address}, {selectedPoint.postal_code} {selectedPoint.city}</span>
              </div>
              <button className="map-confirm-btn" onClick={handleConfirm}>
                Confirm
              </button>
            </div>
          ) : (
            <p className="map-footer-hint">Click a pin on the map to select a pickup point</p>
          )}
        </div>

      </div>
    </div>
  );
}
