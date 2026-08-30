'use client';

import { Zap } from 'lucide-react';
import FeatureStatusPanel from '@/components/admin/FeatureStatusPanel';

export default function AdminFlashOffersPage() {
  return (
    <div className="space-y-6">
      <FeatureStatusPanel
        feature="flash_offers"
        icone={Zap}
        descricao="Ofertas por tempo limitado com preço promocional. Conversão e valor economizado serão apurados a partir das ofertas efetivamente publicadas e vendidas."
      />
    </div>
  );
}
