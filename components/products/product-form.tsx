'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PRODUCT_STATUSES, PIC_VALUES } from '@/lib/constants';

const schema = z.object({
  country: z.string().min(1, 'Country is required'),
  city: z.string().min(1, 'City is required'),
  productType: z.string().min(1, 'Product type is required'),
  linkTitle: z.string().optional(),
  linkUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  productName: z.string().optional(),
  duration: z.string().optional(),
  productStatus: z.string().optional(),
  pic: z.string().optional(),
  notes: z.string().optional(),
  readyForUpload: z.boolean().optional().default(false),
});

type FormData = z.infer<typeof schema>;

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
}

export function ProductForm({ open, onClose }: ProductFormProps) {
  const { mutate } = useSWRConfig();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      readyForUpload: false,
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: FormData) => {
    const { linkTitle, linkUrl, ...rest } = data;
    const title = linkTitle?.trim() ?? '';
    const url = linkUrl?.trim() ?? '';
    const link = title && url ? `${title}||${url}` : url || title || undefined;

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
              <Input
                id="country"
                placeholder="e.g. France"
                {...register('country')}
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
              <Input
                id="city"
                placeholder="e.g. Paris"
                {...register('city')}
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
              <Input
                id="productType"
                placeholder="e.g. Day Tour"
                {...register('productType')}
              />
              {errors.productType && (
                <p className="text-xs text-destructive">{errors.productType.message}</p>
              )}
            </div>

            {/* Link Title + URL */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="linkTitle">Link Title</Label>
                <Input
                  id="linkTitle"
                  placeholder="e.g. Tour Document"
                  {...register('linkTitle')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="linkUrl">Link URL</Label>
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

            {/* Product Name */}
            <div className="space-y-1.5">
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                placeholder="e.g. Eiffel Tower Guided Tour"
                {...register('productName')}
              />
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

            {/* PIC */}
            <div className="space-y-1.5">
              <Label htmlFor="pic">PIC</Label>
              <Controller
                name="pic"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? '__none__'}
                    onValueChange={(val) => field.onChange(val === '__none__' ? undefined : val)}
                  >
                    <SelectTrigger id="pic">
                      <SelectValue placeholder="Select PIC…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {PIC_VALUES.map((pic) => (
                        <SelectItem key={pic} value={pic}>
                          {pic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes…"
                rows={3}
                {...register('notes')}
              />
            </div>

            {/* Ready for Upload */}
            <div className="flex items-center justify-between rounded-md border px-4 py-3">
              <Label htmlFor="readyForUpload" className="cursor-pointer">
                Ready for Upload
              </Label>
              <Controller
                name="readyForUpload"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="readyForUpload"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
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
