import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    VITE_SUPABASE_URL: !!supabaseUrl,
    VITE_SUPABASE_ANON_KEY: !!supabaseAnonKey,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'undefined'
  })
  throw new Error('Supabase configuration is missing. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
})

// أنواع البيانات - النظام الجديد
export interface AppUser {
  id: string
  username: string
  role: 'ADMIN' | 'METER_READER' | 'GENERAL_READER'
  full_name?: string
  department?: string
  position?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Record {
  id: string
  registry: string
  type: string
  record_type: string
  area: string
  subscribers_count: number
  created_at: string
  user_id: string
  app_user_id?: string
}

export interface Subscriber {
  id: string
  account_number: string
  subscriber_name: string
  subscription_class: string
  meter_number: string
  reading: number
  reading_date: string
  created_at: string
  user_id: string
  image_url?: string
  app_user_id?: string
}

export interface Feeder {
  id: string
  station: string
  feeder: string
  voltage: string
  meter_number: string
  meter_type: string
  reading: number
  reading_date: string
  created_at: string
  user_id: string
  image_url?: string
  app_user_id?: string
}

export interface UserProfile {
  id: string
  app_user_id: string
  full_name?: string
  department?: string
  position?: string
  created_at: string
  updated_at: string
}

export interface Meter {
  id: string
  account_number: string
  subscriber_name: string
  meter_number: string
  address: string
  feeder: string
  created_at: string
  user_id?: string
}

export interface Task {
  id: string
  meter_id: string
  app_user_id: string
  assigned_by?: string
  task_date: string
  status: 'قيد التنفيذ' | 'منجز'
  meter_reading: number
  meter_image_url?: string
  location_lat?: number
  location_lng?: number
  completed_at?: string
  created_at: string
  // Relations
  meter?: Meter
  assigned_user?: AppUser
  assigned_by_user?: AppUser
}