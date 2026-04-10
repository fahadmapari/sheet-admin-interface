'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink, RotateCcw, Save, X } from 'lucide-react';
import { useSWRConfig } from 'swr';

import type { TourProduct } from '@/lib/types';
import {
  BOOLEAN_FIELDS,
  FIELD_LABELS,
  PIC_VALUES,
  PRODUCT_STATUSES,
} from '@/lib/constants';
import { useColumnGroups } from '@/lib/hooks/use-column-groups';
import { getProductStatusClasses } from '@/lib/design-system';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { parseLinkField } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const schema = z.object({
  // Required fields
  country: z.string().min(1, 'Country is required'),
  city: z.string().min(1, 'City is required'),
  productType: z.string().min(1, 'Product type is required'),

  // Optional string | null fields
  department: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
  productStatus: z.string().nullable().optional(),
  productName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isOk: z.string().nullable().optional(),
  imageLinks: z.string().nullable().optional(),
  maxPax: z.string().nullable().optional(),
  guideWhere: z.string().nullable().optional(),
  componentsOfTour: z.string().nullable().optional(),
  transportation: z.string().nullable().optional(),
  attractionsIncluded: z.string().nullable().optional(),
  attractionLink: z.string().nullable().optional(),
  providerPrice: z.string().nullable().optional(),
  providerUrl: z.string().nullable().optional(),
  centralProviderLinks: z.string().nullable().optional(),
  centralTransportLinks: z.string().nullable().optional(),
  transportationPrice: z.string().nullable().optional(),
  vatYN: z.string().nullable().optional(),
  totalBuyingPrice: z.string().nullable().optional(),
  cancellation: z.string().nullable().optional(),
  pic: z.string().nullable().optional(),
  b2bPriceInstant: z.string().nullable().optional(),
  b2bPriceOnRequest: z.string().nullable().optional(),
  b2cPriceInstant: z.string().nullable().optional(),
  b2cPriceOnRequest: z.string().nullable().optional(),
  extraHrB2BInstant: z.string().nullable().optional(),
  extraHrB2BRequest: z.string().nullable().optional(),
  extraHrB2CInstant: z.string().nullable().optional(),
  extraHrB2CRequest: z.string().nullable().optional(),
  tourValidityGeneral: z.string().nullable().optional(),
  tourValiditySpecific: z.string().nullable().optional(),
  cancelInstant: z.string().nullable().optional(),
  cutoffInstant: z.string().nullable().optional(),
  cancelOnRequest: z.string().nullable().optional(),
  cutoffOnRequest: z.string().nullable().optional(),
  notesGeneral: z.string().nullable().optional(),
  otaMasterSheet: z.string().nullable().optional(),
  otaTravmonde: z.string().nullable().optional(),
  otaBookableTours: z.string().nullable().optional(),
  otaViator: z.string().nullable().optional(),
  otaGyg: z.string().nullable().optional(),
  otaHotelbeds: z.string().nullable().optional(),
  otaProjectExpedition: z.string().nullable().optional(),
  otaAirbnb: z.string().nullable().optional(),
  otaBokun: z.string().nullable().optional(),
  otaTrekksoft: z.string().nullable().optional(),
  otaTuiMusement: z.string().nullable().optional(),
  otaKlook: z.string().nullable().optional(),
  otaToristy: z.string().nullable().optional(),
  otaTourHQ: z.string().nullable().optional(),
  qualityRemarks: z.string().nullable().optional(),
  uploadedPic: z.string().nullable().optional(),
  dateOfDispatch: z.string().nullable().optional(),
  dateUploaded: z.string().nullable().optional(),
  productLink: z.string().nullable().optional(),

  // Number | null
  vatPercent: z.number().nullable().optional(),

  // Boolean fields
  written: z.boolean().optional().default(false),
  ssOk: z.boolean().optional().default(false),
  guide: z.boolean().optional().default(false),
  driver: z.boolean().optional().default(false),
  driverGuide: z.boolean().optional().default(false),
  attractionIncluded: z.boolean().optional().default(false),
  attractionOptional: z.boolean().optional().default(false),
  readyForUpload: z.boolean().optional().default(false),
});

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Field type helpers
// ---------------------------------------------------------------------------

const URL_FIELDS = new Set<string>([
  'providerUrl',
  'attractionLink',
  'productLink',
  'centralProviderLinks',
  'centralTransportLinks',
]);

const LONG_TEXT_FIELDS = new Set<string>([
  'notes',
  'notesGeneral',
  'qualityRemarks',
  'componentsOfTour',
]);

