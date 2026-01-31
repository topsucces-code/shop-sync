'use client'

import { useState, useEffect } from 'react'
import { Bell, ShoppingCart, CreditCard, Package, AlertTriangle, Megaphone, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: 'order' | 'payment' | 'stock' | 'fraud' | 'flash_sale'
  title: string
  message: string
  data: Record<string, unknown> | null
  read: boolean
  created_at: string
}

const typeConfig = {
  order: { icon: ShoppingCart, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  payment: { icon: CreditCard, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  stock: { icon: Package, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  fraud: { icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  flash_sale: { icon: Megaphone, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
}

export function NotificationsButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchNotifications()
    setupRealtimeSubscription()

    return () => {
      supabase.removeAllChannels()
    }
  }, [])

  const setupRealtimeSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `vendor_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
          setUnreadCount(prev => prev + 1)

          // Show toast for new notification
          toast(newNotification.title, {
            description: newNotification.message,
            action: {
              label: 'Voir',
              onClick: () => setIsOpen(true),
            },
          })
        }
      )
      .subscribe()

    // Also subscribe to orders for instant updates
    supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `vendor_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            toast.success('Nouvelle commande!', {
              description: 'Un client vient de passer commande',
            })
          } else if (payload.eventType === 'UPDATE') {
            const order = payload.new as { payment_status: string }
            if (order.payment_status === 'verified') {
              toast.success('Paiement vérifié!', {
                description: 'Un paiement vient d\'être confirmé',
              })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      const data = await response.json()

      if (response.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (ids?: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids ? { notificationIds: ids } : { markAllRead: true }),
      })

      if (ids) {
        setNotifications(prev =>
          prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - ids.length))
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-CI')
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-12 z-50 w-80 max-h-96 overflow-hidden rounded-lg border bg-background shadow-lg">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAsRead()}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Tout lire
                </Button>
              )}
            </div>

            <div className="overflow-y-auto max-h-72">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Chargement...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  Aucune notification
                </div>
              ) : (
                notifications.map((notification) => {
                  const config = typeConfig[notification.type]
                  const Icon = config.icon

                  return (
                    <div
                      key={notification.id}
                      className={`p-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 ${
                        !notification.read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => !notification.read && markAsRead([notification.id])}
                    >
                      <div className="flex gap-3">
                        <div className={`p-2 rounded-full ${config.bgColor} shrink-0`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
