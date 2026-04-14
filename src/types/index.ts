export type Shop = {
  id: string;
  name: string;
  code: string;
  slug?: string;
  phone_number?: string;
  subscription_days: number;
  expiry_date: string;
  plan?: string;
  plan_expiry_date?: string;
  created_at: string;
};

export type AppUser = {
  id: string;
  shop_id: string;
  role: 'super_admin' | 'admin' | 'manager' | 'user';
  email: string;
  full_name: string;
};

export type ChatbotConfig = {
  id: string;
  shop_id: string;
  shop_name: string;
  product_info: string;
  pricing_info: string;
  faq: string;
  is_active: boolean;
};

export type Message = {
  id: string;
  shop_id: string;
  session_id: string;
  user_message: string;
  ai_response: string;
  created_at: string;
};
