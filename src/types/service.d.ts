export type ServiceCategory = "DELIVERY" | "SHOPPING" | "CARE";

export interface Service {
    service_id: string;
    name: string;
    price: number;
    category: ServiceCategory;
    pickup_address: string;
    dest_address: string;
    image_url?: string | null;
    detail_1?: string | null;
    detail_2?: string | null;
}
