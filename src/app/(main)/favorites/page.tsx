'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { MOCK_PRODUCTS } from '@/lib/constants';
import ProductCard from '@/components/product/ProductCard';
import type { Product } from '@/types';

export default function FavoritesPage() {
  const favorites = (MOCK_PRODUCTS as Product[]).slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Heart className="w-5 h-5 text-brand-pink" />
        <h1 className="font-display font-bold text-xl text-gray-900">Meus Favoritos</h1>
        <span className="badge-pink">{favorites.length}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {favorites.map((product) => (
          <ProductCard key={product.id} product={product} style="card" />
        ))}
      </div>

      {favorites.length === 0 && (
        <div className="text-center py-20">
          <Heart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-display">Nenhum favorito ainda</p>
        </div>
      )}
    </div>
  );
}
