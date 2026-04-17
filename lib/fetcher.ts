export const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (r.status === 401) {
      window.location.href = '/login';
      return new Promise(() => {});
    }
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });
