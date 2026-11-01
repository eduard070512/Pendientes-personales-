/** Enlace de WhatsApp; asume México (+52) si el número tiene 10 dígitos. */
export function whatsappUrl(phone: string, text = "") {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `52${digits}`;
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telUrl(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}
