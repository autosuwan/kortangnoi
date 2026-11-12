export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      alert_settings: {
        Row: {
          donor_can_pick_color: boolean;
          donor_can_pick_image: boolean;
          donor_can_pick_support_text: boolean;
          duration_sec: number;
          last_test_at: string | null;
          media_storage_path: string | null;
          media_type: Database["public"]["Enums"]["alert_media_type"];
          media_url: string | null;
          name_color: string;
          sound_enabled: boolean;
          support_text: string;
          tts_enabled: boolean;
          tts_min_amount_satang: number;
          tts_mode: string;
          tts_preview_at: string | null;
          tts_voice: string;
          tts_volume: number;
          updated_at: string;
          user_id: string;
          volume: number;
        };
        ComputedFields: never;
        Insert: {
          donor_can_pick_color?: boolean;
          donor_can_pick_image?: boolean;
          donor_can_pick_support_text?: boolean;
          duration_sec?: number;
          last_test_at?: string | null;
          media_storage_path?: string | null;
          media_type?: Database["public"]["Enums"]["alert_media_type"];
          media_url?: string | null;
          name_color?: string;
          sound_enabled?: boolean;
          support_text?: string;
          tts_enabled?: boolean;
          tts_min_amount_satang?: number;
          tts_mode?: string;
          tts_preview_at?: string | null;
          tts_voice?: string;
          tts_volume?: number;
          updated_at?: string;
          user_id: string;
          volume?: number;
        };
        Update: {
          donor_can_pick_color?: boolean;
          donor_can_pick_image?: boolean;
          donor_can_pick_support_text?: boolean;
          duration_sec?: number;
          last_test_at?: string | null;
          media_storage_path?: string | null;
          media_type?: Database["public"]["Enums"]["alert_media_type"];
          media_url?: string | null;
          name_color?: string;
          sound_enabled?: boolean;
          support_text?: string;
          tts_enabled?: boolean;
          tts_min_amount_satang?: number;
          tts_mode?: string;
          tts_preview_at?: string | null;
          tts_voice?: string;
          tts_volume?: number;
          updated_at?: string;
          user_id?: string;
          volume?: number;
        };
        Relationships: [
          {
            foreignKeyName: "alert_settings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      donations: {
        Row: {
          access_token_hash: string;
          alert_acked_at: string | null;
          amount_satang: number;
          approved_via: Database["public"]["Enums"]["approval_method"] | null;
          created_at: string;
          donor_media_url: string | null;
          donor_name: string;
          donor_name_color: string | null;
          donor_support_text: string | null;
          expires_at: string;
          id: string;
          ip_hash: string;
          message: string | null;
          qr_payload: string;
          receiver_snapshot: NonNullable<Json>;
          result_message: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          slip_attempts: number;
          slip_qr_hash: string | null;
          slip_storage_path: string | null;
          status: Database["public"]["Enums"]["donation_status"];
          streamer_id: string;
          trans_at: string | null;
          trans_ref: string | null;
          updated_at: string;
          verify_result: Json | null;
          webhook_error: string | null;
        };
        ComputedFields: never;
        Insert: {
          access_token_hash: string;
          alert_acked_at?: string | null;
          amount_satang: number;
          approved_via?: Database["public"]["Enums"]["approval_method"] | null;
          created_at?: string;
          donor_media_url?: string | null;
          donor_name: string;
          donor_name_color?: string | null;
          donor_support_text?: string | null;
          expires_at: string;
          id?: string;
          ip_hash: string;
          message?: string | null;
          qr_payload: string;
          receiver_snapshot: NonNullable<Json>;
          result_message?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          slip_attempts?: number;
          slip_qr_hash?: string | null;
          slip_storage_path?: string | null;
          status?: Database["public"]["Enums"]["donation_status"];
          streamer_id: string;
          trans_at?: string | null;
          trans_ref?: string | null;
          updated_at?: string;
          verify_result?: Json | null;
          webhook_error?: string | null;
        };
        Update: {
          access_token_hash?: string;
          alert_acked_at?: string | null;
          amount_satang?: number;
          approved_via?: Database["public"]["Enums"]["approval_method"] | null;
          created_at?: string;
          donor_media_url?: string | null;
          donor_name?: string;
          donor_name_color?: string | null;
          donor_support_text?: string | null;
          expires_at?: string;
          id?: string;
          ip_hash?: string;
          message?: string | null;
          qr_payload?: string;
          receiver_snapshot?: NonNullable<Json>;
          result_message?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          slip_attempts?: number;
          slip_qr_hash?: string | null;
          slip_storage_path?: string | null;
          status?: Database["public"]["Enums"]["donation_status"];
          streamer_id?: string;
          trans_at?: string | null;
          trans_ref?: string | null;
          updated_at?: string;
          verify_result?: Json | null;
          webhook_error?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "donations_streamer_id_fkey";
            columns: ["streamer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      overlay_widgets: {
        Row: {
          goal_started_at: string;
          goal_target_satang: number;
          goal_title: string;
          qr_caption: string;
          recent_count: number;
          styles: NonNullable<Json>;
          timer_ends_at: string | null;
          timer_initial_sec: number;
          timer_label: string;
          timer_remaining_sec: number;
          timer_status: string;
          timer_step_satang: number;
          timer_step_seconds: number;
          top_count: number;
          top_period: string;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          goal_started_at?: string;
          goal_target_satang?: number;
          goal_title?: string;
          qr_caption?: string;
          recent_count?: number;
          styles?: NonNullable<Json>;
          timer_ends_at?: string | null;
          timer_initial_sec?: number;
          timer_label?: string;
          timer_remaining_sec?: number;
          timer_status?: string;
          timer_step_satang?: number;
          timer_step_seconds?: number;
          top_count?: number;
          top_period?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          goal_started_at?: string;
          goal_target_satang?: number;
          goal_title?: string;
          qr_caption?: string;
          recent_count?: number;
          styles?: NonNullable<Json>;
          timer_ends_at?: string | null;
          timer_initial_sec?: number;
          timer_label?: string;
          timer_remaining_sec?: number;
          timer_status?: string;
          timer_step_satang?: number;
          timer_step_seconds?: number;
          top_count?: number;
          top_period?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "overlay_widgets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_settings: {
        Row: {
          account_name_en: string | null;
          account_name_th: string;
          allow_anonymous: boolean;
          enabled: boolean;
          min_amount_satang: number;
          promptpay_id: string;
          promptpay_type: Database["public"]["Enums"]["promptpay_type"];
          show_account_name: boolean;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          account_name_en?: string | null;
          account_name_th?: string;
          allow_anonymous?: boolean;
          enabled?: boolean;
          min_amount_satang?: number;
          promptpay_id?: string;
          promptpay_type?: Database["public"]["Enums"]["promptpay_type"];
          show_account_name?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          account_name_en?: string | null;
          account_name_th?: string;
          allow_anonymous?: boolean;
          enabled?: boolean;
          min_amount_satang?: number;
          promptpay_id?: string;
          promptpay_type?: Database["public"]["Enums"]["promptpay_type"];
          show_account_name?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_settings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          avatar_url: string | null;
          banner_path: string | null;
          banner_url: string | null;
          bio: string | null;
          created_at: string;
          discord_id: string | null;
          display_name: string;
          id: string;
          overlay_token: string;
          real_name: string;
          updated_at: string;
          username: string | null;
        };
        ComputedFields: never;
        Insert: {
          avatar_path?: string | null;
          avatar_url?: string | null;
          banner_path?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          created_at?: string;
          discord_id?: string | null;
          display_name?: string;
          id: string;
          overlay_token?: string;
          real_name?: string;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_path?: string | null;
          avatar_url?: string | null;
          banner_path?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          created_at?: string;
          discord_id?: string | null;
          display_name?: string;
          id?: string;
          overlay_token?: string;
          real_name?: string;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      system_errors: {
        Row: {
          code: string;
          context: Json | null;
          created_at: string;
          id: number;
          message: string;
          source: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          context?: Json | null;
          created_at?: string;
          id?: never;
          message: string;
          source: string;
        };
        Update: {
          code?: string;
          context?: Json | null;
          created_at?: string;
          id?: never;
          message?: string;
          source?: string;
        };
        Relationships: [];
      };
      webhook_settings: {
        Row: {
          discord_webhook_url: string | null;
          enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          discord_webhook_url?: string | null;
          enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          discord_webhook_url?: string | null;
          enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_settings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      subathon_add_seconds: {
        Args: { p_seconds: number; p_user: string };
        Returns: boolean;
      };
      subathon_control: {
        Args: { p_action: string; p_seconds?: number; p_user: string };
        Returns: boolean;
      };
    };
    Enums: {
      alert_media_type: "default" | "gif" | "upload";
      approval_method: "auto" | "manual";
      donation_status:
        | "awaiting_slip"
        | "verifying"
        | "approved"
        | "pending_review"
        | "rejected"
        | "expired";
      promptpay_type: "phone" | "national_id";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      alert_media_type: ["default", "gif", "upload"],
      approval_method: ["auto", "manual"],
      donation_status: [
        "awaiting_slip",
        "verifying",
        "approved",
        "pending_review",
        "rejected",
        "expired",
      ],
      promptpay_type: ["phone", "national_id"],
    },
  },
} as const;
