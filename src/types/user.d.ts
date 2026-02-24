export type UserRole = "admin" | "customer" | "freelance";

export type Profile = {
    id: string;
    email: string;
    full_name: string;
    phone_number: string | null;
    role: UserRole;
    created_at: string;
};