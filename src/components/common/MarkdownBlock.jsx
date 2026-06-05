import React from 'react';

const headingClasses = {
  1: 'text-3xl font-bold text-primary',
  2: 'text-2xl font-bold text-primary',
  3: 'text-xl font-bold text-primary',
};

const inlineTokenPattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

const MarkdownBlock = ({ content, className = '' }) => {
  const blocks = parseBlocks(content);

  if (!blocks.length) return null;

  return (
    <div className={`space-y-3 text-sm leading-6 text-gray-700 ${className}`}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
};

function parseBlocks(content = '') {
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };

  const flushList = () => {
    if (!list.length) return;
    blocks.push({ type: 'list', items: list });
    list = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      return;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      return;
    }

    const listMatch = /^[-*]\s+(.+)$/.exec(line);
    if (listMatch) {
      flushParagraph();
      list.push(listMatch[1]);
      return;
    }

    flushList();
    paragraph.push(line);
  });

  flushParagraph();
  flushList();
  return blocks;
}

function renderBlock(block, index) {
  if (block.type === 'heading') {
    const Tag = `h${block.level}`;
    return (
      <Tag key={index} className={headingClasses[block.level] || headingClasses[3]}>
        {renderInline(block.text)}
      </Tag>
    );
  }

  if (block.type === 'list') {
    return (
      <ul key={index} className="list-disc space-y-2 pl-5">
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }

  return <p key={index}>{renderInline(block.text)}</p>;
}

function renderInline(text = '') {
  const parts = String(text).split(inlineTokenPattern).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      const href = safeHref(linkMatch[2]);
      if (!href) return linkMatch[1];
      return (
        <a key={index} href={href} target="_blank" rel="noopener noreferrer" className="font-bold text-primary underline underline-offset-2">
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}

function safeHref(value = '') {
  const href = String(value || '').trim();
  if (href.startsWith('/')) return href;
  if (/^https?:\/\//i.test(href)) return href;
  if (/^mailto:/i.test(href)) return href;
  return '';
}

export default MarkdownBlock;
