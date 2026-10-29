import React, { useState } from 'react';
import katex from 'katex';
import { Copy, Check, Terminal, Sparkles, CheckCircle2 } from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';

interface MarkdownMessageProps {
  content: string;
  role: 'user' | 'assistant' | 'system';
}

// Fallback Unicode representation if KaTeX ever fails on broken LaTeX syntax
const cleanUnicodeMath = (raw: string): string => {
  return raw
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\left\s*([(\[{])/g, '$1')
    .replace(/\\right\s*([)\]}])/g, '$1')
    .replace(/≤ft\s*([(\[{])/g, '$1')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\approx/g, '≈')
    .replace(/\\le\b/g, '≤')
    .replace(/\\ge\b/g, '≥')
    .replace(/\\leq\b/g, '≤')
    .replace(/\\geq\b/g, '≥')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\gamma\b/g, 'γ')
    .replace(/\\delta\b/g, 'δ')
    .replace(/\\Delta\b/g, 'Δ')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\lambda\b/g, 'λ')
    .replace(/\\mu\b/g, 'μ')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\omega\b/g, 'ω')
    .replace(/\\int\b/g, '∫')
    .replace(/\\sum\b/g, '∑')
    .replace(/\\infty\b/g, '∞')
    .replace(/\\rightarrow\b/g, '→')
    .replace(/\\vec\{([^}]+)\}/g, 'vec($1)')
    .replace(/_([0-9a-zA-Z])/g, (_, ch) => {
      const subs: Record<string, string> = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
      };
      return subs[ch] || `_${ch}`;
    })
    .replace(/\^([0-9a-zA-Z])/g, (_, ch) => {
      const sups: Record<string, string> = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      };
      return sups[ch] || `^${ch}`;
    });
};

// Render math expression to KaTeX HTML string with robust fallback
const renderMathToHtml = (rawMath: string, isBlock: boolean): string => {
  let clean = rawMath.trim();

  // Strip wrapping delimiters
  if (clean.startsWith('$$') && clean.endsWith('$$')) {
    clean = clean.slice(2, -2).trim();
  } else if (clean.startsWith('\\[') && clean.endsWith('\\]')) {
    clean = clean.slice(2, -2).trim();
  } else if (clean.startsWith('\\(') && clean.endsWith('\\)')) {
    clean = clean.slice(2, -2).trim();
  } else if (clean.startsWith('$') && clean.endsWith('$')) {
    clean = clean.slice(1, -1).trim();
  } else if (clean.startsWith('[') && clean.endsWith(']')) {
    clean = clean.slice(1, -1).trim();
  }

  // Auto-correct common OCR or LLM typos like ≤ft instead of \left
  clean = clean
    .replace(/≤ft/g, '\\left')
    .replace(/≤/g, '\\le ')
    .replace(/≥/g, '\\ge ')
    .replace(/\\left\s*([(\[{|.\\])/g, '\\left$1')
    .replace(/\\right\s*([)\]}|.\\])/g, '\\right$1');

  // Delimiter balance check: if \left and \right counts differ, strip them to plain parens
  const leftCount = (clean.match(/\\left/g) || []).length;
  const rightCount = (clean.match(/\\right/g) || []).length;
  if (leftCount !== rightCount) {
    clean = clean
      .replace(/\\left([(\[{|.\\])/g, '$1')
      .replace(/\\right([)\]}|.\\])/g, '$1');
  }

  // Attempt 1: Full KaTeX rendering with strict: false and throwOnError: true for safety
  try {
    return katex.renderToString(clean, {
      displayMode: isBlock,
      throwOnError: true,
      output: 'htmlAndMathml',
      strict: false,
    });
  } catch {
    // Attempt 2: Simplify any troublesome \left or \right constructs
    try {
      const simplified = clean
        .replace(/\\left([(\[{|.\\])/g, '$1')
        .replace(/\\right([)\]}|.\\])/g, '$1')
        .replace(/\\left/g, '')
        .replace(/\\right/g, '');
      return katex.renderToString(simplified, {
        displayMode: isBlock,
        throwOnError: true,
        output: 'htmlAndMathml',
        strict: false,
      });
    } catch {
      // Attempt 3: Guaranteed clean, styled mathematical Unicode fallback
      const unicodeResult = cleanUnicodeMath(clean);
      return `<span class="katex-unicode-math font-serif text-amber-200 tracking-wide font-normal">${unicodeResult}</span>`;
    }
  }
};

