import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

type MathContentProps = {
  content: string;
  className?: string;
  inline?: boolean;
};

function normalizeMathDelimiters(content: string): string {
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, math: string) => `\n\n$$\n${math.trim()}\n$$\n\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, math: string) => `$${math.trim()}$`);
}

const blockComponents: Components = {
  p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
  code: ({ children }) => (
    <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[0.9em] dark:bg-white/10">
      {children}
    </code>
  ),
};

const inlineComponents: Components = {
  p: ({ children }) => <>{children}</>,
  code: ({ children }) => <code className="font-mono text-[0.9em]">{children}</code>,
};

export function MathContent({ content, className, inline = false }: MathContentProps) {
  const markdown = (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={inline ? inlineComponents : blockComponents}
    >
      {normalizeMathDelimiters(content)}
    </ReactMarkdown>
  );

  if (inline) return <span className={className}>{markdown}</span>;

  return <div className={`math-content space-y-3 ${className ?? ""}`}>{markdown}</div>;
}
