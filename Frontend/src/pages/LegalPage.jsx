import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import ReactMarkdown from "react-markdown";
import "../css/LegalPage.css"; 

export default function LegalPage() {
const [searchParams] = useSearchParams();
const doc = searchParams.get("doc");

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const { lang } = useLanguage();

  useEffect(() => {
    if (!lang || !doc) return;

    setLoading(true);

    fetch(`/Legal/${lang}/${doc}.md`)
      .then((res) => {
        if (!res.ok) throw new Error("File not found");
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        // fallback to English
        fetch(`/Legal/en/${doc}.md`)
          .then((res) => res.text())
          .then((text) => {
            setContent(text);
            setLoading(false);
          })
          .catch(() => {
            setContent("# Document not found");
            setLoading(false);
          });
      });

  }, [doc, lang]);

  if (!doc) return <p>No document selected</p>;

  return (
    <div className="legal-container">
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ReactMarkdown>{content}</ReactMarkdown>
      )}
    </div>
  );
}