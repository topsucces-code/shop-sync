'use client'

import { useState, useEffect } from 'react'
import { Plus, Package, Pencil, Trash2, Loader2, TrendingUp, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatPrice } from '@/lib/delivery-fees'

interface Product {
  id: string
  name: string
  price: number
  purchase_price: number | null
  stock: number | null
  image_url: string | null
  created_at: string | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    purchase_price: '',
    stock: '',
    image_url: '',
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const supabase = createClient()

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Erreur lors du chargement des produits')
      return
    }

    setProducts((data as unknown as Product[]) || [])
    setIsLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingImage(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Resize image
      const reader = new FileReader()
      reader.onload = async (event) => {
        const img = new Image()
        img.onload = async () => {
          const canvas = document.createElement('canvas')
          const MAX_SIZE = 400
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height
              height = MAX_SIZE
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          const base64 = canvas.toDataURL('image/jpeg', 0.8)
          setImagePreview(base64)

          // Upload to Supabase Storage
          const fileName = `${user.id}/product-${Date.now()}.jpg`
          const buffer = Uint8Array.from(atob(base64.split(',')[1]), c => c.charCodeAt(0))

          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(fileName, buffer, {
              contentType: 'image/jpeg',
              upsert: true,
            })

          if (uploadError) {
            toast.error('Erreur lors de l\'upload de l\'image')
            setIsUploadingImage(false)
            return
          }

          const { data: urlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(fileName)

          setFormData(prev => ({ ...prev, image_url: urlData.publicUrl }))
          setImagePreview(urlData.publicUrl)
          setIsUploadingImage(false)
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de l\'upload')
      setIsUploadingImage(false)
    }
  }

  const removeImage = () => {
    setImagePreview(null)
    setFormData(prev => ({ ...prev, image_url: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const productData = {
      name: formData.name,
      price: parseFloat(formData.price),
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : 0,
      stock: parseInt(formData.stock) || 0,
      image_url: formData.image_url || null,
      vendor_id: user.id,
    }

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData as never)
        .eq('id', editingProduct.id)

      if (error) {
        toast.error('Erreur lors de la modification')
        return
      }

      toast.success('Produit modifié!')
    } else {
      const { error } = await supabase
        .from('products')
        .insert(productData as never)

      if (error) {
        toast.error('Erreur lors de l\'ajout')
        return
      }

      toast.success('Produit ajouté!')
    }

    setFormData({ name: '', price: '', purchase_price: '', stock: '', image_url: '' })
    setImagePreview(null)
    setIsAddingProduct(false)
    setEditingProduct(null)
    fetchProducts()
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      purchase_price: (product.purchase_price ?? 0).toString(),
      stock: (product.stock ?? 0).toString(),
      image_url: product.image_url || '',
    })
    setImagePreview(product.image_url)
    setIsAddingProduct(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit?')) return

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Erreur lors de la suppression')
      return
    }

    toast.success('Produit supprimé!')
    fetchProducts()
  }

  // Calculate margin
  const getMargin = (price: number, purchasePrice: number | null) => {
    const cost = purchasePrice || 0
    return price - cost
  }

  const getMarginPercent = (price: number, purchasePrice: number | null) => {
    const cost = purchasePrice || 0
    if (cost === 0) return 100
    return Math.round(((price - cost) / cost) * 100)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Calculate total potential profit
  const totalPotentialProfit = products.reduce((sum, p) => {
    const margin = getMargin(p.price, p.purchase_price)
    return sum + (margin * (p.stock || 0))
  }, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produits</h1>
          <p className="text-muted-foreground">
            {products.length} produit{products.length > 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setIsAddingProduct(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {/* Profit Summary Card */}
      {products.length > 0 && (
        <Card className="bg-linear-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bénéfice potentiel sur stock</p>
                <p className="text-xl font-bold text-green-600">{formatPrice(totalPotentialProfit)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Form */}
      {isAddingProduct && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Nom du produit</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: T-shirt blanc"
                  required
                />
              </div>

              {/* Image Upload */}
              <div>
                <Label>Photo du produit</Label>
                <div className="mt-2">
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Aperçu"
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-white rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      {isUploadingImage ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <ImagePlus className="h-8 w-8 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground mt-1">Ajouter</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        disabled={isUploadingImage}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchase_price">Prix d'achat (FCFA)</Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    placeholder="3000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Ce que vous payez au fournisseur</p>
                </div>
                <div>
                  <Label htmlFor="price">Prix de vente (FCFA)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="5000"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Ce que le client paie</p>
                </div>
              </div>

              {/* Margin Preview */}
              {formData.price && (
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>Marge par vente:</strong> {formatPrice(getMargin(parseFloat(formData.price) || 0, parseFloat(formData.purchase_price) || 0))}
                    ({getMarginPercent(parseFloat(formData.price) || 0, parseFloat(formData.purchase_price) || 0)}%)
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="stock">Stock disponible</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="10"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingProduct ? 'Modifier' : 'Ajouter'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddingProduct(false)
                    setEditingProduct(null)
                    setFormData({ name: '', price: '', purchase_price: '', stock: '', image_url: '' })
                    setImagePreview(null)
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Products List */}
      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun produit</p>
            <Button
              variant="link"
              onClick={() => setIsAddingProduct(true)}
              className="mt-2"
            >
              Ajouter votre premier produit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((product) => {
            const margin = getMargin(product.price, product.purchase_price)
            const marginPercent = getMarginPercent(product.price, product.purchase_price)

            return (
              <Card key={product.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  {/* Product Image */}
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{product.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-primary font-medium">
                        {formatPrice(product.price)}
                      </p>
                      {product.purchase_price ? (
                        <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                          +{formatPrice(margin)} ({marginPercent}%)
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span>Stock: {product.stock}</span>
                      {product.purchase_price ? (
                        <span>Coût: {formatPrice(product.purchase_price)}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
