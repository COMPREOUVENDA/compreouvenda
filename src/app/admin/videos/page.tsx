'use client';

import { Film } from 'lucide-react';
import FeatureStatusPanel from '@/components/admin/FeatureStatusPanel';

export default function AdminVideosPage() {
  return (
    <div className="space-y-6">
      <FeatureStatusPanel
        feature="videos"
        icone={Film}
        descricao="Vídeos de produto gerados por modelo ou por IA. A distribuição por origem e o volume de regenerações serão apurados a partir dos vídeos realmente produzidos."
      />
    </div>
  );
}
