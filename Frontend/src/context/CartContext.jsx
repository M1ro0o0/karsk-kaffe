import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  // ======================
  // CART
  // ======================
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("cart");
    const savedTime = localStorage.getItem("cartTime");

    if (!saved || !savedTime) return [];

    const age = Date.now() - Number(savedTime);
    const DAY = 24 * 60 * 60 * 1000 * 3;

    // clear expired cart
    if (age > DAY) {
      localStorage.removeItem("cart");
      localStorage.removeItem("cartTime");
      return [];
    }

    return JSON.parse(saved);
  });

  // ======================
  // DISCOUNT (PRODUCTS ONLY)
  // ======================
  const [discount, setDiscount] = useState({
    code: "",
    percent: 0,
  });

  // ======================
  // SHIPPING (SET IN CHECKOUT)
  // ======================
  const [shippingPrice, setShippingPrice] = useState(0);

  // ======================
  // ORDER NOTE
  // ======================
  const [orderNote, setOrderNote] = useState("");

  // ======================
  // LOCAL STORAGE SYNC
  // ======================
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("cartTime", Date.now().toString());
  }, [cart]);

  // ======================
  // HELPERS
  // ======================
  const isSameOptions = (a = {}, b = {}) =>
    JSON.stringify(a) === JSON.stringify(b);

  // ======================
  // CART ACTIONS
  // ======================
  const addToCart = (newItem) => {
    setCart((prev) => {
      const index = prev.findIndex(
        (item) =>
          item.id === newItem.id &&
          isSameOptions(item.options, newItem.options),
      );

      const item = {
        ...newItem,
        price: Number(newItem.price) || 0,
        quantity: Number(newItem.quantity) || 1,
      };

      if (index !== -1) {
        return prev.map((p, i) =>
          i === index
            ? {
                ...p,
                quantity: (Number(p.quantity) || 0) + (item.quantity || 1),
              }
            : p,
        );
      }

      return [...prev, item];
    });
  };

  const PACKAGING_WEIGHT = 200;

  const getTotalWeight = () => {
    const productWeight = cart.reduce((total, item) => {
      const weight = item.selectedPrice?.weight ?? item.weight ?? 0;
      return total + weight * item.quantity;
    }, 0);

    return productWeight + PACKAGING_WEIGHT;
  };

  const isOver1kg = getTotalWeight() > 1000;

  const updateQuantity = (index, quantity) => {
    setCart((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              quantity: quantity > 0 ? quantity : 1,
            }
          : item,
      ),
    );
  };

  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    clearDiscount();
    setShippingPrice(0);
    setOrderNote("");
  };

  // ======================
  // DISCOUNT ACTIONS
  // ======================
  const applyDiscount = (code, percent) => {
    setDiscount({ code, percent });
  };

  const clearDiscount = () => {
    setDiscount({ code: "", percent: 0 });
  };

  // ======================
  // TOTALS (DERIVED)
  // ======================
  const productsTotal = cart.reduce(
    (sum, item) =>
      sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0,
  );

  const discountAmount = (productsTotal * discount.percent) / 100;

  const discountedProductsTotal = productsTotal - discountAmount;

  const finalTotal = discountedProductsTotal + shippingPrice;

  const totalItems = cart.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0,
  );

  // ======================
  // PROVIDER
  // ======================
  return (
    <CartContext.Provider
      value={{
        // cart
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getTotalWeight,
        isOver1kg,

        // shipping (checkout only)
        shippingPrice,
        setShippingPrice,

        // discount
        discount,
        applyDiscount,
        clearDiscount,

        // order note
        orderNote,
        setOrderNote,

        // totals
        productsTotal,
        discountAmount,
        discountedProductsTotal,
        finalTotal,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
