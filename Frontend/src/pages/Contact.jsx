import { API_URL } from "../config";
import "../css/Contact.css";

import React, { useState } from "react";

function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    type: "general",
    message: "",
    lang: "da"
  });

  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setStatus("success");
        setForm({ name: "", email: "", type: "general", message: "", lang: ""});
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <div className="contact-container">
      <h1>Contact</h1>

      <form onSubmit={handleSubmit} className="contact-form">

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

        <select
          name="type"
          value={form.type}
          onChange={handleChange}
        >
          <option value="general">General question</option>
          <option value="orders">Order problem</option>
          <option value="wholesale">Wholesale</option>
          <option value="support">Customer support</option>
        </select>

        <textarea
          name="message"
          placeholder="Your message"
          value={form.message}
          onChange={handleChange}
          required
        />

        <button type="submit">Send message</button>

        {status === "success" && <p>Message sent ✔</p>}
        {status === "error" && <p>Something went wrong ❌</p>}

      </form>
    </div>
  );
}

export default ContactPage;