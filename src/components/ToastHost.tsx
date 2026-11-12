import { useStore } from '../lib/store';

export function ToastHost() {
  const { toasts } = useStore();
  // A burst (e.g. posting a weekly series) must not bury the sign-in box on a
  // phone — show the latest few, not all of them.
  const visible = toasts.slice(-3);
  return (
    <div className="toast-host" aria-live="polite" aria-atomic="false">
      {visible.map((t) => (
        <div key={t.id} className="toast" role="status">
          {t.message}
        </div>
      ))}
    </div>
  );
}
