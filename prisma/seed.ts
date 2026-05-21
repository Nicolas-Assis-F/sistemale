import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Categorias de exemplo
  const bombas = await prisma.category.upsert({
    where: { slug: 'bombas-submersas' },
    update: {},
    create: {
      slug: 'bombas-submersas',
      name: 'Bombas Submersas',
      description: 'Bombas para extração de água em poços artesianos profundos.',
      order: 1,
    },
  });

  const motores = await prisma.category.upsert({
    where: { slug: 'motores' },
    update: {},
    create: {
      slug: 'motores',
      name: 'Motores',
      description: 'Motores elétricos para bombeamento de água.',
      order: 2,
    },
  });

  const pecas = await prisma.category.upsert({
    where: { slug: 'pecas-e-acessorios' },
    update: {},
    create: {
      slug: 'pecas-e-acessorios',
      name: 'Peças e Acessórios',
      description: 'Peças de reposição e acessórios para manutenção.',
      order: 3,
    },
  });

  // Produtos de exemplo
  await prisma.product.upsert({
    where: { sku: 'BS-3CV-001' },
    update: {},
    create: {
      sku: 'BS-3CV-001',
      slug: 'bomba-submersa-3cv-3000lh',
      name: 'Bomba Submersa 3CV 3.000 L/h',
      shortDesc: 'Bomba submersa de alta eficiência para poços de até 100m de profundidade.',
      description: `## Bomba Submersa 3CV

Ideal para poços artesianos com profundidade de até **100 metros**.

### Características
- Motor de indução com proteção térmica
- Carcaça em aço inox AISI 304
- Impelidor em Noryl (resistente a areia)
- Plug rápido para conexão com motor

### Aplicações
- Abastecimento residencial
- Irrigação
- Abastecimento industrial`,
      specs: {
        Potência: '3 CV',
        Vazão: '3.000 L/h',
        'Profundidade máx.': '100m',
        Voltagem: '220V / 380V',
        Frequência: '60Hz',
        Diâmetro: '4"',
      },
      priceCents: 189900,
      originalPriceCents: 219900,
      stock: 5,
      active: true,
      featured: true,
      images: [],
      categoryId: bombas.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: 'BS-1CV-002' },
    update: {},
    create: {
      sku: 'BS-1CV-002',
      slug: 'bomba-submersa-1cv-1500lh',
      name: 'Bomba Submersa 1CV 1.500 L/h',
      shortDesc: 'Bomba compacta para poços rasos e residenciais, fácil instalação.',
      description: `## Bomba Submersa 1CV

Solução econômica para **poços até 50 metros** de profundidade.

### Ideal para
- Residências
- Sítios e chácaras
- Piscinas`,
      specs: {
        Potência: '1 CV',
        Vazão: '1.500 L/h',
        'Profundidade máx.': '50m',
        Voltagem: '110V / 220V',
        Frequência: '60Hz',
        Diâmetro: '3"',
      },
      priceCents: 89900,
      stock: 10,
      active: true,
      featured: true,
      images: [],
      categoryId: bombas.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: 'MT-3CV-001' },
    update: {},
    create: {
      sku: 'MT-3CV-001',
      slug: 'motor-submerso-3cv-4pol',
      name: 'Motor Submerso 3CV 4"',
      shortDesc: 'Motor submerso para bomba de 4" com proteção contra areia e sobreaquecimento.',
      description: `## Motor Submerso 3CV 4"

Motor de alto desempenho com **proteção térmica integrada** e blindagem contra areia.`,
      specs: {
        Potência: '3 CV',
        Diâmetro: '4"',
        Voltagem: '220V / 380V',
        Proteção: 'IP68',
        'Proteção térmica': 'Automática',
      },
      priceCents: 129900,
      stock: 3,
      active: true,
      featured: false,
      images: [],
      categoryId: motores.id,
    },
  });

  await prisma.product.upsert({
    where: { sku: 'PA-CAP-50' },
    update: {},
    create: {
      sku: 'PA-CAP-50',
      slug: 'capacitor-50uf-440v',
      name: 'Capacitor 50µF 440V',
      shortDesc: 'Capacitor de partida para motores monofásicos de bombas submersas.',
      description: `## Capacitor de Partida 50µF

Compatível com a maioria dos motores monofásicos de 1 a 3 CV.`,
      specs: {
        Capacitância: '50µF',
        Tensão: '440V',
        Tipo: 'Eletrólito',
        Aplicação: 'Partida de motor',
      },
      priceCents: 2990,
      stock: 30,
      active: true,
      featured: false,
      images: [],
      categoryId: pecas.id,
    },
  });

  console.log('✅ Seed concluído com 3 categorias e 4 produtos de exemplo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
