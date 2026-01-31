export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          vendor_id: string
          name: string
          slug: string | null
          icon: string | null
          sort_order: number
          created_at: string | null
        }
        Insert: {
          id?: string
          vendor_id: string
          name: string
          slug?: string | null
          icon?: string | null
          sort_order?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          vendor_id?: string
          name?: string
          slug?: string | null
          icon?: string | null
          sort_order?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          id: string
          vendor_id: string
          order_id: string | null
          order_amount: number
          commission_rate: number
          commission_amount: number
          status: string
          created_at: string | null
        }
        Insert: {
          id?: string
          vendor_id: string
          order_id?: string | null
          order_amount: number
          commission_rate: number
          commission_amount: number
          status?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          vendor_id?: string
          order_id?: string | null
          order_amount?: number
          commission_rate?: number
          commission_amount?: number
          status?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          id: string
          vendor_id: string
          phone: string
          whatsapp_id: string | null
          name: string | null
          total_orders: number
          total_spent: number
          last_order_at: string | null
          opted_in: boolean
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          vendor_id: string
          phone: string
          whatsapp_id?: string | null
          name?: string | null
          total_orders?: number
          total_spent?: number
          last_order_at?: string | null
          opted_in?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          vendor_id?: string
          phone?: string
          whatsapp_id?: string | null
          name?: string | null
          total_orders?: number
          total_spent?: number
          last_order_at?: string | null
          opted_in?: boolean
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flash_sales: {
        Row: {
          id: string
          vendor_id: string
          title: string
          message: string
          image_url: string | null
          discount_percent: number | null
          valid_until: string | null
          sent_count: number
          created_at: string | null
        }
        Insert: {
          id?: string
          vendor_id: string
          title: string
          message: string
          image_url?: string | null
          discount_percent?: number | null
          valid_until?: string | null
          sent_count?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          vendor_id?: string
          title?: string
          message?: string
          image_url?: string | null
          discount_percent?: number | null
          valid_until?: string | null
          sent_count?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flash_sales_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          vendor_id: string
          type: string
          title: string
          message: string
          data: Json | null
          read: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          vendor_id: string
          type: string
          title: string
          message: string
          data?: Json | null
          read?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          vendor_id?: string
          type?: string
          title?: string
          message?: string
          data?: Json | null
          read?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          items: Json
          payment_network: string | null
          payment_proof_url: string | null
          payment_status: string | null
          total_amount: number
          transaction_date: string | null
          transaction_id: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          payment_network?: string | null
          payment_proof_url?: string | null
          payment_status?: string | null
          total_amount: number
          transaction_date?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          payment_network?: string | null
          payment_proof_url?: string | null
          payment_status?: string | null
          total_amount?: number
          transaction_date?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string | null
          id: string
          image_url: string | null
          low_stock_threshold: number
          name: string
          price: number
          purchase_price: number | null
          stock: number | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name: string
          price: number
          purchase_price?: number | null
          stock?: number | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          low_stock_threshold?: number
          name?: string
          price?: number
          purchase_price?: number | null
          stock?: number | null
          updated_at?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_reservations: {
        Row: {
          id: string
          product_id: string
          order_id: string | null
          quantity: number
          expires_at: string
          status: string
          created_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          order_id?: string | null
          quantity: number
          expires_at: string
          status?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          order_id?: string | null
          quantity?: number
          expires_at?: string
          status?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          orders_limit: number
          orders_this_month: number
          phone: string | null
          plan: string
          plan_expires_at: string | null
          products_limit: number
          role: string
          shop_name: string
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean
          logo_url?: string | null
          orders_limit?: number
          orders_this_month?: number
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          products_limit?: number
          role?: string
          shop_name: string
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          orders_limit?: number
          orders_this_month?: number
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          products_limit?: number
          role?: string
          shop_name?: string
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_history: {
        Row: {
          id: string
          vendor_id: string
          plan: string
          amount: number
          payment_method: string | null
          payment_reference: string | null
          starts_at: string | null
          ends_at: string
          created_at: string | null
        }
        Insert: {
          id?: string
          vendor_id: string
          plan: string
          amount: number
          payment_method?: string | null
          payment_reference?: string | null
          starts_at?: string | null
          ends_at: string
          created_at?: string | null
        }
        Update: {
          id?: string
          vendor_id?: string
          plan?: string
          amount?: number
          payment_method?: string | null
          payment_reference?: string | null
          starts_at?: string | null
          ends_at?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_history_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          id: string
          vendor_id: string
          code: string
          discount_type: string
          discount_value: number
          min_order_amount: number
          max_uses: number | null
          uses_count: number
          valid_from: string | null
          valid_until: string | null
          is_active: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          vendor_id: string
          code: string
          discount_type: string
          discount_value: number
          min_order_amount?: number
          max_uses?: number | null
          uses_count?: number
          valid_from?: string | null
          valid_until?: string | null
          is_active?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          vendor_id?: string
          code?: string
          discount_type?: string
          discount_value?: number
          min_order_amount?: number
          max_uses?: number | null
          uses_count?: number
          valid_from?: string | null
          valid_until?: string | null
          is_active?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          id: string
          vendor_id: string
          order_id: string | null
          customer_phone: string
          message_type: string
          message_content: string | null
          status: string
          sent_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          vendor_id: string
          order_id?: string | null
          customer_phone: string
          message_type: string
          message_content?: string | null
          status?: string
          sent_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          vendor_id?: string
          order_id?: string | null
          customer_phone?: string
          message_type?: string
          message_content?: string | null
          status?: string
          sent_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_analyses: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          extracted_data: Json | null
          id: string
          image_url: string
          order_id: string | null
          vendor_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          extracted_data?: Json | null
          id?: string
          image_url: string
          order_id?: string | null
          vendor_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          extracted_data?: Json | null
          id?: string
          image_url?: string
          order_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_analyses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_analyses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      used_transactions: {
        Row: {
          amount: number | null
          id: string
          network: string | null
          order_id: string | null
          transaction_id: string
          vendor_id: string | null
          verified_at: string | null
        }
        Insert: {
          amount?: number | null
          id?: string
          network?: string | null
          order_id?: string | null
          transaction_id: string
          vendor_id?: string | null
          verified_at?: string | null
        }
        Update: {
          amount?: number | null
          id?: string
          network?: string | null
          order_id?: string | null
          transaction_id?: string
          vendor_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "used_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "used_transactions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_slug: { Args: { shop_name: string }; Returns: string }
      release_expired_reservations: { Args: Record<string, never>; Returns: void }
      get_available_stock: { Args: { p_product_id: string }; Returns: number }
      decrement_stock: { Args: { p_product_id: string; p_quantity: number }; Returns: void }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export interface ReceiptAnalysis {
  amount: number | null
  date: string | null
  transaction_id: string | null
  network: 'wave' | 'orange' | 'mtn' | 'other' | null
  sender_name: string | null
  sender_phone: string | null
  confidence: number
  raw_text?: string
}

// Helper types
type PaymentStatus = 'pending' | 'verified' | 'failed'
type PaymentNetwork = 'wave' | 'orange' | 'mtn' | 'other'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type Order = Database['public']['Tables']['orders']['Row'] & {
  payment_status: PaymentStatus
  payment_network: PaymentNetwork | null
}
export type ReceiptAnalysisRecord = Database['public']['Tables']['receipt_analyses']['Row']
