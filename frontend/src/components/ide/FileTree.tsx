import React from 'react';
import { ChevronRight, ChevronDown, Folder, File as FileIcon, ShieldAlert, AlertTriangle } from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  children?: FileNode[];
  score?: number;
}

interface Finding {
  id: string;
  severity: string;
}

interface FileTreeProps {
  tree: FileNode[];
  findings: Record<string, Finding[]>;
  activePath: string | null;
  onFileSelect: (path: string) => void;
}

// Helper to get file icons
const getFileIcon = (ext?: string, hasVulns?: boolean) => {
  if (hasVulns) return <FileIcon className="w-3 h-3 text-red-500" />;
  switch (ext) {
    case '.py': return <FileIcon className="w-3 h-3 text-blue-400" />;
    case '.js': 
    case '.ts': return <FileIcon className="w-3 h-3 text-yellow-400" />;
    case '.css': return <FileIcon className="w-3 h-3 text-blue-300" />;
    case '.html': return <FileIcon className="w-3 h-3 text-orange-400" />;
    case '.json': return <FileIcon className="w-3 h-3 text-green-400" />;
    default: return <FileIcon className="w-3 h-3 text-gray-500" />;
  }
};

const TreeNode = ({ node, level = 0, findings, activePath, onFileSelect }: { node: FileNode, level?: number } & Omit<FileTreeProps, 'tree'>) => {
  const [isOpen, setIsOpen] = React.useState(true);
  const isFile = node.type === 'file';
  const isActive = activePath === node.path;
  const nodeFindings = isFile ? findings[node.path] || [] : [];
  
  const hasCritical = nodeFindings.some(f => f.severity === 'critical');
  const hasHigh = nodeFindings.some(f => f.severity === 'high');

  return (
    <div className="font-mono text-xs select-none">
      <div 
        className={`flex items-center gap-1.5 py-1 px-2 hover:bg-white/5 cursor-pointer transition-colors ${isActive ? 'bg-indigo-500/20 text-indigo-300' : 'text-gray-400'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          if (isFile) onFileSelect(node.path);
          else setIsOpen(!isOpen);
        }}
        onContextMenu={(e) => {
           e.preventDefault();
           // Context menu placeholder
        }}
      >
        {!isFile ? (
          isOpen ? <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
        ) : <div className="w-3 shrink-0" />}

        {!isFile ? (
          <Folder className="w-3 h-3 text-indigo-400 shrink-0" />
        ) : getFileIcon(node.extension, nodeFindings.length > 0)}

        <span className={`truncate flex-1 ${nodeFindings.length > 0 ? 'text-red-300 font-bold' : ''}`}>
          {node.name}
        </span>

        {nodeFindings.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 pr-2">
             <span className={`text-[9px] font-black italic ${node.score && node.score < 50 ? 'text-red-500' : node.score && node.score < 80 ? 'text-orange-400' : 'text-green-500'}`}>
                {node.score}%
             </span>
             {hasCritical ? <ShieldAlert className="w-3 h-3 text-red-500" /> : <AlertTriangle className="w-3 h-3 text-orange-500" />}
             <span className="text-[9px] font-black bg-white/10 px-1 rounded-full">{nodeFindings.length}</span>
          </div>
        )}
      </div>
      
      {!isFile && isOpen && node.children && (
        <div>
          {node.children.map((child, i) => (
            <TreeNode key={i} node={child} level={level + 1} findings={findings} activePath={activePath} onFileSelect={onFileSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

export function FileTree({ tree, findings, activePath, onFileSelect }: FileTreeProps) {
  const [search, setSearch] = React.useState('');

  return (
    <div className="w-full min-w-[11rem] max-w-[min(17rem,32vw)] bg-[#0a0a0a] border-l border-[#1f1f1f] flex flex-col flex-shrink-0 min-h-0">
      <div className="p-3 border-b border-[#1f1f1f]">
        <input 
          type="text" 
          placeholder="Search files..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-[#161616] border border-[#2a2a2a] rounded text-xs px-3 py-1.5 text-gray-300 focus:border-indigo-500 outline-none transition-colors"
        />
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {tree.length === 0 ? (
          <div className="text-center text-gray-600 text-[10px] font-black uppercase tracking-widest mt-8">Empty Repository</div>
        ) : (
          tree.map((node, i) => (
            <TreeNode key={i} node={node} findings={findings} activePath={activePath} onFileSelect={onFileSelect} />
          ))
        )}
      </div>
    </div>
  );
}
