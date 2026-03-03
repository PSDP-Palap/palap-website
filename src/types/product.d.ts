import { Address } from "./address";

export interface Product {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  image_url?: string | null;
  pickup_address_id?: string | null;
  pickup_address?: Address | null;
  created_at?: string;
}
