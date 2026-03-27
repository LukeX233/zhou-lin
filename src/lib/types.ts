export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'ready'
  | 'completed'
  | 'cancelled'

export interface Profile {
  id: string
  name: string | null
  phone: string | null
  wechat: string | null
  created_at: string
}

export interface MenuItemOptionChoice {
  id: string
  group_id: string
  value_zh: string
  value_en: string | null
  price_modifier: number
  display_order: number
}

export interface MenuItemOptionGroup {
  id: string
  item_id: string
  label_zh: string
  label_en: string | null
  is_required: boolean
  display_order: number
  choices: MenuItemOptionChoice[]
}

export interface MenuItem {
  id: string
  name_zh: string
  name_en: string | null
  description_zh: string | null
  description_en: string | null
  price: number
  image_url: string | null
  available_date: string     // ISO date string YYYY-MM-DD
  pickup_time: string | null // e.g. "5:00pm - 7:00pm"
  capacity: number | null
  orders_count: number       // computed via view
  is_active: boolean
  created_at: string
  option_groups?: MenuItemOptionGroup[]
}

export interface OrderItemSelection {
  id: string
  order_item_id: string
  group_id: string
  choice_id: string
  value_zh: string
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  menu_item?: MenuItem
  selections?: OrderItemSelection[]
}

export interface Order {
  id: string
  user_id: string | null
  customer_name: string
  customer_phone: string | null
  customer_wechat: string | null
  status: OrderStatus
  total_amount: number
  payment_screenshot_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  items?: OrderItem[]
}

export interface PollOption {
  id: string
  poll_id: string
  label_zh: string
  label_en: string | null
  display_order: number
  vote_count?: number  // computed
}

export interface Poll {
  id: string
  question_zh: string
  question_en: string | null
  is_active: boolean
  closes_at: string | null
  created_at: string
  options?: PollOption[]
  user_voted_option_id?: string | null // null = hasn't voted
}

// For building an order in the UI (pre-submit)
export interface CartItem {
  menu_item: MenuItem
  quantity: number
  selections: Record<string, string> // group_id -> choice value_zh
  selected_choice_ids: Record<string, string> // group_id -> choice_id
}
