import useSWR from 'swr';
import type { ColumnMappingEntry } from './use-column-mapping';

export type { ColumnMappingEntry };

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json() as Promise<ColumnMappingEntry[]>;
  });

export interface UseWrittenColumnMappingResult {
  entries: ColumnMappingEntry[];
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useWrittenColumnMapping(): UseWrittenColumnMappingResult {
  const { data, isLoading, error, mutate } = useSWR<ColumnMappingEntry[]>(
    '/api/written-column-mapping',
    fetcher,
    { dedupingInterval: 30_000 },
  );

  return {
    entries: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
