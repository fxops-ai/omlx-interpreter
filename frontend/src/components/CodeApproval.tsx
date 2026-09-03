'use client';

export default function CodeApproval({ code, language, onApprove, onReject }: {
  code: string;
  language: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 16,
    }}>
      <div style={{
        background: '#111111',
        border: '1px solid #2a2a2a',
        borderRadius: 16,
        maxWidth: 720, width: '100%',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #222',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 15, color: '#e8e8e8', letterSpacing: '0.04em' }}>
            ▶ APPROVE CODE EXECUTION
          </span>
          <button onClick={onReject} style={{
            background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 18, lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Code */}
        <div style={{ flex: 1, padding: 16, overflowY: 'auto', background: '#0d0d0d' }}>
          <div style={{ fontSize: 13, color: '#22c55e', marginBottom: 8, letterSpacing: '0.06em' }}>
            // {language}
          </div>
          <pre style={{ margin: 0, fontSize: 14, color: '#e8e8e8', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {code}
          </pre>
        </div>

        {/* Actions */}
        <div style={{
          padding: '14px 18px',
          borderTop: '1px solid #222',
          display: 'flex', gap: 10,
        }}>
          <button onClick={onReject} style={{
            flex: 1, padding: '10px 0',
            background: '#1a1a1a', border: '1px solid #2a2a2a',
            borderRadius: 10, color: '#888',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 14,
            cursor: 'pointer', letterSpacing: '0.05em',
          }}>
            REJECT
          </button>
          <button onClick={onApprove} style={{
            flex: 1, padding: '10px 0',
            background: '#00d4ff', border: 'none',
            borderRadius: 10, color: '#000',
            fontFamily: "'IBM Plex Mono', monospace", fontSize: 14,
            fontWeight: 600, cursor: 'pointer', letterSpacing: '0.05em',
          }}>
            APPROVE & RUN
          </button>
        </div>
      </div>
    </div>
  );
}