import type { ReactNode } from "react";

function inlineNodes(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match = pattern.exec(text);
  let key = 0;

  while (match) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    }

    key += 1;
    lastIndex = match.index + token.length;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function TermsBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    const items = listItems;
    listItems = [];
    blocks.push(
      <ul key={`list-${blocks.length}`} className="list-disc space-y-1 pl-4">
        {items.map((item) => (
          <li key={item}>{inlineNodes(item)}</li>
        ))}
      </ul>,
    );
  };

  lines.forEach((line) => {
    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      return;
    }

    flushList();
    if (line.trim().length === 0) {
      return;
    }

    blocks.push(
      <p key={`line-${blocks.length}`} className="leading-5">
        {inlineNodes(line)}
      </p>,
    );
  });

  flushList();

  return <div className="space-y-2 text-[11px] leading-5 text-steel/80">{blocks}</div>;
}

export function wrapSelection(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
) {
  const selected = value.slice(start, end) || "text";
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;

  return {
    next,
    cursor: start + before.length + selected.length + after.length,
  };
}

export function prefixCurrentLine(value: string, caret: number) {
  const lineStart = value.lastIndexOf("\n", Math.max(0, caret - 1)) + 1;
  const alreadyListed = value.slice(lineStart, lineStart + 2) === "- ";
  if (alreadyListed) {
    return { next: value, cursor: caret };
  }

  const next = `${value.slice(0, lineStart)}- ${value.slice(lineStart)}`;
  return { next, cursor: caret + 2 };
}
