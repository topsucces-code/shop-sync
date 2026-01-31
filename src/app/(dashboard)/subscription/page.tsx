'use client'

import { useState, useEffect } from 'react'
import { Crown, Check, Zap, Building, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { PLANS, type PlanType, formatPrice } from '@/lib/plans'
import { toast } from 'sonner'

interface ProfileData {
  plan: PlanType
  plan_expires_at: string | null
  products_limit: number
  orders_this_month: number
  orders_limit: number
}

export default function SubscriptionPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [productCount, setProductCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('plan, plan_expires_at, products_limit, orders_this_month, orders_limit')
        .eq('id', user.id)
        .single()

      // Fetch product count
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', user.id)

      setProfile((profileData as unknown as ProfileData) || {
        plan: 'free',
        plan_expires_at: null,
        products_limit: 10,
        orders_this_month: 0,
        orders_limit: 50
      })
      setProductCount(count || 0)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = async (planId: PlanType) => {
    if (planId === 'free') return

    setSelectedPlan(planId)
    const plan = PLANS[planId]

    // For now, show payment instructions
    toast.info(
      `Pour passer au plan ${plan.name}, envoyez ${formatPrice(plan.price)} via Wave/Orange Money au 07 XX XX XX XX avec la référence "SHOP-${planId.toUpperCase()}"`,
      { duration: 10000 }
    )

    // In production, integrate with mobile money API
  }

  const getPlanIcon = (planId: PlanType) => {
    switch (planId) {
      case 'free': return <Zap className="h-6 w-6" />
      case 'pro': return <Crown className="h-6 w-6" />
      case 'business': return <Building className="h-6 w-6" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const currentPlan = profile?.plan || 'free'
  const currentPlanData = PLANS[currentPlan]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Abonnement</h1>
        <p className="text-muted-foreground">
          Gérez votre plan et débloquez plus de fonctionnalités
        </p>
      </div>

      {/* Current Plan Status */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getPlanIcon(currentPlan)}
            Plan actuel : {currentPlanData.name}
          </CardTitle>
          <CardDescription>
            {currentPlanData.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Produits</p>
              <p className="text-lg font-bold">
                {productCount} / {currentPlanData.limits.products === -1 ? '∞' : currentPlanData.limits.products}
              </p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm text-muted-foreground">Commandes ce mois</p>
              <p className="text-lg font-bold">
                {profile?.orders_this_month || 0} / {currentPlanData.limits.ordersPerMonth === -1 ? '∞' : currentPlanData.limits.ordersPerMonth}
              </p>
            </div>
          </div>

          {profile?.plan_expires_at && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Expire le {new Date(profile.plan_expires_at).toLocaleDateString('fr-CI')}
            </div>
          )}

          <div className="mt-4 p-3 bg-primary/5 rounded-lg">
            <p className="text-sm">
              <strong>Commission actuelle :</strong> {(currentPlanData.commissionRate * 100).toFixed(1)}% par vente vérifiée
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {Object.values(PLANS).map((plan) => {
          const isCurrent = plan.id === currentPlan
          const isUpgrade = PLANS[plan.id].price > PLANS[currentPlan].price

          return (
            <Card
              key={plan.id}
              className={`relative ${isCurrent ? 'border-primary border-2' : ''} ${plan.id === 'pro' ? 'md:scale-105' : ''}`}
            >
              {plan.id === 'pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                  Populaire
                </div>
              )}
              <CardHeader className="text-center pb-2">
                <div className={`mx-auto p-3 rounded-full ${
                  plan.id === 'free' ? 'bg-muted' :
                  plan.id === 'pro' ? 'bg-primary/10 text-primary' :
                  'bg-accent/20 text-accent-foreground'
                }`}>
                  {getPlanIcon(plan.id)}
                </div>
                <CardTitle className="mt-2">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {plan.price === 0 ? 'Gratuit' : formatPrice(plan.price)}
                  {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/mois</span>}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button className="w-full" disabled>
                    Plan actuel
                  </Button>
                ) : isUpgrade ? (
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    Passer au {plan.name}
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    Downgrade
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Commission Info */}
      <Card>
        <CardHeader>
          <CardTitle>Comment fonctionnent les commissions ?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Une commission est prélevée sur chaque commande dont le paiement est vérifié avec succès.
          </p>
          <div className="grid grid-cols-3 gap-4 py-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">3%</p>
              <p>Plan Gratuit</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">1.5%</p>
              <p>Plan Pro</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-accent-foreground">0.5%</p>
              <p>Plan Business</p>
            </div>
          </div>
          <p>
            Exemple : Sur une vente de 10 000 FCFA, la commission est de 300 FCFA (Gratuit), 150 FCFA (Pro), ou 50 FCFA (Business).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
