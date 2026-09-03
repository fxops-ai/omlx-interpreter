'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { useDropzone } from 'react-dropzone';
import FileTree from '../components/FileTree';
import ArtifactRenderer from '../components/ArtifactRenderer';
import CodeApproval from '../components/CodeApproval';
import { uploadAttachment } from '../lib/api';
import { BACKEND_WS } from '../lib/config';

// ---------------------------------------------------------------------------
// Self-contained styles
// ---------------------------------------------------------------------------
const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:          #0a0a0a;
    --surface:     #111111;
    --border:      #222222;
    --border-mid:  #2a2a2a;
    --text:        #e8e8e8;
    --text-dim:    #666666;
    --text-faint:  #3a3a3a;
    --accent:      #00d4ff;
    --accent-dim:  rgba(0, 212, 255, 0.12);
    --user-bg:     #1a1a2e;
    --user-border: #2a2a4e;
    --error-bg:    rgba(220, 38, 38, 0.08);
    --error-border:#7f1d1d;
    --error-text:  #fca5a5;
    --green:       #22c55e;
    --stop:        #ff4444;
    --stop-dim:    rgba(255, 68, 68, 0.12);
    --font-mono:   'IBM Plex Mono', monospace;
    --font-sans:   'IBM Plex Sans', sans-serif;
    --radius:      12px;
    --radius-lg:   20px;
    --fs-xs:       12px;
    --fs-sm:       13px;
    --fs-md:       14px;
    --fs-base:     16px;
    --fs-lg:       18px;
    --lh:          1.7;
  }

  html, body, #__next { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font-sans); font-size: var(--fs-base); }

  .shell         { display: flex; height: 100vh; overflow: hidden; background: var(--bg); }
  .sidebar       { width: 260px; flex-shrink: 0; border-right: 1px solid var(--border); display: flex; flex-direction: column; background: var(--surface); }
  .main          { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; }

  .header        { padding: 16px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: var(--bg); flex-shrink: 0; }
  .header-title  { font-family: var(--font-mono); font-size: var(--fs-base); letter-spacing: 0.08em; color: var(--text); }
  .header-meta   { display: flex; align-items: center; gap: 12px; font-family: var(--font-mono); font-size: var(--fs-sm); }
  .status-dot    { color: var(--green); }
  .status-model  { color: var(--text-dim); }

  .messages      { flex: 1; overflow-y: auto; padding: 32px 24px; display: flex; flex-direction: column; gap: 20px; scroll-behavior: smooth; }
  .messages::-webkit-scrollbar { width: 4px; }
  .messages::-webkit-scrollbar-track { background: transparent; }
  .messages::-webkit-scrollbar-thumb { background: var(--border-mid); border-radius: 2px; }

  .empty-state   { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; color: var(--text-dim); text-align: center; padding: 48px; }
  .empty-icon    { font-size: 48px; opacity: 0.6; }
  .empty-title   { font-size: 26px; font-weight: 400; color: var(--text); letter-spacing: -0.02em; }
  .empty-sub     { font-size: var(--fs-md); color: var(--text-dim); font-family: var(--font-mono); }

  .msg-row       { display: flex; }
  .msg-row.user  { justify-content: flex-end; }
  .msg-row.assistant { justify-content: flex-start; }

  .bubble        { max-width: 720px; padding: 16px 20px; border-radius: var(--radius-lg); font-size: var(--fs-base); line-height: var(--lh); overflow-wrap: anywhere; word-break: break-word; }
  .bubble.user   { background: var(--user-bg); border: 1px solid var(--user-border); color: var(--text); border-bottom-right-radius: 4px; }
  .bubble.assistant { background: var(--surface); border: 1px solid var(--border); color: var(--text); border-bottom-left-radius: 4px; }

  .interrupted-badge {
    display: inline-flex; align-items: center; gap: 5px;
    margin-top: 8px;
    font-family: var(--font-mono); font-size: var(--fs-xs);
    letter-spacing: 0.08em; text-transform: uppercase;
    color: var(--stop); opacity: 0.7;
  }
  .interrupted-badge::before { content: ''; display: block; width: 5px; height: 5px; border-radius: 50%; background: var(--stop); opacity: 0.8; }

  .error-msg     { max-width: 720px; padding: 14px 18px; border-radius: var(--radius); background: var(--error-bg); border: 1px solid var(--error-border); color: var(--error-text); font-family: var(--font-mono); font-size: var(--fs-md); line-height: var(--lh); overflow-wrap: anywhere; }
  .error-label   { font-size: var(--fs-xs); letter-spacing: 0.1em; text-transform: uppercase; color: #ef4444; margin-bottom: 6px; opacity: 0.8; }

  .prose p                { margin-bottom: 10px; }
  .prose p:last-child     { margin-bottom: 0; }
  .prose code             { font-family: var(--font-mono); font-size: 0.9em; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; }
  .prose pre              { background: #0d0d0d; border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; overflow-x: auto; margin: 10px 0; }
  .prose pre code         { background: none; padding: 0; font-size: var(--fs-md); }
  .prose h1               { margin: 14px 0 8px; font-weight: 500; letter-spacing: -0.01em; font-size: 1.35em; }
  .prose h2               { margin: 14px 0 8px; font-weight: 500; letter-spacing: -0.01em; font-size: 1.2em; }
  .prose h3               { margin: 14px 0 8px; font-weight: 500; letter-spacing: -0.01em; font-size: 1.1em; }
  .prose ul,.prose ol     { padding-left: 20px; margin: 8px 0; }
  .prose li               { margin-bottom: 4px; }
  .prose a                { color: var(--accent); text-decoration: none; }
  .prose a:hover          { text-decoration: underline; }
  .prose table            { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: var(--fs-md); }
  .prose th               { background: rgba(255,255,255,0.04); padding: 8px 12px; border: 1px solid var(--border); text-align: left; font-weight: 500; }
  .prose td               { padding: 8px 12px; border: 1px solid var(--border); }

  .attachments   { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
  .att-chip      { font-size: var(--fs-sm); font-family: var(--font-mono); background: rgba(255,255,255,0.06); border: 1px solid var(--border); padding: 4px 12px; border-radius: 20px; display: flex; align-items: center; gap: 5px; }
  .att-chip.unavailable { opacity: 0.4; text-decoration: line-through; }

  /* ---- Input bar ---- */
  .input-bar     { padding: 16px 24px 20px; border-top: 1px solid var(--border); background: var(--bg); flex-shrink: 0; }
  .input-wrap    { display: flex; align-items: stretch; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); transition: border-color 0.15s; overflow: visible; position: relative; }
  .input-wrap:focus-within { border-color: var(--accent); }
  .input-wrap.streaming { border-color: var(--border-mid); }
  .input-field   {
    flex: 1; background: transparent; border: none;
    padding: 12px 18px; font-size: var(--fs-base); font-family: var(--font-sans);
    color: var(--text); outline: none; min-width: 0;
    resize: none; overflow-y: auto; line-height: 1.5;
    min-height: 48px; max-height: 220px;
    field-sizing: content;
  }
  .input-field::placeholder { color: var(--text-dim); }
  .input-field:disabled { cursor: not-allowed; }

  /* ---- Model selector ---- */
  .model-btn     {
    display: flex; align-items: center; gap: 6px;
    background: transparent; border: none;
    border-right: 1px solid var(--border-mid);
    padding: 8px 14px;
    font-family: var(--font-mono); font-size: var(--fs-sm);
    color: var(--text-dim); cursor: pointer;
    white-space: nowrap; flex-shrink: 0;
    transition: color 0.15s, background 0.15s;
    height: 100%;
    border-radius: var(--radius) 0 0 var(--radius);
    letter-spacing: 0.04em;
  }
  .model-btn:hover:not(:disabled) { color: var(--accent); background: var(--accent-dim); }
  .model-btn:disabled { cursor: not-allowed; opacity: 0.4; }
  .model-btn-chevron { opacity: 0.5; transition: transform 0.15s; }
  .model-btn-chevron.open { transform: rotate(180deg); }

  .model-dropdown {
    position: absolute; bottom: calc(100% + 8px); left: 0;
    min-width: 260px; background: #161616;
    border: 1px solid var(--border-mid); border-radius: var(--radius);
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    z-index: 100; overflow: hidden;
    animation: dropUp 0.12s ease;
  }
  @keyframes dropUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .model-dropdown-header { padding: 10px 14px 8px; font-family: var(--font-mono); font-size: var(--fs-xs); letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-faint); border-bottom: 1px solid var(--border); }
  .model-option  { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; font-family: var(--font-mono); font-size: var(--fs-md); color: var(--text-dim); cursor: pointer; transition: background 0.1s, color 0.1s; border: none; background: transparent; width: 100%; text-align: left; }
  .model-option:hover { background: var(--accent-dim); color: var(--text); }
  .model-option.active { color: var(--accent); }
  .model-active-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
  .model-loading { padding: 12px 14px; font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--text-faint); }

  /* ---- Send / Stop button ---- */
  .send-btn      {
    border: none; border-radius: 0 var(--radius) var(--radius) 0;
    padding: 12px 22px; font-size: var(--fs-md); font-family: var(--font-mono); font-weight: 500;
    cursor: pointer; letter-spacing: 0.05em; white-space: nowrap; flex-shrink: 0;
    transition: opacity 0.15s, transform 0.1s, background 0.2s, color 0.2s;
  }
  .send-btn.idle  { background: var(--accent); color: #000; }
  .send-btn.idle:hover:not(:disabled) { opacity: 0.85; }
  .send-btn.idle:disabled { opacity: 0.35; cursor: not-allowed; }

  .send-btn.stop  {
    background: var(--stop-dim);
    color: var(--stop);
    border: 1px solid rgba(255,68,68,0.3);
    border-left: none;
    animation: stopPulse 1.8s ease-in-out infinite;
  }
  .send-btn.stop:hover { background: rgba(255,68,68,0.2); opacity: 1; }

  @keyframes stopPulse {
    0%,100% { box-shadow: none; }
    50%      { box-shadow: inset 0 0 0 1px rgba(255,68,68,0.25); }
  }

  .send-btn:active:not(:disabled) { transform: scale(0.97); }

  .input-hint    { margin-top: 8px; text-align: center; font-size: var(--fs-sm); font-family: var(--font-mono); color: var(--text-faint); letter-spacing: 0.04em; }

  .drop-overlay  { position: absolute; inset: 0; background: rgba(0, 212, 255, 0.06); border: 2px dashed var(--accent); display: flex; align-items: center; justify-content: center; z-index: 50; pointer-events: none; }
  .drop-label    { font-family: var(--font-mono); font-size: 16px; color: var(--accent); letter-spacing: 0.08em; }

  .thinking      { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); border-bottom-left-radius: 4px; width: fit-content; }
  .dot           { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); opacity: 0.4; animation: pulse 1.2s ease-in-out infinite; }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes pulse { 0%,100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }

  /* ---- Context window bar ---- */
  .ctx-bar-wrap {
    position: relative; display: flex; align-items: center;
    width: 80px; height: 4px; border-radius: 2px;
    background: var(--border-mid); overflow: visible;
    cursor: default;
  }
  .ctx-bar-fill {
    height: 100%; border-radius: 2px;
    transition: width 0.4s ease, background-color 0.4s ease;
  }
  .ctx-tooltip {
    display: none;
    position: absolute; bottom: calc(100% + 7px); right: 0;
    background: #1a1a1a; border: 1px solid var(--border-mid);
    border-radius: 6px; padding: 5px 10px;
    font-family: var(--font-mono); font-size: var(--fs-xs);
    color: var(--text-dim); white-space: nowrap;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    pointer-events: none; z-index: 200;
  }
  .ctx-bar-wrap:hover .ctx-tooltip { display: block; }

  /* ---- Sidebar tabs ---- */
  .sidebar-tabs  { display: flex; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .sidebar-tab   {
    flex: 1; padding: 10px 0; text-align: center;
    font-family: var(--font-mono); font-size: var(--fs-xs);
    letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--text-dim); cursor: pointer; border: none; background: transparent;
    border-bottom: 2px solid transparent; margin-bottom: -1px;
    transition: color 0.15s, border-color 0.15s;
  }
  .sidebar-tab:hover { color: var(--text); }
  .sidebar-tab.active { color: var(--accent); border-bottom-color: var(--accent); }

  /* ---- History panel ---- */
  .history-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #0a0a0a; }
  .history-search-wrap { padding: 10px 10px 8px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .history-search {
    width: 100%; background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 7px 10px;
    font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--text);
    outline: none; transition: border-color 0.15s;
  }
  .history-search:focus { border-color: var(--accent); }
  .history-search::placeholder { color: var(--text-faint); }

  .history-new-btn {
    width: calc(100% - 20px); margin: 8px 10px 0;
    padding: 7px 0; background: transparent;
    border: 1px solid var(--border-mid); border-radius: 8px;
    font-family: var(--font-mono); font-size: var(--fs-xs); letter-spacing: 0.08em;
    color: var(--text-dim); cursor: pointer;
    transition: color 0.15s, border-color 0.15s, background 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .history-new-btn:hover { color: var(--accent); border-color: var(--accent); background: var(--accent-dim); }

  .history-list  { flex: 1; overflow-y: auto; padding: 6px 0; }
  .history-list::-webkit-scrollbar { width: 3px; }
  .history-list::-webkit-scrollbar-thumb { background: var(--border-mid); border-radius: 2px; }

  .history-item  {
    padding: 9px 12px; cursor: pointer;
    border-left: 2px solid transparent;
    transition: background 0.1s, border-color 0.1s;
  }
  .history-item:hover { background: #141414; }
  .history-item.active { border-left-color: var(--accent); background: var(--accent-dim); }

  .history-item-title {
    font-family: var(--font-sans); font-size: var(--fs-md); color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-bottom: 3px;
  }
  .history-item-meta  {
    display: flex; align-items: center; gap: 6px;
    font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--text-dim);
  }
  .history-model-chip {
    background: rgba(255,255,255,0.04); border: 1px solid var(--border);
    border-radius: 4px; padding: 1px 5px; font-size: 11px; color: var(--text-faint);
    max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .history-excerpt {
    font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--text-faint);
    margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .history-empty {
    padding: 24px 12px; font-family: var(--font-mono); font-size: var(--fs-sm);
    color: var(--text-faint); text-align: center;
  }
`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
  isInterrupted?: boolean;
  attachments?: any[];
}

interface ModelOption {
  id: string;
  label: string;
}

interface SessionSummary {
  session_id: string;
  title: string;
  updated_at: string;
  model: string;
  message_count: number;
  artifact_count: number;
}

interface SearchResult {
  session_id: string;
  title: string;
  updated_at: string;
  match_excerpt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function relativeDate(iso: string): string {
  const now  = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 2)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`model-btn-chevron${open ? ' open' : ''}`} width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style={{ marginRight: 6, flexShrink: 0 }}>
      <rect x="1" y="1" width="8" height="8" rx="1.5"/>
    </svg>
  );
}

function ContextBar({ used, max }: { used: number | null; max: number }) {
  if (used === null) return null;
  const pct   = Math.min(used / max, 1);
  const color = pct < 0.6 ? '#22c55e' : pct < 0.85 ? '#f59e0b' : '#ef4444';
  const fmtNum = (n: number) => n.toLocaleString();
  return (
    <div className="ctx-bar-wrap">
      <div className="ctx-bar-fill" style={{ width: `${pct * 100}%`, background: color }} />
      <div className="ctx-tooltip">{fmtNum(used)} / {fmtNum(max)} tokens</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History Panel
// ---------------------------------------------------------------------------
function HistoryPanel({
  currentSessionId,
  onSwitch,
  onNew,
}: {
  currentSessionId: string | undefined;
  onSwitch: (id: string) => void;
  onNew: () => void;
}) {
  const [sessions, setSessions]           = useState<SessionSummary[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [query, setQuery]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const searchTimerRef                    = useRef<ReturnType<typeof setTimeout>>();

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/chat/sessions');
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch (e) {
      console.error('[history] fetch failed:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSessions(); }, [currentSessionId, fetchSessions]);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    if (!query.trim()) { setSearchResults(null); return; }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/chat/sessions/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setSearchResults(data.results ?? []);
      } catch (e) {
        console.error('[history search] failed:', e);
      }
    }, 300);
    return () => clearTimeout(searchTimerRef.current);
  }, [query]);

  const displayItems: Array<SessionSummary | SearchResult> =
    searchResults !== null ? searchResults : sessions;

  return (
    <div className="history-panel">
      <div className="history-search-wrap">
        <input
          className="history-search"
          type="text"
          placeholder="Search sessions…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <button className="history-new-btn" onClick={onNew}>
        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
        NEW SESSION
      </button>

      <div className="history-list">
        {loading && displayItems.length === 0 && (
          <div className="history-empty">loading…</div>
        )}
        {!loading && displayItems.length === 0 && (
          <div className="history-empty">
            {searchResults !== null ? 'no matches' : 'no sessions yet'}
          </div>
        )}
        {displayItems.map(item => (
          <div
            key={item.session_id}
            className={`history-item${item.session_id === currentSessionId ? ' active' : ''}`}
            onClick={() => onSwitch(item.session_id)}
          >
            <div className="history-item-title">{item.title || item.session_id}</div>
            <div className="history-item-meta">
              <span>{relativeDate(item.updated_at)}</span>
              {'model' in item && item.model && (
                <span className="history-model-chip">{item.model}</span>
              )}
              {'message_count' in item && (
                <span style={{ color: 'var(--text-faint)' }}>{item.message_count} msgs</span>
              )}
            </div>
            {'match_excerpt' in item && item.match_excerpt && (
              <div className="history-excerpt">{item.match_excerpt}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function oMLXInterpreter() {
  const [messages, setMessages]                     = useState<ChatMessage[]>([]);
  const [input, setInput]                           = useState('');
  const [isLoading, setIsLoading]                   = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [showApproval, setShowApproval]             = useState(false);
  const [pendingApproval, setPendingApproval]       = useState<any>(null);
  const [artifacts, setArtifacts]                   = useState<any[]>([]);
  const [sessionId, setSessionId]                   = useState<string | undefined>(undefined);
  const [fileTreeTick, setFileTreeTick]             = useState(0);
  const [statusMsg, setStatusMsg]                   = useState<string | null>(null);
  const [ctxUsed, setCtxUsed]                       = useState<number | null>(null);
  const CTX_MAX = 32_000;

  const [sidebarTab, setSidebarTab] = useState<'files' | 'history'>('files');

  // Model selector
  const [models, setModels]               = useState<ModelOption[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [modelDropOpen, setModelDropOpen] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const modelDropRef                      = useRef<HTMLDivElement>(null);

  const wsRef          = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  const resizeComposer = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { resizeComposer(); }, [input, resizeComposer]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, artifacts]);

  const fetchModels = async () => {
    setModelsLoading(true);
    try {
      const res  = await fetch('/api/chat/models');
      const data = await res.json();
      const list: ModelOption[] = data.models ?? [];
      setModels(list);
      if (list.length > 0 && !selectedModel) setSelectedModel(list[0].id);
    } catch (e) {
      console.error('[models] fetch failed:', e);
    }
    setModelsLoading(false);
  };

  useEffect(() => { fetchModels(); }, []);

  useEffect(() => {
    if (!modelDropOpen) return;
    const handler = (e: MouseEvent) => {
      if (modelDropRef.current && !modelDropRef.current.contains(e.target as Node)) {
        setModelDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modelDropOpen]);

  // ---------------------------------------------------------------------------
  // WebSocket — reusable, called on mount and session switch
  // ---------------------------------------------------------------------------
  const setupWs = useCallback((targetSessionId?: string) => {
    if (wsRef.current) {
      wsRef.current.onmessage = null;
      wsRef.current.onclose   = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    const url = targetSessionId
      ? `${BACKEND_WS}/chat/ws?session_id=${targetSessionId}`
      : `${BACKEND_WS}/chat/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      let chunk;
      try { chunk = JSON.parse(event.data); }
      catch (e) { console.error('PARSE FAIL:', event.data, e); return; }
      console.log('CHUNK:', chunk);

      if (chunk.type === 'session') { setSessionId(chunk.session_id); return; }

      if (chunk.type === 'delta' && chunk.content) {
        setStatusMsg(null);
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant' && !last.isError) {
            next[next.length - 1] = { ...last, content: last.content + chunk.content };
          } else {
            next.push({ role: 'assistant', content: chunk.content });
          }
          return next;
        });
        return;
      }

      if (chunk.type === 'status') { setStatusMsg(chunk.content ?? null); return; }

      if (chunk.type === 'artifact' && chunk.data) {
        setStatusMsg(null);
        setArtifacts(prev => [...prev, chunk.data]);
        if (chunk.data.type === 'file') setFileTreeTick(t => t + 1);
        return;
      }

      if (chunk.type === 'approval_request') {
        setPendingApproval(chunk);
        setShowApproval(true);
        return;
      }

      if (chunk.type === 'done') { setIsLoading(false); setStatusMsg(null); return; }

      if (chunk.type === 'context') { setCtxUsed(chunk.used ?? null); return; }

      if (chunk.type === 'interrupted') {
        setIsLoading(false);
        setStatusMsg(null);
        setMessages(prev => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === 'assistant' && !last.isError) {
            next[next.length - 1] = { ...last, isInterrupted: true };
          }
          return next;
        });
        return;
      }

      if (chunk.type === 'error') {
        setMessages(prev => [...prev, { role: 'assistant', content: chunk.content, isError: true }]);
        setIsLoading(false);
        setStatusMsg(null);
      }
    };

    ws.onclose = (e) => console.log('[WS CLOSE] code:', e.code, 'reason:', e.reason);
  }, []);

  useEffect(() => {
    setupWs();
    return () => { wsRef.current?.close(); };
  }, [setupWs]);

  // ---------------------------------------------------------------------------
  // Session switching
  // ---------------------------------------------------------------------------
  const switchSession = useCallback(async (targetId: string) => {
    if (targetId === sessionId) return;

    setIsLoading(false);
    setStatusMsg(null);
    setArtifacts([]);

    try {
      const res  = await fetch(`/api/chat/sessions/${targetId}`);
      const data = await res.json();
      const msgs: ChatMessage[] = (data.messages ?? []).map((m: any) => ({
        role:    m.role,
        content: m.content,
      }));
      setMessages(msgs);
    } catch (e) {
      console.error('[switchSession] fetch failed:', e);
      setMessages([]);
    }

    setupWs(targetId);
  }, [sessionId, setupWs]);

  const startNewSession = useCallback(() => {
    setMessages([]);
    setArtifacts([]);
    setCtxUsed(null);
    setStatusMsg(null);
    setIsLoading(false);
    setupWs();
  }, [setupWs]);

  // ---------------------------------------------------------------------------
  // File drop
  // ---------------------------------------------------------------------------
  const onDrop = async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const result = await uploadAttachment(file);
      setPendingAttachments(prev => [...prev, result]);
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, noClick: true });

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------
  const sendMessage = () => {
    if ((!input.trim() && pendingAttachments.length === 0) || isLoading) return;

    const userMsg: ChatMessage = {
      role:        'user',
      content:     input.trim() || `Attached ${pendingAttachments.length} file(s)`,
      attachments: [...pendingAttachments],
    };

    setMessages(prev => [...prev, userMsg]);
    setPendingAttachments([]);
    setInput('');
    setArtifacts([]);
    setStatusMsg(null);
    setIsLoading(true);

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
    wsRef.current?.send(JSON.stringify({
      messages: history,
      ...(selectedModel ? { model: selectedModel } : {}),
    }));
  };

  const interruptStream = () => {
    wsRef.current?.send(JSON.stringify({ type: 'interrupt' }));
  };

  const handleApprove = () => {
    wsRef.current?.send(JSON.stringify({ type: 'approve', id: pendingApproval.id }));
    setShowApproval(false);
    setPendingApproval(null);
  };

  const handleReject = () => {
    wsRef.current?.send(JSON.stringify({ type: 'reject', id: pendingApproval.id }));
    setShowApproval(false);
    setPendingApproval(null);
  };

  const modelLabel = selectedModel
    ? (selectedModel.length > 22 ? selectedModel.slice(0, 20) + '…' : selectedModel)
    : '…';

  if (!mounted) return null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <style>{css}</style>
      <div className="shell">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab${sidebarTab === 'files' ? ' active' : ''}`}
              onClick={() => setSidebarTab('files')}
            >
              Files
            </button>
            <button
              className={`sidebar-tab${sidebarTab === 'history' ? ' active' : ''}`}
              onClick={() => setSidebarTab('history')}
            >
              History
            </button>
          </div>

          {sidebarTab === 'files' ? (
            <FileTree
              sessionId={sessionId}
              refreshTrigger={fileTreeTick}
              onFileSelect={(path) => console.log('Selected:', path)}
            />
          ) : (
            <HistoryPanel
              currentSessionId={sessionId}
              onSwitch={switchSession}
              onNew={startNewSession}
            />
          )}
        </div>

        {/* Main */}
        <div className="main" {...getRootProps()}>
          <input {...getInputProps()} />

          {isDragActive && (
            <div className="drop-overlay">
              <span className="drop-label">DROP TO ATTACH</span>
            </div>
          )}

          {/* Header */}
          <div className="header">
            <span className="header-title">oMLX / INTERPRETER</span>
            <div className="header-meta">
              <span className="status-dot">● LIVE</span>
              <span className="status-model">{selectedModel || 'connecting…'} · local</span>
              <ContextBar used={ctxUsed} max={CTX_MAX} />
            </div>
          </div>

          {/* Messages */}
          <div className="messages">
            {messages.length === 0 && !isLoading && (
              <div className="empty-state">
                <div className="empty-icon">⬡</div>
                <p className="empty-title">Ready to run locally</p>
                <p className="empty-sub">drag & drop files · code · data · analysis</p>
              </div>
            )}

            {messages.map((msg, i) => {
              if (msg.isError) {
                return (
                  <div key={i} className="msg-row assistant">
                    <div className="error-msg">
                      <div className="error-label">Error</div>
                      {msg.content}
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} className={`msg-row ${msg.role}`}>
                  <div className={`bubble ${msg.role}`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                          {msg.content}
                        </ReactMarkdown>
                        {msg.isInterrupted && (
                          <div className="interrupted-badge">interrupted</div>
                        )}
                      </div>
                    ) : (
                      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{msg.content}</p>
                    )}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="attachments">
                        {msg.attachments.map((att: any, j: number) => (
                          <span key={j} className="att-chip">📎 {att.filename}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {artifacts.map((art, i) => (
              <ArtifactRenderer key={i} artifact={art} />
            ))}

            {isLoading && (
              <div className="msg-row assistant">
                {statusMsg ? (
                  <div style={{
                    padding: '8px 14px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    borderBottomLeftRadius: 4,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 13,
                    color: 'var(--text-dim)',
                    letterSpacing: '0.05em',
                  }}>
                    {statusMsg}
                  </div>
                ) : (
                  <div className="thinking">
                    <div className="dot" /><div className="dot" /><div className="dot" />
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="input-bar">
            {pendingAttachments.length > 0 && (
              <div className="attachments" style={{ marginBottom: 10 }}>
                {pendingAttachments.map((att, i) => (
                  <span key={i} className="att-chip">📎 {att.filename}</span>
                ))}
              </div>
            )}

            <div className={`input-wrap${isLoading ? ' streaming' : ''}`} ref={modelDropRef}>
              <button
                className="model-btn"
                disabled={isLoading}
                onClick={() => { if (!modelDropOpen) fetchModels(); setModelDropOpen(v => !v); }}
              >
                {modelLabel}
                <Chevron open={modelDropOpen} />
              </button>

              {modelDropOpen && (
                <div className="model-dropdown">
                  <div className="model-dropdown-header">Select model</div>
                  {modelsLoading ? (
                    <div className="model-loading">querying oMLX…</div>
                  ) : models.length === 0 ? (
                    <div className="model-loading">no models found</div>
                  ) : (
                    models.map(m => (
                      <button
                        key={m.id}
                        className={`model-option${selectedModel === m.id ? ' active' : ''}`}
                        onClick={() => { setSelectedModel(m.id); setModelDropOpen(false); }}
                      >
                        <span>{m.label}</span>
                        {selectedModel === m.id && <span className="model-active-dot" />}
                      </button>
                    ))
                  )}
                </div>
              )}

              <textarea
                ref={inputRef}
                className="input-field"
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === 'Escape' && isLoading) { e.preventDefault(); interruptStream(); return; }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder={isLoading ? 'Responding…' : 'Ask anything…'}
                disabled={isLoading}
              />

              {isLoading ? (
                <button className="send-btn stop" onClick={interruptStream}>
                  <StopIcon />STOP
                </button>
              ) : (
                <button
                  className="send-btn idle"
                  onClick={sendMessage}
                  disabled={!input.trim() && pendingAttachments.length === 0}
                >
                  SEND →
                </button>
              )}
            </div>

            <p className="input-hint">
              {isLoading
                ? 'press ESC or click STOP to interrupt'
                : 'PDF · IMAGES · MARKDOWN · JSON · SANDBOXED PYTHON'}
            </p>
          </div>
        </div>
      </div>

      {showApproval && pendingApproval && (
        <CodeApproval
          code={pendingApproval.code}
          language={pendingApproval.language}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </>
  );
}
