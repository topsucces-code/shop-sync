'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Store, ShoppingCart, Plus, Minus, Trash2, Loader2, MapPin, Phone, User, Package, Search, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { COMMUNES, getDeliveryFee, formatPrice } from '@/lib/delivery-fees'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  icon: string | null
}

interface Product {
  id: string
  name: string
  price: number
  stock: number
  image_url: string | null
  category_id: string | null
}

interface CartItem extends Product {
  quantity: number
}

interface Vendor {
  id: string
  shop_name: string
  phone: string | null
  address: string | null
  logo_url: string | null
  description: string | null
}

interface PromoCode {
  id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  min_order_amount: number
}

export default function PublicShopPage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = use(params)
  const router = useRouter()

  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Promo code
  const [promoCode, setPromoCode] = useState('')
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null)
  const [promoError, setPromoError] = useState('')
  const [isCheckingPromo, setIsCheckingPromo] = useState(false)

  // Form data
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [commune, setCommune] = useState('')

  useEffect(() => {
    fetchShopData()
  }, [vendorId])

  const fetchShopData = async () => {
    try {
      const response = await fetch(`/api/shop/${vendorId}`)
      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Boutique non trouvée')
        return
      }

      setVendor(data.vendor)
      setProducts(data.products)
      setCategories(data.categories || [])
    } catch (error) {
      console.error(error)
      toast.error('Erreur de chargement')
    } finally {
      setIsLoading(false)
    }
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error('Stock insuffisant')
          return prev
        }
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id !== productId) return item
        const newQty = item.quantity + delta
        if (newQty <= 0) return item
        if (newQty > item.stock) {
          toast.error('Stock insuffisant')
          return item
        }
        return { ...item, quantity: newQty }
      })
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId))
  }

  // Filtered products
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory ||
      product.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFee = commune ? getDeliveryFee(commune) : 0

  // Calculate discount
  let discount = 0
  if (appliedPromo) {
    if (appliedPromo.discount_type === 'percent') {
      discount = Math.round(subtotal * (appliedPromo.discount_value / 100))
    } else {
      discount = appliedPromo.discount_value
    }
  }

  const total = subtotal + deliveryFee - discount

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return

    setIsCheckingPromo(true)
    setPromoError('')

    try {
      const response = await fetch(`/api/shop/${vendorId}/promo?code=${promoCode.toUpperCase()}`)
      const data = await response.json()

      if (!response.ok) {
        setPromoError(data.error || 'Code invalide')
        setAppliedPromo(null)
        return
      }

      if (data.promo.min_order_amount > subtotal) {
        setPromoError(`Commande minimum: ${data.promo.min_order_amount.toLocaleString()} FCFA`)
        setAppliedPromo(null)
        return
      }

      setAppliedPromo(data.promo)
      setPromoCode('')
      toast.success('Code promo appliqué!')
    } catch (error) {
      setPromoError('Erreur de vérification')
    } finally {
      setIsCheckingPromo(false)
    }
  }

  const removePromo = () => {
    setAppliedPromo(null)
    setPromoError('')
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerName || !customerPhone || !commune) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    if (cart.length === 0) {
      toast.error('Votre panier est vide')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId,
          customerName,
          customerPhone,
          commune,
          promoCodeId: appliedPromo?.id || null,
          discountAmount: discount,
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      toast.success('Commande créée!')
      router.push(`/order-success/${data.orderId}`)
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de la commande')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-xl font-semibold">Boutique non trouvée</h1>
            <p className="text-muted-foreground mt-2">
              Cette boutique n&apos;existe pas ou n&apos;est plus disponible.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
          <div className="container px-4 py-4">
            <div className="flex items-center gap-3">
              {vendor.logo_url ? (
                <img src={vendor.logo_url} alt={vendor.shop_name} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <Store className="h-6 w-6" />
              )}
              <div>
                <h1 className="font-bold text-lg">{vendor.shop_name}</h1>
                {vendor.address && (
                  <p className="text-sm opacity-80">{vendor.address}</p>
                )}
              </div>
            </div>
          </div>
        </header>
        <div className="container px-4 py-12">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-6">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold">Boutique en préparation</h2>
              <p className="text-muted-foreground mt-2">
                Cette boutique n&apos;a pas encore de produits disponibles.
                <br />
                Revenez bientôt !
              </p>
              {vendor.phone && (
                <a
                  href={`tel:${vendor.phone}`}
                  className="inline-flex items-center gap-2 mt-4 text-primary hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  Contacter le vendeur
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-3">
            {vendor.logo_url ? (
              <img src={vendor.logo_url} alt={vendor.shop_name} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <Store className="h-6 w-6" />
            )}
            <div>
              <h1 className="font-bold text-lg">{vendor.shop_name}</h1>
              {vendor.address && (
                <p className="text-sm opacity-80">{vendor.address}</p>
              )}
            </div>
          </div>
          {vendor.description && (
            <p className="text-sm opacity-80 mt-2">{vendor.description}</p>
          )}
        </div>
      </header>

      <main className="container px-4 py-6">
        {/* Products */}
        {!showCheckout ? (
          <>
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm transition-colors ${
                    !selectedCategory
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  Tout
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm transition-colors flex items-center gap-1 ${
                      selectedCategory === cat.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {cat.icon && <span>{cat.icon}</span>}
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            <h2 className="text-lg font-semibold mb-4">
              {selectedCategory
                ? categories.find(c => c.id === selectedCategory)?.name
                : 'Nos produits'}
              <span className="text-muted-foreground font-normal text-sm ml-2">
                ({filteredProducts.length})
              </span>
            </h2>

            {filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery || selectedCategory ? 'Aucun produit trouvé' : 'Aucun produit disponible'}
                  </p>
                  {(searchQuery || selectedCategory) && (
                    <Button variant="link" onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}>
                      Voir tous les produits
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map(product => {
                  const inCart = cart.find(item => item.id === product.id)
                  return (
                    <Card key={product.id} className="overflow-hidden">
                      {product.image_url && (
                        <div className="aspect-square bg-muted">
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="p-3">
                        <h3 className="font-medium text-sm truncate">{product.name}</h3>
                        <p className="text-primary font-bold">{formatPrice(product.price)}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Stock: {product.stock}
                        </p>

                        {inCart ? (
                          <div className="flex items-center justify-between">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(product.id, -1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-medium">{inCart.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(product.id, 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => addToCart(product)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Ajouter
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          /* Checkout Form */
          <div className="max-w-md mx-auto">
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => setShowCheckout(false)}
            >
              ← Retour aux produits
            </Button>

            <Card>
              <CardHeader>
                <CardTitle>Finaliser la commande</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitOrder} className="space-y-4">
                  {/* Cart Summary */}
                  <div className="space-y-2 pb-4 border-b">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span>
                          {item.name} x{item.quantity}
                        </span>
                        <div className="flex items-center gap-2">
                          <span>{formatPrice(item.price * item.quantity)}</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="name">
                        <User className="h-4 w-4 inline mr-1" />
                        Votre nom
                      </Label>
                      <Input
                        id="name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ex: Kouassi Jean"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">
                        <Phone className="h-4 w-4 inline mr-1" />
                        Téléphone
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Ex: 07 00 00 00 00"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="commune">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Commune de livraison
                      </Label>
                      <select
                        id="commune"
                        value={commune}
                        onChange={(e) => setCommune(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        required
                      >
                        <option value="">Sélectionnez votre commune</option>
                        {COMMUNES.map(c => (
                          <option key={c} value={c}>
                            {c} - {formatPrice(getDeliveryFee(c))}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Sous-total</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Livraison ({commune || '...'})</span>
                      <span>{commune ? formatPrice(deliveryFee) : '-'}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t">
                      <span>Total</span>
                      <span className="text-primary">{formatPrice(total)}</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={isSubmitting || !commune}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Passer la commande
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Fixed Cart Bar */}
      {cart.length > 0 && !showCheckout && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg">
          <div className="container">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span className="font-medium">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} article(s)
                </span>
              </div>
              <span className="font-bold text-primary">{formatPrice(subtotal)}</span>
            </div>
            <Button className="w-full" size="lg" onClick={() => setShowCheckout(true)}>
              Commander
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
