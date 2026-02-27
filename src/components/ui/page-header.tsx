import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        'sticky top-0 z-10 -mx-6 -mt-6 mb-6 flex flex-col gap-1 border-b border-border bg-background px-6 pb-4 pt-6 dark:border-white/10 dark:bg-midnight-aurora',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold leading-tight tracking-tight text-foreground">
          {title}
        </h1>
        {children}
      </div>
      {description && (
        <p className="text-muted-foreground dark:text-zinc-400 text-sm leading-tight">{description}</p>
      )}
    </div>
  );
}
