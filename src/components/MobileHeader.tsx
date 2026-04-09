'use client';

interface MobileHeaderProps {
  onMenuOpen: () => void;
}

export function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
  return (
    <header className="sm:hidden flex items-center justify-between px-4 py-3 bg-depth-950 border-b border-teal-900/40 sticky top-0 z-30">
      <button
        onClick={onMenuOpen}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-sky-500 hover:text-white hover:bg-white/[0.06] transition-colors"
        aria-label="Open menu"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-teal-500 flex items-center justify-center">
          <span className="text-white text-[10px] font-bold leading-none">B</span>
        </div>
        <span className="text-sm font-semibold text-white">Bill Tracker</span>
      </div>

      {/* Spacer to center the title */}
      <div className="w-9" />
    </header>
  );
}
