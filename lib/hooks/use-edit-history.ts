'use client';

import { useCallback, useState } from 'react';
import { nanoid } from 'nanoid';

export type EditRecord = {
  id: string;
  rowLabel: string;
  fieldLabel: string;
  oldValueDisplay: string;
  newValueDisplay: string;
  timestamp: number;
  revertFn: () => Promise<void>;
};

const MAX_HISTORY = 10;

export function useEditHistory() {
  const [history, setHistory] = useState<EditRecord[]>([]);

  const push = useCallback((record: Omit<EditRecord, 'id' | 'timestamp'>) => {
    const entry: EditRecord = { ...record, id: nanoid(), timestamp: Date.now() };
    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
  }, []);

  // Throws if revertFn fails; caller is responsible for error handling.
  const revert = useCallback(async (record: EditRecord) => {
    await record.revertFn();
    setHistory((prev) => prev.filter((r) => r.id !== record.id));
  }, []);

  return { history, push, revert };
}
