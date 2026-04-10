import useSWR from 'swr';
import { COLUMN_GROUPS } from '@/lib/constants';
import type { ColumnGroupsResponse, ColumnGroup } from '@/lib/column-groups';

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(r.statusText);
    return r.json() as Promise<ColumnGroupsResponse>;
  });

// All field keys from the hardcoded defaults
const ALL_KNOWN_FIELDS = COLUMN_GROUPS.flatMap(
  (g) => g.fields as readonly string[]
);

function computeGroups(resolved: ColumnGroup[]): ColumnGroup[] {
  const assigned = new Set(resolved.flatMap((g) => g.fields));
  const unassigned = ALL_KNOWN_FIELDS.filter((f) => !assigned.has(f));

  if (unassigned.length === 0) return resolved;

  return [
    ...resolved,
    { id: 'others', label: 'Others', fields: unassigned },
  ];
}

const DEFAULT_GROUPS: ColumnGroup[] = COLUMN_GROUPS.map((g) => ({
  id: g.id,
  label: g.label,
  fields: [...(g.fields as readonly string[])],
}));

export interface UseColumnGroupsResult {
  groups: ColumnGroup[];
  isDefault: boolean;
  isLoading: boolean;
  mutate: () => void;
}

export function useColumnGroups(): UseColumnGroupsResult {
  const { data, isLoading, mutate } = useSWR<ColumnGroupsResponse>(
    '/api/column-groups',
    fetcher,
    { dedupingInterval: 30_000 }
  );

  const resolved = data?.groups ?? DEFAULT_GROUPS;
  const groups = computeGroups(resolved);

  return {
    groups,
    isDefault: data?.isDefault ?? true,
    isLoading,
    mutate,
  };
}
