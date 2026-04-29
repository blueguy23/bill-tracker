'use client';
import { useState, useRef } from 'react';

interface Props {
  txnId: string;
  tags: string[] | undefined;
  notes: string | null | undefined;
  onTagsChanged: (txnId: string, tags: string[]) => void;
  onNotesChanged: (txnId: string, notes: string | null) => void;
}

export function TxTagsRow({ txnId, tags = [], notes, onTagsChanged, onNotesChanged }: Props) {
  const [addingTag, setAddingTag] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState(notes ?? '');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasData = tags.length > 0 || !!notes;

  async function submitTag() {
    const val = tagInput.trim().toLowerCase();
    if (!val || tags.includes(val)) { setAddingTag(false); setTagInput(''); return; }
    const next = [...tags, val];
    setAddingTag(false); setTagInput('');
    await fetch(`/api/v1/transactions/${txnId}/tags`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: next }),
    });
    onTagsChanged(txnId, next);
  }

  async function removeTag(tag: string) {
    const next = tags.filter(t => t !== tag);
    await fetch(`/api/v1/transactions/${txnId}/tags`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags: next }),
    });
    onTagsChanged(txnId, next);
  }

  async function saveNotes() {
    setEditingNotes(false);
    await fetch(`/api/v1/transactions/${txnId}/notes`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesInput || null }),
    });
    onNotesChanged(txnId, notesInput || null);
  }

  const pill: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 9999, fontSize: 10, fontWeight: 500, background: 'rgba(255,255,255,0.06)', color: 'var(--text3)' };
  const ghostBtn: React.CSSProperties = { ...pill, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.04)' };
  const tinyInput: React.CSSProperties = { fontSize: 10, padding: '2px 6px', borderRadius: 9999, background: 'rgba(255,255,255,0.06)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' };

  if (!hasData && !expanded) {
    return (
      <button onClick={() => setExpanded(true)} data-testid={`add-tag-btn-${txnId}`}
        style={{ ...ghostBtn, opacity: 0, transition: 'opacity .1s' }}
        className="group-hover/row:opacity-100"
      >+ tag</button>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, marginTop: 3 }} data-testid={`tags-row-${txnId}`}>
      {tags.map(tag => (
        <span key={tag} style={pill} data-testid={`tag-${txnId}-${tag}`}>
          #{tag}
          <button onClick={() => void removeTag(tag)} style={{ border: 'none', background: 'none', color: 'var(--text3)', cursor: 'pointer', lineHeight: 1 }} aria-label={`Remove tag ${tag}`}>×</button>
        </span>
      ))}
      {addingTag ? (
        <input ref={inputRef} value={tagInput} onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void submitTag(); if (e.key === 'Escape') { setAddingTag(false); setTagInput(''); } }}
          onBlur={() => void submitTag()} autoFocus placeholder="tag" maxLength={50}
          style={{ ...tinyInput, width: 64 }} />
      ) : tags.length < 10 && (
        <button onClick={() => setAddingTag(true)} data-testid={`add-tag-btn-${txnId}`} style={ghostBtn}>+ tag</button>
      )}
      {editingNotes ? (
        <input value={notesInput} onChange={e => setNotesInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void saveNotes(); if (e.key === 'Escape') { setEditingNotes(false); setNotesInput(notes ?? ''); } }}
          onBlur={() => void saveNotes()} autoFocus placeholder="add a note…" maxLength={500}
          style={{ ...tinyInput, width: 140 }} data-testid={`notes-input-${txnId}`} />
      ) : (
        <button onClick={() => { setNotesInput(notes ?? ''); setEditingNotes(true); }}
          data-testid={`notes-btn-${txnId}`} style={{ ...ghostBtn, color: notes ? 'var(--text2)' : 'var(--text3)' }}>
          {notes ? `"${notes.slice(0, 20)}${notes.length > 20 ? '…' : ''}"` : '+ note'}
        </button>
      )}
    </div>
  );
}
