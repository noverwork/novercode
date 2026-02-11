import { DiffEditor } from '@monaco-editor/react';
import { invoke } from '@tauri-apps/api/core';
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FilePlus,
  FileX,
  Folder,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DiffViewProps {
  workingDir?: string;
  active?: boolean;
}

interface ChangedFile {
  path: string;
  status: string;
}

interface FileDiff {
  path: string;
  original: string;
  modified: string;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  status?: string;
  children: TreeNode[];
}

function getFileLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    html: 'html',
    rs: 'rust',
    py: 'python',
    go: 'go',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
  };
  return langMap[ext || ''] || 'plaintext';
}

function getStatusIcon(status: string) {
  if (status.includes('A') || status === '??')
    return (
      <FilePlus
        className="h-3 w-3 text-[#00FF00]"
        style={{ textShadow: '0 0 10px rgba(0,255,0,0.5)' }}
      />
    );
  if (status.includes('D'))
    return (
      <FileX
        className="h-3 w-3 text-[#FF0000]"
        style={{ textShadow: '0 0 10px rgba(255,0,0,0.5)' }}
      />
    );
  return <FileCode className="h-3 w-3 text-[rgba(255,255,255,0.7)]" />;
}

function buildTree(files: ChangedFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');

      let node = current.find((n) => n.name === name);
      if (!node) {
        node = {
          name,
          path,
          isFolder: !isLast,
          status: isLast ? file.status : undefined,
          children: [],
        };
        current.push(node);
      }
      current = node.children;
    }
  }

  // Sort: folders first, then files, alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes
      .map((n) => ({ ...n, children: sortNodes(n.children) }))
      .sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  };

  return sortNodes(root);
}

function TreeItem({
  node,
  selectedFile,
  onSelect,
  expandedFolders,
  onToggleFolder,
  depth = 0,
}: {
  node: TreeNode;
  selectedFile: string | null;
  onSelect: (path: string) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  depth?: number;
}) {
  const isExpanded = expandedFolders.has(node.path);

  if (node.isFolder) {
    return (
      <div>
        <button
          onClick={() => onToggleFolder(node.path)}
          className="w-full flex items-center gap-1 px-2 py-1 rounded font-mono text-xs text-left text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)]"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
          )}
          <Folder className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{node.name}</span>
        </button>
        {isExpanded && (
          <div>
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                selectedFile={selectedFile}
                onSelect={onSelect}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded font-mono text-xs text-left transition-colors ${
        selectedFile === node.path
          ? 'bg-[rgba(255,255,255,0.1)] text-[#FFFFFF]'
          : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#FFFFFF]'
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      {getStatusIcon(node.status || 'M')}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function DiffView({ workingDir, active = false }: DiffViewProps) {
  const [files, setFiles] = useState<ChangedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiff, setFileDiff] = useState<FileDiff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set());

  const statusSummary = useMemo(() => {
    return files.reduce(
      (acc, file) => {
        if (file.status === '??' || file.status.includes('A')) {
          acc.added += 1;
        } else if (file.status.includes('D')) {
          acc.deleted += 1;
        } else {
          acc.modified += 1;
        }
        return acc;
      },
      { added: 0, modified: 0, deleted: 0 }
    );
  }, [files]);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // 展開所有包含文件的資料夾
  const expandAllFolders = useCallback((files: ChangedFile[]) => {
    const folders = new Set<string>();
    for (const file of files) {
      const parts = file.path.split('/');
      for (let i = 1; i < parts.length; i++) {
        folders.add(parts.slice(0, i).join('/'));
      }
    }
    setExpandedFolders(folders);
  }, []);

  const fetchFiles = useCallback(async () => {
    if (!workingDir) {
      setFiles([]);
      setSelectedFile(null);
      setFileDiff(null);
      return;
    }

    setIsLoading(true);
    try {
      const result = await invoke<ChangedFile[]>('get_changed_files', { path: workingDir });
      setFiles(result);
      expandAllFolders(result);
      setSelectedFile((prev) => {
        if (result.length === 0) {
          return null;
        }
        if (prev && result.some((file) => file.path === prev)) {
          return prev;
        }
        return result[0].path;
      });
    } catch (e) {
      console.error('Failed to get changed files:', e);
      setFiles([]);
      setSelectedFile(null);
      setFileDiff(null);
    } finally {
      setIsLoading(false);
    }
  }, [workingDir, expandAllFolders]);

  const fetchFileDiff = useCallback(async () => {
    if (!workingDir || !selectedFile) {
      setFileDiff(null);
      return;
    }

    setIsLoadingDiff(true);
    try {
      const result = await invoke<FileDiff>('get_file_diff', {
        path: workingDir,
        filePath: selectedFile,
      });
      setFileDiff(result);
    } catch (e) {
      console.error('Failed to get file diff:', e);
      setFileDiff(null);
    } finally {
      setIsLoadingDiff(false);
    }
  }, [workingDir, selectedFile]);

  useEffect(() => {
    if (!active) {
      return;
    }
    fetchFiles();
  }, [active, fetchFiles]);

  useEffect(() => {
    if (!active) {
      return;
    }
    fetchFileDiff();
  }, [active, fetchFileDiff]);

  return (
    <div className="h-full flex bg-[#0a0a0a]">
      {/* File List */}
      <div className="w-56 border-r border-[rgba(255,255,255,0.15)] flex flex-col">
        <div className="h-9 px-3 border-b border-[rgba(255,255,255,0.15)] flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-[rgba(255,255,255,0.6)] font-[Helvetica_Neue,Arial,sans-serif] uppercase tracking-[0.2em]">
              changed files
            </span>
            <span className="text-[10px] font-mono text-[rgba(255,255,255,0.35)]">
              {files.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchFiles}
            disabled={isLoading}
            className="text-[rgba(255,255,255,0.4)] hover:text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.05)] h-6 w-6"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>
        <div className="h-7 px-3 border-b border-[rgba(255,255,255,0.08)] flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]">
          <span className="text-[#00FF00]">A {statusSummary.added}</span>
          <span className="text-[rgba(255,255,255,0.65)]">M {statusSummary.modified}</span>
          <span className="text-[#ff6b6b]">D {statusSummary.deleted}</span>
        </div>
        <ScrollArea className="flex-1">
          <div className="py-1">
            {files.length === 0 ? (
              <div className="text-center py-8 text-[rgba(255,255,255,0.3)] font-mono text-xs">
                no changes
              </div>
            ) : (
              buildTree(files).map((node) => (
                <TreeItem
                  key={node.path}
                  node={node}
                  selectedFile={selectedFile}
                  onSelect={setSelectedFile}
                  expandedFolders={expandedFolders}
                  onToggleFolder={toggleFolder}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Diff Editor */}
      <div className="flex-1 flex flex-col">
        {selectedFile && (
          <div className="h-9 px-3 border-b border-[rgba(255,255,255,0.15)] flex items-center">
            <span className="text-xs text-[rgba(255,255,255,0.5)] font-mono truncate">
              {selectedFile}
            </span>
          </div>
        )}
        <div className="flex-1">
          {isLoadingDiff ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[rgba(255,255,255,0.5)]" />
            </div>
          ) : fileDiff ? (
            <DiffEditor
              original={fileDiff.original}
              modified={fileDiff.modified}
              language={getFileLanguage(fileDiff.path)}
              theme="vs-dark"
              options={{
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                diffWordWrap: 'on',
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-[rgba(255,255,255,0.3)] font-mono text-sm">
              {files.length === 0 ? 'no changes to display' : 'select a file'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
