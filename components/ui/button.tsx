import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[hsl(var(--text-primary))] text-[hsl(var(--background))] hover:opacity-90",
        destructive:
          "bg-red-500 text-white hover:bg-red-500/90 dark:bg-red-500 dark:hover:bg-red-500/90",
        outline:
          "border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--surface))]",
        secondary:
          "border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-[hsl(var(--text-primary))] hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--surface-raised))]",
        ghost:
          "text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--surface))] hover:text-[hsl(var(--text-primary))]",
        link: "text-[hsl(var(--text-primary))] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-3",
        lg: "h-10 px-4",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
