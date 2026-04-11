// lib/hooks/use-column-mapping.ts
import useSWR from 'swr';

export type ColumnMappingEntry = {
  field: string;
  fieldLabel: string;
  colIndex: number;
  colLetter: string;
  defaultColLetter: string;
  sheetHeader: string;
  isOverridden: boolean;
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json() as Promise<ColumnMappingEntry[]>;
  });

export interface UseColumnMappingResult {
  entries: ColumnMappingEntry[];
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useColumnMapping(): UseColumnMappingResult {
  const { data, isLoading, error, mutate } = useSWR<ColumnMappingEntry[]>(
    '/api/column-mapping',
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
