export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
}

export interface User {
  id: number;
  username: string;
  role: 'user' | 'admin';
}

export interface Order {
  id: number;
  user_id: number;
  username?: string;
  total_price: number;
  status: 'Pending' | 'Confirmed' | 'Completed';
  created_at: string;
  items?: CartItem[];
}

export interface CartItem extends Product {
  quantity: number;
}
