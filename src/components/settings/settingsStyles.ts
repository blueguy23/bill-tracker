import type React from 'react';

export const sectionCard: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  overflow: 'hidden',
};

export const sectionHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '14px 20px',
  borderBottom: '1px solid var(--border)',
};

export const sectionHeaderIcon: React.CSSProperties = {
  width: 28,
  height: 28,
  background: 'var(--raised)',
  border: '1px solid var(--border)',
  borderRadius: 7,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text3)',
  flexShrink: 0,
};

export const formRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '13px 20px',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  gap: 20,
};

export const formRowLast: React.CSSProperties = {
  ...formRow,
  borderBottom: 'none',
};

export const formInput: React.CSSProperties = {
  background: 'var(--raised)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 7,
  padding: '7px 12px',
  fontSize: 12,
  fontFamily: 'var(--sans)',
  color: 'var(--text)',
  outline: 'none',
  minWidth: 180,
};

export const formSelect: React.CSSProperties = {
  background: 'var(--raised)',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 7,
  padding: '7px 28px 7px 12px',
  fontSize: 12,
  fontFamily: 'var(--sans)',
  color: 'var(--text)',
  outline: 'none',
  cursor: 'pointer',
  minWidth: 180,
};

export const btnPrimary: React.CSSProperties = {
  padding: '7px 16px',
  borderRadius: 7,
  border: 'none',
  background: 'var(--accent)',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'var(--sans)',
  fontWeight: 600,
};

export const btnGhost: React.CSSProperties = {
  padding: '7px 14px',
  borderRadius: 7,
  border: '1px solid rgba(255,255,255,0.11)',
  background: 'transparent',
  color: 'var(--text2)',
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'var(--sans)',
};
