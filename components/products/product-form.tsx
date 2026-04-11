'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { PRODUCT_STATUSES } from '@/lib/constants';
import type { TourProduct } from '@/lib/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ---------------------------------------------------------------------------
// ComboboxInput — searchable dropdown that also accepts free-text values
// ---------------------------------------------------------------------------
interface ComboboxInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
}

function ComboboxInput({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select or type…',
  searchPlaceholder = 'Search…',
}: ComboboxInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const showCreate =
    query.trim() !== '' &&
    !options.some((o) => o.toLowerCase() === query.trim().toLowerCase());

  function select(val: string) {
    onChange(val);
    setQuery('');
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background',
            'focus:outline-none focus:ring-1 focus:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-muted-foreground',
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        style={{ width: 'var(--radix-popover-trigger-width)' }}
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filtered.length === 0 && !showCreate && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            {filtered.length > 0 && (
              <CommandGroup>
                {filtered.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => select(option)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {option}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreate && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${query}`}
                  onSelect={() => select(query.trim())}
                >
                  <span className="text-muted-foreground mr-2">Use</span>
                  &ldquo;{query.trim()}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// Schema & form
// ---------------------------------------------------------------------------
const schema = z.object({
  country: z.string().min(1, 'Country is required'),
  city: z.string().min(1, 'City is required'),
  productType: z.string().min(1, 'Product type is required'),
  linkTitle: z.string().min(1, 'Link title is required'),
  linkUrl: z.string().url('Must be a valid URL').min(1, 'Link URL is required'),
  duration: z.string().optional(),
  productStatus: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
}

export function ProductForm({ open, onClose }: ProductFormProps) {
  const { mutate } = useSWRConfig();
  const { data: products } = useSWR<TourProduct[]>('/api/products', fetcher);

  // Derive unique sorted option lists from existing data
  const countryOptions = useMemo(
    () => [...new Set((products ?? []).map((p) => p.country).filter(Boolean) as string[])].sort(),
    [products],
  );
  const cityOptions = useMemo(
    () => [...new Set((products ?? []).map((p) => p.city).filter(Boolean) as string[])].sort(),
    [products],
  );
  const productTypeOptions = useMemo(
    () => [...new Set((products ?? []).map((p) => p.productType).filter(Boolean) as string[])].sort(),
    [products],
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    const { linkTitle, linkUrl, ...rest } = data;
    const link = `${linkTitle.trim()}||${linkUrl.trim()}`;

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...rest, link }),
    });
    if (res.ok) {
      toast.success('Product added');
      mutate('/api/products');
      onClose();
      reset();
    } else {
      toast.error('Failed to add product');
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 py-5 border-b">
          <SheetTitle>Add New Product</SheetTitle>
          <SheetDescription>
            Fill in the required fields to create a new product.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Country */}
            <div className="space-y-1.5">
              <Label htmlFor="country">
                Country <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="country"
                control={control}
                render={({ field }) => (
                  <ComboboxInput
                    id="country"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    options={countryOptions}
                    placeholder="Select or type a country…"
                    searchPlaceholder="Search countries…"
                  />
                )}
              />
              {errors.country && (
                <p className="text-xs text-destructive">{errors.country.message}</p>
              )}
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <Label htmlFor="city">
                City <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <ComboboxInput
                    id="city"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    options={cityOptions}
                    placeholder="Select or type a city…"
                    searchPlaceholder="Search cities…"
                  />
                )}
              />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city.message}</p>
              )}
            </div>

            {/* Product Type */}
            <div className="space-y-1.5">
              <Label htmlFor="productType">
                Product Type <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="productType"
                control={control}
                render={({ field }) => (
                  <ComboboxInput
                    id="productType"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    options={productTypeOptions}
                    placeholder="Select or type a product type…"
                    searchPlaceholder="Search product types…"
                  />
                )}
              />
              {errors.productType && (
                <p className="text-xs text-destructive">{errors.productType.message}</p>
              )}
            </div>

            {/* Link Title + URL */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="linkTitle">
                  Link Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="linkTitle"
                  placeholder="e.g. Tour Document"
                  {...register('linkTitle')}
                />
                {errors.linkTitle && (
                  <p className="text-xs text-destructive">{errors.linkTitle.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="linkUrl">
                  Link URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="linkUrl"
                  placeholder="https://..."
                  type="url"
                  {...register('linkUrl')}
                />
                {errors.linkUrl && (
                  <p className="text-xs text-destructive">{errors.linkUrl.message}</p>
                )}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                placeholder="e.g. 3 hours"
                {...register('duration')}
              />
            </div>

            {/* Product Status */}
            <div className="space-y-1.5">
              <Label htmlFor="productStatus">Product Status</Label>
              <Controller
                name="productStatus"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? '__none__'}
                    onValueChange={(val) => field.onChange(val === '__none__' ? undefined : val)}
                  >
                    <SelectTrigger id="productStatus">
                      <SelectValue placeholder="Select status…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {PRODUCT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add Product'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
