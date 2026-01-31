'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, ExternalLink, Share2, Settings } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ShopLinkProps {
  vendorId: string
}

export function ShopLink({ vendorId }: ShopLinkProps) {
  const [copied, setCopied] = useState(false)
  const [shopUrl, setShopUrl] = useState(`/shop/${vendorId}`)
  const [slug, setSlug] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    // Fetch slug from profile
    const fetchSlug = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('slug')
        .eq('id', vendorId)
        .single()

      const profileData = data as { slug: string | null } | null
      if (profileData?.slug) {
        setSlug(profileData.slug)
        setShopUrl(`${window.location.origin}/shop/${profileData.slug}`)
      } else {
        setShopUrl(`${window.location.origin}/shop/${vendorId}`)
      }
    }

    fetchSlug()
  }, [vendorId, supabase])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shopUrl)
      setCopied(true)
      toast.success('Lien copié!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Erreur lors de la copie')
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ma boutique Shop-Sync',
          text: 'Découvrez ma boutique en ligne!',
          url: shopUrl,
        })
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy()
    }
  }

  return (
    <Card className="bg-linear-to-r from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            Lien de votre boutique
          </h3>
          <div className="flex items-center gap-2">
            <a
              href={shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm flex items-center gap-1"
            >
              Voir
              <ExternalLink className="h-3 w-3" />
            </a>
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground"
              title="Personnaliser le lien"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Partagez ce lien avec vos clients pour qu&apos;ils puissent commander
          {!slug && (
            <Link href="/settings" className="text-primary hover:underline ml-1">
              (personnaliser)
            </Link>
          )}
        </p>
        <div className="flex gap-2">
          <div className="flex-1 bg-background rounded-md px-3 py-2 text-sm font-mono truncate border">
            {shopUrl}
          </div>
          <Button
            size="icon"
            variant={copied ? 'default' : 'outline'}
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleShare}
            className="shrink-0 md:hidden"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
