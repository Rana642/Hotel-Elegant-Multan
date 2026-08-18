'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Headless popover primitive shared by DateRangePicker + OccupancyPicker.
 *
 * The panel is rendered in a portal on document.body with fixed positioning
 * so it escapes any clipping / stacking context — the homepage hero uses
 * `overflow-hidden`, and the booking boxes live inside `sticky` containers,
 * either of which would otherwise crop an inline dropdown.
 *
 * Desktop (>=640px): anchored under the trigger, flipping above when there
 * isn't room below. Mobile: a bottom sheet, which is far easier to tap than
 * a floating calendar on a phone.
 */
interface Props {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  /** Panel chrome (bg/border/shadow). Sizing is handled here. */
  className?: string;
  /** Preferred desktop panel width in px. Clamped to the viewport. */
  desktopWidth?: number;
}

export default function Popover({ open, onClose, anchorRef, children, className = '', desktopWidth = 320 }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => setMounted(true), []);

  // Position the panel relative to the trigger. Runs after the panel mounts
  // (so we can measure its height) and on resize while open.
  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      if (mobile) { setCoords(null); return; } // bottom sheet — CSS handles it

      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor) return;
      const a = anchor.getBoundingClientRect();
      const width = Math.min(desktopWidth, window.innerWidth - 16);
      const panelH = panel?.offsetHeight ?? 340;
      const gap = 8;

      let top = a.bottom + gap;
      // Flip above the trigger if it would run off the bottom of the viewport.
      if (top + panelH > window.innerHeight - 8 && a.top - gap - panelH > 8) {
        top = a.top - gap - panelH;
      }
      let left = a.left;
      if (left + width > window.innerWidth - 8) left = window.innerWidth - 8 - width;
      if (left < 8) left = 8;

      setCoords({ top, left, width });
    };

    place();
    window.addEventListener('resize', place);
    // Close on scroll rather than chase the anchor — simpler and drift-free.
    const onScroll = () => onClose();
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, anchorRef, desktopWidth, onClose]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Backdrop — click anywhere off the panel to dismiss. Faintly dark on
          mobile (sheet) so the sheet reads as a layer; invisible on desktop. */}
      <div
        className={`absolute inset-0 ${isMobile ? 'bg-black/40' : 'bg-transparent'}`}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={`${
          isMobile
            ? 'absolute left-0 right-0 bottom-0 max-h-[85vh] overflow-y-auto'
            : 'absolute'
        } ${className}`}
        style={
          isMobile
            ? { paddingBottom: 'env(safe-area-inset-bottom)' }
            : coords
              ? { top: coords.top, left: coords.left, width: coords.width }
              : { visibility: 'hidden' }
        }
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
