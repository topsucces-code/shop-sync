'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Store, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { NotificationsButton } from '@/components/notifications'

interface DashboardHeaderProps {
  shopName?: string
}

export function DashboardHeader({ shopName }: DashboardHeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 bg-background border-b">
      <div className="container flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <span className="font-semibold truncate max-w-[200px]">
            {shopName || 'Shop-Sync'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationsButton />
          <Link href="/settings">
            <Button
              variant="ghost"
              size="icon"
              title="Réglages"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            title="Déconnexion"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
