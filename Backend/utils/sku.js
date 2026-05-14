function buildSku(
  productId,
  selectedOptions = {},
  optionsFromDb = []
) {

  const getCode = (type, value) => {

    if (!value) {
      throw new Error(
        `Missing selected option value for ${type}`
      );
    }

    const match = optionsFromDb.find(
      (opt) =>
        opt.type &&
        opt.value &&
        opt.code &&
        opt.type
          .trim()
          .toLowerCase() ===
          type.trim().toLowerCase() &&
        opt.value
          .trim()
          .toLowerCase() ===
          value.trim().toLowerCase()
    );

    if (!match) {
      throw new Error(
        `No matching option for ${type}: ${value}`
      );
    }

    return match.code;
  };

  // WEIGHT
  const weight =
    selectedOptions.size;

  if (!weight) {
    throw new Error(
      "Missing product size"
    );
  }

  // OPTION CODES
  const roast = getCode(
    "roast",
    selectedOptions.roast
  );

  const grind = getCode(
    "grind",
    selectedOptions.grind
  );

  // FINAL SKU
  return `${productId}-${weight}-${roast}:${grind}`;
}

module.exports = {
  buildSku
};