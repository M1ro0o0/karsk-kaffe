import "../css/AddressForm.css"

import { useLanguage } from "../context/LanguageContext";
import postalCodes from "../data/postal-codes.json";

function AddressForm({ title, data, onChange, disabled = false }){
  const handleChange = (field, value) => {
  const updated = {
    ...data,
    [field]: value,
  };

  if (field === "postalCode") {
    // Only allow 4 digits
    const zip = value.replace(/\D/g, "").slice(0, 4);

    updated.postalCode = zip;
    updated.city = zip.length === 4
      ? (postalCodes[zip] || "")
      : "";
  }

  onChange(updated);
};

    const { t } = useLanguage();

    return (
    <div className="address-form">
      <h2>{t.address[title]}</h2>

<h5>{t.address.name}</h5>
      <div className="address-row">
        <input
          placeholder={t.address.firstName}
          value={data.firstName}
          disabled={disabled}
          onChange={e => handleChange("firstName", e.target.value)}
        />

        <input
          placeholder={t.address.lastName}
          value={data.lastName}
          disabled={disabled}
          onChange={e => handleChange("lastName", e.target.value)}
        />
      </div>

<h5>{t.address.contact}</h5>
      <input
        type="email"
        placeholder={t.address.email}
        value={data.email}
        disabled={disabled}
        onChange={e => handleChange("email", e.target.value)}
      />

      <div className="address-row">
        <input 
        className="small"
        placeholder={t.address.code}
        value={data.phoneCode}
        disabled={disabled}
        onChange={e => handleChange("phoneCode", e.target.value)} />

        <input
          placeholder={t.address.phone}
          value={data.phoneNumber}
          disabled={disabled}
          onChange={e => handleChange("phoneNumber", e.target.value)}
        />
      </div>

<h5>{t.address.address}</h5>
      <input
        placeholder={t.address.street}
        value={data.address}
        disabled={disabled}
        onChange={e => handleChange("address", e.target.value)}
      />

      <div className="address-row">
        <input
        className="small"
          placeholder={t.address.post}
          value={data.postalCode}
          disabled={disabled}
          onChange={e => handleChange("postalCode", e.target.value)}
        />

        <input
          placeholder={t.address.city}
          value={data.city}
          disabled={disabled}
          onChange={e => handleChange("city", e.target.value)}
        />
      </div>

      <input value={data.country} disabled className="locked" />
    </div>
  );
}

export default AddressForm;
