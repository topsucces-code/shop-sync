'use client'

import { useState } from 'react'
import { ScanLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReceiptUploader } from '@/components/receipt-uploader'
import { ReceiptResult } from '@/components/receipt-result'
import { ReceiptAnalysis } from '@/types/database'
import { toast } from 'sonner'

export default function AnalyzePage() {
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<ReceiptAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!imageBase64) {
      toast.error('Veuillez d\'abord sélectionner une image')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64,
          saveToDb: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'analyse')
      }

      setResult(data.data)
      toast.success('Analyse terminée!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(message)
      toast.error(message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleImageSelected = (base64: string) => {
    setImageBase64(base64)
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="h-6 w-6" />
          Magic Reader
        </h1>
        <p className="text-muted-foreground">
          Scannez un reçu Mobile Money pour extraire automatiquement les informations
        </p>
      </div>

      <ReceiptUploader
        onImageSelected={handleImageSelected}
        isLoading={isAnalyzing}
      />

      {imageBase64 && !result && (
        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full"
          size="lg"
        >
          {isAnalyzing ? 'Analyse en cours...' : 'Analyser le reçu'}
        </Button>
      )}

      <ReceiptResult result={result} error={error} />

      {result && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setImageBase64(null)
              setResult(null)
              setError(null)
            }}
          >
            Nouveau scan
          </Button>
          <Button className="flex-1">
            Créer commande
          </Button>
        </div>
      )}
    </div>
  )
}
