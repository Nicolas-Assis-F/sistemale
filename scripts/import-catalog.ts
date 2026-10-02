import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
import { PrismaClient } from "@prisma/client";
import catalog from "../data/catalogo/products.json";

const prisma = new PrismaClient();
async function main() {
  await prisma.$transaction(async (tx) => {
    for (const category of catalog.categories) {
      await tx.category.upsert({
        where: { slug: category.slug },
        create: category,
        update: {},
      });
    }
    for (const { categorySlug, ...product } of catalog.products) {
      const category = await tx.category.findUniqueOrThrow({
        where: { slug: categorySlug },
      });
      await tx.product.upsert({
        where: { sku: product.sku },
        create: { ...product, categoryId: category.id },
        update: {},
      });
    }
    // Retira somente os quatro exemplos do seed original da vitrine, sem excluir registros.
    await tx.product.updateMany({
      where: {
        sku: { in: ["BS-3CV-001", "BS-1CV-002", "MT-3CV-001", "PA-CAP-50"] },
      },
      data: { active: false, featured: false },
    });
    // Banco remoto (produção) passa dos 5 s padrão em ~40 consultas sequenciais.
  }, { maxWait: 10_000, timeout: 60_000 });
  console.log(
    `Catálogo importado: ${catalog.products.length} referências. Registros existentes preservados.`,
  );
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