const DATE_FIELDS = new Set<string>(['dateOfDispatch', 'dateUploaded']);

function buildDefaultValues(product: TourProduct): FormValues {
  return {
    country: product.country,
    city: product.city,
    productType: product.productType,
    department: product.department,
    region: product.region,
    link: product.link,
    duration: product.duration,
    productStatus: product.productStatus,
    productName: product.productName,
    written: product.written,
    notes: product.notes,
    isOk: product.isOk,
    ssOk: product.ssOk,
    imageLinks: product.imageLinks,
    maxPax: product.maxPax,
    guide: product.guide,
    driver: product.driver,
    driverGuide: product.driverGuide,
    guideWhere: product.guideWhere,
    componentsOfTour: product.componentsOfTour,
    attractionIncluded: product.attractionIncluded,
    attractionOptional: product.attractionOptional,
    transportation: product.transportation,
    attractionsIncluded: product.attractionsIncluded,
    attractionLink: product.attractionLink,
    providerPrice: product.providerPrice,
    providerUrl: product.providerUrl,
    centralProviderLinks: product.centralProviderLinks,
    centralTransportLinks: product.centralTransportLinks,
    transportationPrice: product.transportationPrice,
    vatYN: product.vatYN,
    vatPercent: product.vatPercent,
    totalBuyingPrice: product.totalBuyingPrice,
    cancellation: product.cancellation,
    pic: product.pic,
    b2bPriceInstant: product.b2bPriceInstant,
    b2bPriceOnRequest: product.b2bPriceOnRequest,
    b2cPriceInstant: product.b2cPriceInstant,
    b2cPriceOnRequest: product.b2cPriceOnRequest,
    extraHrB2BInstant: product.extraHrB2BInstant,
    extraHrB2BRequest: product.extraHrB2BRequest,
    extraHrB2CInstant: product.extraHrB2CInstant,
    extraHrB2CRequest: product.extraHrB2CRequest,
    tourValidityGeneral: product.tourValidityGeneral,
    tourValiditySpecific: product.tourValiditySpecific,
    cancelInstant: product.cancelInstant,
    cutoffInstant: product.cutoffInstant,
    cancelOnRequest: product.cancelOnRequest,
    cutoffOnRequest: product.cutoffOnRequest,
    notesGeneral: product.notesGeneral,
    otaMasterSheet: product.otaMasterSheet,
    otaTravmonde: product.otaTravmonde,
    otaBookableTours: product.otaBookableTours,
    otaViator: product.otaViator,
    otaGyg: product.otaGyg,
    otaHotelbeds: product.otaHotelbeds,
    otaProjectExpedition: product.otaProjectExpedition,
    otaAirbnb: product.otaAirbnb,
    otaBokun: product.otaBokun,
    otaTrekksoft: product.otaTrekksoft,
    otaTuiMusement: product.otaTuiMusement,
    otaKlook: product.otaKlook,
    otaToristy: product.otaToristy,
    otaTourHQ: product.otaTourHQ,
    qualityRemarks: product.qualityRemarks,
    readyForUpload: product.readyForUpload,
    uploadedPic: product.uploadedPic,
    dateOfDispatch: product.dateOfDispatch,
    dateUploaded: product.dateUploaded,
    productLink: product.productLink,
  };
}

// ---------------------------------------------------------------------------
// Field renderer
// ---------------------------------------------------------------------------

interface FieldRendererProps {
  fieldName: keyof Omit<TourProduct, 'rowIndex'>;
  control: ReturnType<typeof useForm<FormValues>>['control'];
  register: ReturnType<typeof useForm<FormValues>>['register'];
  errors: ReturnType<typeof useForm<FormValues>>['formState']['errors'];
}

