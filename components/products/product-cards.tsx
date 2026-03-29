'use client';

import { Clock, MapPin, Pencil, Globe } from 'lucide-react';
import type { TourProduct } from '@/lib/types';
import { STATUS_COLORS } from '@/lib/constants';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getActiveOtaCount } from './product-detail-sheet';

const OTA_TOTAL = 13;

interface ProductCardsProps {
  data: TourProduct[];
  isLoading: boolean;
  onCardClick: (product: TourProduct) => void;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const colors = STATUS_COLORS[status];
  if (!colors) return <Badge variant="outline" className="text-xs">{status}</Badge>;
  return <Badge className={`${colors.bg} ${colors.text} border-0 text-xs`}>{status}</Badge>;
}

function ProductCard({ product, onClick }: { product: TourProduct; onClick: () => void }) {
  const otaCount = getActiveOtaCount(product);

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md group"
      onClick={onClick}
    >
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          {product.productType && (
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {product.productType}
            </Badge>
          )}
          <StatusBadge status={product.productStatus} />
        </div>
        <div>
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {product.productName || product.link || `${product.city}, ${product.country}`}
          </h3>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
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
        {/* Pricing */}
        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
          <div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">B2B</div>
            <div className="text-sm font-bold">{product.b2bPriceInstant || '—'}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">B2C</div>
            <div className="text-sm font-bold text-emerald-700">{product.b2cPriceInstant || '—'}</div>
          </div>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {product.pic && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                {product.pic}
              </Badge>
            )}
            {otaCount > 0 && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                <Globe className="h-3 w-3 mr-1" />
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
          <div className="h-5 w-16 bg-muted rounded" />
          <div className="h-5 w-20 bg-muted rounded ml-auto" />
        </div>
        <div className="space-y-1.5">
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-3 w-2/3 bg-muted rounded" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="h-12 bg-muted/40 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-5 w-10 bg-muted rounded" />
          <div className="h-5 w-14 bg-muted rounded" />
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
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
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
