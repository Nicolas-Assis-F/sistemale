import { getProductOffer } from "@/lib/catalog-offers";
import { formatCurrency } from "@/lib/format";

export function ProductPrice({ product }: { product: { priceCents: number; originalPriceCents?: number | null } }) {
  const offer = getProductOffer(product);
  const hasPrice = Number.isSafeInteger(product.priceCents) && product.priceCents > 0;
  return (
    <div className="le-product-price">
      <span className="le-product-price-label">
        {offer ? <>De <del>{formatCurrency(offer.originalPriceCents)}</del> por</> : hasPrice ? "Investimento" : "Feito para sua operação"}
      </span>
      <strong className={offer ? "le-product-price-value is-offer" : "le-product-price-value"}>
        {hasPrice ? formatCurrency(product.priceCents) : "Sob cotação"}
      </strong>
      {offer && <span className="le-product-price-saving">Economize {formatCurrency(offer.savingsCents)}</span>}
    </div>
  );
}
