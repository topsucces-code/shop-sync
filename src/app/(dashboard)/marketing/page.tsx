'use client'

import { useState, useEffect } from 'react'
import { Megaphone, Send, Users, Clock, Image as ImageIcon, Loader2, Zap, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface FlashSale {
  id: string
  title: string
  message: string
  image_url: string | null
  discount_percent: number | null
  valid_until: string | null
  sent_count: number
  created_at: string
}

interface Customer {
  id: string
  phone: string
  name: string | null
  total_orders: number
  total_spent: number
  last_order_at: string | null
}

export default function MarketingPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [flashSales, setFlashSales] = useState<FlashSale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [discountPercent, setDiscountPercent] = useState('')
  const [validUntil, setValidUntil] = useState('')

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('opted_in', true)
        .order('total_spent', { ascending: false })

      setCustomers((customersData as unknown as Customer[]) || [])

      // Fetch flash sale history
      const response = await fetch('/api/flash-sale')
      const data = await response.json()
      setFlashSales(data.flashSales || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendFlashSale = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Titre et message requis')
      return
    }

    if (customers.length === 0) {
      toast.error('Aucun client à notifier')
      return
    }

    setIsSending(true)

    try {
      const response = await fetch('/api/flash-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          discountPercent: discountPercent ? parseInt(discountPercent) : null,
          validUntil: validUntil || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Erreur lors de l\'envoi')
        return
      }

      toast.success(data.message)

      // Reset form
      setTitle('')
      setMessage('')
      setDiscountPercent('')
      setValidUntil('')

      // Refresh history
      fetchData()
    } catch (error) {
      console.error('Error sending flash sale:', error)
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setIsSending(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-CI', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6" />
          Marketing - Ventes Flash
        </h1>
        <p className="text-muted-foreground">
          Envoyez des promotions à vos clients WhatsApp
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customers.length}</p>
                <p className="text-sm text-muted-foreground">Clients inscrits</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-full">
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{flashSales.length}</p>
                <p className="text-sm text-muted-foreground">Campagnes envoyées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Flash Sale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Créer une Vente Flash
          </CardTitle>
          <CardDescription>
            Envoyez un message promotionnel à tous vos clients en un clic
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Titre de la promo *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Soldes de fin d'année!"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="message">Message *</Label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Profitez de réductions exceptionnelles sur toute la boutique..."
              className="w-full h-24 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">{message.length}/500 caractères</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount">Réduction (%)</Label>
              <Input
                id="discount"
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="Ex: 20"
                min="1"
                max="100"
              />
            </div>
            <div>
              <Label htmlFor="validUntil">Valide jusqu'au</Label>
              <Input
                id="validUntil"
                type="datetime-local"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-2">Aperçu du message:</p>
            <div className="bg-background rounded-lg p-3 text-sm">
              <p>🔥 <strong>{title || 'Titre de la promo'}</strong> 🔥</p>
              <p className="mt-2">{message || 'Votre message ici...'}</p>
              {discountPercent && <p className="mt-2">💰 <strong>-{discountPercent}%</strong> sur votre commande!</p>}
              {validUntil && <p className="mt-2">⏰ Offre valable jusqu'au {new Date(validUntil).toLocaleDateString('fr-CI')}</p>}
              <p className="mt-2">👉 Commandez maintenant: [lien boutique]</p>
            </div>
          </div>

          <Button
            onClick={handleSendFlashSale}
            disabled={isSending || !title.trim() || !message.trim() || customers.length === 0}
            className="w-full"
            size="lg"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Envoyer à {customers.length} client{customers.length > 1 ? 's' : ''}
          </Button>

          {customers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Vos clients seront automatiquement ajoutés après leurs commandes
            </p>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowHistory(!showHistory)}
          >
            <span className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des campagnes
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {flashSales.length} campagne{flashSales.length > 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        {showHistory && (
          <CardContent>
            {flashSales.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Aucune campagne envoyée
              </p>
            ) : (
              <div className="space-y-3">
                {flashSales.map((sale) => (
                  <div key={sale.id} className="flex items-center gap-4 p-3 rounded-lg border">
                    <div className="p-2 bg-purple-500/10 rounded-full">
                      <Megaphone className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{sale.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{sale.message}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium text-primary">{sale.sent_count} envois</p>
                      <p className="text-xs text-muted-foreground">{formatDate(sale.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Vos clients ({customers.length})
          </CardTitle>
          <CardDescription>
            Clients ayant passé au moins une commande
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Les clients apparaîtront ici après leur première commande
            </p>
          ) : (
            <div className="space-y-2">
              {customers.slice(0, 10).map((customer) => (
                <div key={customer.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{customer.name || 'Client'}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{customer.total_orders} commande{customer.total_orders > 1 ? 's' : ''}</p>
                    <p className="text-xs text-muted-foreground">
                      {customer.total_spent.toLocaleString()} FCFA
                    </p>
                  </div>
                </div>
              ))}
              {customers.length > 10 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  +{customers.length - 10} autres clients
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
