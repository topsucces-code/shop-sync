'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, CheckCircle2, Clock, XCircle, Loader2, Eye, Phone, MapPin, Package } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/delivery-fees'

type PaymentStatus = 'pending' | 'verified' | 'failed'
type PaymentNetwork = 'wave' | 'orange' | 'mtn' | 'other'

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface OrderItems {
  products: OrderItem[]
  subtotal: number
  delivery_fee: number
  commune: string
}

interface Order {
  id: string
  vendor_id: string
  customer_name: string | null
  customer_phone: string | null
  total_amount: number
  payment_proof_url: string | null
  payment_status: PaymentStatus
  payment_network: PaymentNetwork | null
  transaction_id: string | null
  transaction_date: string | null
  items: OrderItems
  created_at: string
  updated_at: string | null
}

const statusConfig = {
  pending: {
    label: 'En attente',
    icon: Clock,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  verified: {
    label: 'Payée',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  failed: {
    label: 'Échouée',
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
}

const networkLabels: Record<string, string> = {
  wave: 'Wave',
  orange: 'Orange Money',
  mtn: 'MTN MoMo',
  other: 'Autre',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'failed'>('all')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [showProof, setShowProof] = useState<string | null>(null)

  const supabase = createClient()

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Erreur lors du chargement des commandes')
      return
    }

    setAllOrders((data as unknown as Order[]) || [])
    setIsLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    if (filter === 'all') {
      setOrders(allOrders)
    } else {
      setOrders(allOrders.filter(o => o.payment_status === filter))
    }
  }, [filter, allOrders])

  // Count orders by status
  const counts = {
    all: allOrders.length,
    pending: allOrders.filter(o => o.payment_status === 'pending').length,
    verified: allOrders.filter(o => o.payment_status === 'verified').length,
    failed: allOrders.filter(o => o.payment_status === 'failed').length,
  }

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('fr-CI', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dateStr))
  }

  const updateStatus = async (orderId: string, newStatus: PaymentStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: newStatus, updated_at: new Date().toISOString() } as never)
      .eq('id', orderId)

    if (error) {
      toast.error('Erreur lors de la mise à jour')
      return
    }

    toast.success('Statut mis à jour!')
    fetchOrders()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commandes</h1>
        <p className="text-muted-foreground">
          Gérez vos commandes clients
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-2">
        <Card className={filter === 'all' ? 'ring-2 ring-primary' : ''}>
          <CardContent className="p-3 text-center cursor-pointer" onClick={() => setFilter('all')}>
            <p className="text-2xl font-bold">{counts.all}</p>
            <p className="text-xs text-muted-foreground">Toutes</p>
          </CardContent>
        </Card>
        <Card className={filter === 'pending' ? 'ring-2 ring-orange-500' : ''}>
          <CardContent className="p-3 text-center cursor-pointer" onClick={() => setFilter('pending')}>
            <p className="text-2xl font-bold text-orange-500">{counts.pending}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card className={filter === 'verified' ? 'ring-2 ring-green-500' : ''}>
          <CardContent className="p-3 text-center cursor-pointer" onClick={() => setFilter('verified')}>
            <p className="text-2xl font-bold text-green-500">{counts.verified}</p>
            <p className="text-xs text-muted-foreground">Payées</p>
          </CardContent>
        </Card>
        <Card className={filter === 'failed' ? 'ring-2 ring-red-500' : ''}>
          <CardContent className="p-3 text-center cursor-pointer" onClick={() => setFilter('failed')}>
            <p className="text-2xl font-bold text-red-500">{counts.failed}</p>
            <p className="text-xs text-muted-foreground">Échouées</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune commande</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = statusConfig[order.payment_status]
            const StatusIcon = status.icon
            const isExpanded = expandedOrder === order.id

            return (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">
                        {order.customer_name || 'Client anonyme'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {order.customer_phone || '-'}
                      </div>
                      {order.items?.commune && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {order.items.commune}
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${status.bgColor}`}>
                      <StatusIcon className={`h-3 w-3 ${status.color}`} />
                      <span className={`text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Amount & Network */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xl font-bold text-primary">
                      {formatPrice(order.total_amount)}
                    </p>
                    {order.payment_network && (
                      <span className="text-sm px-2 py-1 bg-muted rounded">
                        {networkLabels[order.payment_network]}
                      </span>
                    )}
                  </div>

                  {/* Transaction ID */}
                  {order.transaction_id && (
                    <p className="text-xs font-mono text-muted-foreground mb-2 bg-muted px-2 py-1 rounded">
                      TX: {order.transaction_id}
                    </p>
                  )}

                  {/* Date & Actions Row */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {formatDate(order.created_at)}
                    </p>
                    <div className="flex gap-2">
                      {order.payment_proof_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowProof(showProof === order.id ? null : order.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        {order.items?.products?.length || 0} article(s)
                      </Button>
                    </div>
                  </div>

                  {/* Payment Proof Image */}
                  {showProof === order.id && order.payment_proof_url && (
                    <div className="mt-4 p-2 bg-muted rounded-lg">
                      <p className="text-xs font-medium mb-2">Preuve de paiement:</p>
                      <img
                        src={order.payment_proof_url}
                        alt="Preuve de paiement"
                        className="w-full max-h-64 object-contain rounded"
                      />
                    </div>
                  )}

                  {/* Expanded Order Details */}
                  {isExpanded && order.items?.products && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <p className="text-sm font-medium">Détail de la commande:</p>
                      {order.items.products.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.name} x{item.quantity}</span>
                          <span>{formatPrice(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t space-y-1">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Sous-total</span>
                          <span>{formatPrice(order.items.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Livraison ({order.items.commune})</span>
                          <span>{formatPrice(order.items.delivery_fee)}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>{formatPrice(order.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons for Pending Orders */}
                  {order.payment_status === 'pending' && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        onClick={() => updateStatus(order.id, 'verified')}
                        className="flex-1"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Valider le paiement
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStatus(order.id, 'failed')}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeter
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
