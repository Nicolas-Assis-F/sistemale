interface Args {
  sku?: string;
  productName?: string;
}

export function buildWhatsAppUrl({ sku, productName }: Args = {}): string {
  const phone = (process.env.NEXT_PUBLIC_COMPANY_PHONE || "5562986018386").replace(/\D/g, "");
  let text: string;

  if (sku && productName) {
    // Formato CRÍTICO — o bot (fase 2) vai parsear [SKU-XXX] do início da msg
    text = `[${sku}] Olá! Tenho interesse no produto "${productName}". Pode me ajudar?`;
  } else {
    text = 'Olá! Vim do site e gostaria de mais informações.';
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
