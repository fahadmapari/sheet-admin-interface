import 'server-only';

type GaxiosLikeError = {
  code?: number | string;
  status?: number;
  response?: { status?: number };
  errors?: Array<{ reason?: string; message?: string }>;
  message?: string;
};

export function isSheetPermissionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as GaxiosLikeError;
  const status =
    typeof e.code === 'number' ? e.code :
    typeof e.code === 'string' ? Number(e.code) :
    e.status ?? e.response?.status;
  if (status === 403 || status === 404) return true;
  if (e.errors?.some((x) => x.reason === 'forbidden' || x.reason === 'notFound')) return true;
  const msg = e.message?.toLowerCase() ?? '';
  return msg.includes('does not have permission') || msg.includes('requested entity was not found');
}
