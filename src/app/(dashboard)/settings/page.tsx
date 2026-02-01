'use client'

import { useState, useEffect } from 'react'
import { Store, Camera, Loader2, Check, Link as LinkIcon, Crown, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Profile {
  id: string
  shop_name: string
  phone: string | null
  address: string | null
  slug: string | null
  logo_url: string | null
  description: string | null
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  // Form state
  const [shopName, setShopName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      toast.error('Erreur lors du chargement du profil')
      return
    }

    const profileData = data as unknown as Profile
    setProfile(profileData)
    setShopName(profileData.shop_name || '')
    setPhone(profileData.phone || '')
    setAddress(profileData.address || '')
    setSlug(profileData.slug || '')
    setDescription(profileData.description || '')
    setLogoPreview(profileData.logo_url)
    setIsLoading(false)
  }

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setIsUploadingLogo(true)

    try {
      // Resize image
      const reader = new FileReader()
      reader.onload = async (event) => {
        const img = new Image()
        img.onload = async () => {
          const canvas = document.createElement('canvas')
          const MAX_SIZE = 256
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width
              width = MAX_SIZE
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height
              height = MAX_SIZE
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          const base64 = canvas.toDataURL('image/jpeg', 0.8)
          setLogoPreview(base64)

          // Upload to Supabase Storage
          const fileName = `${profile.id}/logo-${Date.now()}.jpg`
          const buffer = Uint8Array.from(atob(base64.split(',')[1]), c => c.charCodeAt(0))

          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(fileName, buffer, {
              contentType: 'image/jpeg',
              upsert: true,
            })

          if (uploadError) {
            toast.error('Erreur lors de l\'upload du logo')
            setIsUploadingLogo(false)
            return
          }

          const { data: urlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(fileName)

          // Update profile with new logo URL
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ logo_url: urlData.publicUrl } as never)
            .eq('id', profile.id)

          if (updateError) {
            toast.error('Erreur lors de la mise à jour')
          } else {
            setLogoPreview(urlData.publicUrl)
            toast.success('Logo mis à jour!')
          }

          setIsUploadingLogo(false)
        }
        img.src = event.target?.result as string
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de l\'upload')
      setIsUploadingLogo(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    if (!shopName.trim()) {
      toast.error('Le nom de la boutique est requis')
      return
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (slug && !slugRegex.test(slug)) {
      toast.error('Le lien personnalisé ne peut contenir que des lettres minuscules, chiffres et tirets')
      return
    }

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          shop_name: shopName.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          slug: slug.trim() || null,
          description: description.trim() || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', profile.id)

      if (error) {
        if (error.code === '23505') {
          toast.error('Ce lien personnalisé est déjà utilisé')
        } else {
          toast.error('Erreur lors de la sauvegarde')
        }
        return
      }

      toast.success('Profil mis à jour!')
      fetchProfile()
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  const generateSlugFromName = () => {
    const newSlug = shopName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    setSlug(newSlug)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const shopUrl = slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/shop/${slug}`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/shop/${profile?.id}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">
          Personnalisez votre boutique
        </p>
      </div>

      {/* Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Logo de la boutique
          </CardTitle>
          <CardDescription>
            Cette image sera affichée sur votre page de boutique publique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="w-24 h-24 rounded-full object-cover border-2 border-muted"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                  <Store className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              {isUploadingLogo && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <label className="cursor-pointer">
              <Button variant="outline" asChild>
                <span>
                  <Camera className="h-4 w-4 mr-2" />
                  Changer le logo
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
                disabled={isUploadingLogo}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Profile Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Informations de la boutique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="shopName">Nom de la boutique *</Label>
            <Input
              id="shopName"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="Ma Super Boutique"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Vêtements et accessoires de mode"
            />
          </div>

          <div>
            <Label htmlFor="phone">Téléphone / WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07 00 00 00 00"
            />
            {phone && (
              <div className="mt-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-xs text-green-700 dark:text-green-300 mb-1">
                  Lien WhatsApp généré :
                </p>
                <code className="text-xs break-all text-green-800 dark:text-green-200">
                  https://wa.me/225{phone.replace(/\D/g, '')}
                </code>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Cocody, Abidjan"
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Lien personnalisé
          </CardTitle>
          <CardDescription>
            Un lien court et mémorable pour partager votre boutique
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="slug">Identifiant unique</Label>
            <div className="flex gap-2">
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="ma-boutique"
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateSlugFromName}
              >
                Générer
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lettres minuscules, chiffres et tirets uniquement
            </p>
          </div>

          <div className="bg-muted rounded-lg p-3">
            <p className="text-sm text-muted-foreground mb-1">Votre lien de boutique :</p>
            <p className="font-mono text-sm break-all">{shopUrl}</p>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Link */}
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Gérer mon abonnement</p>
                <p className="text-sm text-muted-foreground">Débloquez plus de fonctionnalités</p>
              </div>
            </div>
            <Link href="/subscription">
              <Button variant="outline">
                Voir les plans
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        size="lg"
        className="w-full"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Check className="h-4 w-4 mr-2" />
        )}
        Enregistrer les modifications
      </Button>
    </div>
  )
}
