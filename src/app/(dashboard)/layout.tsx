import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MobileNav } from '@/components/mobile-nav'
import { DashboardHeader } from '@/components/dashboard-header'
import { Toaster } from '@/components/ui/sonner'
import { PWAInstall } from '@/components/pwa-install'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_name')
    .eq('id', user.id)
    .single()

  const shopName = (profile as { shop_name: string } | null)?.shop_name

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <DashboardHeader shopName={shopName} />
      <main className="container px-4 py-4 md:py-6">
        {children}
      </main>
      <MobileNav />
      <PWAInstall />
      <Toaster position="top-center" />
    </div>
  )
}
