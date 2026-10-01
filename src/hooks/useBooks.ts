import { useEffect, useState } from 'react';
import type { Book } from '../types';
import { BOOKS_READ_GID, TBR_GID, USE_SAMPLE, csvUrl } from '../config';
import { normalizeBooks, parseBooks } from '../data/sheet';
import sampleRead from '../data/sample-read.csv?raw';
import sampleTbr from '../data/sample-tbr.csv?raw';

const savedKey = (gid: string) => `bookshelf.csv.${gid}`;

/** The sheet tab's CSV, falling back to the last copy that loaded if the sheet can't be reached. */
async function loadCsv(gid: string, fallback: string): Promise<{ csv: string; stale: boolean }> {
  if (USE_SAMPLE || !gid) return { csv: fallback, stale: false };
  const res = await fetch(csvUrl(gid), { cache: 'no-store' }).catch(() => undefined);
  if (res?.ok) {
    const csv = await res.text();
    try {
      localStorage.setItem(savedKey(gid), csv);
    } catch {
      /* storage unavailable */
    }
    return { csv, stale: false };
  }
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(savedKey(gid));
  } catch {
    /* storage unavailable */
  }
  if (saved != null) return { csv: saved, stale: true };
  throw new Error(
    "Couldn't load your Google Sheet. Check it's still published to the web (File → Share → Publish to web).",
  );
}

export function useBooks() {
  const [state, setState] = useState<{
    read: Book[];
    tbr: Book[];
    loading: boolean;
    error?: string;
    /** True when showing a saved copy because the sheet couldn't be reached. */
    stale?: boolean;
  }>({ read: [], tbr: [], loading: true });

  useEffect(() => {
    Promise.all([loadCsv(BOOKS_READ_GID, sampleRead), loadCsv(TBR_GID, sampleTbr)])
      .then(([readCsv, tbrCsv]) => {
        const read = parseBooks(readCsv.csv, 'read');
        const tbr = parseBooks(tbrCsv.csv, 'tbr');
        normalizeBooks(read, tbr);
        setState({ read, tbr, loading: false, stale: readCsv.stale || tbrCsv.stale });
      })
      .catch((e: Error) => setState({ read: [], tbr: [], loading: false, error: e.message }));
  }, []);

  return state;
}
