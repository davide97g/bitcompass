import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { cn } from '@/lib/utils';
import { MermaidDiagram } from './mermaid-diagram';

interface MarkdownContentProps {
  /** Markdown source. Renders nothing if empty or undefined. */
  content: string | undefined | null;
  /** Optional class name merged with the wrapper div. */
  className?: string;
  /** Use smaller typography (e.g. for chat bubbles). */
  variant?: 'default' | 'compact';
}

/** Handle clicks on anchor links that point to an in-page heading. */
function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string | undefined) {
  if (!href?.startsWith('#')) return;
  const target = document.getElementById(href.slice(1));
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Update the URL hash without jumping
  history.pushState(null, '', href);
}

/**
 * Transform heading children: if the first text node starts with `[something]`,
 * render that part as a small styled tag instead of raw brackets.
 */
function transformHeadingChildren(children: ReactNode): ReactNode {
  const childArray = Array.isArray(children) ? children : [children];
  const first = childArray[0];

  // Case 1: first child is a plain string like "[orchestrator] MCP Orchestrator"
  if (typeof first === 'string') {
    const match = first.match(/^\[([^\]]+)\]\s*/);
    if (match) {
      const tag = match[1];
      const rest = first.slice(match[0].length);
      return [
        <span key="tag" className="inline-flex items-center mr-2 px-2 py-0.5 text-[0.55em] font-mono font-medium rounded-md bg-primary/10 text-primary align-middle">
          {tag}
        </span>,
        rest,
        ...childArray.slice(1),
      ];
    }
  }

  // Case 2: first child is a <a> link (react-markdown parsed `[text](#href)` inside heading)
  if (
    first &&
    typeof first === 'object' &&
    'props' in first &&
    first.props?.href?.startsWith('#')
  ) {
    const linkText = extractText(first.props.children);
    const href = first.props.href;
    return [
      <a
        key="tag"
        href={href}
        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => handleAnchorClick(e, href)}
        className="inline-flex items-center mr-2 px-2 py-0.5 text-[0.55em] font-mono font-medium rounded-md bg-primary/10 text-primary align-middle no-underline hover:bg-primary/20 transition-colors"
      >
        {linkText}
      </a>,
      ...childArray.slice(1),
    ];
  }

  return children;
}

/** Build a heading component that renders with an id (from rehype-slug) and a hover anchor link. */
function HeadingRenderer(Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6') {
  return function Heading({ id, children, ...props }: { id?: string; children?: ReactNode }) {
    return (
      <Tag id={id} className="scroll-mt-20 group" {...props}>
        {transformHeadingChildren(children)}
        {id && (
          <a
            href={`#${id}`}
            onClick={(e) => handleAnchorClick(e, `#${id}`)}
            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground no-underline"
            aria-label={`Link to ${typeof children === 'string' ? children : 'section'}`}
          >
            #
          </a>
        )}
      </Tag>
    );
  };
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
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeHighlight]}
        components={{
          h1: HeadingRenderer('h1'),
          h2: HeadingRenderer('h2'),
          h3: HeadingRenderer('h3'),
          h4: HeadingRenderer('h4'),
          h5: HeadingRenderer('h5'),
          h6: HeadingRenderer('h6'),
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                onClick={(e) => handleAnchorClick(e, href)}
                {...props}
              >
                {children}
              </a>
            );
          },
          pre({ children, ...props }) {
            const child = Array.isArray(children) ? children[0] : children;
            if (
              child &&
              typeof child === 'object' &&
              'props' in child &&
              child.props?.className?.includes('language-mermaid')
            ) {
              const codeText = extractText(child.props.children);
              return <MermaidDiagram chart={codeText} />;
            }
            return <pre {...props}>{children}</pre>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

/** Recursively extract text content from React children. */
function extractText(children: unknown): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children && typeof children === 'object' && 'props' in (children as Record<string, unknown>)) {
    return extractText((children as { props: { children?: unknown } }).props.children);
  }
  return '';
}
