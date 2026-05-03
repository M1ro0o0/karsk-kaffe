import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem("cart");
    const savedTime = localStorage.getItem("cartTime");

    if (!saved || !savedTime) return [];

    const age = Date.now() - Number(savedTime);
    const DAY = 24 * 60 * 60 * 1000;

    if (age > DAY) {
      localStorage.removeItem("cart");
      localStorage.removeItem("cartTime");
      return [];
    }

    return JSON.parse(saved);
  });

  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
    localStorage.setItem("cartTime", Date.now().toString());
  }, [cart]);

  const addToCart = (newItem) => {
  setCart((prevCart) => {
    const existingIndex = prevCart.findIndex(
      (item) =>
        item.id === newItem.id &&
        isSameOptions(item.options, newItem.options)
    );

 const itemToAdd = {
  ...newItem,
  price: newItem.price,
  quantity: newItem.quantity ?? 1,
};

    if (existingIndex !== -1) {
      return prevCart.map((item, index) =>
        index === existingIndex
          ? { ...item, quantity: item.quantity + newItem.quantity }
          : item
      );
    }

    return [...prevCart, itemToAdd];
  });
};

  const updateQuantity = (index, quantity) => {
    setCart((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item)),
    );
  };

  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => setCart([]);

  const isSameOptions = (a = {}, b = {}) => {
  return JSON.stringify(a) === JSON.stringify(b);
};

const totalItems = cart.reduce(
  (sum, item) => sum + (Number(item.quantity) || 0),
  0
);

const totalPrice = cart.reduce((sum, item) => {
  const price = Number(item.price) || 0;
  const quantity = Number(item.quantity) || 0;
  return sum + price * quantity;
}, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
