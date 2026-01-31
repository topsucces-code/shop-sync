'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Search, Filter, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

interface Order {
  id: string
  vendor_id: string
  vendor_name: string
  customer_name: string | null
  customer_phone: string | null
  total_amount: number
  payment_status: string
  payment_network: string | null
  created_at: string
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const supabase = createClient()

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    let result = orders

    if (statusFilter !== 'all') {
      result = result.filter(o => o.payment_status === statusFilter)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(o =>
        o.vendor_name.toLowerCase().includes(searchLower) ||
        o.customer_name?.toLowerCase().includes(searchLower) ||
        o.customer_phone?.includes(search) ||
        o.id.toLowerCase().includes(searchLower)
      )
    }

    setFilteredOrders(result)
  }, [search, statusFilter, orders])

  const fetchOrders = async () => {
    try {
      // Fetch all orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      // Fetch vendor names
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, shop_name')

      const vendorMap = new Map<string, string>()
      if (profiles) {
        for (const p of profiles as Array<{ id: string; shop_name: string }>) {
          vendorMap.set(p.id, p.shop_name)
        }
      }

      const orderList = ((ordersData as Array<{
        id: string
        vendor_id: string
        customer_name: string | null
        customer_phone: string | null
        total_amount: number
        payment_status: string
        payment_network: string | null
        created_at: string
      }>) || []).map(o => ({
        ...o,
        vendor_name: vendorMap.get(o.vendor_id) || 'Inconnu',
      }))

      setOrders(orderList)
      setFilteredOrders(orderList)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Vérifié'
      case 'pending':
        return 'En attente'
      case 'failed':
        return 'Échoué'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const stats = {
    total: orders.length,
    verified: orders.filter(o => o.payment_status === 'verified').length,
    pending: orders.filter(o => o.payment_status === 'pending').length,
    failed: orders.filter(o => o.payment_status === 'failed').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Toutes les Commandes</h1>
        <p className="text-muted-foreground">
          {orders.length} commande(s) au total
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-3 rounded-lg text-center transition-colors ${
            statusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
        >
          <p className="text-xl font-bold">{stats.total}</p>
          <p className="text-xs">Total</p>
        </button>
        <button
          onClick={() => setStatusFilter('verified')}
          className={`p-3 rounded-lg text-center transition-colors ${
            statusFilter === 'verified' ? 'bg-green-500 text-white' : 'bg-green-500/10 hover:bg-green-500/20'
          }`}
        >
          <p className="text-xl font-bold">{stats.verified}</p>
          <p className="text-xs">Vérifié</p>
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`p-3 rounded-lg text-center transition-colors ${
            statusFilter === 'pending' ? 'bg-orange-500 text-white' : 'bg-orange-500/10 hover:bg-orange-500/20'
          }`}
        >
          <p className="text-xl font-bold">{stats.pending}</p>
          <p className="text-xs">En attente</p>
        </button>
        <button
          onClick={() => setStatusFilter('failed')}
          className={`p-3 rounded-lg text-center transition-colors ${
            statusFilter === 'failed' ? 'bg-red-500 text-white' : 'bg-red-500/10 hover:bg-red-500/20'
          }`}
        >
          <p className="text-xl font-bold">{stats.failed}</p>
          <p className="text-xs">Échoué</p>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par vendeur, client, téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucune commande trouvée
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-secondary/20 rounded-full shrink-0">
                      <ShoppingCart className="h-4 w-4 text-secondary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-primary">{order.vendor_name}</span>
                        <span className="text-xs text-muted-foreground">
                          #{order.id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-sm">
                        {order.customer_name || 'Client anonyme'}
                        {order.customer_phone && ` • ${order.customer_phone}`}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        <span className="font-semibold">
                          {order.total_amount.toLocaleString()} FCFA
                        </span>
                        {order.payment_network && (
                          <span className="text-xs px-2 py-0.5 bg-muted rounded">
                            {order.payment_network.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(order.payment_status)}
                      <span className="text-sm">{getStatusLabel(order.payment_status)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(order.created_at).toLocaleDateString('fr-CI', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
