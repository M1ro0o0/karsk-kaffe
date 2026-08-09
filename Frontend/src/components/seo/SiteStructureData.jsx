function SiteStructuredData() {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Karsk Kaffe",
      url: "https://karskkaffe.dk/",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Karsk Kaffe",
      url: "https://karskkaffe.dk/",
      logo: "https://karskkaffe.dk/logos/karsk-kaffe-colour.png",
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

export default SiteStructuredData;