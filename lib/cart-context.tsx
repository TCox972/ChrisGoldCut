'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CartItem, Produit } from './data';

type CartContextType = {
  items: CartItem[];
  addItem: (produit: Produit) => void;
  removeItem: (produitId: string) => void;
  updateQuantite: (produitId: string, quantite: number) => void;
  totalItems: number;
  totalPrix: number;
  remise: number;
  totalFinal: number;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = 'goldcut.cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydratation depuis localStorage au montage (côté client uniquement)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // localStorage indisponible ou JSON corrompu → on ignore
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persistance dès qu'on a hydraté (évite d'écraser au premier render)
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // quota plein / mode privé : silencieux
    }
  }, [items, hydrated]);

  const addItem = (produit: Produit) => {
    setItems(prev => {
      const existing = prev.find(i => i.produitId === produit.id);
      if (existing) {
        return prev.map(i => i.produitId === produit.id ? { ...i, quantite: i.quantite + 1 } : i);
      }
      return [...prev, {
        produitId:   produit.id,
        nom:         produit.nom,
        description: produit.description,
        image:       produit.image,
        prix:        produit.prix,
        quantite:    1,
      }];
    });
  };

  const removeItem = (produitId: string) => {
    setItems(prev => prev.filter(i => i.produitId !== produitId));
  };

  const updateQuantite = (produitId: string, quantite: number) => {
    if (quantite <= 0) { removeItem(produitId); return; }
    setItems(prev => prev.map(i => i.produitId === produitId ? { ...i, quantite } : i));
  };

  const totalItems = items.reduce((s, i) => s + i.quantite, 0);
  const totalPrix  = items.reduce((s, i) => s + i.prix * i.quantite, 0);
  const remise     = totalItems >= 4 ? 10 : 0;
  const totalFinal = totalPrix - remise;

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantite, totalItems, totalPrix, remise, totalFinal, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
