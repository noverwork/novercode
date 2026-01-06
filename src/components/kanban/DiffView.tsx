import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DiffEditor } from "@monaco-editor/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, FileCode, FilePlus, FileX, Folder, ChevronRight, ChevronDown } from "lucide-react";

interface DiffViewProps {
  workingDir?: string;
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
  const ext = path.split(".").pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    css: "css",
    scss: "scss",
    html: "html",
    rs: "rust",
    py: "python",
    go: "go",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
  };
  return langMap[ext || ""] || "plaintext";
}

function getStatusIcon(status: string) {
  if (status.includes("A") || status === "??") return <FilePlus className="h-3 w-3 text-green-500" />;
  if (status.includes("D")) return <FileX className="h-3 w-3 text-red-500" />;
  return <FileCode className="h-3 w-3 text-yellow-500" />;
}

function buildTree(files: ChangedFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");

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
          className="w-full flex items-center gap-1 px-2 py-1 rounded font-mono text-xs text-left text-green-600 hover:bg-green-900/20"
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
          ? "bg-green-900/40 text-green-400"
          : "text-green-700 hover:bg-green-900/20 hover:text-green-500"
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      {getStatusIcon(node.status || "M")}
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function DiffView({ workingDir }: DiffViewProps) {
  const [files, setFiles] = useState<ChangedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileDiff, setFileDiff] = useState<FileDiff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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
      const parts = file.path.split("/");
      for (let i = 1; i < parts.length; i++) {
        folders.add(parts.slice(0, i).join("/"));
      }
    }
    setExpandedFolders(folders);
  }, []);

  const fetchFiles = useCallback(async () => {
    if (!workingDir) {
      setFiles([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await invoke<ChangedFile[]>("get_changed_files", { path: workingDir });
      setFiles(result);
      expandAllFolders(result);
      // 只有在沒有選擇檔案時才自動選擇第一個
      setSelectedFile((prev) => {
        if (!prev && result.length > 0) {
          return result[0].path;
        }
        return prev;
      });
    } catch (e) {
      console.error("Failed to get changed files:", e);
      setFiles([]);
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
      const result = await invoke<FileDiff>("get_file_diff", {
        path: workingDir,
        filePath: selectedFile,
      });
      setFileDiff(result);
    } catch (e) {
      console.error("Failed to get file diff:", e);
      setFileDiff(null);
    } finally {
      setIsLoadingDiff(false);
    }
  }, [workingDir, selectedFile]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    fetchFileDiff();
  }, [fetchFileDiff]);

  return (
    <div className="h-full flex bg-[#0a0a0a]">
      {/* File List */}
      <div className="w-56 border-r border-green-900/50 flex flex-col">
        <div className="h-9 px-3 border-b border-green-900/50 flex items-center justify-between">
          <span className="text-xs text-green-700 font-mono">changed files</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchFiles}
            disabled={isLoading}
            className="text-green-800 hover:text-green-500 hover:bg-green-900/20 h-6 w-6"
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="py-1">
            {files.length === 0 ? (
              <div className="text-center py-8 text-green-900 font-mono text-xs">
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
          <div className="h-9 px-3 border-b border-green-900/50 flex items-center">
            <span className="text-xs text-green-600 font-mono truncate">{selectedFile}</span>
          </div>
        )}
        <div className="flex-1">
          {isLoadingDiff ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-green-600" />
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
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                diffWordWrap: "on",
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-green-800 font-mono text-sm">
              {files.length === 0 ? "no changes to display" : "select a file"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
