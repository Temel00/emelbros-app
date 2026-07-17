// Hand-authored to match the shape `supabase gen types typescript --local`
// produces (ADR-0008). This environment has no local Docker/Supabase stack
// to generate against — regenerate for real once one is available:
//
//   supabase db reset
//   supabase gen types typescript --local > types/database.ts
//
// and diff the result against this file before trusting it further.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          accent: Database["public"]["Enums"]["accent"];
          created_at: string;
        };
        Insert: {
          id: string;
          accent?: Database["public"]["Enums"]["accent"];
          created_at?: string;
        };
        Update: {
          id?: string;
          accent?: Database["public"]["Enums"]["accent"];
          created_at?: string;
        };
        Relationships: [];
      };
      allowed_emails: {
        Row: {
          email: string;
          label: string;
          created_at: string;
        };
        Insert: {
          email: string;
          label: string;
          created_at?: string;
        };
        Update: {
          email?: string;
          label?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      pins: {
        Row: {
          id: string;
          member_id: string;
          module: string;
          widget: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          module: string;
          widget?: string | null;
          position: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          module?: string;
          widget?: string | null;
          position?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      habits_trackable: {
        Row: {
          id: string;
          owner_member_id: string;
          title: string;
          kind: string;
          scope: Database["public"]["Enums"]["scope"];
          cadence_type: string | null;
          cadence_target: number | null;
          cadence_weekdays: number[] | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_member_id: string;
          title: string;
          kind: string;
          scope?: Database["public"]["Enums"]["scope"];
          cadence_type?: string | null;
          cadence_target?: number | null;
          cadence_weekdays?: number[] | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_member_id?: string;
          title?: string;
          kind?: string;
          scope?: Database["public"]["Enums"]["scope"];
          cadence_type?: string | null;
          cadence_target?: number | null;
          cadence_weekdays?: number[] | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      habits_log: {
        Row: {
          id: string;
          trackable_id: string;
          log_date: string;
          done: boolean;
          value: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          trackable_id: string;
          log_date: string;
          done?: boolean;
          value?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          trackable_id?: string;
          log_date?: string;
          done?: boolean;
          value?: number | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      habits_participant: {
        Row: {
          trackable_id: string;
          member_id: string;
        };
        Insert: {
          trackable_id: string;
          member_id: string;
        };
        Update: {
          trackable_id?: string;
          member_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      accent: "pink" | "yellow" | "green" | "blue";
      scope: "private" | "participants" | "family";
    };
    CompositeTypes: Record<string, never>;
  };
};
