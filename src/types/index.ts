export type Shop = {
  id: string;
  name: string;
  created_at: string;
};

export type AppUser = {
  id: string;
  shop_id: string;
  role: 'admin' | 'user';
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
