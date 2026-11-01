// Reglas simples para sugerir categoría a partir de la descripción del estado de cuenta.
const RULES: [RegExp, string][] = [
  [/oxxo|7.?eleven|walmart|bodega aurrera|soriana|chedraui|la comer|costco|sams|sam's|heb|super|mercado/i, "Súper"],
  [/uber ?eats|didi ?food|rappi|starbucks|mcdonald|burger|domino|pizza|taco|restaurant|cafe|café|kfc|subway|little caesars/i, "Comida"],
  [/uber|didi|cabify|metro|autobus|autobús|ado |etn|primera plus|caseta|peaje|estacionamiento|parking/i, "Transporte"],
  [/pemex|gasolin|g500|oxxo gas|shell|bp |mobil|arco|total ?energies/i, "Gasolina"],
  [/cfe|telmex|totalplay|izzi|megacable|telcel|at&t|movistar|bait|agua|gas natural|naturgy/i, "Servicios"],
  [/netflix|spotify|disney|hbo|max\.com|prime video|youtube|apple\.com|icloud|google|chatgpt|openai|anthropic|claude|github|vercel|neon|canva|adobe|notion/i, "Suscripciones"],
  [/amazon|mercado ?libre|mercadopago|shein|temu|aliexpress|liverpool|palacio|coppel|elektra/i, "Compras en línea"],
  [/farmacia|similares|guadalajara|benavides|del ahorro|hospital|doctor|dental|laboratorio/i, "Salud"],
  [/universidad|udec|colegiatura|curso|udemy|coursera|platzi|libreria|librería/i, "Educación"],
  [/cinepolis|cinépolis|cinemex|steam|playstation|xbox|nintendo|ticketmaster|bar |antro/i, "Entretenimiento"],
  [/zara|h&m|c&a|nike|adidas|pull ?& ?bear|bershka|innovasport|marti/i, "Ropa"],
  [/interes|interés|comision|comisión|iva comis|anualidad|cargo por/i, "Comisiones e intereses"],
  [/renta|arrendamiento/i, "Renta"],
];

export function guessCategory(description: string, type: "ingreso" | "gasto") {
  if (type === "ingreso") {
    if (/nomina|nómina|sueldo|salario/i.test(description)) return "Sueldo";
    if (/devolucion|devolución|reembolso|bonificacion|bonificación/i.test(description)) return "Reembolsos";
    return "Otros";
  }
  for (const [re, cat] of RULES) if (re.test(description)) return cat;
  return "Otros";
}

/** Clave para recordar la categoría que le diste a un comercio (primeras 2 palabras). */
export function learnKey(desc: string) {
  return desc
    .toLowerCase()
    .replace(/[^a-záéíóúñ ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .join(" ");
}
