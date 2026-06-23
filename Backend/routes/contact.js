const express = require("express");
const nodemailer = require("nodemailer");

module.exports = () => {

  const router = express.Router();

  /*--------------------
      TRANSPORTER
  --------------------*/

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS, not SSL — required for port 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });

  const NOREPLY_ADDRESS = "NOREPLY@karskkaffe.dk";

  const TYPE_LABELS = {
    general: "General question",
    orders: "Order problem",
    wholesale: "Wholesale",
    support: "Customer support",
  };

  // Which inbox each contact type should be delivered to
  const TYPE_RECIPIENTS = {
    general: "Info@karskkaffe.dk",
    orders: "return@karskkaffe.dk",
    wholesale: "business@karskkaffe.dk",
    support: "Info@karskkaffe.dk",
  };

  // Confirmation email content per language
  const CONFIRMATION_TEXT = {
    da: {
      subject: "Vi har modtaget din besked — Karsk Kaffe",
      heading: (name) => `Tak for din besked, ${name}!`,
      body: "Vi har modtaget din besked og vender tilbage hurtigst muligt.",
      yourMessage: "Din besked:",
    },
    en: {
      subject: "We received your message — Karsk Kaffe",
      heading: (name) => `Thanks for reaching out, ${name}!`,
      body: "We've received your message and will get back to you as soon as possible.",
      yourMessage: "Your message:",
    },
    sk: {
      subject: "Dostali sme vašu správu — Karsk Kaffe",
      heading: (name) => `Ďakujeme za vašu správu, ${name}!`,
      body: "Vašu správu sme dostali a čo najskôr sa vám ozveme.",
      yourMessage: "Vaša správa:",
    },
    pl: {
      subject: "Otrzymaliśmy Twoją wiadomość — Karsk Kaffe",
      heading: (name) => `Dziękujemy za kontakt, ${name}!`,
      body: "Otrzymaliśmy Twoją wiadomość i odpowiemy tak szybko, jak to możliwe.",
      yourMessage: "Twoja wiadomość:",
    },
  };

  /*--------------------
      SEND CONTACT MESSAGE
  --------------------*/

  router.post("/", async (req, res) => {

    const { name, email, type, message, lang } = req.body;

    // Basic validation
    if (!name || !email || !message) {
      return res.status(400).json({
        error: "Name, email, and message are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email address",
      });
    }

    const typeLabel = TYPE_LABELS[type] || "General question";
    const recipient = TYPE_RECIPIENTS[type] || TYPE_RECIPIENTS.general;

    // Default to English if lang is missing/unsupported
    const t = CONFIRMATION_TEXT[lang] || CONFIRMATION_TEXT.en;

    try {

      // 1) Notification email TO THE RELEVANT INBOX
      await transporter.sendMail({
        from: `"Karsk Kaffe Website" <info@karskkaffe.dk>`,
        to: recipient,
        replyTo: email,
        subject: `[${typeLabel}] New message from ${name}`,
        html: `
          <h2>New contact form submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Type:</strong> ${typeLabel}</p>
          <p><strong>Language:</strong> ${lang || "en"}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        `,
      });

      // 2) Confirmation email TO THE CUSTOMER (in their selected language)
      await transporter.sendMail({
        from: `"Karsk Kaffe" <${NOREPLY_ADDRESS}>`,
        to: email,
        subject: t.subject,
        html: `
          <h2>${t.heading(name)}</h2>
          <p>${t.body}</p>
          <p><strong>${t.yourMessage}</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        `,
      });

      return res.json({ success: true });

    } catch (err) {

      console.error("CONTACT EMAIL ERROR:", err);

      return res.status(500).json({
        error: "Failed to send message. Please try again later.",
      });
    }
  });

  return router;
};