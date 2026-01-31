'use client'

import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, Clock, CheckCircle, Loader2, Filter } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Commission {
  id: string
  vendor_id: string
  vendor_name: string
  order_id: string
  order_amount: number
  commission_rate: number
  commission_amount: number
  status: string
  created_at: string
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'collected'>('all')

  const supabase = createClient()

  useEffect(() => {
    fetchCommissions()
  }, [])

  const fetchCommissions = async () => {
    try {
      // Fetch commissions
      const { data: commissionsData } = await supabase
        .from('commissions')
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

      const commissionList = ((commissionsData as Array<{
        id: string
        vendor_id: string
        order_id: string
        order_amount: number
        commission_rate: number
        commission_amount: number
        status: string
        created_at: string
      }>) || []).map(c => ({
        ...c,
        vendor_name: vendorMap.get(c.vendor_id) || 'Inconnu',
      }))

      setCommissions(commissionList)
    } catch (error) {
      console.error('Error fetching commissions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsCollected = async (id: string) => {
    try {
      const { error } = await supabase
        .from('commissions')
        .update({ status: 'collected' } as never)
        .eq('id', id)

      if (error) throw error

      setCommissions(prev =>
        prev.map(c => c.id === id ? { ...c, status: 'collected' } : c)
      )
      toast.success('Commission marquée comme collectée')
    } catch (error) {
      console.error('Error updating commission:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const filteredCommissions = filter === 'all'
    ? commissions
    : commissions.filter(c => c.status === filter)

  const stats = {
    total: commissions.reduce((sum, c) => sum + c.commission_amount, 0),
    pending: commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0),
    collected: commissions.filter(c => c.status === 'collected').reduce((sum, c) => sum + c.commission_amount, 0),
    count: commissions.length,
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
        <h1 className="text-2xl font-bold">Commissions</h1>
        <p className="text-muted-foreground">
          Suivi des commissions sur les ventes
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">FCFA Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-full">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.pending.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">FCFA En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-full">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.collected.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">FCFA Collecté</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold">{stats.count}</p>
                <p className="text-xs text-muted-foreground">Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Tout ({commissions.length})
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
        >
          En attente ({commissions.filter(c => c.status === 'pending').length})
        </Button>
        <Button
          variant={filter === 'collected' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('collected')}
        >
          Collecté ({commissions.filter(c => c.status === 'collected').length})
        </Button>
      </div>

      {/* Commissions List */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des commissions</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCommissions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Aucune commission enregistrée
            </p>
          ) : (
            <div className="space-y-3">
              {filteredCommissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{commission.vendor_name}</p>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span>Vente: {commission.order_amount.toLocaleString()} FCFA</span>
                      <span>•</span>
                      <span>Taux: {(commission.commission_rate * 100).toFixed(1)}%</span>
                      <span>•</span>
                      <span>{new Date(commission.created_at).toLocaleDateString('fr-CI')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {commission.commission_amount.toLocaleString()} FCFA
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        commission.status === 'collected'
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-orange-500/10 text-orange-600'
                      }`}>
                        {commission.status === 'collected' ? 'Collecté' : 'En attente'}
                      </span>
                    </div>
                    {commission.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsCollected(commission.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
