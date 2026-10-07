// Aplica a revisão de catálogo de outubro/2026 (preços praticados, AR-100 → AR60,
// P80 e sua haste, par de ponteiras 2 3/8″, cabeçotes com acessórios).
// Fonte: data/catalogo/products.json. Idempotente. Nunca mexe no estoque e só
// grava fotos quando o produto ainda não tem nenhuma (as do admin são preservadas).
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
import { PrismaClient } from "@prisma/client";
import catalog from "../data/catalogo/products.json";

const SKUS = [
  "LE-AR60", "LE-P80", "LE-HASTE-2Q-15", "LE-ROSCA-238", "LE-API-REGULAR", "LE-API-IF",
  "LE-CAB80", "LE-CAB120", "LE-CAB250", "LE-HASTE-IF", "LE-HASTE-REGULAR",
  ...["238", "278", "312"].flatMap((d) => [2, 3, 4].map((l) => `LE-HASTE-${d}-${l}M`)),
];

const prisma = new PrismaClient();
async function main() {
  await prisma.$transaction(async (tx) => {
    // Renomeia mantendo o mesmo registro (pedidos e fichas de custo continuam ligados)
    const old = await tx.product.findUnique({ where: { sku: "LE-AR100" }, select: { id: true } });
    if (old && !(await tx.product.findUnique({ where: { sku: "LE-AR60" } }))) {
      await tx.product.update({ where: { id: old.id }, data: { sku: "LE-AR60", slug: "ar60" } });
    }
    for (const sku of SKUS) {
      const item = catalog.products.find((p) => p.sku === sku);
      if (!item) throw new Error(`${sku} não está em products.json`);
      const { categorySlug, stock, images, ...data } = item;
      const category = await tx.category.findUniqueOrThrow({ where: { slug: categorySlug } });
      const current = await tx.product.findUnique({ where: { sku }, select: { images: true } });
      await tx.product.upsert({
        where: { sku },
        create: { ...data, stock, images, categoryId: category.id },
        update: { ...data, categoryId: category.id, ...(current?.images.length ? {} : { images }) },
      });
    }
  }, { maxWait: 10_000, timeout: 60_000 });
  console.log(`Revisão aplicada em ${SKUS.length} produtos.`);
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
