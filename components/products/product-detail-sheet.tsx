'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Clock, ExternalLink, MapPin, Users, X } from 'lucide-react';
import type { TourProduct } from '@/lib/types';
import { BOOLEAN_FIELDS, NUMBER_FIELDS } from '@/lib/constants';
import { getProductStatusClasses } from '@/lib/design-system';
import { parseLinkField } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InlineEditCell } from './inline-edit-cell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ASSEMBLY_STAGES, type AssemblyStage, type ProductAssemblyInfo } from '@/lib/types';

const REQUIRED_STRING_FIELDS = new Set<keyof Omit<TourProduct, 'rowIndex'>>([
  'country',
  'city',
  'productType',
]);

const OTA_CHANNELS: { field: keyof TourProduct; label: string }[] = [
  { field: 'otaTravmonde', label: 'Travmonde' },
  { field: 'otaBookableTours', label: 'Bookable Tours' },
  { field: 'otaViator', label: 'Viator' },
  { field: 'otaGyg', label: 'GYG' },
  { field: 'otaHotelbeds', label: 'Hotelbeds' },
  { field: 'otaProjectExpedition', label: 'Project Expedition' },
  { field: 'otaAirbnb', label: 'Airbnb' },
  { field: 'otaBokun', label: 'Bokun' },
  { field: 'otaTrekksoft', label: 'Trekksoft' },
  { field: 'otaTuiMusement', label: 'TUI/Musement' },
  { field: 'otaKlook', label: 'Klook' },
  { field: 'otaToristy', label: 'Toristy' },
  { field: 'otaTourHQ', label: 'TourHQ' },
];

const DETAIL_SECTIONS: {
  id: string;
  label: string;
  fields: { key: keyof TourProduct; label: string }[];
}[] = [
  {
    id: 'overview',
    label: 'Overview',
    fields: [
      { key: 'productName', label: 'Product Name' },
      { key: 'productType', label: 'Type' },
      { key: 'duration', label: 'Duration' },
      { key: 'productStatus', label: 'Status' },
      { key: 'pic', label: 'PIC' },
      { key: 'link', label: 'Link / Title' },
      { key: 'notes', label: 'Notes' },
      { key: 'department', label: 'Department' },
      { key: 'region', label: 'Region' },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing',
    fields: [
      { key: 'b2bPriceInstant', label: 'B2B Instant' },
      { key: 'b2bPriceOnRequest', label: 'B2B On Request' },
      { key: 'b2cPriceInstant', label: 'B2C Instant' },
      { key: 'b2cPriceOnRequest', label: 'B2C On Request' },
      { key: 'extraHrB2BInstant', label: 'Extra Hr B2B Instant' },
      { key: 'extraHrB2BRequest', label: 'Extra Hr B2B Request' },
      { key: 'extraHrB2CInstant', label: 'Extra Hr B2C Instant' },
      { key: 'extraHrB2CRequest', label: 'Extra Hr B2C Request' },
    ],
  },
  {
    id: 'tour',
    label: 'Tour Configuration',
    fields: [
      { key: 'maxPax', label: 'Max Pax' },
      { key: 'guide', label: 'Guide' },
      { key: 'driver', label: 'Driver' },
      { key: 'driverGuide', label: 'Driver-Guide' },
      { key: 'guideWhere', label: 'Guide Where' },
      { key: 'componentsOfTour', label: 'Components' },
      { key: 'attractionIncluded', label: 'Attraction Included?' },
      { key: 'attractionOptional', label: 'Attraction Optional' },
      { key: 'transportation', label: 'Transportation' },
      { key: 'attractionsIncluded', label: 'Attractions Included' },
      { key: 'attractionLink', label: 'Attraction Link' },
    ],
  },
  {
    id: 'provider',
    label: 'Provider & Costs',
    fields: [
      { key: 'providerPrice', label: 'Provider Price' },
      { key: 'providerUrl', label: 'Provider URL' },
      { key: 'centralProviderLinks', label: 'Central Provider Links' },
      { key: 'centralTransportLinks', label: 'Central Transport Links' },
      { key: 'transportationPrice', label: 'Transport Price' },
      { key: 'vatYN', label: 'VAT (Y/N)' },
      { key: 'vatPercent', label: 'VAT %' },
      { key: 'totalBuyingPrice', label: 'Total Buying Price' },
      { key: 'cancellation', label: 'Cancellation' },
    ],
  },
  {
    id: 'validity',
    label: 'Validity & Cancellation',
    fields: [
      { key: 'tourValidityGeneral', label: 'Validity (General)' },
      { key: 'tourValiditySpecific', label: 'Validity (Specific)' },
      { key: 'cancelInstant', label: 'Cancel Instant' },
      { key: 'cutoffInstant', label: 'Cutoff Instant' },
      { key: 'cancelOnRequest', label: 'Cancel On Request' },
      { key: 'cutoffOnRequest', label: 'Cutoff On Request' },
    ],
  },
  {
    id: 'content',
    label: 'Content Status',
    fields: [
      { key: 'written', label: 'Written' },
      { key: 'isOk', label: 'IS OK' },
      { key: 'ssOk', label: 'SS OK' },
      { key: 'imageLinks', label: 'Image Links' },
    ],
  },
  {
    id: 'upload',
    label: 'Upload Workflow',
    fields: [
      { key: 'readyForUpload', label: 'Ready for Upload' },
      { key: 'qualityRemarks', label: 'Quality Remarks' },
      { key: 'uploadedPic', label: 'Uploaded (PIC)' },
      { key: 'dateOfDispatch', label: 'Date of Dispatch' },
      { key: 'dateUploaded', label: 'Date Uploaded' },
      { key: 'productLink', label: 'Product Link' },
    ],
  },
  {
    id: 'notes',
    label: 'Notes',
    fields: [
      { key: 'notesGeneral', label: 'Notes (General)' },
      { key: 'otaMasterSheet', label: 'OTA Master Sheet' },
    ],
  },
];

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[hsl(var(--text-tertiary))]">—</span>;
  return <Badge className={getProductStatusClasses(status)}>{status}</Badge>;
}

