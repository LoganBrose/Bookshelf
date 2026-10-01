import { useEffect, useState } from 'react';
import type { Book } from '../types';
import { BOOKS_READ_GID, TBR_GID, USE_SAMPLE, csvUrl } from '../config';
import { normalizeBooks, parseBooks } from '../data/sheet';
import sampleRead from '../data/sample-read.csv?raw';
import sampleTbr from '../data/sample-tbr.csv?raw';

async function loadCsv(gid: string, fallback: string): Promise<string> {
  if (USE_SAMPLE || !gid) return fallback;
  const res = await fetch(csvUrl(gid), { cache: 'no-store' }).catch(() => undefined);
  if (!res?.ok) {
    throw new Error(
      "Couldn't load your Google Sheet. Check it's still published to the web (File → Share → Publish to web).",
    );
  }
  return res.text();
}

export function useBooks() {
  const [state, setState] = useState<{
    read: Book[];
    tbr: Book[];
    loading: boolean;
    error?: string;
  }>({ read: [], tbr: [], loading: true });

  useEffect(() => {
    Promise.all([loadCsv(BOOKS_READ_GID, sampleRead), loadCsv(TBR_GID, sampleTbr)])
      .then(([readCsv, tbrCsv]) => {
        const read = parseBooks(readCsv, 'read');
        const tbr = parseBooks(tbrCsv, 'tbr');
        normalizeBooks(read, tbr);
        setState({ read, tbr, loading: false });
      })
      .catch((e: Error) => setState({ read: [], tbr: [], loading: false, error: e.message }));
  }, []);

  return state;
}
