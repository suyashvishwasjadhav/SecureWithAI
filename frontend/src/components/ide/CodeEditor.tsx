import { useRef, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import api from '../../lib/api';

interface CodeEditorProps {
  sessionId: string;
  fileContext: {
    content: string;
    language: string;
    path: string;
  };
  annotations: any[];
  onFixApplied: () => void;
}

export function CodeEditor({ sessionId, fileContext, annotations, onFixApplied }: CodeEditorProps) {
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (monaco && editorRef.current && annotations.length > 0) {
      const decs = annotations.map(ann => ({
        range: new monaco.Range(ann.line, 1, ann.line, 1),
        options: {
          isWholeLine: true,
          className: ann.type === 'error' ? 'bg-red-500/10 border-l-4 border-red-500' : 'bg-orange-500/10 border-l-4 border-orange-500',
          glyphMarginClassName: ann.type === 'error' ? 'fas fa-exclamation-circle text-red-500' : 'fas fa-exclamation-triangle text-orange-500',
          hoverMessage: {
            value: `**${ann.type === 'error' ? 'CRITICAL' : 'WARNING'}**\n\n${ann.message}\n\nQuick Fix available. Click the line to view.`
          }
        }
      }));
      
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, decs);
    } else if (editorRef.current) {
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
  }, [monaco, annotations, fileContext.path]);

  // Click handler for widget
  useEffect(() => {
    if (!editorRef.current) return;
    
    const disposable = editorRef.current.onMouseDown((e: any) => {
      const line = e.target.position?.lineNumber;
      if (!line) return;
      
      const ann = annotations.find(a => a.line === line && a.quick_fix);
      if (ann) {
         // Show a simple prompt or handle fix
         if (window.confirm(`Apply Quick Fix for ${ann.message}?\n\nFix: ${ann.quick_fix}`)) {
             api.post(`/ide/${sessionId}/fix`, { finding_id: ann.finding_id || ann.id, fixed_code: ann.quick_fix })
                .then(() => onFixApplied())
                .catch(err => {
                   console.error("Failed to apply quick fix:", err);
                 });
         }
      }
    });
    
    return () => disposable.dispose();
  }, [annotations, sessionId, onFixApplied]);

  return (
    <div className="flex-1 min-w-0 min-h-0 bg-[#1e1e1e] relative flex flex-col">
      <div className="h-10 bg-[#161616] border-b border-[#2a2a2a] flex items-center px-4">
        <div className="text-xs font-mono text-gray-400">
           {fileContext.path ? fileContext.path : '🛡️ Sentinel Space - Select a file'}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 top-10">
        <Editor
          height="100%"
          language={fileContext.language}
          theme="vs-dark"
          value={fileContext.content}
          onMount={handleEditorDidMount}
          options={{
            readOnly: false,
            minimap: { enabled: true },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineHeight: 22,
            scrollBeyondLastLine: false,
            hideCursorInOverviewRuler: true,
            glyphMargin: true
          }}
        />
      </div>
    </div>
  );
}
