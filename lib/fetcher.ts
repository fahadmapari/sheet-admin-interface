export class FetchError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.code = code;
  }
}

export const SHEET_ACCESS_DENIED_CODE = 'sheet_access_denied';

export function isSheetAccessDeniedError(err: unknown): boolean {
  return err instanceof FetchError && err.code === SHEET_ACCESS_DENIED_CODE;
}

export const fetcher = (url: string) =>
  fetch(url).then(async (r) => {
    if (r.status === 401) {
      window.location.href = '/login';
      return new Promise(() => {});
    }
    if (!r.ok) {
      let body: { error?: string; code?: string } = {};
      try {
        body = await r.json();
      } catch {
        // ignore non-json bodies
      }
      throw new FetchError(body.error ?? r.statusText, r.status, body.code);
    }
    return r.json();
  });