function FieldRenderer({
  fieldName,
  control,
  register,
  errors,
}: FieldRendererProps) {
  const label = FIELD_LABELS[fieldName];
  const error = errors[fieldName as keyof FormValues];

  // Boolean → Switch
  if (BOOLEAN_FIELDS.has(fieldName)) {
    const isReadyForUpload = fieldName === 'readyForUpload';

    return (
      <div className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3">
        <Controller
          name={fieldName as keyof FormValues}
          control={control}
          render={({ field }) => {
            return (
              <>
                <Label
                  htmlFor={fieldName}
                  className={isReadyForUpload ? 'text-xs font-medium text-[hsl(var(--text-primary))]' : 'text-xs font-medium'}
                >
                  {label}
                </Label>
                <Switch
                  id={fieldName}
                  checked={field.value as boolean}
                  onCheckedChange={field.onChange}
                />
              </>
            );
          }}
        />
      </div>
    );
  }

  // productStatus → Select
  if (fieldName === 'productStatus') {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldName} className="font-medium">
          {label}
        </Label>
        <Controller
          name="productStatus"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? '__none__'}
              onValueChange={(val) => field.onChange(val === '__none__' ? null : val)}
            >
              <SelectTrigger id={fieldName}>
                <SelectValue placeholder="Select status…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {PRODUCT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {error && <p className="text-xs text-destructive">{error.message as string}</p>}
      </div>
    );
  }

  // pic → Select
  if (fieldName === 'pic') {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldName} className="font-medium">
          {label}
        </Label>
        <Controller
          name="pic"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value ?? '__none__'}
              onValueChange={(val) => field.onChange(val === '__none__' ? null : val)}
            >
              <SelectTrigger id={fieldName}>
                <SelectValue placeholder="Select PIC…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— None —</SelectItem>
                {PIC_VALUES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {error && <p className="text-xs text-destructive">{error.message as string}</p>}
      </div>
    );
  }

  // imageLinks → structured multi-entry editor
  if (fieldName === 'imageLinks') {
    return (
      <div className="space-y-1.5">
        <Label className="font-medium">{label}</Label>
        <Controller
          name="imageLinks"
          control={control}
          render={({ field }) => (
            <ImageLinksEditor value={field.value} onChange={field.onChange} />
          )}
        />
        {error && <p className="text-xs text-destructive">{error.message as string}</p>}
      </div>
    );
  }

  // URL fields → Input type="url" + external link button
  if (URL_FIELDS.has(fieldName)) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const currentUrl = useWatch({ control, name: fieldName as keyof FormValues }) as string | null | undefined;
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldName} className="font-medium">
          {label}
        </Label>
        <div className="flex gap-2">
          <Input
            id={fieldName}
            type="url"
            className="flex-1"
            {...register(fieldName as keyof FormValues)}
          />
          {currentUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => window.open(currentUrl, '_blank', 'noopener,noreferrer')}
              title="Open URL in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error.message as string}</p>}
      </div>
    );
  }

  // Long text fields → Textarea
  if (LONG_TEXT_FIELDS.has(fieldName)) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldName} className="font-medium">
          {label}
        </Label>
        <Textarea
          id={fieldName}
          rows={4}
          className="resize-y"
          {...register(fieldName as keyof FormValues)}
        />
        {error && <p className="text-xs text-destructive">{error.message as string}</p>}
      </div>
    );
  }

  // Date fields
  if (DATE_FIELDS.has(fieldName)) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldName} className="font-medium">
          {label}
        </Label>
        <Input
          id={fieldName}
          type="date"
          {...register(fieldName as keyof FormValues)}
        />
        {error && <p className="text-xs text-destructive">{error.message as string}</p>}
      </div>
    );
  }

  // vatPercent → number input
  if (fieldName === 'vatPercent') {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={fieldName} className="font-medium">
          {label}
        </Label>
        <Controller
          name="vatPercent"
          control={control}
          render={({ field }) => (
            <Input
              id={fieldName}
              type="number"
              step="0.01"
              value={field.value ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                field.onChange(val === '' ? null : parseFloat(val));
              }}
            />
          )}
        />
        {error && <p className="text-xs text-destructive">{error.message as string}</p>}
      </div>
    );
  }

  // Default → text input
  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldName} className="font-medium">
        {label}
      </Label>
      <Input
        id={fieldName}
        type="text"
        {...register(fieldName as keyof FormValues)}
      />
      {error && <p className="text-xs text-destructive">{error.message as string}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ImageLinksEditor
// ---------------------------------------------------------------------------

interface LinkEntry {
  id: string;
  text: string;
  url: string;
}

function serializeEntries(entries: LinkEntry[]): string {
  return entries
    .filter((e) => e.text.trim() || e.url.trim())
    .map((e) => (e.text && e.url ? `${e.text}||${e.url}` : e.url || e.text))
    .join('\n');
}

function parseEntries(value: string | null | undefined): LinkEntry[] {
  return (value ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => ({ ...parseLinkField(l), id: crypto.randomUUID() }));
}

function ImageLinksEditor({
  value,
  onChange,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
}) {
  const [entries, setEntries] = useState<LinkEntry[]>(() => parseEntries(value));

  // Sync when the form resets externally
  useEffect(() => {
    setEntries(parseEntries(value));
  }, [value]);

  function updateEntries(next: LinkEntry[]) {
    setEntries(next);
    onChange(serializeEntries(next));
  }

  function handleChange(index: number, key: keyof LinkEntry, val: string) {
    const next = entries.map((e, i) => (i === index ? { ...e, [key]: val } : e));
    updateEntries(next);
  }

  function handleRemove(index: number) {
    updateEntries(entries.filter((_, i) => i !== index));
  }

  function handleAdd() {
    updateEntries([...entries, { text: '', url: '', id: crypto.randomUUID() }]);
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div key={entry.id} className="flex gap-2 items-center">
          <Input
            className="flex-1"
            placeholder="Label"
            value={entry.text}
            onChange={(e) => handleChange(i, 'text', e.target.value)}
          />
          <Input
            className="flex-[2]"
            placeholder="https://..."
            value={entry.url}
            onChange={(e) => handleChange(i, 'url', e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemove(i)}
            title="Remove"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
      >
        + Add image link
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface ProductDetailClientProps {
  product: TourProduct;
  mode?: 'page' | 'sheet';
  onSaved?: (product: TourProduct) => void;
}

export function ProductDetailClient({
  product,
  mode = 'page',
  onSaved,
}: ProductDetailClientProps) {
  const defaultValues = useMemo(() => buildDefaultValues(product), [product]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { mutate } = useSWRConfig();

  const { groups: columnGroups } = useColumnGroups();

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const onSubmit = async (data: FormValues) => {
    const res = await fetch(`/api/products/${product.rowIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updatedProduct: TourProduct = {
        ...product,
        ...data,
        rowIndex: product.rowIndex,
      };
      reset(data);
      onSaved?.(updatedProduct);
      toast.success('Product saved');
      return;
    }

    if (res.status === 404) {
      toast.error('Product not found — it may have been deleted. Refreshing list...');
      mutate('/api/products');
      return;
    }
    toast.error('Failed to save product');
  };

  const handleReset = () => {
    reset(defaultValues);
  };

  // Determine title and status badge
  const title =
    product.productName ||
    product.link ||
    `Row ${product.rowIndex}`;

  const status = product.productStatus;
  const embedded = mode === 'sheet';
  const renderActionButtons = () => (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleReset}
        disabled={isSubmitting}
      >
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Reset
      </Button>
      <Button type="submit" size="sm" disabled={isSubmitting}>
        <Save className="mr-1.5 h-3.5 w-3.5" />
        {isSubmitting ? 'Saving…' : 'Save'}
      </Button>
    </>
  );
  const form = (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4 flex justify-end gap-2">
        {renderActionButtons()}
      </div>

      <Tabs defaultValue={columnGroups[0]?.id ?? ''}>
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex h-auto w-max flex-wrap gap-0.5">
            {columnGroups.map((group) => (
              <TabsTrigger key={group.id} value={group.id} className="px-2.5 py-1.5 text-xs">
                {group.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {columnGroups.map((group) => (
          <TabsContent key={group.id} value={group.id} className="mt-4">
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-5">
              <h2 className="mb-4 text-sm font-medium text-[hsl(var(--text-secondary))]">
                {group.label}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {(group.fields as readonly string[]).map((fieldName) => (
                  <FieldRenderer
                    key={fieldName}
                    fieldName={fieldName as keyof Omit<TourProduct, 'rowIndex'>}
                    control={control}
                    register={register}
                    errors={errors}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="mt-6 flex justify-end gap-2">
        {renderActionButtons()}
      </div>
    </form>
  );

  if (embedded) {
    return form;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="space-y-3">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--text-secondary))] transition-colors hover:text-[hsl(var(--text-primary))]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>

        <div className="flex flex-wrap items-start gap-3">
          <h1 className="min-w-0 flex-1 break-words text-xl font-semibold tracking-tight">
            {title}
          </h1>
          {status && (
            <Badge className={`shrink-0 ${getProductStatusClasses(status)}`}>
              {status}
            </Badge>
          )}
        </div>

        <p className="text-sm text-[hsl(var(--text-secondary))]">
          {product.country}
          {product.city ? ` › ${product.city}` : ''}
          {product.productType ? ` · ${product.productType}` : ''}
          {' · '}<span className="font-mono text-xs">Row {product.rowIndex}</span>
        </p>
      </div>

      {form}
    </div>
  );
}
