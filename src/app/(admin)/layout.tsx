import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/sonner'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, shop_name')
    .eq('id', user.id)
    .single()

  if (!profile || (profile as { role: string }).role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground border-b">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <span className="font-bold">Shop-Sync Admin</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <a href="/admin" className="hover:underline">Dashboard</a>
            <a href="/admin/vendors" className="hover:underline">Vendeurs</a>
            <a href="/admin/orders" className="hover:underline">Commandes</a>
            <a href="/admin/commissions" className="hover:underline">Commissions</a>
            <a href="/" className="hover:underline opacity-70">← Retour</a>
          </nav>
        </div>
      </header>
      <main className="container px-4 py-6">
        {children}
      </main>
      <Toaster position="top-center" />
    </div>
  )
}
