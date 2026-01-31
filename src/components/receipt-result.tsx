'use client'

import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReceiptAnalysis } from '@/types/database'

interface ReceiptResultProps {
  result: ReceiptAnalysis | null
  error?: string | null
}

const networkLabels: Record<string, { label: string; color: string }> = {
  wave: { label: 'Wave', color: 'bg-blue-500' },
  orange: { label: 'Orange Money', color: 'bg-orange-500' },
  mtn: { label: 'MTN MoMo', color: 'bg-yellow-500' },
  other: { label: 'Autre', color: 'bg-gray-500' },
}

function formatAmount(amount: number | null): string {
  if (amount === null) return '-'
  return new Intl.NumberFormat('fr-CI', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('fr-CI', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return dateStr
  }
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100)
  let color = 'bg-red-500'
  let Icon = XCircle

  if (confidence >= 0.8) {
    color = 'bg-green-500'
    Icon = CheckCircle2
  } else if (confidence >= 0.5) {
    color = 'bg-yellow-500'
    Icon = AlertCircle
  }

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-white text-xs ${color}`}>
      <Icon className="h-3 w-3" />
      {percentage}% confiance
    </div>
  )
}

export function ReceiptResult({ result, error }: ReceiptResultProps) {
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            Erreur d&apos;analyse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!result) return null

  const network = result.network ? networkLabels[result.network] : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Résultat de l&apos;analyse</CardTitle>
          <ConfidenceBadge confidence={result.confidence} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network Badge */}
        {network && (
          <div className={`inline-block px-3 py-1 rounded-full text-white text-sm ${network.color}`}>
            {network.label}
          </div>
        )}

        {/* Main Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Montant</p>
            <p className="text-2xl font-bold text-primary">
              {formatAmount(result.amount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium">{formatDate(result.date)}</p>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="space-y-2 pt-2 border-t">
          <div>
            <p className="text-sm text-muted-foreground">ID Transaction</p>
            <p className="font-mono text-sm">{result.transaction_id || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expéditeur</p>
            <p className="font-medium">{result.sender_name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Téléphone</p>
            <p className="font-medium">{result.sender_phone || '-'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