function coercePatchedValue(
  field: keyof Omit<TourProduct, 'rowIndex'>,
  rawValue: string,
): TourProduct[keyof Omit<TourProduct, 'rowIndex'>] {
  if (BOOLEAN_FIELDS.has(field)) {
    return rawValue === 'TRUE';
  }

  if (NUMBER_FIELDS.has(field)) {
    if (rawValue === '') return null;
    const parsed = Number(rawValue);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (rawValue === '') {
    return REQUIRED_STRING_FIELDS.has(field) ? '' : null;
  }

  return rawValue;
}

export function getActiveOtaCount(product: TourProduct): number {
  return OTA_CHANNELS.filter((channel) => {
    const value = product[channel.field];
    return value && String(value).trim() !== '' && String(value).toLowerCase() !== 'no';
  }).length;
}

interface EditableFieldValueProps {
  product: TourProduct;
  field: keyof Omit<TourProduct, 'rowIndex'>;
  onSaved: (field: keyof Omit<TourProduct, 'rowIndex'>, value: string) => void;
}

function EditableFieldValue({ product, field, onSaved }: EditableFieldValueProps) {
  const value = product[field];

  if (field === 'productStatus') {
    return <InlineEditCell product={product} field={field} onSaved={(name, next) => onSaved(name as keyof Omit<TourProduct, 'rowIndex'>, next)} />;
  }

  if (BOOLEAN_FIELDS.has(field)) {
    return (
      <div className="flex justify-end">
        <InlineEditCell product={product} field={field} onSaved={(name, next) => onSaved(name as keyof Omit<TourProduct, 'rowIndex'>, next)} />
      </div>
    );
  }

  if (field.startsWith('ota')) {
    const active = value && String(value).trim() !== '' && String(value).toLowerCase() !== 'no';
    return (
      <span className={active ? 'text-[hsl(var(--text-primary))]' : 'text-[hsl(var(--text-secondary))]'}>
        <InlineEditCell product={product} field={field} onSaved={(name, next) => onSaved(name as keyof Omit<TourProduct, 'rowIndex'>, next)} />
      </span>
    );
  }

  return (
    <div className="min-w-0 max-w-[260px] text-right">
      <InlineEditCell product={product} field={field} onSaved={(name, next) => onSaved(name as keyof Omit<TourProduct, 'rowIndex'>, next)} />
    </div>
  );
}

interface ProductDetailSheetProps {
  product: TourProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (product: TourProduct) => void;
}

export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
  onSaved,
}: ProductDetailSheetProps) {
  const [draftProduct, setDraftProduct] = useState<TourProduct | null>(product);

  useEffect(() => {
    setDraftProduct(product);
  }, [product]);

  const [assemblyInfo, setAssemblyInfo] = useState<ProductAssemblyInfo | null | undefined>(undefined);
  const [movingStage, setMovingStage] = useState(false);

  useEffect(() => {
    if (!product?.rowIndex) {
      setAssemblyInfo(undefined);
      return;
    }
    setAssemblyInfo(undefined);
    fetch(`/api/assembly/product/${product.rowIndex}`)
      .then((r) => r.json())
      .then((data) => setAssemblyInfo(data ?? null))
      .catch(() => setAssemblyInfo(null));
  }, [product?.rowIndex]);

  const moveToStage = async (targetStage: AssemblyStage) => {
    if (!draftProduct) return;
    setMovingStage(true);
    try {
      const res = await fetch('/api/assembly/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowIndexes: [draftProduct.rowIndex],
          targetStage,
          batchStrategy: { type: 'new' },
        }),
      });
      if (res.ok) {
        const data = await res.json() as { ok: boolean; batchId: string };
        toast.success(`Moved to "${targetStage}"`);
        setAssemblyInfo({ stage: targetStage, batchId: data.batchId, batchName: '' });
      } else {
        toast.error('Move failed');
      }
    } finally {
      setMovingStage(false);
    }
  };

  const handleMoveToNext = () => {
    const currentStage = assemblyInfo?.stage;
    const currentIndex = currentStage ? ASSEMBLY_STAGES.indexOf(currentStage) : -1;
    const nextStage: AssemblyStage =
      currentIndex === -1 || currentIndex >= ASSEMBLY_STAGES.length - 1
        ? ASSEMBLY_STAGES[0]
        : ASSEMBLY_STAGES[currentIndex + 1];
    moveToStage(nextStage);
  };

  if (!draftProduct) return null;

  const activeOtas = OTA_CHANNELS.filter((channel) => {
    const value = draftProduct[channel.field];
    return value && String(value).trim() !== '' && String(value).toLowerCase() !== 'no';
  });

  const handleFieldSaved = (field: keyof Omit<TourProduct, 'rowIndex'>, rawValue: string) => {
    setDraftProduct((current) => {
      if (!current) return current;

      const updatedProduct = {
        ...current,
        [field]: coercePatchedValue(field, rawValue),
      } as TourProduct;

      onSaved?.(updatedProduct);
      return updatedProduct;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full p-0 flex flex-col" side="right">
        <div className="space-y-3 border-b border-[hsl(var(--border))] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-xl font-semibold tracking-tight">
                {(() => {
                  const linkParsed = draftProduct.link ? parseLinkField(draftProduct.link) : null;
                  const displayName = draftProduct.productName || linkParsed?.text || linkParsed?.url || `${draftProduct.city}, ${draftProduct.country}`;
                  const linkUrl = linkParsed?.url || null;
                  return (
                    <span className="inline-flex items-center gap-1.5">
                      {displayName}
                      {linkUrl && (
                        <a
                          href={linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-primary))] transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </span>
                  );
                })()}
              </SheetTitle>
              <SheetDescription className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {draftProduct.city}, {draftProduct.country}
                </span>
                {draftProduct.duration && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {draftProduct.duration}
                  </span>
                )}
                {draftProduct.maxPax && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Max {draftProduct.maxPax}
                  </span>
                )}
              </SheetDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={draftProduct.productStatus} />
            {draftProduct.productType && <Badge variant="default">{draftProduct.productType}</Badge>}
          </div>

          <p className="text-xs text-[hsl(var(--text-secondary))]">
            Click any value to edit. Changes save automatically.
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-6 px-6 py-4">
            {(draftProduct.b2bPriceInstant || draftProduct.b2cPriceInstant) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3">
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-[hsl(var(--text-tertiary))]">
                    B2B Instant
                  </div>
                  <div className="mt-1 text-xl font-semibold tracking-tight">
                    {draftProduct.b2bPriceInstant || '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-3">
                  <div className="text-xs font-medium uppercase tracking-[0.12em] text-[hsl(var(--text-tertiary))]">
                    B2C Instant
                  </div>
                  <div className="mt-1 text-xl font-semibold tracking-tight">
                    {draftProduct.b2cPriceInstant || '—'}
                  </div>
                </div>
              </div>
            )}

            {DETAIL_SECTIONS.map((section) => (
              <div key={section.id}>
                <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[hsl(var(--text-tertiary))]">
                  {section.label}
                </h3>
                <div className="rounded-lg border border-[hsl(var(--border))]">
                  <div className="divide-y">
                    {section.fields.map((field) => (
                      <div key={field.key} className="flex items-start justify-between gap-4 px-4 py-2.5">
                        <span className="flex-shrink-0 text-sm text-[hsl(var(--text-secondary))]">
                          {field.label}
                        </span>
                        <EditableFieldValue
                          product={draftProduct}
                          field={field.key as keyof Omit<TourProduct, 'rowIndex'>}
                          onSaved={handleFieldSaved}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <div>
              <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[hsl(var(--text-tertiary))]">
                OTA Distribution ({activeOtas.length}/{OTA_CHANNELS.length})
              </h3>
              <div className="rounded-lg border border-[hsl(var(--border))] p-4">
                <div className="flex flex-wrap gap-2">
                  {OTA_CHANNELS.map((channel) => {
                    const value = draftProduct[channel.field];
                    const active = value && String(value).trim() !== '' && String(value).toLowerCase() !== 'no';

                    return (
                      <div
                        key={channel.field}
                        className={
                          active
                            ? 'flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300'
                            : 'flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-1 text-[hsl(var(--text-secondary))]'
                        }
                      >
                        {active ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                        <span className="text-xs font-medium">{channel.label}</span>
                        <div className="max-w-[120px] text-xs">
                          <InlineEditCell
                            product={draftProduct}
                            field={channel.field as keyof Omit<TourProduct, 'rowIndex'>}
                            onSaved={(field, next) => handleFieldSaved(field as keyof Omit<TourProduct, 'rowIndex'>, next)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-3 border-t border-[hsl(var(--border))] px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs text-[hsl(var(--text-secondary))]">
              Row {draftProduct.rowIndex}
            </p>
            {assemblyInfo?.stage && (
              <span className="text-xs text-[hsl(var(--text-tertiary))]">
                Currently in: {assemblyInfo.stage}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex">
              <Button
                size="sm"
                variant="outline"
                className="rounded-r-none border-r-0"
                disabled={movingStage || assemblyInfo === undefined}
                onClick={handleMoveToNext}
              >
                <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                {assemblyInfo?.stage
                  ? (() => {
                      const idx = ASSEMBLY_STAGES.indexOf(assemblyInfo.stage);
                      const next = ASSEMBLY_STAGES[idx + 1];
                      return next ? `Move to ${next}` : `Re-enter Review`;
                    })()
                  : 'Add to Assembly'}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-l-none px-2"
                    disabled={movingStage || assemblyInfo === undefined}
                    aria-label="Select stage"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {ASSEMBLY_STAGES.map((stage) => (
                    <DropdownMenuItem key={stage} onClick={() => moveToStage(stage)}>
                      {stage}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
