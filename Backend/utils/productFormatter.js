function formatOptions(optionsArray) {

  const grouped = {};

  (optionsArray || []).forEach(
    (opt) => {

      if (
        !grouped[opt.type]
      ) {
        grouped[opt.type] = [];
      }

      grouped[opt.type].push(
        opt.value
      );
    }
  );

  return grouped;
}

function formatProduct(
  product,
  lang = "en"
) {

  const translations =
    product.ProductTranslation || [];

  const translation =
    translations.find(
      (t) =>
        t.language === lang
    );

  const selections =
    product.ProductContent || [];

  const selection =
    selections.find(
      (t) =>
        t.language === lang
    ) || selections[0];

  return {
    id: product.id,
    type: product.type,
    image: product.image,
    discount:
      product.baseDiscount,
    prices:
      product.ProductPrices || [],
    weight:
      product.ProductPrices.weight || 0,
    name:
      translation?.name,
    description:
      translation?.description,
    items:
      selection?.items
        ?.products || [],
    options: formatOptions(
      product.ProductOptions || []
    )
  };
}

function formatProductCard(
  product,
  lang = "en"
) {

  const translations =
    product.ProductTranslation || [];

  const translation =
    translations.find(
      (t) =>
        t.language === lang
    );

  return {
    id: product.id,
    image: product.image,
    discount:
      product.baseDiscount,
    name:
      translation?.name ||
      "No name",
    price:
      product.ProductPrices?.[0]
        ?.price || 0,
    isMultiprice:
      (
        product.ProductPrices
          ?.length || 0
      ) > 1
  };
}

module.exports = {
  formatOptions,
  formatProduct,
  formatProductCard
};