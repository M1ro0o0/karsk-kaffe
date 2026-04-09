export function getDiscountedPrice(price, discount = 1) {
  return Math.round(price * discount);
}

export function getDiscountPercent(discount = 1) {
  return Math.round((1 - discount) * 100);
}

export function getVATAmount(price, VATAmount = 0.25)
{
    return Math.round(price * VATAmount);
}
