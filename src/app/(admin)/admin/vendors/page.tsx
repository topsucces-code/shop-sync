'use client'

import { useState, useEffect } from 'react'
import { Store, Search, ToggleLeft, ToggleRight, ExternalLink, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Vendor {
  id: string
  shop_name: string
  phone: string | null
  slug: string | null
  is_active: boolean
  created_at: string
  orders_count: number
  total_revenue: number
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchVendors()
  }, [])

  useEffect(() => {
    if (search) {
      setFilteredVendors(
        vendors.filter(v =>
          v.shop_name.toLowerCase().includes(search.toLowerCase()) ||
          v.phone?.includes(search)
        )
      )
    } else {
      setFilteredVendors(vendors)
    }
  }, [search, vendors])

  const fetchVendors = async () => {
    try {
      // Fetch vendors
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, shop_name, phone, slug, is_active, created_at, role')
        .eq('role', 'vendor')
        .order('created_at', { ascending: false })

      // Fetch orders for each vendor
      const { data: orders } = await supabase
        .from('orders')
        .select('vendor_id, total_amount, payment_status')

      const ordersByVendor = new Map<string, { count: number; revenue: number }>()

      if (orders) {
        for (const order of orders as Array<{ vendor_id: string; total_amount: number; payment_status: string }>) {
          const current = ordersByVendor.get(order.vendor_id) || { count: 0, revenue: 0 }
          current.count++
          if (order.payment_status === 'verified') {
            current.revenue += order.total_amount || 0
          }
          ordersByVendor.set(order.vendor_id, current)
        }
      }

      const vendorList = ((profiles as Array<{
        id: string
        shop_name: string
        phone: string | null
        slug: string | null
        is_active: boolean
        created_at: string
        role: string
      }>) || []).map(p => ({
        id: p.id,
        shop_name: p.shop_name,
        phone: p.phone,
        slug: p.slug,
        is_active: p.is_active !== false,
        created_at: p.created_at,
        orders_count: ordersByVendor.get(p.id)?.count || 0,
        total_revenue: ordersByVendor.get(p.id)?.revenue || 0,
      }))

      setVendors(vendorList)
      setFilteredVendors(vendorList)
    } catch (error) {
      console.error('Error fetching vendors:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleVendorStatus = async (vendorId: string, currentStatus: boolean) => {
    setTogglingId(vendorId)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus } as never)
        .eq('id', vendorId)

      if (error) throw error

      setVendors(prev =>
        prev.map(v =>
          v.id === vendorId ? { ...v, is_active: !currentStatus } : v
        )
      )

      toast.success(currentStatus ? 'Vendeur suspendu' : 'Vendeur activé')
    } catch (error) {
      console.error('Error toggling vendor:', error)
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setTogglingId(null)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Vendeurs</h1>
          <p className="text-muted-foreground">
            {vendors.length} vendeur(s) inscrit(s)
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Vendors List */}
      <div className="space-y-4">
        {filteredVendors.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucun vendeur trouvé
            </CardContent>
          </Card>
        ) : (
          filteredVendors.map((vendor) => (
            <Card key={vendor.id} className={vendor.is_active ? '' : 'opacity-60'}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-full shrink-0">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{vendor.shop_name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          vendor.is_active
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-red-500/10 text-red-600'
                        }`}>
                          {vendor.is_active ? 'Actif' : 'Suspendu'}
                        </span>
                      </div>
                      {vendor.phone && (
                        <p className="text-sm text-muted-foreground">{vendor.phone}</p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        <span>
                          <strong>{vendor.orders_count}</strong> commande(s)
                        </span>
                        <span>
                          <strong>{vendor.total_revenue.toLocaleString()}</strong> FCFA
                        </span>
                        <span className="text-muted-foreground">
                          Inscrit le {new Date(vendor.created_at).toLocaleDateString('fr-CI')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/shop/${vendor.slug || vendor.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                    <Button
                      variant={vendor.is_active ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => toggleVendorStatus(vendor.id, vendor.is_active)}
                      disabled={togglingId === vendor.id}
                    >
                      {togglingId === vendor.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : vendor.is_active ? (
                        <>
                          <ToggleRight className="h-4 w-4 mr-1" />
                          Suspendre
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 mr-1" />
                          Activer
                        </>
                      )}
                    </Button>
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
