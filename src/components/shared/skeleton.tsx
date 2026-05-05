import { cn } from '@/lib/utils';

// בלוק skeleton בסיסי — רקע מטושטש מטעמי "טוען"
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted/60',
        className
      )}
      {...props}
    />
  );
}
