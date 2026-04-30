import 'server-only';

const MAX_ROW_INDEX = 1_000_000;

export function isValidRowIndex(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 2 &&
    value <= MAX_ROW_INDEX
  );
}

export function parseRowIndexParam(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return isValidRowIndex(n) ? n : null;
}
