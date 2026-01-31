'use client'

import { useState, use } from 'react'
import { CheckCircle2, Upload, Camera, Loader2, ArrowRight, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface VerificationResult {
  amount?: number
  transaction_id?: string
  network?: string
  date?: string
}

export default function OrderSuccessPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)

  const [step, setStep] = useState<'success' | 'upload' | 'verifying' | 'verified' | 'failed'>('success')
  const [selectedNetwork, setSelectedNetwork] = useState<string>('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isFraud, setIsFraud] = useState(false)
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)

  const networks = [
    { id: 'wave', name: 'Wave', color: 'bg-blue-500' },
    { id: 'orange', name: 'Orange Money', color: 'bg-orange-500' },
    { id: 'mtn', name: 'MTN MoMo', color: 'bg-yellow-500' },
  ]

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_SIZE = 1024
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
        setPreview(base64)
        setImageBase64(base64.split(',')[1])
        setErrorMessage('')
        setIsFraud(false)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleVerify = async () => {
    if (!imageBase64 || !selectedNetwork) {
      toast.error('Veuillez sélectionner le réseau et une image')
      return
    }

    setIsVerifying(true)
    setStep('verifying')
    setErrorMessage('')
    setIsFraud(false)

    try {
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          imageBase64,
          paymentNetwork: selectedNetwork,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMessage(data.error || 'Erreur de vérification')
        setIsFraud(data.fraud || false)
        setStep('failed')
        return
      }

      setVerificationResult(data.verification)
      toast.success('Paiement vérifié!')
      setStep('verified')
    } catch (error) {
      console.error(error)
      setErrorMessage('Erreur de connexion. Veuillez réessayer.')
      setStep('failed')
    } finally {
      setIsVerifying(false)
    }
  }

  const resetUpload = () => {
    setPreview(null)
    setImageBase64(null)
    setErrorMessage('')
    setIsFraud(false)
    setStep('upload')
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-green-50 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Step 1: Order Created */}
        {step === 'success' && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">
                Commande créée!
              </h1>
              <p className="text-muted-foreground mb-6">
                Votre commande a été enregistrée.
                <br />
                <strong>Référence:</strong> {orderId.slice(0, 8).toUpperCase()}
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-amber-800 text-sm">
                  <strong>Étape suivante:</strong> Effectuez le paiement Mobile Money puis envoyez la capture d&apos;écran pour vérification automatique.
                </p>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={() => setStep('upload')}
              >
                J&apos;ai payé, envoyer la preuve
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Upload Payment Proof */}
        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Vérification du paiement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Notre IA va vérifier automatiquement votre paiement.
              </p>

              {/* Network Selection */}
              <div>
                <p className="text-sm font-medium mb-2">Quel service avez-vous utilisé?</p>
                <div className="grid grid-cols-3 gap-2">
                  {networks.map(network => (
                    <button
                      key={network.id}
                      type="button"
                      onClick={() => setSelectedNetwork(network.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedNetwork === network.id
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                    >
                      <div className={`w-8 h-8 ${network.color} rounded-full mx-auto mb-1`} />
                      <p className="text-xs font-medium">{network.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <p className="text-sm font-medium mb-2">Capture du reçu:</p>

                {preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Preuve de paiement"
                      className="w-full rounded-lg border"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setPreview(null)
                        setImageBase64(null)
                      }}
                    >
                      Changer
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors">
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Galerie</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors">
                        <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Photo</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <Button
                size="lg"
                className="w-full"
                disabled={!imageBase64 || !selectedNetwork}
                onClick={handleVerify}
              >
                Vérifier le paiement
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep('success')}
              >
                Retour
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Verifying */}
        {step === 'verifying' && (
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Vérification en cours...</h2>
              <p className="text-muted-foreground">
                Notre IA analyse votre reçu de paiement
              </p>
              <div className="mt-4 space-y-2 text-sm text-left bg-muted/50 rounded-lg p-4">
                <p>✓ Lecture du montant</p>
                <p>✓ Extraction de l&apos;ID transaction</p>
                <p>✓ Vérification anti-fraude</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Verification Failed */}
        {step === 'failed' && (
          <Card className={isFraud ? 'border-red-500 border-2' : ''}>
            <CardContent className="pt-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                isFraud ? 'bg-red-100' : 'bg-amber-100'
              }`}>
                {isFraud ? (
                  <XCircle className="h-8 w-8 text-red-600" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                )}
              </div>
              <h2 className={`text-xl font-semibold mb-2 ${isFraud ? 'text-red-600' : 'text-amber-600'}`}>
                {isFraud ? 'Fraude détectée!' : 'Vérification échouée'}
              </h2>
              <p className="text-muted-foreground mb-4">
                {errorMessage}
              </p>

              {isFraud ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-left">
                  <p className="text-red-800 text-sm">
                    <strong>Attention:</strong> Ce reçu a déjà été utilisé.
                    Toute tentative de fraude sera signalée.
                  </p>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={resetUpload}
                >
                  Réessayer avec une autre image
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => setStep('success')}
              >
                Retour
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Verified Successfully */}
        {step === 'verified' && (
          <Card className="border-green-500 border-2">
            <CardContent className="pt-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">
                Paiement vérifié!
              </h1>
              <p className="text-muted-foreground mb-4">
                Votre paiement a été confirmé par notre système.
              </p>

              {verificationResult && (
                <div className="bg-green-50 rounded-lg p-4 text-left space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Montant:</span>
                    <span className="font-semibold">{verificationResult.amount?.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transaction:</span>
                    <span className="font-mono text-xs">{verificationResult.transaction_id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Réseau:</span>
                    <span className="capitalize">{verificationResult.network}</span>
                  </div>
                </div>
              )}

              <div className="bg-muted rounded-lg p-4">
                <p className="font-medium mb-1">Référence commande:</p>
                <p className="font-mono text-lg">{orderId.slice(0, 8).toUpperCase()}</p>
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                Le vendeur préparera votre commande sous peu.
                <br />
                Vous pouvez fermer cette page.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
