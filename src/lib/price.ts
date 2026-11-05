/**
 * Teachers can charge for a class, up to MAX_PRICE dollars. Free is the
 * default. The site shows the price; it doesn't take payments.
 */
export const MAX_PRICE = 19;

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
 * came. Without the second part, posting empty classes would add hours.
 */
export function countsForHours(s: { price?: number; attendees: unknown[] }): boolean {
  return isFree(s) && s.attendees.length > 0;
}
