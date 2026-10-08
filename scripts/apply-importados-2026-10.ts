// Itens da 1ª importação (out/2026): martelo CIR110 com preço, bit CIR110 de 130 mm
// e brocas PDC por diâmetro (substituem as fichas genéricas sem preço).
// Fonte: data/catalogo/products.json. Idempotente; nunca mexe no estoque e só grava
// fotos quando o produto ainda não tem nenhuma.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
import { PrismaClient } from "@prisma/client";
import catalog from "../data/catalogo/products.json";

const SKUS = [
  "LE-CIR110-M", "LE-CIR110-B130", "LE-PDC3-139", "LE-PDC3-152", "LE-PDC5-127", "LE-PDC5-152",
  "LE-PDC3", "LE-PDC5",
];

const prisma = new PrismaClient();
async function main() {
  await prisma.$transaction(async (tx) => {
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
  console.log(`Itens importados aplicados em ${SKUS.length} produtos.`);
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
