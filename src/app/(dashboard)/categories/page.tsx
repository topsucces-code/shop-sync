'use client'

import { useState, useEffect } from 'react'
import { Plus, FolderOpen, Pencil, Trash2, Loader2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  slug: string | null
  icon: string | null
  sort_order: number
  products_count?: number
}

const ICONS = ['🛍️', '👕', '👗', '👟', '💄', '📱', '🍔', '🏠', '🎮', '📚', '💍', '🧴']

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', icon: '🛍️' })

  const supabase = createClient()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .eq('vendor_id', user.id)
        .order('sort_order', { ascending: true })

      // Count products per category
      const { data: products } = await supabase
        .from('products')
        .select('category_id')
        .eq('vendor_id', user.id)

      const countMap = new Map<string, number>()
      if (products) {
        for (const p of products as Array<{ category_id: string | null }>) {
          if (p.category_id) {
            countMap.set(p.category_id, (countMap.get(p.category_id) || 0) + 1)
          }
        }
      }

      const categoriesWithCount = ((cats as Category[]) || []).map(c => ({
        ...c,
        products_count: countMap.get(c.id) || 0
      }))

      setCategories(categoriesWithCount)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const slug = formData.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')

    if (editingId) {
      const { error } = await supabase
        .from('categories')
        .update({ name: formData.name, icon: formData.icon, slug } as never)
        .eq('id', editingId)

      if (error) {
        toast.error('Erreur lors de la modification')
        return
      }
      toast.success('Catégorie modifiée')
    } else {
      const { error } = await supabase
        .from('categories')
        .insert({
          vendor_id: user.id,
          name: formData.name,
          icon: formData.icon,
          slug,
          sort_order: categories.length,
        } as never)

      if (error) {
        toast.error('Erreur lors de l\'ajout')
        return
      }
      toast.success('Catégorie ajoutée')
    }

    setFormData({ name: '', icon: '🛍️' })
    setIsAdding(false)
    setEditingId(null)
    fetchCategories()
  }

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id)
    setFormData({ name: cat.name, icon: cat.icon || '🛍️' })
    setIsAdding(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette catégorie ?')) return

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Erreur lors de la suppression')
      return
    }

    toast.success('Catégorie supprimée')
    fetchCategories()
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
          <h1 className="text-2xl font-bold">Catégories</h1>
          <p className="text-muted-foreground">
            Organisez vos produits par catégorie
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Modifier' : 'Nouvelle'} catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Icône</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                        formData.icon === icon
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="name">Nom de la catégorie</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Vêtements"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingId ? 'Modifier' : 'Ajouter'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAdding(false)
                    setEditingId(null)
                    setFormData({ name: '', icon: '🛍️' })
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucune catégorie</p>
            <Button variant="link" onClick={() => setIsAdding(true)} className="mt-2">
              Créer votre première catégorie
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <Card key={cat.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon || '🛍️'}</span>
                  <div>
                    <h3 className="font-medium">{cat.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {cat.products_count} produit{(cat.products_count || 0) > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
