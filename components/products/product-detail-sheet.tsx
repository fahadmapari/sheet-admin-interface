'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Clock, ExternalLink, MapPin, Pencil, Users, X } from 'lucide-react';
import type { TourProduct } from '@/lib/types';
import { BOOLEAN_FIELDS, FIELD_LABELS, NUMBER_FIELDS } from '@/lib/constants';
import { useColumnGroups } from '@/lib/hooks/use-column-groups';
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
import { InlineEditCell } from './inline-edit-cell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoveToStageDialog } from '@/components/assembly/move-to-stage-dialog';
import { toast } from 'sonner';
import { ASSEMBLY_STAGES, type AssemblyStage, type ProductAssemblyInfo } from '@/lib/types';

const REQUIRED_STRING_FIELDS = new Set<keyof Omit<TourProduct, 'rowIndex'>>([
  'country',
  'city',
  'productType',
]);


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


interface EditableFieldValueProps {
  product: TourProduct;
  field: keyof Omit<TourProduct, 'rowIndex'>;
  onSaved: (field: keyof Omit<TourProduct, 'rowIndex'>, value: string) => void;
  readOnly?: boolean;
}

function EditableFieldValue({ product, field, onSaved, readOnly }: EditableFieldValueProps) {
  const value = product[field];

  if (field === 'productStatus') {
    return (
      <div className="flex justify-end">
        <InlineEditCell product={product} field={field} onSaved={(name, next) => onSaved(name as keyof Omit<TourProduct, 'rowIndex'>, next)} readOnly={readOnly} />
      </div>
    );
  }

  if (BOOLEAN_FIELDS.has(field)) {
    return (
      <div className="flex justify-end">
        <InlineEditCell product={product} field={field} onSaved={(name, next) => onSaved(name as keyof Omit<TourProduct, 'rowIndex'>, next)} readOnly={readOnly} />
      </div>
    );
  }

  if (field.startsWith('ota')) {
    const active = value && String(value).trim() !== '' && String(value).toLowerCase() !== 'no';
    return (
      <span className={active ? 'text-[hsl(var(--text-primary))]' : 'text-[hsl(var(--text-secondary))]'}>
        <InlineEditCell product={product} field={field} onSaved={(name, next) => onSaved(name as keyof Omit<TourProduct, 'rowIndex'>, next)} readOnly={readOnly} />
      </span>
    );
  }

  return (
    <div className="min-w-0 max-w-[260px] text-right">
      <InlineEditCell product={product} field={field} onSaved={(name, next) => onSaved(name as keyof Omit<TourProduct, 'rowIndex'>, next)} readOnly={readOnly} />
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
  const { groups } = useColumnGroups();
  const sections = useMemo(
    () =>
      groups.map((g) => ({
        id: g.id,
        label: g.label,
        fields: g.fields.map((f) => ({
          key: f as keyof TourProduct,
          label: FIELD_LABELS[f as keyof typeof FIELD_LABELS] ?? f,
        })),
      })),
    [groups]
  );

  const [draftProduct, setDraftProduct] = useState<TourProduct | null>(product);
  const [editMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftProduct(product);
  }, [product]);

  useEffect(() => {
    setEditMode(false);
  }, [product?.rowIndex]);

  const [assemblyInfo, setAssemblyInfo] = useState<ProductAssemblyInfo | null | undefined>(undefined);
  const [movingStage, setMovingStage] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);

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
    if (!assemblyInfo?.stage) {
      setMoveDialogOpen(true);
      return;
    }

    const currentStage = assemblyInfo?.stage;
    const currentIndex = currentStage ? ASSEMBLY_STAGES.indexOf(currentStage) : -1;
    const nextStage: AssemblyStage =
      currentIndex === -1 || currentIndex >= ASSEMBLY_STAGES.length - 1
        ? ASSEMBLY_STAGES[0]
        : ASSEMBLY_STAGES[currentIndex + 1];
    moveToStage(nextStage);
  };

  const handleAddToAssemblyConfirm = async (
    strategy: { type: 'new'; name: string } | { type: 'existing'; batchId: string },
  ) => {
    if (!draftProduct) return;

    setMovingStage(true);
    try {
      const targetStage = ASSEMBLY_STAGES[0];
      const res = await fetch('/api/assembly/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowIndexes: [draftProduct.rowIndex],
          targetStage,
          batchStrategy: strategy,
        }),
      });

      if (res.ok) {
        const data = await res.json() as { ok: boolean; batchId: string };
        toast.success(`Moved to "${targetStage}"`);
        setAssemblyInfo({ stage: targetStage, batchId: data.batchId, batchName: '' });
      } else {
        toast.error('Move failed');
        throw new Error('Move failed');
      }
    } finally {
      setMovingStage(false);
    }
  };

  const isProgrammaticScrollRef = useRef(false);
  const programmaticScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleScroll = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;
    const container = scrollAreaRef.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;
    const ids = sections.map((s) => s.id);
    let active = ids[0] ?? '';
    for (const id of ids) {
      const el = sectionRefs.current[id];
      if (el && el.getBoundingClientRect().top - containerTop <= 40) {
        active = id;
      }
    }
    setActiveSection(active);
  }, [sections]);

  function scrollToSection(id: string) {
    const container = scrollAreaRef.current;
    const el = sectionRefs.current[id];
    if (!container || !el) return;
    setActiveSection(id);
    isProgrammaticScrollRef.current = true;
    if (programmaticScrollTimerRef.current) clearTimeout(programmaticScrollTimerRef.current);

    const unlock = () => { isProgrammaticScrollRef.current = false; };

    if ('onscrollend' in container) {
      container.addEventListener('scrollend', unlock, { once: true });
      // Safety fallback in case scrollend doesn't fire
      programmaticScrollTimerRef.current = setTimeout(unlock, 2000);
    } else {
      programmaticScrollTimerRef.current = setTimeout(unlock, 1000);
    }

    const offset = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - 16;
    container.scrollTo({ top: offset, behavior: 'smooth' });
  }

  if (!draftProduct) return null;

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
      <SheetContent className="sm:max-w-4xl w-full p-0 flex flex-col" side="right">
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

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={draftProduct.productStatus} />
              {draftProduct.productType && <Badge variant="default">{draftProduct.productType}</Badge>}
            </div>
            <Button
              size="sm"
              variant={editMode ? 'default' : 'outline'}
              className="h-7 gap-1.5 text-xs"
              onClick={() => setEditMode((prev) => !prev)}
            >
              <Pencil className="h-3 w-3" />
              {editMode ? 'Done' : 'Edit'}
            </Button>
          </div>

          {editMode && (
            <p className="text-xs text-[hsl(var(--text-secondary))]">
              Click any value to edit. Changes save automatically.
            </p>
          )}
        </div>

        <div className="flex overflow-x-auto border-b border-[hsl(var(--border))] scrollbar-hide">
          {sections.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => scrollToSection(tab.id)}
              className={[
                'shrink-0 whitespace-nowrap px-4 py-2.5 text-sm transition-colors',
                activeSection === tab.id
                  ? 'border-b-2 border-[hsl(var(--text-primary))] font-medium text-[hsl(var(--text-primary))]'
                  : 'text-[hsl(var(--text-tertiary))] hover:text-[hsl(var(--text-secondary))]',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div ref={scrollAreaRef} className="flex-1 overflow-y-auto scrollbar-hide" onScroll={handleScroll}>
          <div className="space-y-6 px-6 py-4">
            {sections.map((section) => (
              <div
                key={section.id}
                data-section-id={section.id}
                ref={(el) => { sectionRefs.current[section.id] = el; }}
              >
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
                          readOnly={!editMode}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[hsl(var(--border))] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4">
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
      <MoveToStageDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        targetStage={ASSEMBLY_STAGES[0]}
        onConfirm={handleAddToAssemblyConfirm}
      />
    </Sheet>
  );
}
