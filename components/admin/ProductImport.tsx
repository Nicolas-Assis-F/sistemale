"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { importProducts } from "@/app/admin/produtos/_import-actions";
import {
  csvToImportRows,
  normalizeImportHeader,
  parseImportPrice,
  type ImportRow,
} from "@/lib/product-import";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export function ProductImport({ categories }: { categories: Category[] }) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const validCategories = useMemo(
    () =>
      new Set(
        categories.flatMap((item) => [
          normalizeImportHeader(item.name),
          normalizeImportHeader(item.slug),
        ]),
      ),
    [categories],
  );
  const issues = useMemo(() => {
    const seen = new Set<string>();
    return rows.map((row) => {
      const problems: string[] = [];
      if (!row.sku || !row.nome) problems.push("Nome e SKU obrigatórios");
      if (seen.has(row.sku.toLowerCase())) problems.push("SKU repetido");
      if (!validCategories.has(normalizeImportHeader(row.categoria)))
        problems.push("Categoria não cadastrada");
      if (parseImportPrice(row.preco) === null) problems.push("Preço inválido");
      if (
        row.estoque &&
        (!/^\d+$/.test(row.estoque) || Number(row.estoque) > 1000000)
      )
        problems.push("Estoque inválido");
      if (row.resumo.length > 200) problems.push("Resumo longo demais");
      seen.add(row.sku.toLowerCase());
      return problems;
    });
  }, [rows, validCategories]);
  const errorCount = issues.filter((item) => item.length > 0).length;
  const invalidRows = issues.flatMap((messages, index) =>
    messages.length ? [{ line: index + 2, messages }] : [],
  );

  async function readFile(file?: File) {
    if (!file) return;
    setError("");
    setResult(null);
    setRows([]);
    setFileName(file.name);
    if (file.size > 1024 * 1024) {
      setError("O arquivo deve ter até 1 MB.");
      return;
    }
    try {
      setRows(csvToImportRows(await file.text()));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Não foi possível ler o CSV.",
      );
    }
  }

  function downloadTemplate() {
    const sample = categories[0]?.slug ?? "crie-uma-categoria";
    const csv = `sku;nome;categoria;preco;estoque;resumo;descricao;ativo;destaque\r\nEX-001;Exemplo de equipamento;${sample};1299,90;3;Resumo para o card;Descrição completa;sim;não\r\n`;
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "modelo-produtos-letorneadora.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function save() {
    if (!rows.length || errorCount || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await importProducts(rows);
      if ("error" in response && response.error) setError(response.error);
      else if ("created" in response && response.created !== undefined) {
        setResult({
          created: response.created,
          skipped: response.skipped ?? 0,
        });
        setRows([]);
      }
    } catch {
      setError("Falha ao importar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
      <div>
        <Link
          href="/admin/produtos"
          className="inline-flex items-center gap-2 text-xs font-semibold text-le-muted hover:text-le-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar aos produtos
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-le-blue">
          Catálogo / ingestão
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-le-text">
          Importar produtos
        </h1>
        <p className="mt-2 text-sm text-le-muted">
          Cadastre até 250 produtos por arquivo, com prévia e conferência antes
          de publicar.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="rounded-xl border border-le-line bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-le-subtle text-le-blue">
              <UploadCloud className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-heading font-semibold text-le-text">
                1. Envie o arquivo
              </h2>
              <p className="text-xs text-le-muted">
                CSV separado por ponto e vírgula ou vírgula · até 1 MB
              </p>
            </div>
          </div>
          <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-le-line bg-le-canvas px-5 text-center transition-colors hover:border-le-warning hover:bg-le-subtle">
            <FileSpreadsheet className="mb-3 h-9 w-9 text-le-muted" />
            <span className="text-sm font-semibold text-le-text">
              {fileName || "Clique para escolher um arquivo CSV"}
            </span>
            <span className="mt-1 text-xs text-le-muted">
              O arquivo não será salvo antes da sua confirmação
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => readFile(event.target.files?.[0])}
            />
          </label>
        </div>
        <div className="rounded-xl border border-le-line bg-le-ink p-6 text-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-orange">
            Comece pelo modelo
          </p>
          <h2 className="mt-3 font-heading text-xl font-semibold">
            Planilha pronta para preencher.
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Use o nome ou o identificador de uma categoria já cadastrada. Preço
            em reais; estoque, ativo e destaque são opcionais.
          </p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="mt-7 inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-xs font-bold text-le-ink hover:bg-le-warning-surface"
          >
            <Download className="h-4 w-4" /> Baixar modelo CSV
          </button>
          <p className="mt-6 text-xs text-white/55">
            Categorias disponíveis:{" "}
            {categories.length
              ? categories.map((item) => item.name).join(" · ")
              : "nenhuma. Cadastre uma categoria antes de importar."}
          </p>
        </div>
      </div>

      {result && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-[#a8d7c1] bg-le-success-surface p-4 text-sm text-le-text"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>
            <strong>{result.created} produtos criados.</strong>{" "}
            {result.skipped > 0
              ? `${result.skipped} ignorados por SKU ou URL já existente.`
              : "Tudo pronto."}{" "}
            <Link href="/admin/produtos" className="font-bold underline">
              Ver catálogo
            </Link>
          </span>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-[#efc2b9] bg-le-subtle p-4 text-sm font-medium text-le-danger"
        >
          {error}
        </p>
      )}

      {rows.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-le-line bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-le-line p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-le-blue">
                2. Confira os dados
              </p>
              <h2 className="mt-1 font-heading text-xl font-semibold text-le-text">
                Prévia da importação
              </h2>
              <p className="mt-1 text-xs text-le-muted">
                {rows.length} linhas ·{" "}
                {errorCount
                  ? `${errorCount} com ajuste necessário`
                  : "todas válidas para envio"}
              </p>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={busy || errorCount > 0 || categories.length === 0}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-orange px-5 text-sm font-bold text-le-text disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Importando..." : `Importar ${rows.length} produtos`}
            </button>
          </div>
          {invalidRows.length > 0 && (
            <div
              role="alert"
              className="border-b border-[#f0d2c8] bg-le-subtle p-5 text-sm text-le-danger"
            >
              <p className="font-bold">
                Corrija no CSV e envie o arquivo novamente:
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {invalidRows.slice(0, 20).map((item) => (
                  <li key={item.line}>
                    Linha {item.line}: {item.messages.join(", ")}
                  </li>
                ))}
              </ul>
              {invalidRows.length > 20 && (
                <p className="mt-2">
                  …e mais {invalidRows.length - 20} linhas com erro.
                </p>
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="le-responsive-table w-full  text-left text-sm">
              <thead className="bg-le-subtle text-xs font-semibold uppercase tracking-wider text-le-muted">
                <tr>
                  <th className="px-4 py-3">Linha</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Preço</th>
                  <th className="px-4 py-3">Verificação</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 15).map((row, index) => (
                  <tr key={index} className="border-t border-le-line">
                    <td data-label="Linha" className="px-4 py-3 font-mono text-xs text-le-muted">
                      {index + 2}
                    </td>
                    <td data-label="SKU" className="px-4 py-3 font-mono text-xs">{row.sku}</td>
                    <td data-label="Nome" className="max-w-56 truncate px-4 py-3 font-medium">
                      {row.nome}
                    </td>
                    <td data-label="Categoria" className="px-4 py-3">{row.categoria}</td>
                    <td data-label="Preço" className="px-4 py-3">{row.preco}</td>
                    <td data-label="Verificação" className="px-4 py-3 text-xs">
                      {issues[index].length ? (
                        <span className="font-semibold text-le-danger">
                          {issues[index].join(" · ")}
                        </span>
                      ) : (
                        <span className="font-semibold text-le-success">
                          Pronto
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 15 && (
            <p className="border-t border-le-line p-4 text-xs text-le-muted">
              Mostrando 15 de {rows.length} linhas. Todas as linhas foram
              validadas.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
