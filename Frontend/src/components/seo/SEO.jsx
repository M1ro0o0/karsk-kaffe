import { useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";

import markdownToPlainText from "../../utils/markdown-to-plain-text";

const SITE_URL = "https://karskkaffe.dk";

function SEO({ title, description, canonical, image }) {
  const { lang } = useLanguage();

  useEffect(() => {
    // Set document language
    document.documentElement.lang = lang;

    // Set page title
    if (title) {
      document.title = title;
    }

    // Set meta description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');

      if (!metaDescription) {
        metaDescription = document.createElement("meta");
        metaDescription.setAttribute("name", "description");
        document.head.appendChild(metaDescription);
      }

      metaDescription.setAttribute("content", markdownToPlainText(description));
    }

    // Set canonical URL
    if (canonical) {
      let canonicalTag = document.querySelector('link[rel="canonical"]');

      if (!canonicalTag) {
        canonicalTag = document.createElement("link");
        canonicalTag.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalTag);
      }

      const canonicalUrl = canonical.startsWith("http")
        ? canonical
        : `${SITE_URL}${canonical}`;

      canonicalTag.setAttribute("href", canonicalUrl);
    }

    // Set Open Graph title
    if (title) {
      let ogTitle = document.querySelector('meta[property="og:title"]');

      if (!ogTitle) {
        ogTitle = document.createElement("meta");
        ogTitle.setAttribute("property", "og:title");
        document.head.appendChild(ogTitle);
      }

      ogTitle.setAttribute("content", title);
    }

    // Set Open Graph description
    if (description) {
      let ogDescription = document.querySelector(
        'meta[property="og:description"]',
      );

      if (!ogDescription) {
        ogDescription = document.createElement("meta");
        ogDescription.setAttribute("property", "og:description");
        document.head.appendChild(ogDescription);
      }

      ogDescription.setAttribute("content", markdownToPlainText(description));
    }

    // Set Open Graph image
    if (image) {
      let ogImage = document.querySelector('meta[property="og:image"]');

      if (!ogImage) {
        ogImage = document.createElement("meta");
        ogImage.setAttribute("property", "og:image");
        document.head.appendChild(ogImage);
      }

      const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;

      ogImage.setAttribute("content", imageUrl);
    }
  }, [lang, title, description, canonical, image]);

  return null;
}

export default SEO;
