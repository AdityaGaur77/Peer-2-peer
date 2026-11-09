import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/util';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  labelledBy?: string;
}

// Open dialogs, newest last. Escape closes only the top one, so a sign-in
// box opened over a thank-you note doesn't take the note with it.
const stack: number[] = [];
let nextId = 1;

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ onClose, children, wide, labelledBy }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const id = useRef(0);
  if (!id.current) id.current = nextId++;

  useEffect(() => {
    const me = id.current;
    stack.push(me);
    // put focus back where it was (e.g. the "Save my spot" button) on close
    const opener = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    return () => {
      stack.splice(stack.indexOf(me), 1);
      if (stack.length === 0) document.body.style.overflow = '';
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stack[stack.length - 1] === id.current) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // keep keyboard focus inside the dialog
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const preferred =
      panel.querySelector<HTMLElement>('[autofocus]') ??
      panel.querySelector<HTMLElement>(FOCUSABLE);
    preferred?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel.addEventListener('keydown', trap);
    return () => panel.removeEventListener('keydown', trap);
  }, []);

  const dialog = (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={cx('modal', wide && 'modal-wide')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        <button className="modal-x" onClick={onClose} aria-label="Close">
          ✕ Close
        </button>
        {children}
      </div>
    </div>
  );
  // Rendered at the end of <body>, so a card's overflow or hover transform
  // can never clip it or trap it inside the card.
  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}
