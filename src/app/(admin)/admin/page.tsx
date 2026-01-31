'use client'

import { useState, useEffect } from 'react'
import { Users, ShoppingCart, Store, TrendingUp, Loader2, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  totalVendors: number
  activeVendors: number
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  recentVendors: Array<{
    id: string
    shop_name: string
    created_at: string
    is_active: boolean
  }>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch all vendors
      const { data: vendors } = await supabase
        .from('profiles')
        .select('id, shop_name, created_at, is_active, role')
        .eq('role', 'vendor')
        .order('created_at', { ascending: false })

      // Fetch all orders
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total_amount, payment_status, created_at')

      const vendorList = (vendors as Array<{
        id: string
        shop_name: string
        created_at: string
        is_active: boolean
        role: string
      }>) || []

      const orderList = (orders as Array<{
        id: string
        total_amount: number
        payment_status: string
        created_at: string
      }>) || []

      const totalRevenue = orderList
        .filter(o => o.payment_status === 'verified')
        .reduce((sum, o) => sum + (o.total_amount || 0), 0)

      const pendingOrders = orderList.filter(o => o.payment_status === 'pending').length

      setStats({
        totalVendors: vendorList.length,
        activeVendors: vendorList.filter(v => v.is_active !== false).length,
        totalOrders: orderList.length,
        totalRevenue,
        pendingOrders,
        recentVendors: vendorList.slice(0, 5),
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Admin</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de la plateforme Shop-Sync
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalVendors || 0}</p>
                <p className="text-sm text-muted-foreground">Vendeurs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-full">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.activeVendors || 0}</p>
                <p className="text-sm text-muted-foreground">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalOrders || 0}</p>
                <p className="text-sm text-muted-foreground">Commandes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-full">
                <TrendingUp className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(stats?.totalRevenue || 0).toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">FCFA Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(stats?.pendingOrders || 0) > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <p className="text-sm">
                <strong>{stats?.pendingOrders}</strong> commande(s) en attente de paiement
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Vendors */}
      <Card>
        <CardHeader>
          <CardTitle>Derniers vendeurs inscrits</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentVendors && stats.recentVendors.length > 0 ? (
            <div className="space-y-3">
              {stats.recentVendors.map((vendor) => (
                <div key={vendor.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{vendor.shop_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(vendor.created_at).toLocaleDateString('fr-CI')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    vendor.is_active !== false
                      ? 'bg-green-500/10 text-green-600'
                      : 'bg-red-500/10 text-red-600'
                  }`}>
                    {vendor.is_active !== false ? 'Actif' : 'Suspendu'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              Aucun vendeur inscrit
            </p>
          )}
          <a
            href="/admin/vendors"
            className="block text-center text-primary hover:underline mt-4 text-sm"
          >
            Voir tous les vendeurs →
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
