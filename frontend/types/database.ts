export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          user_id: string;
          full_name: string | null;
          username: string | null;
          primary_role: 'learner' | 'creator';
          theme_mode: 'light' | 'dark' | 'ocean' | 'forest' | 'ember';
          profile_photo_url: string | null;
          bio: string | null;
          github_username: string | null;
          github_profile_url: string | null;
          is_admin: boolean;
          is_banned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          full_name?: string | null;
          username?: string | null;
          primary_role?: 'learner' | 'creator';
          theme_mode?: 'light' | 'dark' | 'ocean' | 'forest' | 'ember';
          profile_photo_url?: string | null;
          bio?: string | null;
          github_username?: string | null;
          github_profile_url?: string | null;
          is_admin?: boolean;
          is_banned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          full_name?: string | null;
          username?: string | null;
          primary_role?: 'learner' | 'creator';
          theme_mode?: 'light' | 'dark' | 'ocean' | 'forest' | 'ember';
          profile_photo_url?: string | null;
          bio?: string | null;
          github_username?: string | null;
          github_profile_url?: string | null;
          is_admin?: boolean;
          is_banned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          creator_user_id: string;
          title: string;
          slug: string;
          description: string;
          image_url: string | null;
          course_domain_id: string | null;
          price_amount: number;
          premium_enabled: boolean;
          premium_access_days: number | null;
          premium_updated_at: string | null;
          status: 'draft' | 'published';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_user_id: string;
          title: string;
          slug: string;
          description: string;
          image_url?: string | null;
          course_domain_id?: string | null;
          price_amount?: number;
          premium_enabled?: boolean;
          premium_access_days?: number | null;
          premium_updated_at?: string | null;
          status?: 'draft' | 'published';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          creator_user_id?: string;
          title?: string;
          slug?: string;
          description?: string;
          image_url?: string | null;
          course_domain_id?: string | null;
          price_amount?: number;
          premium_enabled?: boolean;
          premium_access_days?: number | null;
          premium_updated_at?: string | null;
          status?: 'draft' | 'published';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_collaborators: {
        Row: {
          course_id: string;
          collaborator_user_id: string;
          role: 'editor';
          added_by_user_id: string;
          created_at: string;
        };
        Insert: {
          course_id: string;
          collaborator_user_id: string;
          role?: 'editor';
          added_by_user_id: string;
          created_at?: string;
        };
        Update: {
          course_id?: string;
          collaborator_user_id?: string;
          role?: 'editor';
          added_by_user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      course_collaborator_invites: {
        Row: {
          id: string;
          course_id: string;
          inviter_user_id: string;
          invitee_user_id: string;
          role: 'editor';
          status: 'pending' | 'accepted' | 'declined' | 'revoked';
          message: string | null;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          course_id: string;
          inviter_user_id: string;
          invitee_user_id: string;
          role?: 'editor';
          status?: 'pending' | 'accepted' | 'declined' | 'revoked';
          message?: string | null;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: {
          id?: string;
          course_id?: string;
          inviter_user_id?: string;
          invitee_user_id?: string;
          role?: 'editor';
          status?: 'pending' | 'accepted' | 'declined' | 'revoked';
          message?: string | null;
          created_at?: string;
          responded_at?: string | null;
        };
        Relationships: [];
      };
      course_domains: {
        Row: {
          id: string;
          name: string;
          slug: string;
          normalized_name: string;
          created_by_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          normalized_name: string;
          created_by_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          normalized_name?: string;
          created_by_user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      course_modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          summary: string;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          summary: string;
          position: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          summary?: string;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_nodes: {
        Row: {
          id: string;
          module_id: string;
          type: 'content' | 'html' | 'question' | 'quiz' | 'video' | 'pdf' | 'github';
          title: string;
          payload: Json;
          is_premium: boolean;
          excerpt: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          type: 'content' | 'html' | 'question' | 'quiz' | 'video' | 'pdf' | 'github';
          title: string;
          payload: Json;
          is_premium?: boolean;
          excerpt?: string | null;
          position: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          module_id?: string;
          type?: 'content' | 'html' | 'question' | 'quiz' | 'video' | 'pdf' | 'github';
          title?: string;
          payload?: Json;
          is_premium?: boolean;
          excerpt?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      learner_node_progress: {
        Row: {
          learner_user_id: string;
          course_id: string;
          module_id: string;
          node_id: string;
          completed_at: string;
          updated_at: string;
        };
        Insert: {
          learner_user_id: string;
          course_id: string;
          module_id: string;
          node_id: string;
          completed_at?: string;
          updated_at?: string;
        };
        Update: {
          learner_user_id?: string;
          course_id?: string;
          module_id?: string;
          node_id?: string;
          completed_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      learner_last_visited_nodes: {
        Row: {
          learner_user_id: string;
          course_id: string;
          module_id: string;
          node_id: string;
          visited_at: string;
          updated_at: string;
        };
        Insert: {
          learner_user_id: string;
          course_id: string;
          module_id: string;
          node_id: string;
          visited_at?: string;
          updated_at?: string;
        };
        Update: {
          learner_user_id?: string;
          course_id?: string;
          module_id?: string;
          node_id?: string;
          visited_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      node_bookmark_entries: {
        Row: {
          learner_user_id: string;
          course_id: string;
          module_id: string;
          node_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          learner_user_id: string;
          course_id: string;
          module_id: string;
          node_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          learner_user_id?: string;
          course_id?: string;
          module_id?: string;
          node_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          id: string;
          course_id: string;
          node_id: string;
          learner_user_id: string;
          score: number;
          max_score: number;
          answers: Json;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          node_id: string;
          learner_user_id: string;
          score: number;
          max_score: number;
          answers: Json;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          node_id?: string;
          learner_user_id?: string;
          score?: number;
          max_score?: number;
          answers?: Json;
          submitted_at?: string;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          id: number;
          currency: string;
          platform_fee_percent: number;
          platform_flat_fee_amount: number;
          minimum_withdrawal_amount: number;
          settlement_hold_days: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          currency?: string;
          platform_fee_percent?: number;
          platform_flat_fee_amount?: number;
          minimum_withdrawal_amount?: number;
          settlement_hold_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          currency?: string;
          platform_fee_percent?: number;
          platform_flat_fee_amount?: number;
          minimum_withdrawal_amount?: number;
          settlement_hold_days?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_purchases: {
        Row: {
          id: string;
          course_id: string;
          learner_user_id: string;
          creator_user_id: string;
          gross_amount: number;
          platform_fee_amount: number;
          creator_net_amount: number;
          currency: string;
          payment_status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
          payment_provider: string | null;
          provider_order_id: string | null;
          provider_payment_id: string | null;
          provider_signature: string | null;
          paid_at: string | null;
          access_starts_at: string | null;
          access_expires_at: string | null;
          purchased_access_days: number | null;
          pricing_plan_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          learner_user_id: string;
          creator_user_id: string;
          gross_amount: number;
          platform_fee_amount: number;
          creator_net_amount: number;
          currency?: string;
          payment_status?: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
          payment_provider?: string | null;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          provider_signature?: string | null;
          paid_at?: string | null;
          access_starts_at?: string | null;
          access_expires_at?: string | null;
          purchased_access_days?: number | null;
          pricing_plan_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          learner_user_id?: string;
          creator_user_id?: string;
          gross_amount?: number;
          platform_fee_amount?: number;
          creator_net_amount?: number;
          currency?: string;
          payment_status?: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
          payment_provider?: string | null;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          provider_signature?: string | null;
          paid_at?: string | null;
          access_starts_at?: string | null;
          access_expires_at?: string | null;
          purchased_access_days?: number | null;
          pricing_plan_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_pricing_plans: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          price_amount: number;
          access_days: number;
          position: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          price_amount: number;
          access_days: number;
          position: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          price_amount?: number;
          access_days?: number;
          position?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_entitlements: {
        Row: {
          id: string;
          course_id: string;
          learner_user_id: string;
          purchase_id: string;
          starts_at: string;
          expires_at: string;
          status: 'active' | 'expired' | 'revoked';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          learner_user_id: string;
          purchase_id: string;
          starts_at: string;
          expires_at: string;
          status?: 'active' | 'expired' | 'revoked';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          learner_user_id?: string;
          purchase_id?: string;
          starts_at?: string;
          expires_at?: string;
          status?: 'active' | 'expired' | 'revoked';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_certificate_templates: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          template_config: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          template_config?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          template_config?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      course_certificate_requirements: {
        Row: {
          id: string;
          template_id: string;
          requirement_type: string;
          requirement_value: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          requirement_type: string;
          requirement_value?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          requirement_type?: string;
          requirement_value?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      issued_certificates: {
        Row: {
          id: string;
          learner_user_id: string;
          course_id: string;
          template_id: string;
          certificate_code: string;
          issued_at: string;
          pdf_url: string | null;
          render_payload: Json;
        };
        Insert: {
          id?: string;
          learner_user_id: string;
          course_id: string;
          template_id: string;
          certificate_code: string;
          issued_at?: string;
          pdf_url?: string | null;
          render_payload?: Json;
        };
        Update: {
          id?: string;
          learner_user_id?: string;
          course_id?: string;
          template_id?: string;
          certificate_code?: string;
          issued_at?: string;
          pdf_url?: string | null;
          render_payload?: Json;
        };
        Relationships: [];
      };
      creator_balance_ledger: {
        Row: {
          id: string;
          creator_user_id: string;
          entry_type: string;
          amount: number;
          currency: string;
          reference_type: string;
          reference_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          creator_user_id: string;
          entry_type: string;
          amount: number;
          currency?: string;
          reference_type: string;
          reference_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          creator_user_id?: string;
          entry_type?: string;
          amount?: number;
          currency?: string;
          reference_type?: string;
          reference_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      creator_balance_summaries: {
        Row: {
          creator_user_id: string;
          currency: string;
          total_earned_amount: number;
          pending_settlement_amount: number;
          available_amount: number;
          withdrawn_amount: number;
          pending_withdrawal_amount: number;
          updated_at: string;
        };
        Insert: {
          creator_user_id: string;
          currency?: string;
          total_earned_amount?: number;
          pending_settlement_amount?: number;
          available_amount?: number;
          withdrawn_amount?: number;
          pending_withdrawal_amount?: number;
          updated_at?: string;
        };
        Update: {
          creator_user_id?: string;
          currency?: string;
          total_earned_amount?: number;
          pending_settlement_amount?: number;
          available_amount?: number;
          withdrawn_amount?: number;
          pending_withdrawal_amount?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      withdrawal_requests: {
        Row: {
          id: string;
          creator_user_id: string;
          amount: number;
          currency: string;
          payout_method_snapshot: string;
          status: 'pending' | 'approved' | 'rejected' | 'paid';
          requested_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          creator_user_id: string;
          amount: number;
          currency?: string;
          payout_method_snapshot: string;
          status?: 'pending' | 'approved' | 'rejected' | 'paid';
          requested_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          creator_user_id?: string;
          amount?: number;
          currency?: string;
          payout_method_snapshot?: string;
          status?: 'pending' | 'approved' | 'rejected' | 'paid';
          requested_at?: string;
          processed_at?: string | null;
        };
        Relationships: [];
      };
      node_discussion_threads: {
        Row: {
          id: string;
          course_id: string;
          node_id: string;
          creator_user_id: string;
          is_open: boolean;
          unresolved_count: number;
          last_activity_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          node_id: string;
          creator_user_id: string;
          is_open?: boolean;
          unresolved_count?: number;
          last_activity_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          node_id?: string;
          creator_user_id?: string;
          is_open?: boolean;
          unresolved_count?: number;
          last_activity_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      node_discussion_comments: {
        Row: {
          id: string;
          thread_id: string;
          course_id: string;
          node_id: string;
          author_user_id: string;
          parent_comment_id: string | null;
          root_comment_id: string;
          comment_tag: 'discussion' | 'doubt';
          body: string;
          depth: number;
          reply_count: number;
          like_count: number;
          is_edited: boolean;
          is_deleted: boolean;
          status: 'open' | 'resolved';
          resolved_by_user_id: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          course_id: string;
          node_id: string;
          author_user_id: string;
          parent_comment_id?: string | null;
          root_comment_id: string;
          comment_tag?: 'discussion' | 'doubt';
          body: string;
          depth?: number;
          reply_count?: number;
          like_count?: number;
          is_edited?: boolean;
          is_deleted?: boolean;
          status?: 'open' | 'resolved';
          resolved_by_user_id?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          course_id?: string;
          node_id?: string;
          author_user_id?: string;
          parent_comment_id?: string | null;
          root_comment_id?: string;
          comment_tag?: 'discussion' | 'doubt';
          body?: string;
          depth?: number;
          reply_count?: number;
          like_count?: number;
          is_edited?: boolean;
          is_deleted?: boolean;
          status?: 'open' | 'resolved';
          resolved_by_user_id?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      node_comment_likes: {
        Row: {
          comment_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          comment_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          comment_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      course_reviews: {
        Row: {
          id: string;
          course_id: string;
          reviewer_user_id: string;
          rating: number;
          review_text: string | null;
          is_edited: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          reviewer_user_id: string;
          rating: number;
          review_text?: string | null;
          is_edited?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          reviewer_user_id?: string;
          rating?: number;
          review_text?: string | null;
          is_edited?: boolean;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      creator_followers: {
        Row: {
          creator_user_id: string;
          follower_user_id: string;
          created_at: string;
        };
        Insert: {
          creator_user_id: string;
          follower_user_id: string;
          created_at?: string;
        };
        Update: {
          creator_user_id?: string;
          follower_user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      course_wishlist_entries: {
        Row: {
          course_id: string;
          learner_user_id: string;
          created_at: string;
        };
        Insert: {
          course_id: string;
          learner_user_id: string;
          created_at?: string;
        };
        Update: {
          course_id?: string;
          learner_user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      admin_messages: {
        Row: {
          id: string;
          sender_user_id: string;
          sender_role: 'learner' | 'creator';
          subject: string | null;
          message: string;
          message_type: string;
          target_user_id: string | null;
          status: string;
          reviewed_by_admin_user_id: string | null;
          reviewed_at: string | null;
          attachment_image_url: string | null;
          edited_at: string | null;
          is_deleted: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sender_user_id: string;
          sender_role: 'learner' | 'creator';
          subject?: string | null;
          message: string;
          message_type: string;
          target_user_id?: string | null;
          status?: string;
          reviewed_by_admin_user_id?: string | null;
          reviewed_at?: string | null;
          attachment_image_url?: string | null;
          edited_at?: string | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sender_user_id?: string;
          sender_role?: 'learner' | 'creator';
          subject?: string | null;
          message?: string;
          message_type?: string;
          target_user_id?: string | null;
          status?: string;
          reviewed_by_admin_user_id?: string | null;
          reviewed_at?: string | null;
          attachment_image_url?: string | null;
          edited_at?: string | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      admin_message_replies: {
        Row: {
          id: string;
          thread_id: string;
          sender_user_id: string;
          body: string;
          created_at: string;
          edited_at: string | null;
          is_deleted: boolean;
          attachment_image_url: string | null;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_user_id: string;
          body: string;
          created_at?: string;
          edited_at?: string | null;
          is_deleted?: boolean;
          attachment_image_url?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          thread_id?: string;
          sender_user_id?: string;
          body?: string;
          created_at?: string;
          edited_at?: string | null;
          is_deleted?: boolean;
          attachment_image_url?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      admin_message_thread_reads: {
        Row: {
          thread_id: string;
          user_id: string;
          last_read_at: string;
        };
        Insert: {
          thread_id: string;
          user_id: string;
          last_read_at?: string;
        };
        Update: {
          thread_id?: string;
          user_id?: string;
          last_read_at?: string;
        };
        Relationships: [];
      };
      admin_broadcasts: {
        Row: {
          id: string;
          title: string;
          body: string;
          image_url: string | null;
          cta_label: string | null;
          cta_href: string | null;
          audience: 'all' | 'learners' | 'creators' | 'admins';
          is_active: boolean;
          created_by_admin_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          image_url?: string | null;
          cta_label?: string | null;
          cta_href?: string | null;
          audience?: 'all' | 'learners' | 'creators' | 'admins';
          is_active?: boolean;
          created_by_admin_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          body?: string;
          image_url?: string | null;
          cta_label?: string | null;
          cta_href?: string | null;
          audience?: 'all' | 'learners' | 'creators' | 'admins';
          is_active?: boolean;
          created_by_admin_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_broadcast_reads: {
        Row: {
          broadcast_id: string;
          user_id: string;
          read_at: string;
        };
        Insert: {
          broadcast_id: string;
          user_id: string;
          read_at?: string;
        };
        Update: {
          broadcast_id?: string;
          user_id?: string;
          read_at?: string;
        };
        Relationships: [];
      };
      learner_feed_event_views: {
        Row: {
          learner_user_id: string;
          feed_event_id: string;
          seen_at: string;
        };
        Insert: {
          learner_user_id: string;
          feed_event_id: string;
          seen_at?: string;
        };
        Update: {
          learner_user_id?: string;
          feed_event_id?: string;
          seen_at?: string;
        };
        Relationships: [];
      };
      admin_intro_cards: {
        Row: {
          id: string;
          title: string;
          body: string;
          image_url: string | null;
          image_focus: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
          cta_label: string | null;
          cta_href: string | null;
          is_active: boolean;
          created_by_admin_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          body: string;
          image_url?: string | null;
          image_focus?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
          cta_label?: string | null;
          cta_href?: string | null;
          is_active?: boolean;
          created_by_admin_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          body?: string;
          image_url?: string | null;
          image_focus?: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
          cta_label?: string | null;
          cta_href?: string | null;
          is_active?: boolean;
          created_by_admin_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_moderation_actions: {
        Row: {
          id: string;
          admin_user_id: string;
          target_user_id: string;
          source_message_id: string | null;
          action_type: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_user_id: string;
          target_user_id: string;
          source_message_id?: string | null;
          action_type: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_user_id?: string;
          target_user_id?: string;
          source_message_id?: string | null;
          action_type?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      can_access_course_content: {
        Args: { target_course_id: string };
        Returns: boolean;
      };
      current_user_is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      current_user_is_banned: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      can_view_node_discussion: {
        Args: { target_node_id: string };
        Returns: boolean;
      };
      can_user_comment_on_node: {
        Args: {
          target_node_id: string;
          target_user_id: string;
        };
        Returns: boolean;
      };
      can_user_review_course: {
        Args: {
          target_course_id: string;
          target_user_id: string;
        };
        Returns: boolean;
      };
      refresh_creator_balance_summary: {
        Args: { target_creator_user_id: string };
        Returns: undefined;
      };
      refresh_node_discussion_thread_summary: {
        Args: { target_thread_id: string };
        Returns: undefined;
      };
      get_or_create_node_discussion_thread: {
        Args: { target_node_id: string };
        Returns: Database['public']['Tables']['node_discussion_threads']['Row'];
      };
      apply_node_comment_like_count: {
        Args: { target_comment_id: string };
        Returns: undefined;
      };
      list_creator_learner_doubts: {
        Args: { p_creator_user_id: string };
        Returns: {
          comment_id: string;
          thread_id: string;
          course_id: string;
          course_title: string;
          course_creator_user_id: string;
          node_id: string;
          node_title: string;
          node_type: string;
          learner_user_id: string;
          learner_name: string | null;
          parent_comment_id: string | null;
          status: string;
          is_deleted: boolean;
          comment_body: string;
          last_activity_at: string;
          created_at: string;
        }[];
      };
      finalize_premium_course_purchase: {
        Args: {
          p_purchase_id: string;
          p_provider_payment_id: string;
          p_provider_signature: string | null;
          p_paid_at: string;
        };
        Returns: {
          purchase_id: string;
          entitlement_id: string;
          purchase_kind: 'initial' | 'renewal';
        }[];
      };
      create_creator_withdrawal_request: {
        Args: {
          p_creator_user_id: string;
          p_amount: number;
          p_currency: string;
          p_payout_method_snapshot: string;
        };
        Returns: Database['public']['Tables']['withdrawal_requests']['Row'][];
      };
      update_withdrawal_request_status: {
        Args: {
          p_admin_user_id: string;
          p_withdrawal_request_id: string;
          p_status: 'paid' | 'rejected';
        };
        Returns: Database['public']['Tables']['withdrawal_requests']['Row'][];
      };
    };
    Enums: {
      user_role: 'learner' | 'creator';
      theme_mode: 'light' | 'dark' | 'ocean' | 'forest' | 'ember';
      course_status: 'draft' | 'published';
      node_type: 'content' | 'html' | 'question' | 'quiz' | 'video' | 'pdf' | 'github';
      withdrawal_status: 'pending' | 'approved' | 'rejected' | 'paid';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
