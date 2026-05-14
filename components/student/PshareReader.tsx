import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function PshareReader({ body }: { body: string }) {
  return (
    <div className="text-ink [&_h1]:font-display [&_h2]:font-display font-sans text-[14px] leading-[1.7] [&_a]:underline [&_h1]:text-[22px] [&_h1]:italic [&_h2]:text-[18px] [&_h2]:italic">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}
