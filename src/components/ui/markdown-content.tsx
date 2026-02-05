import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  /** Markdown source. Renders nothing if empty or undefined. */
  content: string | undefined | null;
  /** Optional class name merged with the wrapper div. */
  className?: string;
  /** Use smaller typography (e.g. for chat bubbles). */
  variant?: 'default' | 'compact';
}

export const MarkdownContent = ({
  content,
  className,
  variant = 'default',
}: MarkdownContentProps) => {
  if (content === undefined || content === null || content.trim() === '') {
    return null;
  }

  const proseClass =
    variant === 'compact'
      ? 'prose prose-sm dark:prose-invert max-w-none'
      : 'prose dark:prose-invert max-w-none';

  return (
    <div className={cn(proseClass, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
