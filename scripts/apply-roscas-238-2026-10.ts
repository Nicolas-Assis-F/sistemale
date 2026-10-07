// Rosca 2 3/8″ padrão (tubo de 60 mm): fotos reais do par de ponteiras e conexão
// nas hastes 2 3/8″. Fonte: data/catalogo/products.json. Idempotente; não mexe em
// estoque, preço nem nas fotos das hastes.
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
import { PrismaClient } from "@prisma/client";
import catalog from "../data/catalogo/products.json";

const find = (sku: string) => {
  const item = catalog.products.find((p) => p.sku === sku);
  if (!item) throw new Error(`${sku} não está em products.json`);
  return item;
};

const prisma = new PrismaClient();
async function main() {
  await prisma.$transaction(async (tx) => {
    const pair = find("LE-ROSCA-238");
    await tx.product.update({
      where: { sku: pair.sku },
      data: { name: pair.name, shortDesc: pair.shortDesc, description: pair.description, specs: pair.specs, images: pair.images },
    });
    for (const l of [2, 3, 4]) {
      const rod = find(`LE-HASTE-238-${l}M`);
      await tx.product.update({ where: { sku: rod.sku }, data: { specs: rod.specs } });
    }
  }, { maxWait: 10_000, timeout: 60_000 });
  console.log("Rosca 2 3/8″ padrão aplicada (1 par + 3 hastes).");
}
main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
