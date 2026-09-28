/** Somente preços anteriores válidos geram uma oferta na apresentação. */
export function getProductOffer(product: { priceCents: number; originalPriceCents?: number | null }) {
  const { priceCents, originalPriceCents } = product;
  if (!Number.isSafeInteger(priceCents) || priceCents <= 0 ||
      !Number.isSafeInteger(originalPriceCents) || !originalPriceCents || originalPriceCents <= priceCents) return null;
  const savingsCents = originalPriceCents - priceCents;
  return { originalPriceCents, savingsCents, percent: Math.floor(savingsCents / originalPriceCents * 100) };
}
