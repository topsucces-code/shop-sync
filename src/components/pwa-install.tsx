'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope)
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)

      // Show banner after a delay (don't show immediately on first visit)
      const hasSeenPrompt = localStorage.getItem('pwa-prompt-seen')
      if (!hasSeenPrompt) {
        setTimeout(() => setShowBanner(true), 3000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowBanner(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('PWA installed')
    }

    setInstallPrompt(null)
    setShowBanner(false)
    localStorage.setItem('pwa-prompt-seen', 'true')
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-prompt-seen', 'true')
  }

  if (!showBanner || !installPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary-foreground/20 rounded-lg">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Installer Shop-Sync</h3>
            <p className="text-sm opacity-90 mt-1">
              Accédez rapidement à votre boutique depuis l&apos;écran d&apos;accueil
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleInstall}
                className="flex-1"
              >
                Installer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-primary-foreground hover:text-primary-foreground/80"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
