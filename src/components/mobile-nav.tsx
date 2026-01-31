'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Package, ShoppingCart, ScanLine, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: Home, label: 'Accueil' },
  { href: '/orders', icon: ShoppingCart, label: 'Commandes' },
  { href: '/analyze', icon: ScanLine, label: 'Scanner' },
  { href: '/products', icon: Package, label: 'Produits' },
  { href: '/marketing', icon: Megaphone, label: 'Marketing' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full px-2 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
