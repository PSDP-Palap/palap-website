import { Address } from "./address";

export interface Product {
  id?: string;
  product_id?: string;
  name: string;
  description?: string;
  price: number;
  qty?: number;
  image_url: string | null;
  created_at?: string;
  pickup_address_id?: string | null;
  pickup_address?: Address | null;
  service_id?: string | null;
}

export interface CartRow {
  id: string;
  name: string;
  imageUrl: string | null;
  qty: number;
  unitPrice: number;
  subtotal: number;
}
