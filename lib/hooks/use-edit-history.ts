'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';

export type EditRecord<P = unknown> = {
  id: string;
  rowLabel: string;
  fieldLabel: string;
  oldValueDisplay: string;
  newValueDisplay: string;
  timestamp: number;
  revertPayload: P;
  revertFn: () => Promise<void>;
};

type StoredRecord<P> = Omit<EditRecord<P>, 'revertFn'>;

const MAX_HISTORY = 10;

export function useEditHistory<P>(options: {
  storageKey: string;
  buildRevertFn: (payload: P) => () => Promise<void>;
}) {
  const { storageKey } = options;
  const buildRevertFnRef = useRef(options.buildRevertFn);
  buildRevertFnRef.current = options.buildRevertFn;

  // historyRef mirrors state so push/revert can read current value synchronously
  // without causing side effects inside React state updaters.
  const historyRef = useRef<EditRecord<P>[]>([]);
  const [history, setHistoryState] = useState<EditRecord<P>[]>([]);

  const persist = useCallback(
    (records: EditRecord<P>[]) => {
      try {
        const stored: StoredRecord<P>[] = records.map(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ({ revertFn, ...rest }) => rest,
        );
        sessionStorage.setItem(storageKey, JSON.stringify(stored));
      } catch {
        // sessionStorage unavailable (e.g. quota exceeded) — silently skip
      }
    },
    [storageKey],
  );

  // Hydrate from sessionStorage once on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const stored = JSON.parse(raw) as StoredRecord<P>[];
      if (!Array.isArray(stored)) throw new Error('invalid shape');
      const records: EditRecord<P>[] = stored.map((r) => ({
        ...r,
        revertFn: buildRevertFnRef.current(r.revertPayload),
      }));
      historyRef.current = records;
      setHistoryState(records);
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  // storageKey is the only external dep; buildRevertFnRef always has the latest fn
  }, [storageKey]);

  const push = useCallback(
    (record: Omit<EditRecord<P>, 'id' | 'timestamp' | 'revertFn'>) => {
      const entry: EditRecord<P> = {
        ...record,
        id: nanoid(),
        timestamp: Date.now(),
        revertFn: buildRevertFnRef.current(record.revertPayload),
      };
      const next = [entry, ...historyRef.current].slice(0, MAX_HISTORY);
      historyRef.current = next;
      setHistoryState(next);
      persist(next);
    },
    [persist],
  );

  // Throws if revertFn fails; caller is responsible for error handling.
  const revert = useCallback(
    async (record: EditRecord<P>) => {
      await record.revertFn();
      const next = historyRef.current.filter((r) => r.id !== record.id);
      historyRef.current = next;
      setHistoryState(next);
      persist(next);
    },
    [persist],
  );

  return { history, push, revert };
}
