'use client';

import { Clock, MapPin, Pencil, Globe } from 'lucide-react';
import type { TourProduct } from '@/lib/types';
import { getProductStatusClasses } from '@/lib/design-system';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getActiveOtaCount } from './product-detail-sheet';

const OTA_TOTAL = 13;

interface ProductCardsProps {
  data: TourProduct[];
  isLoading: boolean;
  onCardClick: (product: TourProduct) => void;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  return <Badge className={cn('text-xs', getProductStatusClasses(status))}>{status}</Badge>;
}

function ProductCard({ product, onClick }: { product: TourProduct; onClick: () => void }) {
  const otaCount = getActiveOtaCount(product);

  return (
    <Card
      className="group cursor-pointer transition-colors hover:border-[hsl(var(--border-strong))]"
      onClick={onClick}
    >
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          {product.productType && (
            <Badge variant="default" className="shrink-0 text-xs">
              {product.productType}
            </Badge>
          )}
          <StatusBadge status={product.productStatus} />
        </div>
        <div>
          <h3 className="line-clamp-2 text-sm font-medium leading-tight text-[hsl(var(--text-primary))]">
            {product.productName || product.link || `${product.city}, ${product.country}`}
          </h3>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-[hsl(var(--text-secondary))]">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {product.city}, {product.country}
            </span>
            {product.duration && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {product.duration}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-3 py-2">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--text-tertiary))]">B2B</div>
            <div className="text-sm font-medium text-[hsl(var(--text-primary))]">{product.b2bPriceInstant || '—'}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[hsl(var(--text-tertiary))]">B2C</div>
            <div className="text-sm font-medium text-[hsl(var(--text-primary))]">{product.b2cPriceInstant || '—'}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {product.pic && (
              <Badge variant="outline" className="text-xs">
                {product.pic}
              </Badge>
            )}
            {otaCount > 0 && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Globe className="mr-1 h-3 w-3" />
                {otaCount}/{OTA_TOTAL}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3 space-y-2">
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded bg-[hsl(var(--surface-raised))]" />
          <div className="ml-auto h-5 w-20 rounded bg-[hsl(var(--surface-raised))]" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 w-full rounded bg-[hsl(var(--surface-raised))]" />
          <div className="h-3 w-2/3 rounded bg-[hsl(var(--surface-raised))]" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="h-12 rounded-lg bg-[hsl(var(--surface-raised))]" />
        <div className="flex gap-2">
          <div className="h-5 w-10 rounded bg-[hsl(var(--surface-raised))]" />
          <div className="h-5 w-14 rounded bg-[hsl(var(--surface-raised))]" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProductCards({ data, isLoading, onCardClick }: ProductCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-[hsl(var(--text-secondary))]">
        No products match your filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {data.map((product) => (
        <ProductCard
          key={product.rowIndex}
          product={product}
          onClick={() => onCardClick(product)}
        />
      ))}
    </div>
  );
}
