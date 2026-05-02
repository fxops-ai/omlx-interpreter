'use client';
import { useState, useEffect } from 'react';

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  children?: TreeNode[];
}

export default function FileTree({ sessionId, refreshTrigger, onFileSelect }: {
  sessionId?: string;
  refreshTrigger?: number;
  onFileSelect?: (path: string) => void;
}) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const fetchTree = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/files/tree?session_id=${sessionId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTree(data);
    } catch (e) {
      console.error('[FileTree] fetch failed:', e);
    }
    setLoading(false);
  };

  // Re-fetch when sessionId changes or parent signals a new file arrived
  useEffect(() => { fetchTree(); }, [sessionId, refreshTrigger]);

  const toggle = (nodePath: string) => {
    const next = new Set(expanded);
    if (next.has(nodePath)) next.delete(nodePath);
    else next.add(nodePath);
    setExpanded(next);
  };

  const renderNode = (node: TreeNode, depth = 0) => (
    <div key={node.path} style={{ paddingLeft: depth * 12 }}>
      <div
        onMouseEnter={() => setHovered(node.path)}
        onMouseLeave={() => setHovered(null)}
        onClick={() => { if (node.isDir) toggle(node.path); else onFileSelect?.(node.path); }}
        style={{
          display: 'flex', alignItems: 'center',
          padding: '4px 8px', borderRadius: 6,
          cursor: 'pointer', userSelect: 'none',
          background: hovered === node.path ? '#1a1a1a' : 'transparent',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12, color: '#e8e8e8',
          gap: 6,
        }}
      >
        <span style={{ color: node.isDir ? '#00d4ff' : '#4a9eff', flexShrink: 0, fontSize: 10 }}>
          {node.isDir ? (expanded.has(node.path) ? '▾' : '▸') : '·'}
        </span>
        <span style={{
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: node.isDir ? '#e8e8e8' : '#aaaaaa',
        }}>
          {node.name}
        </span>
        {node.size !== undefined && node.size > 0 && (
          <span style={{ fontSize: 10, color: '#3a3a3a', flexShrink: 0 }}>
            {node.size < 1024 ? `${node.size}b` : `${(node.size / 1024).toFixed(1)}k`}
          </span>
        )}
      </div>
      {node.isDir && expanded.has(node.path) && node.children?.map(child => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0a' }}>
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid #222',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Workspace
        </span>
        <button
          onClick={fetchTree}
          disabled={loading || !sessionId}
          style={{
            background: 'none', border: 'none', cursor: (loading || !sessionId) ? 'not-allowed' : 'pointer',
            color: '#444', fontSize: 14, padding: 2,
            animation: loading ? 'spin 1s linear infinite' : 'none',
          }}
          title="Refresh"
        >
          ↻
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
        {!sessionId && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#3a3a3a', padding: '12px 8px' }}>
            waiting for session...
          </div>
        )}
        {sessionId && tree.length === 0 && !loading && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#3a3a3a', padding: '12px 8px' }}>
            no files yet
          </div>
        )}
        {tree.map(node => renderNode(node, 0))}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}