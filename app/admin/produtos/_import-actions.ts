"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { slugify } from "@/lib/slugify";
import {
  normalizeImportHeader,
  parseImportPrice,
  type ImportRow,
} from "@/lib/product-import";

type ImportResult =
  | { created: number; skipped: number; error?: never }
  | { error: string; created?: never; skipped?: never };

export async function importProducts(rows: ImportRow[]): Promise<ImportResult> {
  if (!(await isAuthenticated()))
    return { error: "Sessão expirada. Entre novamente no painel." };
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 250)
    return { error: "Envie de 1 a 250 produtos por vez." };

  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true },
  });
  const byCategory = new Map(
    categories.flatMap((c) => [
      [normalizeImportHeader(c.name), c.id],
      [normalizeImportHeader(c.slug), c.id],
    ]),
  );
  const seenSkus = new Set<string>();
  const products = [];

  for (const [index, row] of rows.entries()) {
    if (!row || typeof row !== "object")
      return { error: `Linha ${index + 2}: dados inválidos.` };
    const read = (field: keyof ImportRow) =>
      typeof row[field] === "string" ? row[field].trim() : "";
    const sku = read("sku").slice(0, 60);
    const name = read("nome").slice(0, 160);
    const categoryId = byCategory.get(normalizeImportHeader(read("categoria")));
    const priceCents = parseImportPrice(read("preco"));
    const stockText = read("estoque");
    const stock = stockText ? Number(stockText) : 0;
    const summary = read("resumo") || name;
    if (!sku || !name)
      return { error: `Linha ${index + 2}: nome e SKU são obrigatórios.` };
    if (seenSkus.has(sku.toLowerCase()))
      return { error: `Linha ${index + 2}: SKU ${sku} repetido no arquivo.` };
    if (!categoryId)
      return {
        error: `Linha ${index + 2}: categoria “${read("categoria")}” não existe. Crie-a antes da importação.`,
      };
    if (priceCents === null)
      return {
        error: `Linha ${index + 2}: preço inválido. Use 1299,90 ou 1299.90.`,
      };
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1000000)
      return { error: `Linha ${index + 2}: estoque inválido.` };
    if (summary.length > 200)
      return {
        error: `Linha ${index + 2}: o resumo deve ter até 200 caracteres.`,
      };
    seenSkus.add(sku.toLowerCase());

    products.push({
      sku,
      slug: `${slugify(name) || "produto"}-${slugify(sku) || String(index + 1)}`,
      name,
      categoryId,
      shortDesc: summary,
      description: read("descricao").slice(0, 10000),
      priceCents,
      originalPriceCents: null,
      stock,
      active: !["nao", "não", "false", "0", "inativo"].includes(
        read("ativo").toLowerCase(),
      ),
      featured: ["sim", "true", "1"].includes(read("destaque").toLowerCase()),
      images: [] as string[],
      specs: {},
    });
  }

  try {
    const result = await prisma.product.createMany({
      data: products,
      skipDuplicates: true,
    });
    revalidateTag("products", "max");
    revalidatePath("/");
    revalidatePath("/admin/produtos");
    return { created: result.count, skipped: rows.length - result.count };
  } catch {
    return {
      error:
        "Não foi possível importar. Verifique a conexão com o banco e tente novamente.",
    };
  }
}