// Block Math Component (e.g. $$...$$, \[...\], or [a = \left( \frac{...}{...} \right) ...])
const MathBlockView: React.FC<{ math: string }> = ({ math }) => {
  const html = renderMathToHtml(math, true);
  return (
    <div className="my-3 py-3 px-4 rounded-2xl bg-neutral-950/95 border border-purple-800/50 text-amber-200 overflow-x-auto shadow-md flex items-center justify-center no-scrollbar">
      <div
        className="katex-display-container text-sm sm:text-base leading-normal font-serif select-text"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

// Inline Math Component
const MathInlineView: React.FC<{ math: string }> = ({ math }) => {
  const html = renderMathToHtml(math, false);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 mx-1 rounded-lg bg-neutral-950/90 border border-purple-900/50 text-amber-200 font-serif text-[13px] align-baseline leading-none select-text shadow-xs"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content, role }) => {
  if (role === 'user') {
    return <div className="whitespace-pre-wrap leading-relaxed select-text font-sans">{content}</div>;
  }

  // Parse markdown into blocks: code blocks, display math, headers, lists, blockquotes, tables, and paragraphs
  const renderFormattedContent = (rawText: string) => {
    // 1. Separate Code Blocks (``` ... ```)
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    let segmentIndex = 0;
    while ((match = codeBlockRegex.exec(rawText)) !== null) {
      if (match.index > lastIndex) {
        const textBefore = rawText.substring(lastIndex, match.index);
        parts.push(
          <React.Fragment key={`text-${segmentIndex}`}>
            {renderTextBlock(textBefore, segmentIndex)}
          </React.Fragment>
        );
        segmentIndex++;
      }

      const language = match[1] || 'code';
      const codeContent = match[2];
      parts.push(
        <CodeBlockView
          key={`code-${segmentIndex}`}
          language={language}
          code={codeContent}
        />
      );
      segmentIndex++;
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < rawText.length) {
      const remainingText = rawText.substring(lastIndex);
      parts.push(
        <React.Fragment key={`text-${segmentIndex}`}>
          {renderTextBlock(remainingText, segmentIndex)}
        </React.Fragment>
      );
    }

    return parts;
  };

  // Render text segments that may include headers, display math, lists, blockquotes, tables
  const renderTextBlock = (text: string, blockKey: number) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Empty line
      if (!line.trim()) {
        i++;
        continue;
      }

      const trimmed = line.trim();

      // Standalone Display Math Block ($$...$$, \[...\], or [a = ... \frac ...])
      const isDisplayMathLine =
        (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 2) ||
        (trimmed.startsWith('\\[') && trimmed.endsWith('\\]')) ||
        (trimmed.startsWith('[') &&
          trimmed.endsWith(']') &&
          /(?:\\(?:frac|left|right|sqrt|int|sum|vec|alpha|beta|theta|mu|Delta|approx|pm|times|cdot|le|ge|leq|geq)|≤ft)/.test(
            trimmed
          ));

      if (isDisplayMathLine) {
        elements.push(<MathBlockView key={`mathblock-${blockKey}-${i}`} math={trimmed} />);
        i++;
        continue;
      }

      // Headers
      if (line.startsWith('### ')) {
        elements.push(
          <div key={`h3-${blockKey}-${i}`} className="mt-3.5 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <h3 className="text-xs font-bold text-purple-200 tracking-wide">
              {renderInlineSpans(line.replace('### ', ''))}
            </h3>
          </div>
        );
        i++;
        continue;
      }

      if (line.startsWith('## ')) {
        elements.push(
          <div key={`h2-${blockKey}-${i}`} className="mt-4 mb-2 pb-1 border-b border-neutral-800/80 flex items-center gap-2">
            <div className="w-2 h-2 rounded-xs bg-gradient-to-tr from-purple-500 to-indigo-400" />
            <h2 className="text-sm font-bold text-neutral-100 tracking-tight">
              {renderInlineSpans(line.replace('## ', ''))}
            </h2>
          </div>
        );
        i++;
        continue;
      }

      if (line.startsWith('# ')) {
        elements.push(
          <div key={`h1-${blockKey}-${i}`} className="mt-4 mb-2 pb-1.5 border-b border-purple-800/40">
            <h1 className="text-base font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-indigo-100 to-amber-200 tracking-tight">
              {renderInlineSpans(line.replace('# ', ''))}
            </h1>
          </div>
        );
        i++;
        continue;
      }

      // Blockquote / Pro-Tip Callouts (starts with >)
      if (line.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith('>')) {
          quoteLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        elements.push(
          <div
            key={`quote-${blockKey}-${i}`}
            className="my-2.5 p-3 rounded-xl bg-gradient-to-r from-purple-950/40 to-neutral-900 border-l-3 border-purple-500 border-y border-r border-neutral-800/60 text-purple-200/90 text-xs space-y-1 shadow-sm"
          >
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold text-purple-400">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Pro-Tip / Key Formula</span>
            </div>
            <div className="leading-relaxed">
              {quoteLines.map((ql, qIdx) => (
                <div key={qIdx} className="my-0.5">
                  {renderInlineSpans(ql)}
                </div>
              ))}
            </div>
          </div>
        );
        continue;
      }

      // Table (lines with |)
      if (line.trim().startsWith('|') && line.includes('|', 1)) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }
        elements.push(
          <div key={`table-${blockKey}-${i}`} className="my-3 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950/60 shadow-inner">
            <table className="w-full text-left text-xs border-collapse">
              {renderTable(tableLines)}
            </table>
          </div>
        );
        continue;
      }

      // Unordered List Items (- or * or •)
      if (/^[-*•]\s+/.test(line.trim())) {
        const listItems: string[] = [];
        while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
          listItems.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
          i++;
        }
        elements.push(
          <ul key={`ul-${blockKey}-${i}`} className="my-2 space-y-1.5 pl-1">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-neutral-200">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 mt-1.5 shadow-xs" />
                <div className="flex-1">{renderInlineSpans(item)}</div>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Ordered List Items (1. or 2.)
      if (/^\d+\.\s+/.test(line.trim())) {
        const listItems: { num: string; text: string }[] = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          const matchNum = lines[i].trim().match(/^(\d+)\.\s+(.*)$/);
          if (matchNum) {
            listItems.push({ num: matchNum[1], text: matchNum[2] });
          }
          i++;
        }
        elements.push(
          <ol key={`ol-${blockKey}-${i}`} className="my-2 space-y-1.5 pl-1">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-neutral-200">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-purple-900/60 border border-purple-700/60 text-[10px] font-mono font-bold text-purple-300 shrink-0 mt-0.5 shadow-xs">
                  {item.num}
                </span>
                <div className="flex-1">{renderInlineSpans(item.text)}</div>
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // Action Approval Disclaimer highlight
      if (line.includes('Action Approval Disclaimer') || line.includes('Action Confirmation')) {
        elements.push(
          <div
            key={`action-disc-${blockKey}-${i}`}
            className="my-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-2 text-emerald-300 text-xs shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="font-medium">{renderInlineSpans(line)}</div>
          </div>
        );
        i++;
        continue;
      }

      // Regular paragraph line
      elements.push(
        <p key={`p-${blockKey}-${i}`} className="my-1.5 text-xs text-neutral-200 leading-relaxed font-sans">
          {renderInlineSpans(line)}
        </p>
      );
      i++;
    }

    return elements;
  };

  // Render inline formatting: math formulas, fractions, **bold**, *italic*, `code`
  const renderInlineSpans = (text: string): React.ReactNode => {
    // Regex matches:
    // 1. $$ display math
    // 2. \[ ... \] display math
    // 3. \( ... \) inline math
    // 4. $ ... $ inline math
    // 5. [ ... \frac ... ] or [ ... ≤ft ... ] bracket math formulas
    // 6. Naked equations e.g. a = \left( \frac{...}{...} \right) g or a = \frac{...}{...}
    // 7. Naked \frac{...}{...}
    // 8. `code`
    // 9. **bold**
    // 10. *italic*
    const pattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\(.+?\\\)|\\frac\{[^}]+\}\{[^}]+\}|\$[^\$]+?\$|\[[^\]\n]*?(?:\\(?:frac|left|right|sqrt|int|sum|vec|alpha|beta|theta|mu|Delta|approx|pm|times|cdot|le|ge)|≤ft)[^\]\n]*?\]|[a-zA-Z0-9_]+\s*=\s*(?:\\left\(|≤ft\()[^=]+?(?:\\right\)|[)\]])\s*[a-zA-Z0-9_]*|[a-zA-Z0-9_]+\s*=\s*\\frac\{[^}]+\}\{[^}]+\}[a-zA-Z0-9_]*|`[^`]+`|\*\*[^*]+?\*\*|\*[^*]+?\*)/g;
    const parts = text.split(pattern);

    return parts.map((part, index) => {
      if (!part) return null;

      // 1. Display Math ($$ ... $$ or \[ ... \])
      if (
        (part.startsWith('$$') && part.endsWith('$$')) ||
        (part.startsWith('\\[') && part.endsWith('\\]'))
      ) {
        return <MathBlockView key={index} math={part} />;
      }

      // 2. Bracket LaTeX formula e.g. [a = \left( \frac{m_2 - m_1}{m_1 + m_2} \right) g] or [a = ≤ft( ... \right) g]
      if (
        part.startsWith('[') &&
        part.endsWith(']') &&
        /(?:\\(?:frac|left|right|sqrt|int|sum|vec|alpha|beta|theta|mu|Delta|approx|pm|times|cdot|le|ge)|≤ft)/.test(part)
      ) {
        return <MathInlineView key={index} math={part} />;
      }

      // 3. Inline Math ($ ... $ or \( ... \))
      if (
        (part.startsWith('$') && part.endsWith('$') && part.length > 2) ||
        (part.startsWith('\\(') && part.endsWith('\\)'))
      ) {
        return <MathInlineView key={index} math={part} />;
      }

      // 4. Naked equation e.g. a = \left( \frac{m_2 - m_1}{m_1 + m_2} \right) g
      if (
        /[a-zA-Z0-9_]+\s*=\s*(?:\\left\(|≤ft\(|\\frac)/.test(part)
      ) {
        return <MathInlineView key={index} math={part} />;
      }

      // 5. Naked Fraction \frac{...}{...}
      if (part.startsWith('\\frac{')) {
        return <MathInlineView key={index} math={part} />;
      }

      // 6. Inline Code (`...`)
      if (part.startsWith('`') && part.endsWith('`')) {
        const code = part.slice(1, -1);
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-neutral-800/80 border border-neutral-700/60 font-mono text-[11px] text-purple-300 font-medium"
          >
            {code}
          </code>
        );
      }

      // 6. Bold (**...**)
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-neutral-100">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // 7. Italic (*...*)
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={index} className="italic text-neutral-300">
            {part.slice(1, -1)}
          </em>
        );
      }

      return part;
    });
  };

  // Helper to parse and render Markdown tables
  const renderTable = (lines: string[]) => {
    if (lines.length === 0) return null;
    const parseRow = (line: string) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim());

    const header = parseRow(lines[0]);
    const bodyLines = lines.slice(1).filter((l) => !l.includes('---'));

    return (
      <>
        <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-300 font-semibold text-[11px]">
          <tr>
            {header.map((col, idx) => (
              <th key={idx} className="p-2.5">
                {renderInlineSpans(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800/60">
          {bodyLines.map((rowLine, rIdx) => {
            const cells = parseRow(rowLine);
            return (
              <tr key={rIdx} className="hover:bg-neutral-900/40 transition-colors">
                {cells.map((cell, cIdx) => (
                  <td key={cIdx} className="p-2.5 text-neutral-200">
                    {renderInlineSpans(cell)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </>
    );
  };

  return <div className="space-y-1 select-text">{renderFormattedContent(content)}</div>;
};

// Component for styled Code Block with Copy Button and tactile sound
const CodeBlockView: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    soundEffects.playCopied();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-900/90 border-b border-neutral-800 text-[11px] text-neutral-400">
        <div className="flex items-center gap-1.5 font-mono">
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span>{language || 'code'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-100 transition-colors px-2 py-0.5 rounded hover:bg-neutral-800"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto font-mono text-xs text-neutral-200 leading-relaxed no-scrollbar">
        <code>{code.trim()}</code>
      </pre>
    </div>
  );
};
