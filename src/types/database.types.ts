/**
 * Supabase schema types.
 *
 * Regenerate after any migration with:
 *   npm run types
 *   (supabase gen types typescript --linked > src/types/database.types.ts)
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          status: Database["public"]["Enums"]["account_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          status?: Database["public"]["Enums"]["account_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          status?: Database["public"]["Enums"]["account_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          birthday: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          phone?: string | null;
          birthday?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          birthday?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          client_id: string | null;
          client_name: string;
          client_phone: string | null;
          employee_id: string;
          service_name: string;
          scheduled_at: string;
          status: Database["public"]["Enums"]["appointment_status"];
          cancellation_reason: string | null;
          canceled_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          client_name: string;
          client_phone?: string | null;
          employee_id: string;
          service_name: string;
          scheduled_at: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          cancellation_reason?: string | null;
          canceled_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string | null;
          client_name?: string;
          client_phone?: string | null;
          employee_id?: string;
          service_name?: string;
          scheduled_at?: string;
          status?: Database["public"]["Enums"]["appointment_status"];
          cancellation_reason?: string | null;
          canceled_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_super_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: "super_admin" | "employee";
      account_status: "pending" | "active" | "inactive";
      appointment_status: "scheduled" | "canceled";
    };
    CompositeTypes: Record<never, never>;
  };
};
