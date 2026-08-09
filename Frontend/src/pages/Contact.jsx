import { API_URL } from "../config";
import "../css/Contact.css";

import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";

const CONTACT_TYPES = [
  { value: "general", label: "General question" },
  { value: "complaint", label: "Order problem / complaint" },
  { value: "wholesale", label: "Wholesale" },
  { value: "support", label: "Customer support" },
];

const MAX_IMAGES = 5;

function ContactPage() {
  const { lang } = useLanguage();

  const [form, setForm] = useState({
    name: "",
    email: "",
    type: "general",
    message: "",
    orderNumber: ""
  });

  const [images, setImages] = useState([]);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const showComplaintFields = form.type === "complaint";

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_IMAGES);
    setImages(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("type", form.type);
      formData.append("message", form.message);
      formData.append("lang", lang);
      if (form.orderNumber) formData.append("orderNumber", form.orderNumber);
      images.forEach((file) => formData.append("images", file));

      const res = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        body: formData
        // Don't set Content-Type manually — the browser sets the
        // multipart boundary automatically when body is FormData.
      });

      if (res.ok) {
        setStatus("success");
        setForm({ name: "", email: "", type: "general", message: "", orderNumber: "" });
        setImages([]);
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-container">
      <h1>Contact</h1>

      <p className="contact-direct-note">
        Prefer email? Reach us directly: <strong>info@karskkaffe.dk</strong> for general
        questions, <strong>return@karskkaffe.dk</strong> for order problems, or{" "}
        <strong>business@karskkaffe.dk</strong> for wholesale.
      </p>

      <form onSubmit={handleSubmit} className="contact-form">

        <fieldset className="contact-types">
          <legend>What is your message about?</legend>
          {CONTACT_TYPES.map(({ value, label }) => (
            <label key={value} className="contact-type-option">
              <input
                type="radio"
                name="type"
                value={value}
                checked={form.type === value}
                onChange={handleChange}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <input
          type="text"
          name="name"
          placeholder="Your name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Your email"
          value={form.email}
          onChange={handleChange}
          required
        />

        {showComplaintFields && (
          <div className="contact-complaint-fields">
            <input
              type="text"
              name="orderNumber"
              placeholder="Order / invoice number"
              value={form.orderNumber}
              onChange={handleChange}
            />

            <label className="contact-file-label">
              Photos of the damaged parcel (optional, up to {MAX_IMAGES})
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
              />
            </label>

            {images.length > 0 && (
              <p className="contact-file-count">{images.length} file(s) selected</p>
            )}
          </div>
        )}

        <textarea
          name="message"
          placeholder="Your message"
          value={form.message}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Send message"}
        </button>

        {status === "success" && <p>Message sent ✔</p>}
        {status === "error" && <p>Something went wrong ❌</p>}

      </form>
    </div>
  );
}

export default ContactPage;