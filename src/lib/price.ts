/**
 * Group classes are always free. A teacher can offer 1-on-1 tutoring for up
 * to MAX_PRICE dollars a session. The site shows the price; it doesn't take
 * payments.
 */
export const MAX_PRICE = 20;

export function clampPrice(n: unknown): number {
  const v = Math.round(Number(n) || 0);
  return Math.min(MAX_PRICE, Math.max(0, v));
}

export function priceLabel(price: number | undefined): string {
  return price ? `$${price}` : 'Free';
}

/** Volunteer hours only count classes taught for free. */
export function isFree(s: { price?: number }): boolean {
  return !s.price;
}

/**
 * A past class adds volunteer hours when it was free and somebody actually
 * came. "Came" means the teacher marked them present on the class card —
 * signing up is not attendance.
 */
export function countsForHours(s: { price?: number; attendees: Array<{ attended?: boolean }> }): boolean {
  return isFree(s) && s.attendees.some((a) => a.attended === true);
}
