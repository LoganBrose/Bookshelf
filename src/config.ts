// Your Google Sheet, published via File → Share → Publish to web.
// Each tab is read as CSV by its "gid" (the number after `gid=` in the
// sheet URL when that tab is selected).
export const PUBLISHED_SHEET_URL =
  import.meta.env.VITE_PUBLISHED_SHEET_URL ??
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRkt9_2bZhlMEigO4bYoh5kQ1XNa4LCm_cZm5lT7MpLRmr0Oe6CGwN71RLhVavLD1To9wD50oClU1hs/pubhtml';

/** gid of the "Books Read" tab (the first tab is usually 0). */
export const BOOKS_READ_GID: string = import.meta.env.VITE_BOOKS_READ_GID ?? '0';

/** gid of the "TBR" tab. */
export const TBR_GID: string = import.meta.env.VITE_TBR_GID ?? '1859169813';

/** Set VITE_USE_SAMPLE=1 to ignore the sheet and use the bundled sample CSVs. */
export const USE_SAMPLE = import.meta.env.VITE_USE_SAMPLE === '1';

export function csvUrl(gid: string): string {
  const base = PUBLISHED_SHEET_URL.replace(/\/pub(html)?(\?.*)?$/, '');
  return `${base}/pub?gid=${encodeURIComponent(gid)}&single=true&output=csv`;
}
