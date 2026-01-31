export type PlanType = 'free' | 'pro' | 'business'

export interface Plan {
  id: PlanType
  name: string
  price: number // FCFA per month
  description: string
  features: string[]
  limits: {
    products: number
    ordersPerMonth: number
    flashSales: boolean
    analytics: boolean
    prioritySupport: boolean
    customSlug: boolean
    whatsappBot: boolean
  }
  commissionRate: number // percentage
}

export const PLANS: Record<PlanType, Plan> = {
  free: {
    id: 'free',
    name: 'Gratuit',
    price: 0,
    description: 'Pour démarrer votre boutique',
    features: [
      '10 produits maximum',
      '50 commandes/mois',
      'Vérification reçus Mobile Money',
      'Page boutique publique',
      'Commission 3% par vente',
    ],
    limits: {
      products: 10,
      ordersPerMonth: 50,
      flashSales: false,
      analytics: false,
      prioritySupport: false,
      customSlug: false,
      whatsappBot: false,
    },
    commissionRate: 0.03,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 2500,
    description: 'Pour les vendeurs actifs',
    features: [
      '100 produits',
      'Commandes illimitées',
      'Ventes Flash WhatsApp',
      'Lien personnalisé (slug)',
      'Statistiques avancées',
      'Commission 1.5% par vente',
    ],
    limits: {
      products: 100,
      ordersPerMonth: -1, // unlimited
      flashSales: true,
      analytics: true,
      prioritySupport: false,
      customSlug: true,
      whatsappBot: true,
    },
    commissionRate: 0.015,
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 7500,
    description: 'Pour les grandes boutiques',
    features: [
      'Produits illimités',
      'Commandes illimitées',
      'Toutes les fonctionnalités Pro',
      'Support prioritaire',
      'Commission 0.5% par vente',
      'Export données',
      'Multi-utilisateurs (bientôt)',
    ],
    limits: {
      products: -1, // unlimited
      ordersPerMonth: -1,
      flashSales: true,
      analytics: true,
      prioritySupport: true,
      customSlug: true,
      whatsappBot: true,
    },
    commissionRate: 0.005,
  },
}

export function getPlan(planId: PlanType): Plan {
  return PLANS[planId] || PLANS.free
}

export function canAddProduct(currentCount: number, plan: PlanType): boolean {
  const planData = getPlan(plan)
  if (planData.limits.products === -1) return true
  return currentCount < planData.limits.products
}

export function canProcessOrder(currentMonthOrders: number, plan: PlanType): boolean {
  const planData = getPlan(plan)
  if (planData.limits.ordersPerMonth === -1) return true
  return currentMonthOrders < planData.limits.ordersPerMonth
}

export function calculateCommission(amount: number, plan: PlanType): number {
  const planData = getPlan(plan)
  return Math.round(amount * planData.commissionRate)
}

export function formatPrice(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}
