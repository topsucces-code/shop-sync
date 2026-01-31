// Frais de livraison par commune d'Abidjan (en FCFA)
export const DELIVERY_FEES: Record<string, number> = {
  'Abobo': 1500,
  'Adjamé': 1000,
  'Anyama': 2000,
  'Attécoubé': 1000,
  'Bingerville': 2000,
  'Cocody': 1500,
  'Koumassi': 1000,
  'Marcory': 1000,
  'Plateau': 1000,
  'Port-Bouët': 1500,
  'Treichville': 1000,
  'Yopougon': 1500,
  'Songon': 2500,
  'Autres': 2000,
}

export const COMMUNES = Object.keys(DELIVERY_FEES)

export function getDeliveryFee(commune: string): number {
  return DELIVERY_FEES[commune] ?? DELIVERY_FEES['Autres']
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-CI', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount)
}
