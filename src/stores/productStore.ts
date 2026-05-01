import { create } from 'zustand';
import type { Product } from '@/types';

interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  searchQuery: string;
  selectedCategory: string | null;
  setProducts: (products: Product[]) => void;
  setSelectedProduct: (product: Product | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  selectedProduct: null,
  searchQuery: '',
  selectedCategory: null,
  setProducts: (products) => set({ products }),
  setSelectedProduct: (selectedProduct) => set({ selectedProduct }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
}));
