import React, { useEffect, useRef, useState } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, className = "" }) => {
  const codeRef = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative group rounded-lg overflow-hidden bg-[#0d0d0d] border border-[#1f1f1f] ${className}`}>
      <button
        onClick={handleCopy}
        className="absolute right-3 top-3 p-2 bg-[#1f1f1f]/80 hover:bg-indigo-600 rounded-md transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm z-10"
      >
        {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-gray-400" />}
      </button>
      
      {language && (
        <div className="px-4 py-1 text-[10px] font-mono text-gray-500 bg-[#151515] border-b border-[#1f1f1f] uppercase tracking-widest">
          {language}
        </div>
      )}
      
      <pre className="p-4 overflow-x-auto text-sm leading-relaxed scrollbar-thin scrollbar-thumb-[#1f1f1f] scrollbar-track-transparent">
        <code ref={codeRef} className={`${language ? `language-${language}` : ''} block font-mono`}>
          {code}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock;
