"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function PshareReader({ body }: { body: string }) {
  return (
    <div className="prose prose-sm max-w-none font-sans text-[14px] leading-[1.7] text-ink [&_h1]:font-display [&_h1]:italic [&_h1]:text-[22px] [&_h2]:font-display [&_h2]:italic [&_h2]:text-[18px] [&_a]:underline">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
    </div>
  );
}
