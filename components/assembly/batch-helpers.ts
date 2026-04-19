import type { AssemblyBatch, AssemblyStage, TourProduct } from '@/lib/types';

export function getDaysInStage(batch: Pick<AssemblyBatch, 'movedToStageAt' | 'createdAt'>): number {
  const ref = batch.movedToStageAt ?? batch.createdAt;
  return (Date.now() - new Date(ref).getTime()) / 86_400_000;
}

export function getStageStaleness(
  batches: Pick<AssemblyBatch, 'movedToStageAt' | 'createdAt'>[],
): 'red' | 'yellow' | 'none' {
  let worst: 'red' | 'yellow' | 'none' = 'none';
  for (const b of batches) {
    const days = getDaysInStage(b);
    if (days > 7) return 'red';
    if (days > 3) worst = 'yellow';
  }
  return worst;
}

export function isProductReady(product: TourProduct, stage: AssemblyStage): boolean {
  switch (stage) {
    case 'In Review':
      return !!product.isOk && product.isOk.trim() !== '';
    case '2nd Review':
      return !!product.ssOk;
    case 'Buying Price':
      return !!product.totalBuyingPrice && product.totalBuyingPrice.trim() !== '';
    case 'Selling Price':
      return (
        !!product.b2bPriceOnRequest &&
        product.b2bPriceOnRequest.trim() !== '' &&
        !!product.b2cPriceOnRequest &&
        product.b2cPriceOnRequest.trim() !== ''
      );
    case 'Ready for Upload':
      return !!product.productLink && product.productLink.trim() !== '';
    default:
      return false;
  }
}
