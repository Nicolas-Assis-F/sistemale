export const IMPORT_COLUMNS = [
  "sku",
  "nome",
  "categoria",
  "preco",
  "estoque",
  "resumo",
  "descricao",
  "ativo",
  "destaque",
] as const;
export type ImportColumn = (typeof IMPORT_COLUMNS)[number];
export type ImportRow = Record<ImportColumn, string>;

export function normalizeImportHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function parseImportPrice(value: string): number | null {
  const clean = value
    .trim()
    .replace(/^R\$\s*/, "")
    .replace(/\s/g, "");
  if (!clean) return null;
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return Number.isSafeInteger(cents) && cents >= 0 && cents <= 2147483647
    ? cents
    : null;
}

// Leitura de CSV com aspas, separadores dentro do texto e quebras de linha em células.
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "").replace(/^sep=;\r?\n/i, "");
  const firstLine = source.split(/\r?\n/, 1)[0];
  const separator =
    (firstLine.match(/;/g) ?? []).length >= (firstLine.match(/,/g) ?? []).length
      ? ";"
      : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === separator && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell.trim());
      cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error("O CSV contém aspas sem fechamento.");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function csvToImportRows(text: string): ImportRow[] {
  const [header, ...data] = parseCsv(text);
  if (!header) throw new Error("O arquivo CSV está vazio.");
  const normalized = header.map(normalizeImportHeader);
  const required = ["sku", "nome", "categoria", "preco"];
  const missing = required.filter((name) => !normalized.includes(name));
  if (missing.length)
    throw new Error(`Colunas obrigatórias ausentes: ${missing.join(", ")}.`);
  if (data.length === 0)
    throw new Error("O CSV precisa conter pelo menos um produto.");
  if (data.length > 250)
    throw new Error("Importe no máximo 250 produtos por arquivo.");
  return data.map(
    (values) =>
      Object.fromEntries(
        IMPORT_COLUMNS.map((key) => [
          key,
          values[normalized.indexOf(key)] ?? "",
        ]),
      ) as ImportRow,
  );
}
