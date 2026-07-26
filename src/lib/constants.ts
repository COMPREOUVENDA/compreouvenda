import type { Category } from '@/types';

export const PLATFORM_FEE_PERCENT = 10;
export const DEFAULT_NEGOTIATION_RADIUS_KM = 30;

export const PHOTO_LABELS = [
  'Frente',
  'Lado Esquerdo',
  'Lado Direito',
  'Traseira',
  'Detalhe 1',
  'Detalhe 2',
  'Contexto',
  'Complementar',
];

export const CATEGORIES: Category[] = [
  { id: '1', name: 'Eletrônicos', icon: '📱', slug: 'eletronicos' },
  { id: '2', name: 'Móveis', icon: '🛋️', slug: 'moveis' },
  { id: '3', name: 'Veículos', icon: '🚗', slug: 'veiculos' },
  { id: '4', name: 'Roupas', icon: '👕', slug: 'roupas' },
  { id: '5', name: 'Esportes', icon: '⚽', slug: 'esportes' },
  { id: '6', name: 'Casa', icon: '🏠', slug: 'casa' },
  { id: '7', name: 'Brinquedos', icon: '🧸', slug: 'brinquedos' },
  { id: '8', name: 'Livros', icon: '📚', slug: 'livros' },
  { id: '9', name: 'Games', icon: '🎮', slug: 'games' },
  { id: '10', name: 'Beleza', icon: '💄', slug: 'beleza' },
  { id: '11', name: 'Ferramentas', icon: '🔧', slug: 'ferramentas' },
  { id: '12', name: 'Outros', icon: '📦', slug: 'outros' },
];


