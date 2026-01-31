'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, Camera, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ReceiptUploaderProps {
  onImageSelected: (base64: string) => void
  isLoading?: boolean
}

export function ReceiptUploader({ onImageSelected, isLoading }: ReceiptUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const compressImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_SIZE = 800
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

          // Get base64 with 70% quality
          const base64 = canvas.toDataURL('image/jpeg', 0.7)
          // Remove data URL prefix
          const base64Data = base64.split(',')[1]
          resolve(base64Data)
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image')
      return
    }

    try {
      const base64 = await compressImage(file)
      setPreview(`data:image/jpeg;base64,${base64}`)
      onImageSelected(base64)
    } catch (error) {
      console.error('Error processing image:', error)
      alert('Erreur lors du traitement de l\'image')
    }
  }, [compressImage, onImageSelected])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [handleFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }, [handleFile])

  const clearPreview = useCallback(() => {
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }, [])

  return (
    <Card className="p-4">
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Aperçu du reçu"
            className="w-full max-h-64 object-contain rounded-lg"
          />
          {!isLoading && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={clearPreview}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">
            Glissez votre reçu ici ou
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Parcourir
            </Button>
            <Button
              variant="outline"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isLoading}
            >
              <Camera className="h-4 w-4 mr-2" />
              Prendre photo
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleChange}
            className="hidden"
          />
        </div>
      )}
    </Card>
  )
}
