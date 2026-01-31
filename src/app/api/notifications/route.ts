import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Get notifications
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('vendor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors du chargement' },
        { status: 500 }
      )
    }

    // Count unread
    const unreadCount = notifications?.filter(n => !(n as { read: boolean }).read).length || 0

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, markAllRead } = body

    if (markAllRead) {
      await supabase
        .from('notifications')
        .update({ read: true } as never)
        .eq('vendor_id', user.id)
        .eq('read', false)
    } else if (notificationIds && Array.isArray(notificationIds)) {
      await supabase
        .from('notifications')
        .update({ read: true } as never)
        .eq('vendor_id', user.id)
        .in('id', notificationIds)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Create notification (internal use)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { vendorId, type, title, message, data } = body

    if (!vendorId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('notifications')
      .insert({
        vendor_id: vendorId,
        type,
        title,
        message,
        data,
      } as never)

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la création' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
