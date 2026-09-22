export type UserRole = 'FARMER' | 'CENTRE_OPERATOR' | 'GOVERNMENT_OFFICER' | 'ADMIN'

export interface AuthUser {
  id: number
  email?: string
  mobile?: string
  role: UserRole
  full_name?: string
  is_active: boolean
}

export interface Token {
  access_token: string
  token_type: string
  user_id: number
  role: UserRole
  full_name?: string
}

export interface FarmerProfile {
  id: number
  user_id: number
  full_name: string
  mobile?: string
  email?: string
  village?: string
  district?: string
  state?: string
  pincode?: string
  aadhaar_masked?: string
  photo_url?: string
  kyc_verified: boolean
  kyc_method?: string
  preferred_language: string
  preferred_theme: string
  assisted_mode: boolean
  created_at?: string
}

export interface Crop {
  id: number
  farmer_id: number
  crop_name: string
  crop_type?: string
  quantity_quintals?: number
  season?: string
  year?: number
  is_active: boolean
  notes?: string
  created_at?: string
}

export interface Centre {
  id: number
  name: string
  code: string
  address?: string
  village?: string
  district?: string
  state?: string
  contact_phone?: string
  is_active: boolean
  avg_service_time_minutes: number
  active_counters: number
  queue_length: number
  crowd_level?: 'LOW' | 'MEDIUM' | 'HIGH'
  estimated_wait_minutes?: number
}

export interface Slot {
  id: number
  centre_id: number
  slot_date: string
  slot_start_time: string
  slot_end_time: string
  slot_label?: string
  max_capacity: number
  booked_count: number
  available: number
  status: 'AVAILABLE' | 'FULL' | 'CLOSED'
  crowd_level?: 'LOW' | 'MEDIUM' | 'HIGH'
  estimated_wait_minutes?: number
}

export interface Booking {
  id: number
  farmer_id: number
  slot_id: number
  crop_id?: number
  token_number: string
  quantity_quintals?: number
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'RESCHEDULED' | 'NO_SHOW'
  qr_data?: string
  created_at?: string
  slot?: Slot
  centre_name?: string
  queue_position?: number
  estimated_wait_minutes?: number
}

export interface QueueEntry {
  id: number
  booking_id: number
  centre_id: number
  position: number
  status: 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
  estimated_wait_minutes?: number
  called_at?: string
  service_started_at?: string
  token_number?: string
  current_token?: string
  people_ahead?: number
  active_counters?: number
}

export interface Procurement {
  id: number
  booking_id: number
  centre_id: number
  farmer_id: number
  crop_name?: string
  gross_weight?: number
  net_weight?: number
  moisture_percent?: number
  quality_grade?: string
  msp_per_quintal?: number
  total_amount?: number
  stage: ProcurementStage
  arrived_at?: string
  weighing_started_at?: string
  weighing_completed_at?: string
  quality_started_at?: string
  quality_completed_at?: string
  procurement_completed_at?: string
}

export type ProcurementStage =
  | 'ARRIVED'
  | 'WEIGHING'
  | 'WEIGHING_COMPLETED'
  | 'QUALITY_CHECK'
  | 'QUALITY_COMPLETED'
  | 'PROCUREMENT_COMPLETED'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_COMPLETED'

export interface Payment {
  id: number
  procurement_id: number
  farmer_id: number
  amount?: number
  payment_mode?: string
  bank_account_masked?: string
  transaction_reference?: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  initiated_at?: string
  completed_at?: string
  notes?: string
}

export interface Notification {
  id: number
  user_id: number
  title: string
  message: string
  notification_type?: string
  related_booking_id?: number
  is_read: boolean
  created_at?: string
}

export type Theme = 'light' | 'dark' | 'system'
export type Language = 'en' | 'hi' | 'ur' | 'cg' | 'mr' | 'bn' | 'gu' | 'pa' | 'te'

export interface ActiveBookingResponse {
  booking: {
    id: number
    token_number: string
    status: string
    qr_data?: string
    created_at?: string
    slot: {
      date?: string
      start_time?: string
      end_time?: string
      label?: string
    }
    centre: {
      id?: number
      name?: string
      address?: string
    }
  } | null
  queue?: {
    position?: number
    status?: string
    people_ahead?: number
    estimated_wait_minutes?: number
    active_counters?: number
  } | null
  procurement?: {
    stage?: ProcurementStage
    arrived_at?: string
    weighing_completed_at?: string
    quality_completed_at?: string
    procurement_completed_at?: string
    net_weight?: number
    quality_grade?: string
    total_amount?: number
    msp_per_quintal?: number
  } | null
  payment?: {
    status?: string
    amount?: number
    completed_at?: string
    initiated_at?: string
    payment_mode?: string
  } | null
  action: string
  action_message: string
}
