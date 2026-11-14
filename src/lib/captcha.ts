/**
 * Optional hCaptcha on the sign-in screen. Without a site key it does
 * nothing at all — the site works unchanged. With one, the email step
 * renders a human-check first, and the code is only requested once it's
 * solved, so random addresses can't be used to burn your SMTP quota.
 *
 * Setup (one-off): create a free account at hcaptcha.com, add the site, put
 * the **site key** in VITE_HCAPTCHA_SITE_KEY, and the **secret** in Supabase
 * under Authentication → Bot protection. See SUPABASE.md.
 */

const SITE_KEY = (import.meta.env.VITE_HCAPTCHA_SITE_KEY ?? '').trim();
export const captchaEnabled = SITE_KEY.length > 0;
export const captchaSiteKey = SITE_KEY;

interface HCaptcha {
  render: (container: HTMLElement, options: Record<string, unknown>) => number;
  reset: (widgetId?: number) => void;
  remove?: (widgetId: number) => void;
}

declare global {
  interface Window {
    hcaptcha?: HCaptcha;
  }
}

let ready: Promise<HCaptcha | null> | null = null;

/** Load the hCaptcha API script once; null when hCaptcha is disabled. */
export function ensureHCaptcha(): Promise<HCaptcha | null> {
  if (!captchaEnabled) return Promise.resolve(null);
  if (ready) return ready;
  ready = new Promise<HCaptcha | null>((resolve) => {
    const onload = () => resolve(window.hcaptcha ?? null);
    if (window.hcaptcha) return onload();
    const s = document.createElement('script');
    s.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = onload;
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return ready;
}
