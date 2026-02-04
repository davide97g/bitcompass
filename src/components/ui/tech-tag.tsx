import { cn } from '@/lib/utils';

interface TechTagProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'cyan';
  className?: string;
  onClick?: () => void;
}

const variantClasses = {
  blue: 'tag-blue',
  green: 'tag-green',
  purple: 'tag-purple',
  orange: 'tag-orange',
  pink: 'tag-pink',
  cyan: 'tag-cyan',
};

export function TechTag({ children, variant = 'blue', className, onClick }: TechTagProps) {
  const Component = onClick ? 'button' : 'span';
  
  return (
    <Component
      className={cn('tag', variantClasses[variant], onClick && 'cursor-pointer hover:opacity-80', className)}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

// Helper to assign consistent colors to technology names
const techColors: Record<string, TechTagProps['variant']> = {
  react: 'blue',
  typescript: 'blue',
  javascript: 'orange',
  graphql: 'pink',
  nodejs: 'green',
  'node.js': 'green',
  python: 'cyan',
  kubernetes: 'blue',
  docker: 'cyan',
  aws: 'orange',
  postgresql: 'blue',
  redis: 'orange',
  terraform: 'purple',
  tensorflow: 'orange',
  pytorch: 'orange',
  security: 'purple',
  devops: 'green',
  frontend: 'blue',
  backend: 'green',
  ai: 'purple',
  'machine learning': 'purple',
};

export function getTechColor(tech: string): TechTagProps['variant'] {
  const key = tech.toLowerCase();
  return techColors[key] || 'blue';
}
