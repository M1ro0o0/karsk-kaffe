function markdownToPlainText(markdown = "") {
  return markdown
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ProductStructuredData({ product }) {
  if (!product) return null;

  const prices = product.prices || [];

  const numericPrices = prices
    .map((item) => Number(item.price))
    .filter((price) => Number.isFinite(price));

  const lowestPrice = Math.min(...numericPrices);
  const highestPrice = Math.max(...numericPrices);

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",

    name: product.name,

    description: markdownToPlainText(product.description),

    image: product.image
      ? [`https://karskkaffe.dk${product.image}`]
      : undefined,

    brand: {
      "@type": "Brand",
      name: "Karsk Kaffe",
    },

    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "DKK",
      lowPrice: lowestPrice,
      highPrice: highestPrice,
      offerCount: prices.length,
      availability: "https://schema.org/InStock",
      url: `https://karskkaffe.dk/product/${product.id}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema),
      }}
    />
  );
}

export default ProductStructuredData;