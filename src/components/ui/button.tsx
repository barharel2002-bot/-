import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// כפתור בסיסי — מבוסס על shadcn/ui עם התאמות לאפליקציה
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // ראשי — גרדיאנט creator
        default:
          'bg-creator-gradient text-white shadow-lg shadow-creator-purple/20 hover:shadow-creator-purple/40 hover:scale-[1.02] active:scale-[0.98]',
        // משני — מסגרת בלבד
        outline:
          'border border-border bg-transparent text-foreground hover:bg-card hover:border-muted-foreground/30',
        // שקוף — לפעולות עדינות
        ghost: 'bg-transparent text-foreground hover:bg-card',
        // קישור
        link: 'text-foreground underline-offset-4 hover:underline',
        // הרס — אדום
        destructive:
          'bg-red-600/90 text-white hover:bg-red-600 active:bg-red-700',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
