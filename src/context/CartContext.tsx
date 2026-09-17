import React, { createContext, useContext, useReducer } from 'react';
import { trackAddToCart, trackRemoveFromCart } from '../api/analytics';

export interface CartItem {
  id: string;         // productId + spec (unique key)
  productId: string;
  productName: string;
  spec: string;
  qty: number;
  checked: boolean;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'checked'> }
  | { type: 'UPDATE_QTY'; id: string; qty: number }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'TOGGLE_CHECK'; id: string }
  | { type: 'TOGGLE_ALL' }
  | { type: 'CLEAR_CHECKED' };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.id === action.payload.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.id === action.payload.id ? { ...i, qty: i.qty + action.payload.qty } : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, checked: true }],
      };
    }
    case 'UPDATE_QTY':
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.id ? { ...i, qty: Math.max(1, action.qty) } : i
        ),
      };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.id) };
    case 'TOGGLE_CHECK':
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.id ? { ...i, checked: !i.checked } : i
        ),
      };
    case 'TOGGLE_ALL': {
      const allChecked = state.items.length > 0 && state.items.every(i => i.checked);
      return {
        ...state,
        items: state.items.map(i => ({ ...i, checked: !allChecked })),
      };
    }
    case 'CLEAR_CHECKED':
      return { ...state, items: state.items.filter(i => !i.checked) };
    default:
      return state;
  }
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'checked'>) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  toggleCheck: (id: string) => void;
  toggleAll: () => void;
  clearChecked: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  const addItem = (item: Omit<CartItem, 'checked'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
    trackAddToCart({
      item_id: item.id,
      item_name: item.productName,
      item_variant: item.spec,
      quantity: item.qty,
    });
  };
  const updateQty = (id: string, qty: number) =>
    dispatch({ type: 'UPDATE_QTY', id, qty });
  const removeItem = (id: string) => {
    const removed = state.items.find(i => i.id === id);
    dispatch({ type: 'REMOVE_ITEM', id });
    if (removed) {
      trackRemoveFromCart({
        item_id: removed.id,
        item_name: removed.productName,
        item_variant: removed.spec,
        quantity: removed.qty,
      });
    }
  };
  const toggleCheck = (id: string) =>
    dispatch({ type: 'TOGGLE_CHECK', id });
  const toggleAll = () =>
    dispatch({ type: 'TOGGLE_ALL' });
  const clearChecked = () =>
    dispatch({ type: 'CLEAR_CHECKED' });

  return (
    <CartContext.Provider
      value={{ items: state.items, addItem, updateQty, removeItem, toggleCheck, toggleAll, clearChecked }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
