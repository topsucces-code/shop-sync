import Link from 'next/link'
import { Package, ShoppingCart, ScanLine, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { ShopLink } from '@/components/shop-link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch stats
  const [productsResult, ordersResult, pendingResult] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('vendor_id', user!.id),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('vendor_id', user!.id),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('vendor_id', user!.id).eq('payment_status', 'pending'),
  ])

  const stats = [
    {
      title: 'Produits',
      value: productsResult.count || 0,
      icon: Package,
      href: '/products',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Commandes',
      value: ordersResult.count || 0,
      icon: ShoppingCart,
      href: '/orders',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'En attente',
      value: pendingResult.count || 0,
      icon: TrendingUp,
      href: '/orders?status=pending',
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Bienvenue sur Shop-Sync
        </p>
      </div>

      {/* Shop Link */}
      <ShopLink vendorId={user!.id} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/analyze">
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <ScanLine className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Scanner un reçu</h3>
                  <p className="text-sm text-muted-foreground">
                    Vérifier un paiement Mobile Money
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/products">
            <Card className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="p-3 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Package className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Gérer les produits</h3>
                  <p className="text-sm text-muted-foreground">
                    Ajouter ou modifier vos produits
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
