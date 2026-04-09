import { createContext, useContext, useState } from "react";
import en from "../i18n/en";
import da from "../i18n/da";
import sk from "../i18n/sk";

const languages = {
  en,
  da,
  sk,
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("da");

  const t = languages[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
