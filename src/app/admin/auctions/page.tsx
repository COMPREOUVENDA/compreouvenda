'use client';

import { Gavel } from 'lucide-react';
import FeatureStatusPanel from '@/components/admin/FeatureStatusPanel';

export default function AdminAuctionsPage() {
  return (
    <div className="space-y-6">
      <FeatureStatusPanel
        feature="auctions"
        icone={Gavel}
        descricao="Leilões de produtos com lances em tempo real. Os indicadores de leilões ativos, total de lances e valor movimentado serão calculados a partir dos lances reais registrados."
      />
    </div>
  );
}
