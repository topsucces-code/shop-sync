import { TrendingUp, Package, ShoppingCart, DollarSign, Award, Calendar, Wallet, Truck, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/delivery-fees'

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
}

interface OrderItems {
  products: OrderItem[]
  delivery_fee?: number
  subtotal?: number
}

interface ProductData {
  id: string
  name: string
  price: number
  purchase_price: number | null
  stock: number | null
}

interface OrderData {
  id: string
  total_amount: number
  created_at: string | null
  payment_network: string | null
  items: unknown
}

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all verified orders
  const { data: ordersData } = await supabase
    .from('orders')
    .select('*')
    .eq('vendor_id', user!.id)
    .eq('payment_status', 'verified')

  const orders = ordersData as unknown as OrderData[] | null

  // Fetch all products with purchase prices
  const { data: productsData } = await supabase
    .from('products')
    .select('*')
    .eq('vendor_id', user!.id)

  const products = productsData as unknown as ProductData[] | null

  // Create a map of product IDs to purchase prices
  const productCosts: Record<string, number> = {}
  products?.forEach(p => {
    productCosts[p.id] = p.purchase_price || 0
  })

  // Calculate statistics
  const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0
  const totalOrders = orders?.length || 0
  const totalProducts = products?.length || 0

  // Calculate costs and profit
  let totalProductCost = 0
  let totalDeliveryFees = 0

  orders?.forEach(order => {
    const items = order.items as unknown as OrderItems

    // Sum up product costs
    items?.products?.forEach(item => {
      const purchaseCost = productCosts[item.id] || 0
      totalProductCost += purchaseCost * item.quantity
    })

    // Sum up delivery fees
    if (items?.delivery_fee) {
      totalDeliveryFees += items.delivery_fee
    }
  })

  // Net profit = Revenue - Product Costs - Delivery Fees
  // Note: We keep delivery fees since they're charged to customers
  const netProfit = totalRevenue - totalProductCost
  const profitMarginPercent = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0

  // Calculate this month's revenue and profit
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthlyOrders = orders?.filter(order =>
    order.created_at && new Date(order.created_at) >= startOfMonth
  ) || []
  const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + Number(order.total_amount), 0)

  // Calculate monthly cost and profit
  let monthlyProductCost = 0
  monthlyOrders.forEach(order => {
    const items = order.items as unknown as OrderItems
    items?.products?.forEach(item => {
      const purchaseCost = productCosts[item.id] || 0
      monthlyProductCost += purchaseCost * item.quantity
    })
  })
  const monthlyNetProfit = monthlyRevenue - monthlyProductCost

  // Calculate best-selling products with profit
  const productSales: Record<string, { name: string; quantity: number; revenue: number; cost: number; profit: number }> = {}

  orders?.forEach(order => {
    const items = order.items as unknown as OrderItems
    items?.products?.forEach(item => {
      if (!productSales[item.id]) {
        productSales[item.id] = { name: item.name, quantity: 0, revenue: 0, cost: 0, profit: 0 }
      }
      const itemRevenue = item.price * item.quantity
      const itemCost = (productCosts[item.id] || 0) * item.quantity

      productSales[item.id].quantity += item.quantity
      productSales[item.id].revenue += itemRevenue
      productSales[item.id].cost += itemCost
      productSales[item.id].profit += (itemRevenue - itemCost)
    })
  })

  const topProducts = Object.entries(productSales)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5)

  // Calculate orders by payment network
  const networkStats: Record<string, number> = {}
  orders?.forEach(order => {
    const network = order.payment_network || 'other'
    networkStats[network] = (networkStats[network] || 0) + 1
  })

  const networkLabels: Record<string, string> = {
    wave: 'Wave',
    orange: 'Orange Money',
    mtn: 'MTN MoMo',
    other: 'Autre',
  }

  const networkColors: Record<string, string> = {
    wave: 'bg-blue-500',
    orange: 'bg-orange-500',
    mtn: 'bg-yellow-500',
    other: 'bg-gray-500',
  }

  // Average order value
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const averageProfit = totalOrders > 0 ? netProfit / totalOrders : 0

  // Products without purchase price set (warning)
  const productsWithoutCost = products?.filter(p => !p.purchase_price || p.purchase_price === 0) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Statistiques - Argent Réel</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble de vos bénéfices réels
        </p>
      </div>

      {/* Warning for products without cost */}
      {productsWithoutCost.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {productsWithoutCost.length} produit{productsWithoutCost.length > 1 ? 's' : ''} sans prix d&apos;achat
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Ajoutez les prix d&apos;achat pour calculer vos vrais bénéfices: {productsWithoutCost.map(p => p.name).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Profit Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="col-span-2 bg-linear-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-green-600" />
              Bénéfice Net Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {formatPrice(netProfit)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Marge: {profitMarginPercent}% sur {formatPrice(totalRevenue)} de CA
            </p>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-primary/10 to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Chiffre d&apos;affaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatPrice(totalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground">
              {totalOrders} commande{totalOrders > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Coût Produits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">
              -{formatPrice(totalProductCost)}
            </p>
            <p className="text-xs text-muted-foreground">
              Prix d&apos;achat total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Bénéfice ce mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatPrice(monthlyNetProfit)}
            </p>
            <p className="text-xs text-muted-foreground">
              sur {formatPrice(monthlyRevenue)} de CA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Bénéfice moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatPrice(averageProfit)}
            </p>
            <p className="text-xs text-muted-foreground">
              par commande
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Panier moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(averageOrderValue)}</p>
            <p className="text-xs text-muted-foreground">par commande</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalProducts}</p>
            <p className="text-xs text-muted-foreground">en catalogue</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Products by Profit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            Produits les plus rentables
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucune vente pour le moment
            </p>
          ) : (
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-amber-600' : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.quantity} vendu{product.quantity > 1 ? 's' : ''} • CA: {formatPrice(product.revenue)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      +{formatPrice(product.profit)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      bénéfice
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Networks */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition par mode de paiement</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(networkStats).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucune donnée disponible
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(networkStats)
                .sort((a, b) => b[1] - a[1])
                .map(([network, count]) => {
                  const percentage = totalOrders > 0 ? (count / totalOrders) * 100 : 0
                  return (
                    <div key={network}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{networkLabels[network] || network}</span>
                        <span className="text-muted-foreground">
                          {count} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${networkColors[network] || 'bg-primary'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
