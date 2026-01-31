'use client'

import { useState, useEffect } from 'react'
import { Plus, Ticket, Pencil, Trash2, Loader2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface PromoCode {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  min_order_amount: number
  max_uses: number | null
  uses_count: number
  valid_until: string | null
  is_active: boolean
  created_at: string
}

export default function PromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '',
    min_order_amount: '',
    max_uses: '',
    valid_until: '',
  })

  const supabase = createClient()

  useEffect(() => {
    fetchPromos()
  }, [])

  const fetchPromos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('vendor_id', user.id)
        .order('created_at', { ascending: false })

      setPromos((data as PromoCode[]) || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, code })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code.trim() || !formData.discount_value) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const promoData = {
      vendor_id: user.id,
      code: formData.code.toUpperCase().trim(),
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : 0,
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      valid_until: formData.valid_until || null,
      is_active: true,
    }

    if (editingId) {
      const { error } = await supabase
        .from('promo_codes')
        .update(promoData as never)
        .eq('id', editingId)

      if (error) {
        if (error.code === '23505') {
          toast.error('Ce code existe déjà')
        } else {
          toast.error('Erreur lors de la modification')
        }
        return
      }
      toast.success('Code promo modifié')
    } else {
      const { error } = await supabase
        .from('promo_codes')
        .insert(promoData as never)

      if (error) {
        if (error.code === '23505') {
          toast.error('Ce code existe déjà')
        } else {
          toast.error('Erreur lors de l\'ajout')
        }
        return
      }
      toast.success('Code promo créé')
    }

    resetForm()
    fetchPromos()
  }

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percent',
      discount_value: '',
      min_order_amount: '',
      max_uses: '',
      valid_until: '',
    })
    setIsAdding(false)
    setEditingId(null)
  }

  const handleEdit = (promo: PromoCode) => {
    setEditingId(promo.id)
    setFormData({
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: promo.discount_value.toString(),
      min_order_amount: promo.min_order_amount?.toString() || '',
      max_uses: promo.max_uses?.toString() || '',
      valid_until: promo.valid_until?.split('T')[0] || '',
    })
    setIsAdding(true)
  }

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('promo_codes')
      .update({ is_active: !currentStatus } as never)
      .eq('id', id)

    if (error) {
      toast.error('Erreur')
      return
    }

    setPromos(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentStatus } : p))
    toast.success(currentStatus ? 'Code désactivé' : 'Code activé')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce code promo ?')) return

    const { error } = await supabase
      .from('promo_codes')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Erreur')
      return
    }

    toast.success('Code supprimé')
    fetchPromos()
  }

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast.success('Code copié!')
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Codes Promo</h1>
          <p className="text-muted-foreground">
            Créez des réductions pour vos clients
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau code
        </Button>
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Modifier' : 'Nouveau'} code promo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code">Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="PROMO2024"
                    className="font-mono"
                    required
                  />
                  <Button type="button" variant="outline" onClick={generateCode}>
                    Générer
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type de réduction</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant={formData.discount_type === 'percent' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setFormData({ ...formData, discount_type: 'percent' })}
                    >
                      Pourcentage %
                    </Button>
                    <Button
                      type="button"
                      variant={formData.discount_type === 'fixed' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setFormData({ ...formData, discount_type: 'fixed' })}
                    >
                      Fixe FCFA
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="discount_value">
                    Valeur ({formData.discount_type === 'percent' ? '%' : 'FCFA'})
                  </Label>
                  <Input
                    id="discount_value"
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    placeholder={formData.discount_type === 'percent' ? '10' : '1000'}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_order">Commande minimum (FCFA)</Label>
                  <Input
                    id="min_order"
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                    placeholder="5000"
                  />
                </div>
                <div>
                  <Label htmlFor="max_uses">Utilisations max</Label>
                  <Input
                    id="max_uses"
                    type="number"
                    value={formData.max_uses}
                    onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    placeholder="Illimité"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="valid_until">Valide jusqu'au</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingId ? 'Modifier' : 'Créer'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Promos List */}
      {promos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun code promo</p>
            <Button variant="link" onClick={() => setIsAdding(true)} className="mt-2">
              Créer votre premier code
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {promos.map((promo) => {
            const isExpired = promo.valid_until && new Date(promo.valid_until) < new Date()
            const isMaxed = promo.max_uses && promo.uses_count >= promo.max_uses

            return (
              <Card key={promo.id} className={!promo.is_active || isExpired || isMaxed ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-accent/20 rounded-full">
                        <Ticket className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg">{promo.code}</span>
                          <button onClick={() => copyCode(promo.code, promo.id)}>
                            {copiedId === promo.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-primary font-medium">
                          -{promo.discount_value}{promo.discount_type === 'percent' ? '%' : ' FCFA'}
                          {promo.min_order_amount > 0 && ` (min. ${promo.min_order_amount.toLocaleString()} FCFA)`}
                        </p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {promo.uses_count} utilisation{promo.uses_count > 1 ? 's' : ''}
                            {promo.max_uses && ` / ${promo.max_uses}`}
                          </span>
                          {promo.valid_until && (
                            <span className={`text-xs ${isExpired ? 'text-red-500' : 'text-muted-foreground'}`}>
                              • {isExpired ? 'Expiré' : `Expire le ${new Date(promo.valid_until).toLocaleDateString('fr-CI')}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={promo.is_active ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => handleToggle(promo.id, promo.is_active)}
                      >
                        {promo.is_active ? 'Désactiver' : 'Activer'}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(promo)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(promo.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
