'use client';

import Link from 'next/link';
import { ExternalLink, Pencil, X, Check, Clock, MapPin, Users, Globe } from 'lucide-react';
import type { TourProduct } from '@/lib/types';
import { BOOLEAN_FIELDS, FIELD_LABELS, STATUS_COLORS } from '@/lib/constants';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// OTA channel fields and their display names
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

// Detail sections with their fields
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

function formatFieldValue(product: TourProduct, key: keyof TourProduct): string {
  const value = product[key];
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  return String(value);
}

function isUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const colors = STATUS_COLORS[status];
  if (!colors) return <Badge variant="outline">{status}</Badge>;
  return <Badge className={`${colors.bg} ${colors.text} border-0`}>{status}</Badge>;
}

function FieldValue({ product, field }: { product: TourProduct; field: keyof TourProduct }) {
  const value = product[field];
  const display = formatFieldValue(product, field);

  if (field === 'productStatus') {
    return <StatusBadge status={value as string | null} />;
  }

  if (BOOLEAN_FIELDS.has(field)) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm ${value ? 'text-green-700' : 'text-muted-foreground'}`}>
        {value ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  if (display !== '—' && isUrl(display)) {
    return (
      <a
        href={display}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 break-all"
      >
        {display.length > 50 ? display.slice(0, 50) + '...' : display}
        <ExternalLink className="h-3 w-3 flex-shrink-0" />
      </a>
    );
  }

  return <span className="text-sm text-foreground">{display}</span>;
}

export function getActiveOtaCount(product: TourProduct): number {
  return OTA_CHANNELS.filter(
    (ch) => {
      const val = product[ch.field];
      return val && String(val).trim() !== '' && String(val).toLowerCase() !== 'no';
    }
  ).length;
}

interface ProductDetailSheetProps {
  product: TourProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailSheet({ product, open, onOpenChange }: ProductDetailSheetProps) {
  if (!product) return null;

  const activeOtas = OTA_CHANNELS.filter((ch) => {
    const val = product[ch.field];
    return val && String(val).trim() !== '' && String(val).toLowerCase() !== 'no';
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full p-0 flex flex-col" side="right">
        {/* Header */}
        <div className="px-6 py-5 border-b space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold leading-tight">
                {product.productName || product.link || `${product.city}, ${product.country}`}
              </SheetTitle>
              <SheetDescription className="mt-1 flex items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {product.city}, {product.country}
                </span>
                {product.duration && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {product.duration}
                  </span>
                )}
                {product.maxPax && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Max {product.maxPax}
                  </span>
                )}
              </SheetDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={product.productStatus} />
            {product.productType && (
              <Badge variant="secondary">{product.productType}</Badge>
            )}
            {product.pic && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {product.pic}
              </Badge>
            )}
            {activeOtas.length > 0 && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <Globe className="h-3 w-3 mr-1" />
                {activeOtas.length}/{OTA_CHANNELS.length} OTAs
              </Badge>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* Quick pricing summary */}
            {(product.b2bPriceInstant || product.b2cPriceInstant) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">B2B Instant</div>
                  <div className="text-xl font-bold mt-1">
                    {product.b2bPriceInstant || '—'}
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">B2C Instant</div>
                  <div className="text-xl font-bold mt-1 text-emerald-700">
                    {product.b2cPriceInstant || '—'}
                  </div>
                </div>
              </div>
            )}

            {/* Detail sections */}
            {DETAIL_SECTIONS.map((section) => {
              const hasAnyValue = section.fields.some((f) => {
                const val = product[f.key];
                return val !== null && val !== undefined && val !== '' && val !== false;
              });

              return (
                <div key={section.id}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    {section.label}
                  </h3>
                  <div className="rounded-lg border">
                    <div className="divide-y">
                      {section.fields.map((f) => (
                        <div key={f.key} className="flex items-start justify-between px-4 py-2.5 gap-4">
                          <span className="text-sm text-muted-foreground flex-shrink-0">{f.label}</span>
                          <div className="text-right">
                            <FieldValue product={product} field={f.key} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* OTA Distribution section */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                OTA Distribution ({activeOtas.length}/{OTA_CHANNELS.length})
              </h3>
              <div className="rounded-lg border p-4">
                <div className="flex flex-wrap gap-2">
                  {OTA_CHANNELS.map((ch) => {
                    const val = product[ch.field];
                    const active = val && String(val).trim() !== '' && String(val).toLowerCase() !== 'no';
                    return (
                      <Badge
                        key={ch.field}
                        variant="outline"
                        className={
                          active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-muted/30 text-muted-foreground border-muted'
                        }
                      >
                        {active ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                        {ch.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" asChild>
            <Link href={`/products/${product.rowIndex}`}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit Product
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
