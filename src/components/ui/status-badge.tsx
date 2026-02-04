import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'open' | 'solved' | 'in-progress' | 'active' | 'completed' | 'on-hold' | 'planning';
  className?: string;
}

const statusConfig = {
  open: { label: 'Open', className: 'status-open' },
  solved: { label: 'Solved', className: 'status-solved' },
  'in-progress': { label: 'In Progress', className: 'status-in-progress' },
  active: { label: 'Active', className: 'status-in-progress' },
  completed: { label: 'Completed', className: 'status-solved' },
  'on-hold': { label: 'On Hold', className: 'status-open' },
  planning: { label: 'Planning', className: 'bg-slate-100 text-slate-700' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn('status-badge', config.className, className)}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        status === 'open' || status === 'on-hold' ? 'bg-amber-500' :
        status === 'solved' || status === 'completed' ? 'bg-emerald-500' :
        status === 'in-progress' || status === 'active' ? 'bg-blue-500' :
        'bg-slate-400'
      )} />
      {config.label}
    </span>
  );
}
