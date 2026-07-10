import { useStore } from '../lib/store';

export function ToastHost() {
  const { toasts } = useStore();
  return (
    <div className="toast-host" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className="toast" role="status">
          {t.message}
        </div>
      ))}
    </div>
  );
}
