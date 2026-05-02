'use client';

import { useMemo } from 'react';

function langFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    py: 'python', js: 'javascript', ts: 'typescript',
    tsx: 'tsx', jsx: 'jsx', md: 'markdown', json: 'json',
    html: 'html', css: 'css', sh: 'bash', txt: 'text',
  };
  return map[ext] ?? ext ?? 'text';
}

function TextFileArtifact({ artifact }: { artifact: any }) {
  const filename: string = artifact.filename ?? 'file';
  const content: string  = artifact.content ?? '';
  const lang             = langFromFilename(filename);

  const downloadHref = useMemo(() => {
    if (typeof window === 'undefined') return '#';
    const blob = new Blob([content], { type: artifact.mime ?? 'text/plain' });
    return URL.createObjectURL(blob);
  }, [content, artifact.mime]);

  return (
    <div style={{
      margin: '12px 0',
      background: '#0d0d0d',
      border: '1px solid #2a2a2a',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 14px',
        background: '#161616',
        borderBottom: '1px solid #2a2a2a',
      }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#a3a3a3' }}>
          {filename}
          <span style={{ marginLeft: 8, color: '#444', fontSize: 11 }}>{lang}</span>
        </span>
        <a
          href={downloadHref}
          download={filename}
          style={{
            fontSize: 11,
            color: '#6366f1',
            textDecoration: 'none',
            fontFamily: "'IBM Plex Mono', monospace",
            padding: '3px 10px',
            border: '1px solid #6366f1',
            borderRadius: 6,
          }}
        >
          Download
        </a>
      </div>
      <pre style={{
        margin: 0,
        padding: '12px 16px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
        color: '#e5e5e5',
        overflowX: 'auto',
        maxHeight: 480,
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.6,
      }}>
        {content}
      </pre>
    </div>
  );
}

export default function ArtifactRenderer({ artifact }: { artifact: any }) {
  if (!artifact) return null;

  if (artifact.type === 'html' || String(artifact.content ?? '').includes('<!DOCTYPE')) {
    return (
      <div style={{ border: '1px solid #2a2a2a', borderRadius: 16, overflow: 'hidden', margin: '16px 0', background: '#fff' }}>
        <iframe
          srcDoc={artifact.content}
          style={{ width: '100%', height: 500, display: 'block', border: 'none' }}
          title="Preview"
        />
      </div>
    );
  }

  if (artifact.type === 'image' || artifact.content?.startsWith('data:image')) {
    return (
      <img
        src={artifact.content}
        style={{ maxWidth: 672, borderRadius: 16, margin: '16px 0', display: 'block' }}
        alt="Generated"
      />
    );
  }

  if (artifact.type === 'output' && typeof artifact.content === 'string') {
    return (
      <div style={{
        margin: '12px 0',
        background: '#0d0d0d',
        border: '1px solid #2a2a2a',
        borderRadius: 12,
        padding: '12px 16px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
        color: '#22c55e',
        overflowX: 'auto',
        maxHeight: 384,
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.6,
      }}>
        {artifact.content}
      </div>
    );
  }

  if (artifact.type === 'file') {
    if (artifact.content_b64) {
      const filename: string = artifact.filename ?? 'file';
      const mime: string     = artifact.mime ?? 'application/octet-stream';
      const href             = `data:${mime};base64,${artifact.content_b64}`;
      return (
        <div style={{
          margin: '12px 0',
          background: '#0d0d0d',
          border: '1px solid #2a2a2a',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            background: '#161616',
            borderBottom: '1px solid #2a2a2a',
          }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#a3a3a3' }}>
              {filename}
            </span>
            <a
              href={href}
              download={filename}
              style={{
                fontSize: 11,
                color: '#6366f1',
                textDecoration: 'none',
                fontFamily: "'IBM Plex Mono', monospace",
                padding: '3px 10px',
                border: '1px solid #6366f1',
                borderRadius: 6,
              }}
            >
              Download
            </a>
          </div>
          <div style={{ padding: '12px 16px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#666' }}>
            {mime} · binary
          </div>
        </div>
      );
    }

    return <TextFileArtifact artifact={artifact} />;
  }

  // Fallback
  return (
    <div style={{
      margin: '12px 0',
      border: '1px solid #2a2a2a',
      borderRadius: 12,
      padding: '16px',
      background: '#111',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 12,
      color: '#666',
    }}>
      <pre style={{ whiteSpace: 'pre-wrap', overflow: 'auto', margin: 0 }}>
        {JSON.stringify(artifact, null, 2)}
      </pre>
    </div>
  );
}
