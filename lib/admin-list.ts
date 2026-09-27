export type AdminListParams = { q?: string; novo?: string; editar?: string };

/** Retain search when opening/closing a URL-backed editor. */
export function adminListHref(section: string, q = '', editor?: { novo: string } | { editar: string }) {
  const params = new URLSearchParams(q ? { q } : {});
  if (editor) Object.entries(editor).forEach(([key, value]) => params.set(key, value));
  return `/admin/${section}${params.size ? `?${params}` : ''}`;
}
