import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1 mb-6 pb-4 border-b border-border', className)}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight leading-tight">{title}</h1>
        {children}
      </div>
      {description && (
        <p className="text-muted-foreground text-sm leading-tight">{description}</p>
      )}
    </div>
  );
}
