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
      darts_game: {
        Row: {
          id: string;
          owner_member_id: string;
          variant: number;
          starting_participant_id: string | null;
          winner_participant_id: string | null;
          status: string;
          scope: Database["public"]["Enums"]["scope"];
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_member_id: string;
          variant: number;
          starting_participant_id?: string | null;
          winner_participant_id?: string | null;
          status?: string;
          scope?: Database["public"]["Enums"]["scope"];
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_member_id?: string;
          variant?: number;
          starting_participant_id?: string | null;
          winner_participant_id?: string | null;
          status?: string;
          scope?: Database["public"]["Enums"]["scope"];
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "darts_game_starting_participant_id_fkey";
            columns: ["starting_participant_id"];
            isOneToOne: false;
            referencedRelation: "darts_participant";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "darts_game_winner_participant_id_fkey";
            columns: ["winner_participant_id"];
            isOneToOne: false;
            referencedRelation: "darts_participant";
            referencedColumns: ["id"];
          },
        ];
      };
      darts_participant: {
        Row: {
          id: string;
          game_id: string;
          member_id: string | null;
          guest_name: string | null;
          slot: number;
        };
        Insert: {
          id?: string;
          game_id: string;
          member_id?: string | null;
          guest_name?: string | null;
          slot: number;
        };
        Update: {
          id?: string;
          game_id?: string;
          member_id?: string | null;
          guest_name?: string | null;
          slot?: number;
        };
        Relationships: [
          {
            foreignKeyName: "darts_participant_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "darts_game";
            referencedColumns: ["id"];
          },
        ];
      };
      darts_turn: {
        Row: {
          id: string;
          game_id: string;
          participant_id: string;
          turn_number: number;
          busted: boolean;
        };
        Insert: {
          id?: string;
          game_id: string;
          participant_id: string;
          turn_number: number;
          busted?: boolean;
        };
        Update: {
          id?: string;
          game_id?: string;
          participant_id?: string;
          turn_number?: number;
          busted?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "darts_turn_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "darts_game";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "darts_turn_participant_id_fkey";
            columns: ["participant_id"];
            isOneToOne: false;
            referencedRelation: "darts_participant";
            referencedColumns: ["id"];
          },
        ];
      };
      darts_dart: {
        Row: {
          id: string;
          turn_id: string;
          dart_number: number;
          segment: number;
          multiple: number;
        };
        Insert: {
          id?: string;
          turn_id: string;
          dart_number: number;
          segment: number;
          multiple: number;
        };
        Update: {
          id?: string;
          turn_id?: string;
          dart_number?: number;
          segment?: number;
          multiple?: number;
        };
        Relationships: [
          {
            foreignKeyName: "darts_dart_turn_id_fkey";
            columns: ["turn_id"];
            isOneToOne: false;
            referencedRelation: "darts_turn";
            referencedColumns: ["id"];
          },
        ];
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
