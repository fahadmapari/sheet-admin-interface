import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent))]",
  {
    variants: {
      variant: {
        default:
          "border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-[hsl(var(--text-secondary))]",
        secondary:
          "border-[hsl(var(--border))] bg-[hsl(var(--surface-raised))] text-[hsl(var(--text-secondary))]",
        destructive:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/15 dark:text-red-300",
        outline:
          "border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--text-secondary))]",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300",
        warning:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300",
        error:
          "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/15 dark:text-red-300",
        info:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
