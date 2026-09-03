export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      abonados: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          id: string
          notes: string | null
          organization_id: string
          person_id: string
          since_date: string | null
          status: string
          subscriber_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          organization_id: string
          person_id: string
          since_date?: string | null
          status?: string
          subscriber_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          organization_id?: string
          person_id?: string
          since_date?: string | null
          status?: string
          subscriber_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abonados_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonados_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonados_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abonados_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      arrangement_installments: {
        Row: {
          amount: number
          arrangement_id: string
          created_at: string
          due_date: string
          id: string
          installment_no: number
          organization_id: string
          paid_amount: number
          paid_at: string | null
          payment_id: string | null
          status: string
        }
        Insert: {
          amount: number
          arrangement_id: string
          created_at?: string
          due_date: string
          id?: string
          installment_no: number
          organization_id: string
          paid_amount?: number
          paid_at?: string | null
          payment_id?: string | null
          status?: string
        }
        Update: {
          amount?: number
          arrangement_id?: string
          created_at?: string
          due_date?: string
          id?: string
          installment_no?: number
          organization_id?: string
          paid_amount?: number
          paid_at?: string | null
          payment_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrangement_installments_arrangement_id_fkey"
            columns: ["arrangement_id"]
            isOneToOne: false
            referencedRelation: "payment_arrangements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrangement_installments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrangement_installments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      arrangement_obligations: {
        Row: {
          arrangement_id: string
          obligation_id: string
          organization_id: string
          original_amount: number
        }
        Insert: {
          arrangement_id: string
          obligation_id: string
          organization_id: string
          original_amount: number
        }
        Update: {
          arrangement_id?: string
          obligation_id?: string
          organization_id?: string
          original_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "arrangement_obligations_arrangement_id_fkey"
            columns: ["arrangement_id"]
            isOneToOne: false
            referencedRelation: "payment_arrangements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrangement_obligations_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrangement_obligations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance_log: {
        Row: {
          asset_id: string
          condition_after: string | null
          cost: number
          created_at: string
          created_by: string
          description: string
          event_date: string
          event_type: string
          id: string
          maintenance_plan_id: string | null
          organization_id: string
          performed_by: string | null
          work_order_id: string | null
        }
        Insert: {
          asset_id: string
          condition_after?: string | null
          cost?: number
          created_at?: string
          created_by: string
          description: string
          event_date?: string
          event_type: string
          id?: string
          maintenance_plan_id?: string | null
          organization_id: string
          performed_by?: string | null
          work_order_id?: string | null
        }
        Update: {
          asset_id?: string
          condition_after?: string | null
          cost?: number
          created_at?: string
          created_by?: string
          description?: string
          event_date?: string
          event_type?: string
          id?: string
          maintenance_plan_id?: string | null
          organization_id?: string
          performed_by?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_log_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_log_maintenance_plan_id_fkey"
            columns: ["maintenance_plan_id"]
            isOneToOne: false
            referencedRelation: "maintenance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_maintenance_log_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          address: string | null
          asset_type: string
          code: string
          condition: string
          created_at: string
          created_by: string
          criticality: string
          expected_life_years: number | null
          id: string
          installed_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          organization_id: string
          photo_path: string | null
          replacement_cost: number
          sector: string | null
          serial_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          asset_type: string
          code: string
          condition?: string
          created_at?: string
          created_by: string
          criticality?: string
          expected_life_years?: number | null
          id?: string
          installed_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          organization_id: string
          photo_path?: string | null
          replacement_cost?: number
          sector?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          asset_type?: string
          code?: string
          condition?: string
          created_at?: string
          created_by?: string
          criticality?: string
          expected_life_years?: number | null
          id?: string
          installed_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          photo_path?: string | null
          replacement_cost?: number
          sector?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          new_data: Json | null
          old_data: Json | null
          organization_id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          organization_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_restore_sessions: {
        Row: {
          backup_run_id: string
          error_message: string | null
          finished_at: string | null
          id: string
          organization_id: string
          requested_by: string | null
          restored_files: number
          restored_format: string | null
          restored_rows: number
          started_at: string
          status: string
        }
        Insert: {
          backup_run_id: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          organization_id: string
          requested_by?: string | null
          restored_files?: number
          restored_format?: string | null
          restored_rows?: number
          started_at?: string
          status?: string
        }
        Update: {
          backup_run_id?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          organization_id?: string
          requested_by?: string | null
          restored_files?: number
          restored_format?: string | null
          restored_rows?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_restore_sessions_backup_run_id_fkey"
            columns: ["backup_run_id"]
            isOneToOne: false
            referencedRelation: "backup_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_restore_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_restore_sessions_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_runs: {
        Row: {
          checksum_sha256: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          organization_id: string
          pruned_at: string | null
          pruned_by: string | null
          restored_at: string | null
          restored_by: string | null
          retention_days: number
          size_bytes: number | null
          status: string
          storage_path: string | null
          table_counts: Json
        }
        Insert: {
          checksum_sha256?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          organization_id: string
          pruned_at?: string | null
          pruned_by?: string | null
          restored_at?: string | null
          restored_by?: string | null
          retention_days?: number
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          table_counts?: Json
        }
        Update: {
          checksum_sha256?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string
          pruned_at?: string | null
          pruned_by?: string | null
          restored_at?: string | null
          restored_by?: string | null
          retention_days?: number
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          table_counts?: Json
        }
        Relationships: [
          {
            foreignKeyName: "backup_runs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_runs_pruned_by_fkey"
            columns: ["pruned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backup_runs_restored_by_fkey"
            columns: ["restored_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_mask: string | null
          active: boolean
          currency: string
          id: string
          name: string
          opening_balance: number
          organization_id: string
        }
        Insert: {
          account_mask?: string | null
          active?: boolean
          currency?: string
          id?: string
          name: string
          opening_balance?: number
          organization_id: string
        }
        Update: {
          account_mask?: string | null
          active?: boolean
          currency?: string
          id?: string
          name?: string
          opening_balance?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statements: {
        Row: {
          bank_account_id: string
          closing_balance: number
          id: string
          imported: boolean
          opening_balance: number
          organization_id: string
          period_end: string
          period_start: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          bank_account_id: string
          closing_balance?: number
          id?: string
          imported?: boolean
          opening_balance?: number
          organization_id: string
          period_end: string
          period_start: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          bank_account_id?: string
          closing_balance?: number
          id?: string
          imported?: boolean
          opening_balance?: number
          organization_id?: string
          period_end?: string
          period_start?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          created_at: string
          description: string | null
          id: string
          linked_expense_id: string | null
          linked_payment_id: string | null
          organization_id: string
          recon_status: Database["public"]["Enums"]["recon_status"]
          reference: string | null
          statement_id: string | null
          txn_date: string
          txn_type: Database["public"]["Enums"]["bank_txn_type"]
        }
        Insert: {
          amount: number
          bank_account_id: string
          created_at?: string
          description?: string | null
          id?: string
          linked_expense_id?: string | null
          linked_payment_id?: string | null
          organization_id: string
          recon_status?: Database["public"]["Enums"]["recon_status"]
          reference?: string | null
          statement_id?: string | null
          txn_date: string
          txn_type: Database["public"]["Enums"]["bank_txn_type"]
        }
        Update: {
          amount?: number
          bank_account_id?: string
          created_at?: string
          description?: string | null
          id?: string
          linked_expense_id?: string | null
          linked_payment_id?: string | null
          organization_id?: string
          recon_status?: Database["public"]["Enums"]["recon_status"]
          reference?: string | null
          statement_id?: string | null
          txn_date?: string
          txn_type?: Database["public"]["Enums"]["bank_txn_type"]
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_linked_expense_id_fkey"
            columns: ["linked_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_linked_payment_id_fkey"
            columns: ["linked_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      benefit_definitions: {
        Row: {
          active: boolean
          applies_to_all_connections: boolean
          applies_to_annual_fee_only: boolean
          authority_basis: string | null
          code: string
          created_at: string
          created_by: string | null
          evidence_type: string
          excludes_late_fees: boolean
          id: string
          minimum_age: number | null
          name: string
          organization_id: string
          percentage: number
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          active?: boolean
          applies_to_all_connections?: boolean
          applies_to_annual_fee_only?: boolean
          authority_basis?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          evidence_type?: string
          excludes_late_fees?: boolean
          id?: string
          minimum_age?: number | null
          name: string
          organization_id: string
          percentage?: number
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          active?: boolean
          applies_to_all_connections?: boolean
          applies_to_annual_fee_only?: boolean
          authority_basis?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          evidence_type?: string
          excludes_late_fees?: boolean
          id?: string
          minimum_age?: number | null
          name?: string
          organization_id?: string
          percentage?: number
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "benefit_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benefit_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      board_members: {
        Row: {
          active: boolean
          board_id: string
          person_id: string
          position: Database["public"]["Enums"]["institutional_position"]
        }
        Insert: {
          active?: boolean
          board_id: string
          person_id: string
          position: Database["public"]["Enums"]["institutional_position"]
        }
        Update: {
          active?: boolean
          board_id?: string
          person_id?: string
          position?: Database["public"]["Enums"]["institutional_position"]
        }
        Relationships: [
          {
            foreignKeyName: "board_members_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      boards: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          organization_id: string
          period_end: string | null
          period_start: string | null
          term_label: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          organization_id: string
          period_end?: string | null
          period_start?: string | null
          term_label?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          period_end?: string | null
          period_start?: string | null
          term_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boards_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_categories: {
        Row: {
          active: boolean
          category_type: string
          code: string
          created_at: string
          id: string
          match_pattern: string | null
          name: string
          organization_id: string
        }
        Insert: {
          active?: boolean
          category_type: string
          code: string
          created_at?: string
          id?: string
          match_pattern?: string | null
          name: string
          organization_id: string
        }
        Update: {
          active?: boolean
          category_type?: string
          code?: string
          created_at?: string
          id?: string
          match_pattern?: string | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          budget_amount: number
          category_id: string
          created_by: string
          fiscal_period_id: string
          id: string
          notes: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          budget_amount: number
          category_id: string
          created_by: string
          fiscal_period_id: string
          id?: string
          notes?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          budget_amount?: number
          category_id?: string
          created_by?: string
          fiscal_period_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_fiscal_period_id_fkey"
            columns: ["fiscal_period_id"]
            isOneToOne: false
            referencedRelation: "fiscal_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          compliance_ref: string | null
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          event_kind: Database["public"]["Enums"]["calendar_event_kind"]
          id: string
          organization_id: string
          recurring: string | null
          responsible_person_id: string | null
          title: string
        }
        Insert: {
          compliance_ref?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          event_date: string
          event_kind?: Database["public"]["Enums"]["calendar_event_kind"]
          id?: string
          organization_id: string
          recurring?: string | null
          responsible_person_id?: string | null
          title: string
        }
        Update: {
          compliance_ref?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          event_date?: string
          event_kind?: Database["public"]["Enums"]["calendar_event_kind"]
          id?: string
          organization_id?: string
          recurring?: string | null
          responsible_person_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_responsible_person_id_fkey"
            columns: ["responsible_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          cash_session_id: string
          created_at: string
          created_by: string | null
          id: number
          linked_source_id: string | null
          linked_source_type: string | null
          movement_type: string
          organization_id: string
          reference: string | null
        }
        Insert: {
          amount: number
          cash_session_id: string
          created_at?: string
          created_by?: string | null
          id?: never
          linked_source_id?: string | null
          linked_source_type?: string | null
          movement_type: string
          organization_id: string
          reference?: string | null
        }
        Update: {
          amount?: number
          cash_session_id?: string
          created_at?: string
          created_by?: string | null
          id?: never
          linked_source_id?: string | null
          linked_source_type?: string | null
          movement_type?: string
          organization_id?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          counted_amount: number | null
          difference: number | null
          expected_amount: number | null
          id: string
          location: string | null
          notes: string | null
          opened_at: string
          opening_amount: number
          organization_id: string
          status: Database["public"]["Enums"]["cash_session_status"]
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          counted_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          organization_id: string
          status?: Database["public"]["Enums"]["cash_session_status"]
          user_id: string
        }
        Update: {
          closed_at?: string | null
          counted_amount?: number | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          opened_at?: string
          opening_amount?: number
          organization_id?: string
          status?: Database["public"]["Enums"]["cash_session_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chlorination_logs: {
        Row: {
          chlorine_dose: number | null
          created_at: string
          id: string
          notes: string | null
          operator_id: string | null
          organization_id: string
          point: Database["public"]["Enums"]["chlorination_point"]
          recorded_at: string
          residual_chlorine: number
          source_id: string | null
        }
        Insert: {
          chlorine_dose?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          operator_id?: string | null
          organization_id: string
          point?: Database["public"]["Enums"]["chlorination_point"]
          recorded_at?: string
          residual_chlorine: number
          source_id?: string | null
        }
        Update: {
          chlorine_dose?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          operator_id?: string | null
          organization_id?: string
          point?: Database["public"]["Enums"]["chlorination_point"]
          recorded_at?: string
          residual_chlorine?: number
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chlorination_logs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chlorination_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chlorination_logs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "water_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_members: {
        Row: {
          active: boolean
          committee_id: string
          person_id: string
          role: string | null
        }
        Insert: {
          active?: boolean
          committee_id: string
          person_id: string
          role?: string | null
        }
        Update: {
          active?: boolean
          committee_id?: string
          person_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "committee_members_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      committees: {
        Row: {
          active: boolean
          committee_type: Database["public"]["Enums"]["committee_type"]
          created_at: string
          id: string
          name: string
          organization_id: string
          purpose: string | null
        }
        Insert: {
          active?: boolean
          committee_type?: Database["public"]["Enums"]["committee_type"]
          created_at?: string
          id?: string
          name: string
          organization_id: string
          purpose?: string | null
        }
        Update: {
          active?: boolean
          committee_type?: Database["public"]["Enums"]["committee_type"]
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          purpose?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "committees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_messages: {
        Row: {
          body_preview: string | null
          channel: string
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          organization_id: string
          provider_message_id: string | null
          recipient: string
          related_payment_id: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          body_preview?: string | null
          channel: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          organization_id: string
          provider_message_id?: string | null
          recipient: string
          related_payment_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body_preview?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          organization_id?: string
          provider_message_id?: string | null
          recipient?: string
          related_payment_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_messages_related_payment_id_fkey"
            columns: ["related_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_obligations: {
        Row: {
          code: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          evidence: string | null
          frequency: string | null
          id: string
          organization_id: string
          regulation_source: string
          regulation_version: string | null
          requires_validation: boolean
          status: Database["public"]["Enums"]["compliance_status"]
          title: string
        }
        Insert: {
          code: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          evidence?: string | null
          frequency?: string | null
          id?: string
          organization_id: string
          regulation_source: string
          regulation_version?: string | null
          requires_validation?: boolean
          status?: Database["public"]["Enums"]["compliance_status"]
          title: string
        }
        Update: {
          code?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          evidence?: string | null
          frequency?: string | null
          id?: string
          organization_id?: string
          regulation_source?: string
          regulation_version?: string | null
          requires_validation?: boolean
          status?: Database["public"]["Enums"]["compliance_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_obligations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_obligations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consumption_tariff_blocks: {
        Row: {
          block_order: number
          from_volume: number
          id: string
          organization_id: string
          scheme_id: string
          to_volume: number | null
          unit_price: number
        }
        Insert: {
          block_order: number
          from_volume: number
          id?: string
          organization_id: string
          scheme_id: string
          to_volume?: number | null
          unit_price: number
        }
        Update: {
          block_order?: number
          from_volume?: number
          id?: string
          organization_id?: string
          scheme_id?: string
          to_volume?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "consumption_tariff_blocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumption_tariff_blocks_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "consumption_tariff_schemes"
            referencedColumns: ["id"]
          },
        ]
      }
      consumption_tariff_schemes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          effective_from: string
          effective_to: string | null
          fixed_charge: number
          id: string
          name: string
          notes: string | null
          organization_id: string
          service_type: string | null
          status: string
          tariff_definition_id: string
          tariff_version_id: string
          version_number: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          effective_from: string
          effective_to?: string | null
          fixed_charge?: number
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          service_type?: string | null
          status?: string
          tariff_definition_id: string
          tariff_version_id: string
          version_number: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          effective_from?: string
          effective_to?: string | null
          fixed_charge?: number
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          service_type?: string | null
          status?: string
          tariff_definition_id?: string
          tariff_version_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "consumption_tariff_schemes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumption_tariff_schemes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumption_tariff_schemes_tariff_definition_id_fkey"
            columns: ["tariff_definition_id"]
            isOneToOne: false
            referencedRelation: "tariff_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumption_tariff_schemes_tariff_version_id_fkey"
            columns: ["tariff_version_id"]
            isOneToOne: false
            referencedRelation: "tariff_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      data_import_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          error_message: string | null
          error_rows: number
          file_name: string
          file_size: number
          file_type: string | null
          id: string
          imported_rows: number
          kind: Database["public"]["Enums"]["data_import_kind"]
          mapping: Json
          organization_id: string
          skipped_rows: number
          source_sha256: string | null
          status: Database["public"]["Enums"]["data_import_status"]
          total_rows: number
          valid_rows: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          error_rows?: number
          file_name: string
          file_size?: number
          file_type?: string | null
          id?: string
          imported_rows?: number
          kind: Database["public"]["Enums"]["data_import_kind"]
          mapping?: Json
          organization_id: string
          skipped_rows?: number
          source_sha256?: string | null
          status?: Database["public"]["Enums"]["data_import_status"]
          total_rows?: number
          valid_rows?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          error_rows?: number
          file_name?: string
          file_size?: number
          file_type?: string | null
          id?: string
          imported_rows?: number
          kind?: Database["public"]["Enums"]["data_import_kind"]
          mapping?: Json
          organization_id?: string
          skipped_rows?: number
          source_sha256?: string | null
          status?: Database["public"]["Enums"]["data_import_status"]
          total_rows?: number
          valid_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "data_import_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_import_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      data_import_rows: {
        Row: {
          batch_id: string
          created_at: string
          error_codes: string[]
          id: string
          message: string | null
          normalized_data: Json
          organization_id: string
          raw_data: Json
          result_entity_id: string | null
          row_number: number
          status: Database["public"]["Enums"]["import_row_status"]
          updated_at: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          error_codes?: string[]
          id?: string
          message?: string | null
          normalized_data?: Json
          organization_id: string
          raw_data: Json
          result_entity_id?: string | null
          row_number: number
          status?: Database["public"]["Enums"]["import_row_status"]
          updated_at?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          error_codes?: string[]
          id?: string
          message?: string | null
          normalized_data?: Json
          organization_id?: string
          raw_data?: Json
          result_entity_id?: string | null
          row_number?: number
          status?: Database["public"]["Enums"]["import_row_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_import_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "data_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_import_rows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_override_events: {
        Row: {
          authorized_by: string
          created_at: string
          id: string
          operation: Database["public"]["Enums"]["debt_operation"]
          organization_id: string
          reason: string
          subscriber_id: string
        }
        Insert: {
          authorized_by: string
          created_at?: string
          id?: string
          operation: Database["public"]["Enums"]["debt_operation"]
          organization_id: string
          reason: string
          subscriber_id: string
        }
        Update: {
          authorized_by?: string
          created_at?: string
          id?: string
          operation?: Database["public"]["Enums"]["debt_operation"]
          organization_id?: string
          reason?: string
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_override_events_authorized_by_fkey"
            columns: ["authorized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_override_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_override_events_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      document_artifacts: {
        Row: {
          artifact_type: string
          checksum_sha256: string | null
          created_at: string
          document_version: string | null
          financial_document_id: string
          generated_at: string | null
          generated_by: string | null
          id: string
          mime_type: string | null
          organization_id: string
          size_bytes: number | null
          status: string
          storage_path: string | null
          was_replacement: boolean
        }
        Insert: {
          artifact_type?: string
          checksum_sha256?: string | null
          created_at?: string
          document_version?: string | null
          financial_document_id: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          mime_type?: string | null
          organization_id: string
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          was_replacement?: boolean
        }
        Update: {
          artifact_type?: string
          checksum_sha256?: string | null
          created_at?: string
          document_version?: string | null
          financial_document_id?: string
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          was_replacement?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "document_artifacts_financial_document_id_fkey"
            columns: ["financial_document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_artifacts_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_artifacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_sequences: {
        Row: {
          current_value: number
          organization_id: string
          sequence_key: string
          sequence_year: number
        }
        Insert: {
          current_value?: number
          organization_id: string
          sequence_key: string
          sequence_year: number
        }
        Update: {
          current_value?: number
          organization_id?: string
          sequence_key?: string
          sequence_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_template_versions: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          change_reason: string | null
          configuration: Json
          created_at: string
          created_by: string
          document_type: string
          id: string
          name: string
          organization_id: string
          status: string
          version_number: number
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          change_reason?: string | null
          configuration?: Json
          created_at?: string
          created_by: string
          document_type: string
          id?: string
          name: string
          organization_id: string
          status?: string
          version_number: number
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          change_reason?: string | null
          configuration?: Json
          created_at?: string
          created_by?: string
          document_type?: string
          id?: string
          name?: string
          organization_id?: string
          status?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_template_versions_activated_by_fkey"
            columns: ["activated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_template_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_template_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_reviews: {
        Row: {
          clarification: string
          created_at: string
          decision: string
          existing_subscriber_id: string
          id: string
          new_subscriber_id: string
          organization_id: string
          reviewed_by: string
          similarity_score: number
        }
        Insert: {
          clarification: string
          created_at?: string
          decision: string
          existing_subscriber_id: string
          id?: string
          new_subscriber_id: string
          organization_id: string
          reviewed_by: string
          similarity_score: number
        }
        Update: {
          clarification?: string
          created_at?: string
          decision?: string
          existing_subscriber_id?: string
          id?: string
          new_subscriber_id?: string
          organization_id?: string
          reviewed_by?: string
          similarity_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "duplicate_reviews_existing_subscriber_id_fkey"
            columns: ["existing_subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_reviews_new_subscriber_id_fkey"
            columns: ["new_subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duplicate_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          category: string
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          description: string
          id: string
          idempotency_key: string | null
          invoice_number: string | null
          invoice_path: string | null
          organization_id: string
          paid_from: string | null
          reason: string
          requested_by: string
          status: Database["public"]["Enums"]["expense_status"]
          supplier: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          category: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          description: string
          id?: string
          idempotency_key?: string | null
          invoice_number?: string | null
          invoice_path?: string | null
          organization_id: string
          paid_from?: string | null
          reason: string
          requested_by: string
          status?: Database["public"]["Enums"]["expense_status"]
          supplier?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          description?: string
          id?: string
          idempotency_key?: string | null
          invoice_number?: string | null
          invoice_path?: string | null
          organization_id?: string
          paid_from?: string | null
          reason?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["expense_status"]
          supplier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      field_readings: {
        Row: {
          anomaly_code: string | null
          batch_id: string | null
          captured_at: string
          connection_id: string
          consumption: number | null
          created_at: string
          current_reading: number
          gps_accuracy_m: number | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          notes: string | null
          offline_id: string | null
          organization_id: string
          photo_bucket: string | null
          photo_url: string | null
          previous_reading: number
          reading_number: string
          status: Database["public"]["Enums"]["field_reading_status"]
          synced_at: string | null
          technician_id: string
          validated_at: string | null
        }
        Insert: {
          anomaly_code?: string | null
          batch_id?: string | null
          captured_at?: string
          connection_id: string
          consumption?: number | null
          created_at?: string
          current_reading: number
          gps_accuracy_m?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          notes?: string | null
          offline_id?: string | null
          organization_id: string
          photo_bucket?: string | null
          photo_url?: string | null
          previous_reading?: number
          reading_number: string
          status?: Database["public"]["Enums"]["field_reading_status"]
          synced_at?: string | null
          technician_id: string
          validated_at?: string | null
        }
        Update: {
          anomaly_code?: string | null
          batch_id?: string | null
          captured_at?: string
          connection_id?: string
          consumption?: number | null
          created_at?: string
          current_reading?: number
          gps_accuracy_m?: number | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          notes?: string | null
          offline_id?: string | null
          organization_id?: string
          photo_bucket?: string | null
          photo_url?: string | null
          previous_reading?: number
          reading_number?: string
          status?: Database["public"]["Enums"]["field_reading_status"]
          synced_at?: string | null
          technician_id?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_readings_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "meter_reading_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_readings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "water_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_readings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_readings_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_documents: {
        Row: {
          base_amount: number
          calculation_snapshot: Json
          connection_id: string | null
          created_at: string
          currency: string
          discount_amount: number
          document_number: string
          document_type: string
          due_date: string | null
          fiscal_year: number | null
          id: string
          late_fee_amount: number
          obligation_id: string | null
          organization_id: string
          payment_id: string | null
          posted_at: string
          posted_by: string | null
          posting_date: string
          reversal_of_document_id: string | null
          status: string
          subscriber_id: string | null
          template_snapshot: Json
          total_amount: number
          void_reason: string | null
        }
        Insert: {
          base_amount?: number
          calculation_snapshot?: Json
          connection_id?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          document_number: string
          document_type: string
          due_date?: string | null
          fiscal_year?: number | null
          id?: string
          late_fee_amount?: number
          obligation_id?: string | null
          organization_id: string
          payment_id?: string | null
          posted_at?: string
          posted_by?: string | null
          posting_date?: string
          reversal_of_document_id?: string | null
          status?: string
          subscriber_id?: string | null
          template_snapshot?: Json
          total_amount?: number
          void_reason?: string | null
        }
        Update: {
          base_amount?: number
          calculation_snapshot?: Json
          connection_id?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          document_number?: string
          document_type?: string
          due_date?: string | null
          fiscal_year?: number | null
          id?: string
          late_fee_amount?: number
          obligation_id?: string | null
          organization_id?: string
          payment_id?: string | null
          posted_at?: string
          posted_by?: string | null
          posting_date?: string
          reversal_of_document_id?: string | null
          status?: string
          subscriber_id?: string | null
          template_snapshot?: Json
          total_amount?: number
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_documents_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "water_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_reversal_of_document_id_fkey"
            columns: ["reversal_of_document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_periods: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          fiscal_year: number
          id: string
          notes: string | null
          opening_bank: number
          opening_cash: number
          organization_id: string
          reserve_target: number
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          fiscal_year: number
          id?: string
          notes?: string | null
          opening_bank?: number
          opening_cash?: number
          organization_id: string
          reserve_target?: number
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          fiscal_year?: number
          id?: string
          notes?: string | null
          opening_bank?: number
          opening_cash?: number
          organization_id?: string
          reserve_target?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_periods_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_periods_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fiscal_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          category: Database["public"]["Enums"]["incident_category"]
          connection_id: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          incident_number: string
          organization_id: string
          priority: string
          reported_at: string
          reporter_name: string | null
          reporter_phone: string | null
          resolved_at: string | null
          status: string
          subscriber_id: string | null
          title: string
          work_order_id: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["incident_category"]
          connection_id?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          incident_number: string
          organization_id: string
          priority?: string
          reported_at?: string
          reporter_name?: string | null
          reporter_phone?: string | null
          resolved_at?: string | null
          status?: string
          subscriber_id?: string | null
          title: string
          work_order_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["incident_category"]
          connection_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          incident_number?: string
          organization_id?: string
          priority?: string
          reported_at?: string
          reporter_name?: string | null
          reporter_phone?: string | null
          resolved_at?: string | null
          status?: string
          subscriber_id?: string | null
          title?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "water_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_reports: {
        Row: {
          created_at: string
          created_by: string
          id: string
          organization_id: string
          published: boolean
          published_at: string | null
          report_kind: Database["public"]["Enums"]["report_doc_kind"]
          storage_path: string | null
          title: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          published?: boolean
          published_at?: string | null
          report_kind?: Database["public"]["Enums"]["report_doc_kind"]
          storage_path?: string | null
          title: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          published?: boolean
          published_at?: string | null
          report_kind?: Database["public"]["Enums"]["report_doc_kind"]
          storage_path?: string | null
          title?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "institutional_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutional_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_runs: {
        Row: {
          actor_id: string | null
          completed_at: string | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          id: string
          integration_key: string
          operation: string
          organization_id: string
          request_summary: Json
          response_summary: Json
          started_at: string
          status: string
        }
        Insert: {
          actor_id?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          integration_key: string
          operation: string
          organization_id: string
          request_summary?: Json
          response_summary?: Json
          started_at?: string
          status: string
        }
        Update: {
          actor_id?: string | null
          completed_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          integration_key?: string
          operation?: string
          organization_id?: string
          request_summary?: Json
          response_summary?: Json
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_runs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          enabled: boolean
          id: string
          key: string
          last_checked_at: string | null
          last_error: string | null
          organization_id: string
          public_config: Json
          secret_configured: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          id?: string
          key: string
          last_checked_at?: string | null
          last_error?: string | null
          organization_id: string
          public_config?: Json
          secret_configured?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          id?: string
          key?: string
          last_checked_at?: string | null
          last_error?: string | null
          organization_id?: string
          public_config?: Json
          secret_configured?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integrations_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string
          id: string
          minimum_stock: number
          name: string
          organization_id: string
          quantity: number
          unit: string
          unit_cost: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by: string
          id?: string
          minimum_stock?: number
          name: string
          organization_id: string
          quantity?: number
          unit: string
          unit_cost?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          minimum_stock?: number
          name?: string
          organization_id?: string
          quantity?: number
          unit?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string
          id: string
          item_id: string
          movement_type: string
          organization_id: string
          quantity: number
          reason: string
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
          warehouse_id: string | null
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          item_id: string
          movement_type: string
          organization_id: string
          quantity: number
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          item_id?: string
          movement_type?: string
          organization_id?: string
          quantity?: number
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_warehouse: {
        Row: {
          item_id: string
          min_stock: number
          organization_id: string
          quantity: number
          warehouse_id: string
        }
        Insert: {
          item_id: string
          min_stock?: number
          organization_id: string
          quantity?: number
          warehouse_id: string
        }
        Update: {
          item_id?: string
          min_stock?: number
          organization_id?: string
          quantity?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_warehouse_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_warehouse_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      late_fee_policies: {
        Row: {
          applies_from: string | null
          applies_to: string | null
          code: string
          created_at: string
          created_by: string | null
          fixed_amount: number | null
          formula_type: string | null
          grace_days: number
          id: string
          name: string
          organization_id: string
          percentage: number | null
          period_days: number | null
          status: string
          updated_at: string
        }
        Insert: {
          applies_from?: string | null
          applies_to?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          fixed_amount?: number | null
          formula_type?: string | null
          grace_days?: number
          id?: string
          name?: string
          organization_id: string
          percentage?: number | null
          period_days?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          applies_from?: string | null
          applies_to?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          fixed_amount?: number | null
          formula_type?: string | null
          grace_days?: number
          id?: string
          name?: string
          organization_id?: string
          percentage?: number | null
          period_days?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "late_fee_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "late_fee_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account: string
          amount: number
          created_by: string
          description: string
          entry_date: string
          entry_type: string
          id: string
          organization_id: string
          source_id: string
          source_type: string
        }
        Insert: {
          account: string
          amount: number
          created_by: string
          description: string
          entry_date?: string
          entry_type: string
          id?: string
          organization_id: string
          source_id: string
          source_type: string
        }
        Update: {
          account?: string
          amount?: number
          created_by?: string
          description?: string
          entry_date?: string
          entry_type?: string
          id?: string
          organization_id?: string
          source_id?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempt_cooldowns: {
        Row: {
          blocked_until: string | null
          email_hash: string
          failed_attempts: number
          first_failed_at: string | null
          last_failed_at: string | null
        }
        Insert: {
          blocked_until?: string | null
          email_hash: string
          failed_attempts?: number
          first_failed_at?: string | null
          last_failed_at?: string | null
        }
        Update: {
          blocked_until?: string | null
          email_hash?: string
          failed_attempts?: number
          first_failed_at?: string | null
          last_failed_at?: string | null
        }
        Relationships: []
      }
      maintenance_plans: {
        Row: {
          active: boolean
          asset_id: string
          checklist: string | null
          created_at: string
          created_by: string
          estimated_cost: number
          frequency_days: number
          id: string
          name: string
          next_due_date: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          asset_id: string
          checklist?: string | null
          created_at?: string
          created_by: string
          estimated_cost?: number
          frequency_days: number
          id?: string
          name: string
          next_due_date: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          asset_id?: string
          checklist?: string | null
          created_at?: string
          created_by?: string
          estimated_cost?: number
          frequency_days?: number
          id?: string
          name?: string
          next_due_date?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_plans_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendees: {
        Row: {
          meeting_id: string
          person_id: string
          present: boolean
        }
        Insert: {
          meeting_id: string
          person_id: string
          present?: boolean
        }
        Update: {
          meeting_id?: string
          person_id?: string
          present?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendees_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendees_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          board_id: string | null
          created_at: string
          created_by: string
          id: string
          organization_id: string
          place: string | null
          quorum_reached: boolean | null
          reunion_type: Database["public"]["Enums"]["reunion_type"]
          scheduled_at: string
          status: Database["public"]["Enums"]["reunion_status"]
          title: string
        }
        Insert: {
          board_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          organization_id: string
          place?: string | null
          quorum_reached?: boolean | null
          reunion_type?: Database["public"]["Enums"]["reunion_type"]
          scheduled_at: string
          status?: Database["public"]["Enums"]["reunion_status"]
          title: string
        }
        Update: {
          board_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          organization_id?: string
          place?: string | null
          quorum_reached?: boolean | null
          reunion_type?: Database["public"]["Enums"]["reunion_type"]
          scheduled_at?: string
          status?: Database["public"]["Enums"]["reunion_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "boards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      meter_reading_batches: {
        Row: {
          created_at: string
          created_by: string
          due_date: string
          error_readings: number
          id: string
          notes: string | null
          organization_id: string
          period_key: string
          posted_at: string | null
          posted_by: string | null
          posted_readings: number
          reading_date: string
          scheme_id: string
          status: Database["public"]["Enums"]["reading_batch_status"]
          total_readings: number
          warning_readings: number
        }
        Insert: {
          created_at?: string
          created_by: string
          due_date: string
          error_readings?: number
          id?: string
          notes?: string | null
          organization_id: string
          period_key: string
          posted_at?: string | null
          posted_by?: string | null
          posted_readings?: number
          reading_date: string
          scheme_id: string
          status?: Database["public"]["Enums"]["reading_batch_status"]
          total_readings?: number
          warning_readings?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          due_date?: string
          error_readings?: number
          id?: string
          notes?: string | null
          organization_id?: string
          period_key?: string
          posted_at?: string | null
          posted_by?: string | null
          posted_readings?: number
          reading_date?: string
          scheme_id?: string
          status?: Database["public"]["Enums"]["reading_batch_status"]
          total_readings?: number
          warning_readings?: number
        }
        Relationships: [
          {
            foreignKeyName: "meter_reading_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_reading_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_reading_batches_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_reading_batches_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "consumption_tariff_schemes"
            referencedColumns: ["id"]
          },
        ]
      }
      meter_readings: {
        Row: {
          anomaly_code: string | null
          batch_id: string
          connection_id: string
          consumption: number
          created_at: string
          created_by: string
          current_reading: number
          id: string
          notes: string | null
          obligation_id: string | null
          organization_id: string
          previous_reading: number
          status: Database["public"]["Enums"]["meter_reading_status"]
          updated_at: string
        }
        Insert: {
          anomaly_code?: string | null
          batch_id: string
          connection_id: string
          consumption: number
          created_at?: string
          created_by: string
          current_reading: number
          id?: string
          notes?: string | null
          obligation_id?: string | null
          organization_id: string
          previous_reading: number
          status: Database["public"]["Enums"]["meter_reading_status"]
          updated_at?: string
        }
        Update: {
          anomaly_code?: string | null
          batch_id?: string
          connection_id?: string
          consumption?: number
          created_at?: string
          created_by?: string
          current_reading?: number
          id?: string
          notes?: string | null
          obligation_id?: string | null
          organization_id?: string
          previous_reading?: number
          status?: Database["public"]["Enums"]["meter_reading_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meter_readings_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "meter_reading_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "water_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meter_readings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      minutes: {
        Row: {
          acta_status: Database["public"]["Enums"]["acta_status"]
          approved_at: string | null
          approved_by: string | null
          content: string
          created_at: string
          created_by: string
          id: string
          meeting_id: string
          organization_id: string
          updated_at: string
          version: number
        }
        Insert: {
          acta_status?: Database["public"]["Enums"]["acta_status"]
          approved_at?: string | null
          approved_by?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          meeting_id: string
          organization_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          acta_status?: Database["public"]["Enums"]["acta_status"]
          approved_at?: string | null
          approved_by?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          meeting_id?: string
          organization_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "minutes_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      obligations: {
        Row: {
          adjustment_amount: number
          base_amount: number | null
          calculation_snapshot: Json
          cancellation_reason: string | null
          cancelled_at: string | null
          connection_id: string | null
          created_at: string
          created_by: string
          description: string
          discount_amount: number
          due_date: string
          id: string
          issue_date: string
          late_fee_amount: number
          late_fee_pending: boolean
          organization_id: string
          original_amount: number
          paid_amount: number
          period_key: string
          source: Database["public"]["Enums"]["obligation_source"]
          subscriber_id: string
          tariff_definition_id: string
          tariff_version_id: string
        }
        Insert: {
          adjustment_amount?: number
          base_amount?: number | null
          calculation_snapshot?: Json
          cancellation_reason?: string | null
          cancelled_at?: string | null
          connection_id?: string | null
          created_at?: string
          created_by: string
          description: string
          discount_amount?: number
          due_date: string
          id?: string
          issue_date?: string
          late_fee_amount?: number
          late_fee_pending?: boolean
          organization_id: string
          original_amount: number
          paid_amount?: number
          period_key: string
          source: Database["public"]["Enums"]["obligation_source"]
          subscriber_id: string
          tariff_definition_id: string
          tariff_version_id: string
        }
        Update: {
          adjustment_amount?: number
          base_amount?: number | null
          calculation_snapshot?: Json
          cancellation_reason?: string | null
          cancelled_at?: string | null
          connection_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          discount_amount?: number
          due_date?: string
          id?: string
          issue_date?: string
          late_fee_amount?: number
          late_fee_pending?: boolean
          organization_id?: string
          original_amount?: number
          paid_amount?: number
          period_key?: string
          source?: Database["public"]["Enums"]["obligation_source"]
          subscriber_id?: string
          tariff_definition_id?: string
          tariff_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obligations_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "water_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_tariff_definition_id_fkey"
            columns: ["tariff_definition_id"]
            isOneToOne: false
            referencedRelation: "tariff_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligations_tariff_version_id_fkey"
            columns: ["tariff_version_id"]
            isOneToOne: false
            referencedRelation: "tariff_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_extractions: {
        Row: {
          confidence: number | null
          created_at: string
          created_by: string | null
          document_kind: string
          extracted_data: Json
          id: string
          organization_id: string
          raw_text: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          storage_bucket: string
          storage_path: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          document_kind: string
          extracted_data?: Json
          id?: string
          organization_id: string
          raw_text?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_bucket: string
          storage_path: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          document_kind?: string
          extracted_data?: Json
          id?: string
          organization_id?: string
          raw_text?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          storage_bucket?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocr_extractions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_extractions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_extractions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_sequences: {
        Row: {
          last_subscriber_number: number
          organization_id: string
        }
        Insert: {
          last_subscriber_number?: number
          organization_id: string
        }
        Update: {
          last_subscriber_number?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_sequences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          email: string | null
          id: string
          logo_path: string | null
          name: string
          phone: string | null
          receipt_footer: string | null
          receipt_signatory_name: string | null
          receipt_signatory_title: string | null
          receipt_template_version: string
          rtn: string | null
          signature_path: string | null
          stamp_path: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          logo_path?: string | null
          name: string
          phone?: string | null
          receipt_footer?: string | null
          receipt_signatory_name?: string | null
          receipt_signatory_title?: string | null
          receipt_template_version?: string
          rtn?: string | null
          signature_path?: string | null
          stamp_path?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          logo_path?: string | null
          name?: string
          phone?: string | null
          receipt_footer?: string | null
          receipt_signatory_name?: string | null
          receipt_signatory_title?: string | null
          receipt_template_version?: string
          rtn?: string | null
          signature_path?: string | null
          stamp_path?: string | null
        }
        Relationships: []
      }
      payment_allocations: {
        Row: {
          amount: number
          obligation_id: string
          payment_id: string
          refunded_amount: number
        }
        Insert: {
          amount: number
          obligation_id: string
          payment_id: string
          refunded_amount?: number
        }
        Update: {
          amount?: number
          obligation_id?: string
          payment_id?: string
          refunded_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_obligation_id_fkey"
            columns: ["obligation_id"]
            isOneToOne: false
            referencedRelation: "obligations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_arrangements: {
        Row: {
          abonado_id: string | null
          approved_by: string
          code: string
          created_at: string
          created_by: string
          first_due_date: string
          frequency: Database["public"]["Enums"]["frequency_enum"]
          id: string
          installment_amount: number
          notes: string | null
          num_installments: number
          organization_id: string
          status: Database["public"]["Enums"]["arrangement_status"]
          subscriber_id: string
          total_debt: number
          updated_at: string
        }
        Insert: {
          abonado_id?: string | null
          approved_by: string
          code: string
          created_at?: string
          created_by: string
          first_due_date: string
          frequency?: Database["public"]["Enums"]["frequency_enum"]
          id?: string
          installment_amount: number
          notes?: string | null
          num_installments: number
          organization_id: string
          status?: Database["public"]["Enums"]["arrangement_status"]
          subscriber_id: string
          total_debt: number
          updated_at?: string
        }
        Update: {
          abonado_id?: string | null
          approved_by?: string
          code?: string
          created_at?: string
          created_by?: string
          first_due_date?: string
          frequency?: Database["public"]["Enums"]["frequency_enum"]
          id?: string
          installment_amount?: number
          notes?: string | null
          num_installments?: number
          organization_id?: string
          status?: Database["public"]["Enums"]["arrangement_status"]
          subscriber_id?: string
          total_debt?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_arrangements_abonado_id_fkey"
            columns: ["abonado_id"]
            isOneToOne: false
            referencedRelation: "abonados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_arrangements_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_arrangements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_arrangements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_arrangements_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_components: {
        Row: {
          amount: number
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          payment_id: string
          reference: string | null
          refunded_amount: number
        }
        Insert: {
          amount: number
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          payment_id: string
          reference?: string | null
          refunded_amount?: number
        }
        Update: {
          amount?: number
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          payment_id?: string
          reference?: string | null
          refunded_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_components_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          amount: number | null
          cash_amount: number
          created_at: string
          created_by: string
          event_type: string
          id: string
          organization_id: string
          payment_id: string
          reason: string
        }
        Insert: {
          amount?: number | null
          cash_amount?: number
          created_at?: string
          created_by: string
          event_type: string
          id?: string
          organization_id: string
          payment_id: string
          reason: string
        }
        Update: {
          amount?: number | null
          cash_amount?: number
          created_at?: string
          created_by?: string
          event_type?: string
          id?: string
          organization_id?: string
          payment_id?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          cash_session_id: string | null
          change_amount: number | null
          created_at: string
          created_by: string
          id: string
          idempotency_key: string | null
          method: Database["public"]["Enums"]["payment_method"]
          organization_id: string
          receipt_brand_snapshot: Json | null
          receipt_number: string
          receipt_path: string | null
          received_amount: number
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscriber_id: string
          total: number
          verification_token: string
        }
        Insert: {
          cash_session_id?: string | null
          change_amount?: number | null
          created_at?: string
          created_by: string
          id?: string
          idempotency_key?: string | null
          method: Database["public"]["Enums"]["payment_method"]
          organization_id: string
          receipt_brand_snapshot?: Json | null
          receipt_number: string
          receipt_path?: string | null
          received_amount: number
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscriber_id: string
          total: number
          verification_token?: string
        }
        Update: {
          cash_session_id?: string | null
          change_amount?: number | null
          created_at?: string
          created_by?: string
          id?: string
          idempotency_key?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          organization_id?: string
          receipt_brand_snapshot?: Json | null
          receipt_number?: string
          receipt_path?: string | null
          received_amount?: number
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscriber_id?: string
          total?: number
          verification_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description: string
        }
        Insert: {
          code: string
          description: string
        }
        Update: {
          code?: string
          description?: string
        }
        Relationships: []
      }
      persons: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string
          created_by: string
          document_number: string | null
          document_type:
            | Database["public"]["Enums"]["identity_document_type"]
            | null
          email: string | null
          full_name: string
          gender: Database["public"]["Enums"]["person_gender"] | null
          id: string
          issuing_country: string | null
          kind: string
          normalized_document: string | null
          normalized_name: string
          notes: string | null
          organization_id: string
          phone: string | null
          sector: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          created_by: string
          document_number?: string | null
          document_type?:
            | Database["public"]["Enums"]["identity_document_type"]
            | null
          email?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["person_gender"] | null
          id?: string
          issuing_country?: string | null
          kind?: string
          normalized_document?: string | null
          normalized_name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          sector?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          created_by?: string
          document_number?: string | null
          document_type?:
            | Database["public"]["Enums"]["identity_document_type"]
            | null
          email?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["person_gender"] | null
          id?: string
          issuing_country?: string | null
          kind?: string
          normalized_document?: string | null
          normalized_name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          sector?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "persons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "persons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_update_requests: {
        Row: {
          created_at: string
          field_name: string
          id: string
          ip_address: unknown
          new_value: string | null
          old_value: string | null
          organization_id: string
          source: string
          status: string
          subscriber_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: string
          ip_address?: unknown
          new_value?: string | null
          old_value?: string | null
          organization_id: string
          source?: string
          status?: string
          subscriber_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: string
          ip_address?: unknown
          new_value?: string | null
          old_value?: string | null
          organization_id?: string
          source?: string
          status?: string
          subscriber_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_update_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_update_requests_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      position_terms: {
        Row: {
          created_at: string
          elected_by: string | null
          id: string
          notes: string | null
          organization_id: string
          person_id: string
          position: Database["public"]["Enums"]["institutional_position"]
          status: Database["public"]["Enums"]["position_period_status"]
          term_end: string
          term_start: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          elected_by?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          person_id: string
          position: Database["public"]["Enums"]["institutional_position"]
          status?: Database["public"]["Enums"]["position_period_status"]
          term_end: string
          term_start: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          elected_by?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          person_id?: string
          position?: Database["public"]["Enums"]["institutional_position"]
          status?: Database["public"]["Enums"]["position_period_status"]
          term_end?: string
          term_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "position_terms_elected_by_fkey"
            columns: ["elected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_terms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "position_terms_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          organization_id: string | null
          status: string
          updated_at: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          organization_id?: string | null
          status?: string
          updated_at?: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          organization_id?: string | null
          status?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number
          code: string
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          funding: Database["public"]["Enums"]["project_funding"]
          id: string
          location_id: string | null
          name: string
          organization_id: string
          resolution_id: string | null
          responsible_person_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          budget?: number
          code: string
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          funding?: Database["public"]["Enums"]["project_funding"]
          id?: string
          location_id?: string | null
          name: string
          organization_id: string
          resolution_id?: string | null
          responsible_person_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          budget?: number
          code?: string
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          funding?: Database["public"]["Enums"]["project_funding"]
          id?: string
          location_id?: string | null
          name?: string
          organization_id?: string
          resolution_id?: string | null
          responsible_person_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "service_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_resolution_id_fkey"
            columns: ["resolution_id"]
            isOneToOne: false
            referencedRelation: "resolutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_responsible_person_id_fkey"
            columns: ["responsible_person_id"]
            isOneToOne: false
            referencedRelation: "persons"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          created_at: string
          description: string
          id: string
          inventory_item_id: string | null
          organization_id: string
          purchase_order_id: string
          quantity: number
          received_quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          inventory_item_id?: string | null
          organization_id: string
          purchase_order_id: string
          quantity: number
          received_quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          inventory_item_id?: string | null
          organization_id?: string
          purchase_order_id?: string
          quantity?: number
          received_quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expected_date: string | null
          id: string
          order_date: string
          organization_id: string
          paid_amount: number
          requisition_id: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expected_date?: string | null
          id?: string
          order_date?: string
          organization_id: string
          paid_amount?: number
          requisition_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expected_date?: string | null
          id?: string
          order_date?: string
          organization_id?: string
          paid_amount?: number
          requisition_id?: string | null
          status?: Database["public"]["Enums"]["purchase_status"]
          supplier_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requisition_lines: {
        Row: {
          category: string | null
          created_at: string
          description: string
          id: string
          organization_id: string
          quantity: number
          requisition_id: string
          unit: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description: string
          id?: string
          organization_id: string
          quantity: number
          requisition_id: string
          unit?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          organization_id?: string
          quantity?: number
          requisition_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requisition_lines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisition_lines_requisition_id_fkey"
            columns: ["requisition_id"]
            isOneToOne: false
            referencedRelation: "purchase_requisitions"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requisitions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          code: string
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          reason: string
          requestor_id: string
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          code: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          reason: string
          requestor_id: string
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          code?: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          reason?: string
          requestor_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requisitions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requisitions_requestor_id_fkey"
            columns: ["requestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rationalization_schedules: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          organization_id: string
          rational_type: Database["public"]["Enums"]["rational_type"]
          starts_at: string
          status: Database["public"]["Enums"]["rational_status"]
          title: string
          zones: string[] | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          organization_id: string
          rational_type?: Database["public"]["Enums"]["rational_type"]
          starts_at: string
          status?: Database["public"]["Enums"]["rational_status"]
          title: string
          zones?: string[] | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          organization_id?: string
          rational_type?: Database["public"]["Enums"]["rational_type"]
          starts_at?: string
          status?: Database["public"]["Enums"]["rational_status"]
          title?: string
          zones?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "rationalization_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rationalization_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resolutions: {
        Row: {
          approved_at: string | null
          content: string
          created_at: string
          created_by: string
          effective_date: string | null
          id: string
          meeting_id: string | null
          number: string
          organization_id: string
          requires_validation: boolean
          resolution_type: Database["public"]["Enums"]["resolution_type"]
          source_regulation: string | null
          status: Database["public"]["Enums"]["resolution_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          approved_at?: string | null
          content: string
          created_at?: string
          created_by: string
          effective_date?: string | null
          id?: string
          meeting_id?: string | null
          number: string
          organization_id: string
          requires_validation?: boolean
          resolution_type?: Database["public"]["Enums"]["resolution_type"]
          source_regulation?: string | null
          status?: Database["public"]["Enums"]["resolution_status"]
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          approved_at?: string | null
          content?: string
          created_at?: string
          created_by?: string
          effective_date?: string | null
          id?: string
          meeting_id?: string | null
          number?: string
          organization_id?: string
          requires_validation?: boolean
          resolution_type?: Database["public"]["Enums"]["resolution_type"]
          source_regulation?: string | null
          status?: Database["public"]["Enums"]["resolution_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "resolutions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolutions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resolutions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_code: string
          role_id: string
        }
        Insert: {
          permission_code: string
          role_id: string
        }
        Update: {
          permission_code?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          code: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          code?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          active: boolean
          calculation_type: string
          category: string
          code: string
          created_at: string
          created_by: string | null
          default_amount: number
          description: string | null
          discount_eligible: boolean
          generates_obligation: boolean
          id: string
          name: string
          organization_id: string
          requires_approval: boolean
          requires_evidence: boolean
          unit: string
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          active?: boolean
          calculation_type?: string
          category: string
          code: string
          created_at?: string
          created_by?: string | null
          default_amount?: number
          description?: string | null
          discount_eligible?: boolean
          generates_obligation?: boolean
          id?: string
          name: string
          organization_id: string
          requires_approval?: boolean
          requires_evidence?: boolean
          unit?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          active?: boolean
          calculation_type?: string
          category?: string
          code?: string
          created_at?: string
          created_by?: string | null
          default_amount?: number
          description?: string | null
          discount_eligible?: boolean
          generates_obligation?: boolean
          id?: string
          name?: string
          organization_id?: string
          requires_approval?: boolean
          requires_evidence?: boolean
          unit?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_catalog_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_contracts: {
        Row: {
          abonado_id: string
          connection_id: string | null
          contract_type: Database["public"]["Enums"]["contract_type"]
          created_at: string
          created_by: string
          end_date: string | null
          id: string
          location_id: string | null
          notes: string | null
          organization_id: string
          start_date: string
          status: Database["public"]["Enums"]["contract_status"]
          tariff_definition_id: string | null
          updated_at: string
        }
        Insert: {
          abonado_id: string
          connection_id?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by: string
          end_date?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id: string
          start_date: string
          status?: Database["public"]["Enums"]["contract_status"]
          tariff_definition_id?: string | null
          updated_at?: string
        }
        Update: {
          abonado_id?: string
          connection_id?: string | null
          contract_type?: Database["public"]["Enums"]["contract_type"]
          created_at?: string
          created_by?: string
          end_date?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["contract_status"]
          tariff_definition_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_contracts_abonado_id_fkey"
            columns: ["abonado_id"]
            isOneToOne: false
            referencedRelation: "abonados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "water_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "service_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_contracts_tariff_definition_id_fkey"
            columns: ["tariff_definition_id"]
            isOneToOne: false
            referencedRelation: "tariff_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_locations: {
        Row: {
          address: string
          cadastral_ref: string | null
          code: string
          created_at: string
          created_by: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          organization_id: string
          property_type: Database["public"]["Enums"]["property_type"]
          sector: string
        }
        Insert: {
          address: string
          cadastral_ref?: string | null
          code: string
          created_at?: string
          created_by: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          organization_id: string
          property_type?: Database["public"]["Enums"]["property_type"]
          sector: string
        }
        Update: {
          address?: string
          cadastral_ref?: string | null
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          organization_id?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          sector?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          abonado_id: string | null
          assigned_to: string | null
          channel: Database["public"]["Enums"]["request_channel"]
          code: string
          connection_id: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          organization_id: string
          priority: string
          request_type: Database["public"]["Enums"]["request_type"]
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          subject: string
          subscriber_id: string | null
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          abonado_id?: string | null
          assigned_to?: string | null
          channel?: Database["public"]["Enums"]["request_channel"]
          code: string
          connection_id?: string | null
          created_at?: string
          created_by: string
          description: string
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: string
          request_type?: Database["public"]["Enums"]["request_type"]
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          subject: string
          subscriber_id?: string | null
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          abonado_id?: string | null
          assigned_to?: string | null
          channel?: Database["public"]["Enums"]["request_channel"]
          code?: string
          connection_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: string
          request_type?: Database["public"]["Enums"]["request_type"]
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          subject?: string
          subscriber_id?: string | null
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_abonado_id_fkey"
            columns: ["abonado_id"]
            isOneToOne: false
            referencedRelation: "abonados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "water_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_benefits: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          benefit_definition_id: string
          created_at: string
          detected_automatically: boolean
          evidence_identity_id: string | null
          id: string
          notes: string | null
          organization_id: string
          status: string
          subscriber_id: string
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          benefit_definition_id: string
          created_at?: string
          detected_automatically?: boolean
          evidence_identity_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          status?: string
          subscriber_id: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          benefit_definition_id?: string
          created_at?: string
          detected_automatically?: boolean
          evidence_identity_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          status?: string
          subscriber_id?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_benefits_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_benefits_benefit_definition_id_fkey"
            columns: ["benefit_definition_id"]
            isOneToOne: false
            referencedRelation: "benefit_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_benefits_evidence_identity_id_fkey"
            columns: ["evidence_identity_id"]
            isOneToOne: false
            referencedRelation: "subscriber_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_benefits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_benefits_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_connection_sequences: {
        Row: {
          last_connection_number: number
          subscriber_id: string
        }
        Insert: {
          last_connection_number?: number
          subscriber_id: string
        }
        Update: {
          last_connection_number?: number
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_connection_sequences_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: true
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_identities: {
        Row: {
          created_at: string
          created_by: string
          document_number: string
          document_type: Database["public"]["Enums"]["identity_document_type"]
          id: string
          is_primary: boolean
          issuing_country: string
          normalized_number: string
          organization_id: string
          storage_path: string | null
          subscriber_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          document_number: string
          document_type: Database["public"]["Enums"]["identity_document_type"]
          id?: string
          is_primary?: boolean
          issuing_country: string
          normalized_number: string
          organization_id: string
          storage_path?: string | null
          subscriber_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          document_number?: string
          document_type?: Database["public"]["Enums"]["identity_document_type"]
          id?: string
          is_primary?: boolean
          issuing_country?: string
          normalized_number?: string
          organization_id?: string
          storage_path?: string | null
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_identities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_identities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_identities_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriber_portal_accounts: {
        Row: {
          created_at: string
          failed_login_count: number
          id: string
          identity_verified_at: string | null
          invited_at: string
          invited_by: string | null
          last_access_at: string | null
          locked_until: string | null
          must_change_password: boolean
          organization_id: string
          password_changed_at: string | null
          status: string
          subscriber_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          failed_login_count?: number
          id?: string
          identity_verified_at?: string | null
          invited_at?: string
          invited_by?: string | null
          last_access_at?: string | null
          locked_until?: string | null
          must_change_password?: boolean
          organization_id: string
          password_changed_at?: string | null
          status?: string
          subscriber_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          failed_login_count?: number
          id?: string
          identity_verified_at?: string | null
          invited_at?: string
          invited_by?: string | null
          last_access_at?: string | null
          locked_until?: string | null
          must_change_password?: boolean
          organization_id?: string
          password_changed_at?: string | null
          status?: string
          subscriber_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_portal_accounts_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_portal_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriber_portal_accounts_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: true
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          address: string
          birth_date: string | null
          code: string
          created_at: string
          created_by: string
          email: string | null
          full_name: string
          id: string
          normalized_name: string
          notes: string | null
          organization_id: string
          photo_path: string | null
          portal_enabled: boolean
          portal_last_access_at: string | null
          portal_profile_updated_at: string | null
          sector: string
          status: Database["public"]["Enums"]["subscriber_status"]
          updated_at: string
          whatsapp: string
        }
        Insert: {
          address: string
          birth_date?: string | null
          code: string
          created_at?: string
          created_by: string
          email?: string | null
          full_name: string
          id?: string
          normalized_name: string
          notes?: string | null
          organization_id: string
          photo_path?: string | null
          portal_enabled?: boolean
          portal_last_access_at?: string | null
          portal_profile_updated_at?: string | null
          sector: string
          status?: Database["public"]["Enums"]["subscriber_status"]
          updated_at?: string
          whatsapp: string
        }
        Update: {
          address?: string
          birth_date?: string | null
          code?: string
          created_at?: string
          created_by?: string
          email?: string | null
          full_name?: string
          id?: string
          normalized_name?: string
          notes?: string | null
          organization_id?: string
          photo_path?: string | null
          portal_enabled?: boolean
          portal_last_access_at?: string | null
          portal_profile_updated_at?: string | null
          sector?: string
          status?: Database["public"]["Enums"]["subscriber_status"]
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscribers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          active: boolean
          id: string
          name: string
          organization_id: string
          phone: string | null
          tax_id: string | null
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          tax_id?: string | null
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          tax_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_checks: {
        Row: {
          check_key: string
          checked_at: string
          checked_by: string | null
          details: Json
          id: string
          organization_id: string
          status: string
        }
        Insert: {
          check_key: string
          checked_at?: string
          checked_by?: string | null
          details?: Json
          id?: string
          organization_id: string
          status: string
        }
        Update: {
          check_key?: string
          checked_at?: string
          checked_by?: string | null
          details?: Json
          id?: string
          organization_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_health_checks_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_health_checks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_update_state: {
        Row: {
          checked_at: string
          checked_by: string | null
          current_version: string
          details: Json
          error_message: string | null
          latest_version: string | null
          organization_id: string
          published_at: string | null
          release_name: string | null
          release_notes: string | null
          release_url: string | null
          status: string
          update_available: boolean
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          current_version: string
          details?: Json
          error_message?: string | null
          latest_version?: string | null
          organization_id: string
          published_at?: string | null
          release_name?: string | null
          release_notes?: string | null
          release_url?: string | null
          status: string
          update_available?: boolean
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          current_version?: string
          details?: Json
          error_message?: string | null
          latest_version?: string | null
          organization_id?: string
          published_at?: string | null
          release_name?: string | null
          release_notes?: string | null
          release_url?: string | null
          status?: string
          update_available?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "system_update_state_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_update_state_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tariff_definitions: {
        Row: {
          applies_to_service: string | null
          category: Database["public"]["Enums"]["tariff_category"]
          code: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_annual: boolean
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["tariff_status"]
          updated_at: string
        }
        Insert: {
          applies_to_service?: string | null
          category: Database["public"]["Enums"]["tariff_category"]
          code: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_annual?: boolean
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["tariff_status"]
          updated_at?: string
        }
        Update: {
          applies_to_service?: string | null
          category?: Database["public"]["Enums"]["tariff_category"]
          code?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_annual?: boolean
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["tariff_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tariff_definitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tariff_versions: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          notes: string | null
          organization_id: string
          tariff_definition_id: string
          valid_from: string
          valid_to: string | null
          version_number: number
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          organization_id: string
          tariff_definition_id: string
          valid_from: string
          valid_to?: string | null
          version_number: number
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          organization_id?: string
          tariff_definition_id?: string
          valid_from?: string
          valid_to?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "tariff_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tariff_versions_tariff_definition_id_fkey"
            columns: ["tariff_definition_id"]
            isOneToOne: false
            referencedRelation: "tariff_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          role_id: string
          user_id: string
        }
        Insert: {
          role_id: string
          user_id: string
        }
        Update: {
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          active: boolean
          address: string | null
          code: string
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          code: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          active?: boolean
          address?: string | null
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      water_connections: {
        Row: {
          address: string
          code: string
          created_at: string
          created_by: string
          id: string
          installation_date: string | null
          latitude: number | null
          longitude: number | null
          meter_number: string | null
          normalized_meter: string | null
          notes: string | null
          organization_id: string
          sector: string
          service_type: string
          status: Database["public"]["Enums"]["connection_status"]
          subscriber_id: string
        }
        Insert: {
          address: string
          code: string
          created_at?: string
          created_by: string
          id?: string
          installation_date?: string | null
          latitude?: number | null
          longitude?: number | null
          meter_number?: string | null
          normalized_meter?: string | null
          notes?: string | null
          organization_id: string
          sector: string
          service_type: string
          status?: Database["public"]["Enums"]["connection_status"]
          subscriber_id: string
        }
        Update: {
          address?: string
          code?: string
          created_at?: string
          created_by?: string
          id?: string
          installation_date?: string | null
          latitude?: number | null
          longitude?: number | null
          meter_number?: string | null
          normalized_meter?: string | null
          notes?: string | null
          organization_id?: string
          sector?: string
          service_type?: string
          status?: Database["public"]["Enums"]["connection_status"]
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "water_connections_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_connections_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      water_sample_parameters: {
        Row: {
          compliant: boolean | null
          created_at: string
          id: string
          limit_max: number | null
          limit_min: number | null
          organization_id: string
          parameter: string
          result: number | null
          sample_id: string
          unit: string | null
        }
        Insert: {
          compliant?: boolean | null
          created_at?: string
          id?: string
          limit_max?: number | null
          limit_min?: number | null
          organization_id: string
          parameter: string
          result?: number | null
          sample_id: string
          unit?: string | null
        }
        Update: {
          compliant?: boolean | null
          created_at?: string
          id?: string
          limit_max?: number | null
          limit_min?: number | null
          organization_id?: string
          parameter?: string
          result?: number | null
          sample_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "water_sample_parameters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_sample_parameters_sample_id_fkey"
            columns: ["sample_id"]
            isOneToOne: false
            referencedRelation: "water_samples"
            referencedColumns: ["id"]
          },
        ]
      }
      water_samples: {
        Row: {
          chlorine_residual: number | null
          code: string
          collected_by: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          ph: number | null
          sample_date: string
          source_id: string | null
          status: Database["public"]["Enums"]["sample_status"]
          temperature: number | null
          turbidity: number | null
        }
        Insert: {
          chlorine_residual?: number | null
          code: string
          collected_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          ph?: number | null
          sample_date?: string
          source_id?: string | null
          status?: Database["public"]["Enums"]["sample_status"]
          temperature?: number | null
          turbidity?: number | null
        }
        Update: {
          chlorine_residual?: number | null
          code?: string
          collected_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          ph?: number | null
          sample_date?: string
          source_id?: string | null
          status?: Database["public"]["Enums"]["sample_status"]
          temperature?: number | null
          turbidity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "water_samples_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_samples_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_samples_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "water_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      water_sources: {
        Row: {
          code: string
          created_at: string
          created_by: string
          estimated_flow: number | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          microcuenca_id: string | null
          name: string
          organization_id: string
          source_type: Database["public"]["Enums"]["source_type"]
          status: Database["public"]["Enums"]["source_status"]
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          estimated_flow?: number | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          microcuenca_id?: string | null
          name: string
          organization_id: string
          source_type: Database["public"]["Enums"]["source_type"]
          status?: Database["public"]["Enums"]["source_status"]
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          estimated_flow?: number | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          microcuenca_id?: string | null
          name?: string
          organization_id?: string
          source_type?: Database["public"]["Enums"]["source_type"]
          status?: Database["public"]["Enums"]["source_status"]
        }
        Relationships: [
          {
            foreignKeyName: "water_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_sources_microcuenca_fk"
            columns: ["microcuenca_id"]
            isOneToOne: false
            referencedRelation: "watersheds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "water_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      watersheds: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          protection_status: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          protection_status?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          protection_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "watersheds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          actual_cost: number
          asset_id: string | null
          assigned_to: string | null
          completed_at: string | null
          connection_id: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          estimated_cost: number
          id: string
          maintenance_plan_id: string | null
          notes: string | null
          order_number: string
          organization_id: string
          priority: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          subscriber_id: string | null
          type: string
        }
        Insert: {
          actual_cost?: number
          asset_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          connection_id?: string | null
          created_at?: string
          created_by: string
          description: string
          due_date?: string | null
          estimated_cost?: number
          id?: string
          maintenance_plan_id?: string | null
          notes?: string | null
          order_number: string
          organization_id: string
          priority?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          subscriber_id?: string | null
          type: string
        }
        Update: {
          actual_cost?: number
          asset_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          connection_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          estimated_cost?: number
          id?: string
          maintenance_plan_id?: string | null
          notes?: string | null
          order_number?: string
          organization_id?: string
          priority?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          subscriber_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "water_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_maintenance_plan_id_fkey"
            columns: ["maintenance_plan_id"]
            isOneToOne: false
            referencedRelation: "maintenance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_document_template: {
        Args: { p_template_id: string }
        Returns: Json
      }
      age_on_date: {
        Args: { p_birth_date: string; p_reference?: string }
        Returns: number
      }
      approve_budget: { Args: { p_fiscal_year: number }; Returns: Json }
      approve_expense: {
        Args: { p_decision: string; p_expense_id: string; p_notes?: string }
        Returns: Json
      }
      assert_org_scope: {
        Args: { p_entity_id: string; p_table: string }
        Returns: undefined
      }
      assign_service_request: {
        Args: { p_assigned_to: string; p_request_id: string }
        Returns: Json
      }
      attach_identity_document: {
        Args: { p_storage_path: string; p_subscriber_id: string }
        Returns: undefined
      }
      attach_payment_receipt: {
        Args: { p_payment_id: string; p_storage_path: string }
        Returns: undefined
      }
      attach_payment_receipt_v2: {
        Args: {
          p_brand_snapshot: Json
          p_payment_id: string
          p_storage_path: string
        }
        Returns: undefined
      }
      attach_subscriber_photo: {
        Args: { p_storage_path: string; p_subscriber_id: string }
        Returns: undefined
      }
      authorize_debt_override: {
        Args: {
          p_operation: Database["public"]["Enums"]["debt_operation"]
          p_reason: string
          p_subscriber_id: string
        }
        Returns: string
      }
      bootstrap_organization: {
        Args: { p_full_name: string; p_name: string; p_username: string }
        Returns: string
      }
      calculate_annual_charge: {
        Args: {
          p_subscriber_id: string
          p_unit_amount?: number
          p_year: number
        }
        Returns: Json
      }
      calculate_consumption_charge: {
        Args: { p_consumption: number; p_scheme_id: string }
        Returns: number
      }
      capture_field_reading: { Args: { p_payload: Json }; Returns: Json }
      check_debt_operation: {
        Args: {
          p_operation: Database["public"]["Enums"]["debt_operation"]
          p_subscriber_id: string
        }
        Returns: Json
      }
      check_subscriber_duplicates: {
        Args: {
          p_document_number: string
          p_document_type: string
          p_full_name: string
          p_issuing_country: string
          p_sector?: string
          p_whatsapp?: string
        }
        Returns: {
          exact_document: boolean
          full_name: string
          masked_document: string
          match_level: string
          score: number
          subscriber_code: string
          subscriber_id: string
        }[]
      }
      close_cash_session: {
        Args: {
          p_counted_amount: number
          p_notes?: string
          p_session_id: string
        }
        Returns: Json
      }
      complete_document_artifact: {
        Args: {
          p_artifact_id: string
          p_checksum: string
          p_document_version?: string
          p_mime_type?: string
          p_storage_path: string
        }
        Returns: Json
      }
      complete_import_batch: {
        Args: { p_batch_id: string; p_error_message?: string }
        Returns: Json
      }
      confirm_expense: {
        Args: {
          p_expense_id: string
          p_invoice_number: string
          p_invoice_path: string
          p_paid_from: string
        }
        Returns: Json
      }
      create_abonado: {
        Args: {
          p_category?: string
          p_notes?: string
          p_person_id: string
          p_since_date?: string
          p_subscriber_id?: string
        }
        Returns: string
      }
      create_asset: { Args: { p_payload: Json }; Returns: Json }
      create_calendar_event: {
        Args: {
          p_compliance_ref?: string
          p_description?: string
          p_event_date: string
          p_event_kind?: string
          p_title: string
        }
        Returns: string
      }
      create_committee: {
        Args: { p_name: string; p_purpose?: string; p_type?: string }
        Returns: string
      }
      create_expense_request: { Args: { p_payload: Json }; Returns: Json }
      create_import_batch: { Args: { p_payload: Json }; Returns: Json }
      create_incident: { Args: { p_payload: Json }; Returns: Json }
      create_inventory_item: { Args: { p_payload: Json }; Returns: Json }
      create_maintenance_plan: { Args: { p_payload: Json }; Returns: Json }
      create_manual_obligation: {
        Args: {
          p_connection_id: string
          p_description?: string
          p_due_date: string
          p_subscriber_id: string
          p_tariff_definition_id: string
        }
        Returns: string
      }
      create_meeting: {
        Args: {
          p_board_id?: string
          p_place?: string
          p_reunion_type: string
          p_scheduled_at: string
          p_title: string
        }
        Returns: string
      }
      create_meter_reading_batch: { Args: { p_payload: Json }; Returns: Json }
      create_payment_arrangement: {
        Args: {
          p_first_due_date: string
          p_frequency: string
          p_installment_amount: number
          p_notes?: string
          p_obligation_ids: string[]
          p_subscriber_id: string
          p_total_debt: number
        }
        Returns: string
      }
      create_person: {
        Args: {
          p_address?: string
          p_birth_date?: string
          p_document_number: string
          p_document_type: string
          p_email?: string
          p_full_name: string
          p_issuing_country?: string
          p_kind?: string
          p_phone?: string
          p_sector?: string
          p_whatsapp?: string
        }
        Returns: string
      }
      create_project: {
        Args: {
          p_budget?: number
          p_code: string
          p_description?: string
          p_funding?: string
          p_name: string
          p_resolution_id?: string
        }
        Returns: string
      }
      create_purchase_order: {
        Args: {
          p_expected_date?: string
          p_lines: Json
          p_requisition_id?: string
          p_supplier_id: string
        }
        Returns: string
      }
      create_rationalization: {
        Args: {
          p_description?: string
          p_ends_at?: string
          p_rational_type: string
          p_starts_at: string
          p_title: string
          p_zones?: string[]
        }
        Returns: string
      }
      create_resolution: {
        Args: {
          p_content: string
          p_effective_date: string
          p_meeting_id?: string
          p_number: string
          p_resolution_type: string
          p_source_regulation?: string
          p_title: string
        }
        Returns: string
      }
      create_service_request: { Args: { p_payload: Json }; Returns: string }
      create_subscriber: {
        Args: {
          p_homonym_note?: string
          p_matched_subscriber_id?: string
          p_payload: Json
        }
        Returns: string
      }
      create_tariff: { Args: { p_payload: Json }; Returns: string }
      create_tariff_version: {
        Args: { p_definition_id: string; p_payload: Json }
        Returns: string
      }
      create_warehouse: {
        Args: { p_address?: string; p_code: string; p_name: string }
        Returns: string
      }
      create_water_connection: {
        Args: { p_payload: Json; p_subscriber_id: string }
        Returns: string
      }
      create_work_order: { Args: { p_payload: Json }; Returns: Json }
      current_organization_id: { Args: never; Returns: string }
      discard_bank_transaction: {
        Args: { p_transaction_id: string }
        Returns: Json
      }
      evaluate_benefit_eligibility: {
        Args: {
          p_benefit_code: string
          p_reference_date?: string
          p_subscriber_id: string
        }
        Returns: Json
      }
      fail_document_artifact: {
        Args: { p_artifact_id: string; p_reason?: string }
        Returns: undefined
      }
      generate_annual_obligations: {
        Args: {
          p_due_date: string
          p_tariff_definition_id: string
          p_year: number
        }
        Returns: Json
      }
      generate_preventive_work_orders: {
        Args: { p_through_date?: string }
        Returns: Json
      }
      get_abonado_360: { Args: { p_abonado_id: string }; Returns: Json }
      get_active_cash_session: { Args: never; Returns: Json }
      get_active_document_template: {
        Args: { p_document_type: string }
        Returns: Json
      }
      get_arrangement_detail: {
        Args: { p_arrangement_id: string }
        Returns: Json
      }
      get_backup_restore_sessions: {
        Args: { p_limit?: number }
        Returns: {
          backup_run_id: string
          error_message: string
          finished_at: string
          id: string
          restored_files: number
          restored_format: string
          restored_rows: number
          started_at: string
          status: string
        }[]
      }
      get_bank_account_balance: {
        Args: { p_bank_account_id: string }
        Returns: Json
      }
      get_board_members: { Args: never; Returns: Json }
      get_budget_dashboard: { Args: { p_fiscal_year: number }; Returns: Json }
      get_field_reading: { Args: { p_id: string }; Returns: Json }
      get_financial_dashboard: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      get_governance_summary: { Args: never; Returns: Json }
      get_incident: { Args: { p_id: string }; Returns: Json }
      get_inventory_with_warehouses: { Args: never; Returns: Json }
      get_late_fee_policy: { Args: never; Returns: Json }
      get_login_cooldown_seconds: { Args: { p_email: string }; Returns: number }
      get_my_authorization: { Args: never; Returns: Json }
      get_my_portal_account_state: { Args: never; Returns: Json }
      get_my_subscriber_card: { Args: never; Returns: Json }
      get_organization_settings: { Args: never; Returns: Json }
      get_payment_receipt_data: {
        Args: { p_payment_id: string }
        Returns: Json
      }
      get_role_dashboard: { Args: never; Returns: Json }
      get_subscriber_account: {
        Args: { p_subscriber_id: string }
        Returns: Json
      }
      get_subscriber_detail: {
        Args: { p_subscriber_id: string }
        Returns: Json
      }
      get_subscriber_digital_card: {
        Args: { p_subscriber_id: string }
        Returns: Json
      }
      get_system_readiness: { Args: never; Returns: Json }
      get_transparency_report: { Args: { p_year: number }; Returns: Json }
      get_transparency_report_v5: { Args: { p_year: number }; Returns: Json }
      get_update_state: { Args: never; Returns: Json }
      global_search: {
        Args: { p_limit?: number; p_query: string }
        Returns: Json[]
      }
      has_permission: { Args: { p_code: string }; Returns: boolean }
      import_bank_statement: {
        Args: {
          p_bank_account_id: string
          p_closing: number
          p_opening: number
          p_period_end: string
          p_period_start: string
          p_transactions: Json
        }
        Returns: string
      }
      import_subscriber_with_connection: {
        Args: { p_connection?: Json; p_subscriber: Json }
        Returns: Json
      }
      link_bank_transaction: {
        Args: { p_kind: string; p_source_id: string; p_transaction_id: string }
        Returns: undefined
      }
      link_service_request_work_order: {
        Args: { p_request_id: string; p_work_order_id: string }
        Returns: Json
      }
      link_subscriber_portal_account: {
        Args: { p_subscriber_id: string; p_user_id: string }
        Returns: Json
      }
      list_assets: {
        Args: { p_query?: string; p_status?: string; p_type?: string }
        Returns: Json[]
      }
      list_audit_events: {
        Args: {
          p_action?: string
          p_from?: string
          p_limit?: number
          p_query?: string
          p_to?: string
        }
        Returns: Json[]
      }
      list_backup_runs: { Args: never; Returns: Json[] }
      list_bank_transactions: {
        Args: { p_bank_account_id?: string; p_status?: string }
        Returns: {
          amount: number
          bank_account_id: string
          created_at: string
          description: string | null
          id: string
          linked_expense_id: string | null
          linked_payment_id: string | null
          organization_id: string
          recon_status: Database["public"]["Enums"]["recon_status"]
          reference: string | null
          statement_id: string | null
          txn_date: string
          txn_type: Database["public"]["Enums"]["bank_txn_type"]
        }[]
        SetofOptions: {
          from: "*"
          to: "bank_transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_calendar_events: {
        Args: { p_year?: number }
        Returns: {
          compliance_ref: string | null
          created_at: string
          created_by: string
          description: string | null
          event_date: string
          event_kind: Database["public"]["Enums"]["calendar_event_kind"]
          id: string
          organization_id: string
          recurring: string | null
          responsible_person_id: string | null
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "calendar_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_chlorination_logs: {
        Args: { p_limit?: number }
        Returns: {
          chlorine_dose: number | null
          created_at: string
          id: string
          notes: string | null
          operator_id: string | null
          organization_id: string
          point: Database["public"]["Enums"]["chlorination_point"]
          recorded_at: string
          residual_chlorine: number
          source_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "chlorination_logs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_communication_messages: {
        Args: { p_limit?: number }
        Returns: Json[]
      }
      list_compliance: {
        Args: { p_status?: string }
        Returns: {
          code: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          evidence: string | null
          frequency: string | null
          id: string
          organization_id: string
          regulation_source: string
          regulation_version: string | null
          requires_validation: boolean
          status: Database["public"]["Enums"]["compliance_status"]
          title: string
        }[]
        SetofOptions: {
          from: "*"
          to: "compliance_obligations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_connection_map_points: {
        Args: { p_sector?: string; p_status?: string }
        Returns: Json[]
      }
      list_consumption_tariff_schemes: { Args: never; Returns: Json[] }
      list_cut_candidates: {
        Args: { p_min_days_overdue?: number }
        Returns: Json[]
      }
      list_document_artifacts: {
        Args: { p_financial_document_id: string }
        Returns: Json[]
      }
      list_document_templates: { Args: never; Returns: Json[] }
      list_expenses: { Args: never; Returns: Json[] }
      list_field_readings: {
        Args: {
          p_batch_id?: string
          p_status?: string
          p_technician_id?: string
        }
        Returns: Json[]
      }
      list_financial_documents: {
        Args: {
          p_document_type?: string
          p_limit?: number
          p_query?: string
          p_status?: string
        }
        Returns: Json[]
      }
      list_import_batches: { Args: { p_limit?: number }; Returns: Json[] }
      list_import_rows: { Args: { p_batch_id: string }; Returns: Json[] }
      list_incidents: {
        Args: { p_category?: string; p_status?: string }
        Returns: Json[]
      }
      list_integration_runs: {
        Args: { p_key?: string; p_limit?: number }
        Returns: Json[]
      }
      list_integrations: { Args: never; Returns: Json[] }
      list_inventory: { Args: never; Returns: Json[] }
      list_maintenance_plans: { Args: never; Returns: Json[] }
      list_meter_reading_batches: {
        Args: { p_limit?: number }
        Returns: Json[]
      }
      list_meter_readings: { Args: { p_batch_id: string }; Returns: Json[] }
      list_metering_connections: { Args: { p_query?: string }; Returns: Json[] }
      list_ocr_extractions: { Args: { p_limit?: number }; Returns: Json[] }
      list_organization_roles: { Args: never; Returns: Json[] }
      list_organization_users: { Args: never; Returns: Json[] }
      list_payment_arrangements: {
        Args: { p_status?: string }
        Returns: {
          abonado_id: string | null
          approved_by: string
          code: string
          created_at: string
          created_by: string
          first_due_date: string
          frequency: Database["public"]["Enums"]["frequency_enum"]
          id: string
          installment_amount: number
          notes: string | null
          num_installments: number
          organization_id: string
          status: Database["public"]["Enums"]["arrangement_status"]
          subscriber_id: string
          total_debt: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "payment_arrangements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_payments: { Args: { p_limit?: number }; Returns: Json[] }
      list_purchase_orders: {
        Args: { p_status?: string }
        Returns: {
          code: string
          created_at: string
          created_by: string
          expected_date: string | null
          id: string
          order_date: string
          organization_id: string
          paid_amount: number
          requisition_id: string | null
          status: Database["public"]["Enums"]["purchase_status"]
          supplier_id: string
          total_amount: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "purchase_orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_rationalization: {
        Args: { p_status?: string }
        Returns: {
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          organization_id: string
          rational_type: Database["public"]["Enums"]["rational_type"]
          starts_at: string
          status: Database["public"]["Enums"]["rational_status"]
          title: string
          zones: string[] | null
        }[]
        SetofOptions: {
          from: "*"
          to: "rationalization_schedules"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_service_catalog: { Args: never; Returns: Json[] }
      list_service_requests: {
        Args: { p_limit?: number; p_status?: string }
        Returns: {
          abonado_id: string | null
          assigned_to: string | null
          channel: Database["public"]["Enums"]["request_channel"]
          code: string
          connection_id: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          organization_id: string
          priority: string
          request_type: Database["public"]["Enums"]["request_type"]
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          subject: string
          subscriber_id: string | null
          updated_at: string
          work_order_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "service_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_tariffs: {
        Args: never
        Returns: {
          amount: number
          applies_to_service: string
          category: string
          code: string
          definition_id: string
          description: string
          is_annual: boolean
          name: string
          status: string
          valid_from: string
          valid_to: string
          version_id: string
          version_number: number
        }[]
      }
      list_warehouses: {
        Args: never
        Returns: {
          active: boolean
          address: string | null
          code: string
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "warehouses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_water_samples: {
        Args: { p_limit?: number }
        Returns: {
          chlorine_residual: number | null
          code: string
          collected_by: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          ph: number | null
          sample_date: string
          source_id: string | null
          status: Database["public"]["Enums"]["sample_status"]
          temperature: number | null
          turbidity: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "water_samples"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      list_work_orders: { Args: never; Returns: Json[] }
      log_session_event: {
        Args: { p_action: string; p_metadata?: Json }
        Returns: undefined
      }
      mark_arrangement_installment_paid: {
        Args: {
          p_arrangement_id: string
          p_installment_no: number
          p_paid_amount?: number
          p_payment_id?: string
        }
        Returns: Json
      }
      mark_my_portal_password_changed: { Args: never; Returns: undefined }
      mask_identifier: { Args: { v: string }; Returns: string }
      next_connection_code: {
        Args: { p_subscriber_id: string }
        Returns: string
      }
      next_document_number: {
        Args: { p_key: string; p_prefix: string; p_width?: number }
        Returns: string
      }
      next_subscriber_code: { Args: never; Returns: string }
      normalize_identifier: { Args: { v: string }; Returns: string }
      normalize_person_name: { Args: { v: string }; Returns: string }
      obligation_balance: {
        Args: { p_adjustment: number; p_original: number; p_paid: number }
        Returns: number
      }
      obligation_computed_state: {
        Args: {
          p_adjustment: number
          p_cancelled: string
          p_due: string
          p_original: number
          p_paid: number
        }
        Returns: Database["public"]["Enums"]["obligation_state"]
      }
      obligation_late_fee_label: {
        Args: { p_amount: number; p_pending: boolean }
        Returns: string
      }
      open_cash_session: {
        Args: { p_location?: string; p_opening_amount: number }
        Returns: Json
      }
      post_annual_financial_document: {
        Args: { p_obligation_id: string }
        Returns: Json
      }
      post_meter_reading_batch: { Args: { p_batch_id: string }; Returns: Json }
      post_payment_financial_document: {
        Args: { p_payment_id: string }
        Returns: Json
      }
      receive_purchase_order: {
        Args: { p_line_receipts: Json; p_order_id: string }
        Returns: undefined
      }
      record_login_attempt: {
        Args: { p_email: string; p_success: boolean }
        Returns: undefined
      }
      record_payment_reprint: {
        Args: { p_payment_id: string }
        Returns: undefined
      }
      refund_payment: {
        Args: { p_amount: number; p_payment_id: string; p_reason: string }
        Returns: Json
      }
      refund_payment_with_document: {
        Args: { p_amount: number; p_payment_id: string; p_reason: string }
        Returns: Json
      }
      register_chlorination: {
        Args: {
          p_chlorine_dose?: number
          p_notes?: string
          p_point: string
          p_residual_clorine: number
          p_source_id: string
        }
        Returns: string
      }
      register_compliance_obligation: {
        Args: {
          p_code: string
          p_description?: string
          p_due_date?: string
          p_frequency?: string
          p_regulation_source: string
          p_regulation_version?: string
          p_title: string
        }
        Returns: string
      }
      register_document_artifact: {
        Args: { p_artifact_type?: string; p_financial_document_id: string }
        Returns: string
      }
      register_inventory_movement: { Args: { p_payload: Json }; Returns: Json }
      register_payment: { Args: { p_payload: Json }; Returns: Json }
      register_payment_with_document: {
        Args: { p_payload: Json }
        Returns: Json
      }
      register_service_contract: {
        Args: {
          p_abonado_id: string
          p_connection_id: string
          p_contract_type?: string
          p_location_id: string
          p_start_date?: string
          p_tariff_definition_id?: string
        }
        Returns: string
      }
      register_water_sample: {
        Args: { p_parameters?: Json; p_payload: Json }
        Returns: string
      }
      register_water_source: {
        Args: {
          p_code: string
          p_estimated_flow?: number
          p_latitude?: number
          p_location?: string
          p_longitude?: number
          p_microcuenca_id?: string
          p_name: string
          p_source_type: string
        }
        Returns: string
      }
      register_watershed: {
        Args: {
          p_code?: string
          p_description?: string
          p_name: string
          p_protection_status?: string
        }
        Returns: string
      }
      require_aal2: { Args: never; Returns: undefined }
      require_permission: {
        Args: { p_code: string; p_require_aal2?: boolean }
        Returns: undefined
      }
      resolve_service_request: {
        Args: { p_request_id: string; p_resolution: string; p_status?: string }
        Returns: undefined
      }
      reverse_financial_document: {
        Args: {
          p_document_id: string
          p_reason: string
          p_reversal_type?: string
        }
        Returns: Json
      }
      reverse_payment_financial_document: {
        Args: { p_amount: number; p_document_id: string; p_reason: string }
        Returns: Json
      }
      save_budget_line: { Args: { p_payload: Json }; Returns: Json }
      save_consumption_tariff_scheme: {
        Args: { p_payload: Json }
        Returns: Json
      }
      save_document_template: {
        Args: {
          p_configuration: Json
          p_document_type: string
          p_name: string
          p_reason?: string
        }
        Returns: Json
      }
      save_fiscal_period: { Args: { p_payload: Json }; Returns: Json }
      save_integration: {
        Args: {
          p_enabled: boolean
          p_key: string
          p_public_config: Json
          p_secret_configured?: boolean
        }
        Returns: Json
      }
      save_integration_public_config: {
        Args: { p_enabled: boolean; p_key: string; p_public_config: Json }
        Returns: Json
      }
      save_minutes: {
        Args: { p_content: string; p_meeting_id: string }
        Returns: string
      }
      save_service_catalog_item: { Args: { p_payload: Json }; Returns: Json }
      search_abonados: {
        Args: { p_limit?: number; p_query?: string }
        Returns: {
          abonado_id: string
          category: string
          connection_count: number
          full_name: string
          masked_document: string
          person_id: string
          sector: string
          status: string
          subscriber_code: string
          subscriber_id: string
        }[]
      }
      search_payable_accounts: {
        Args: { p_limit?: number; p_query: string }
        Returns: Json[]
      }
      search_subscriber_accounts: {
        Args: { p_limit?: number; p_query?: string }
        Returns: {
          debt_status: string
          full_name: string
          overdue_amount: number
          overdue_count: number
          subscriber_code: string
          subscriber_id: string
          total_pending: number
        }[]
      }
      search_subscribers: {
        Args: { p_limit?: number; p_query?: string }
        Returns: {
          full_name: string
          masked_document: string
          sector: string
          status: string
          subscriber_code: string
          subscriber_id: string
        }[]
      }
      seed_default_roles: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      set_import_row_result: {
        Args: {
          p_error_codes?: string[]
          p_message?: string
          p_result_entity_id?: string
          p_row_id: string
          p_status: Database["public"]["Enums"]["import_row_status"]
        }
        Returns: undefined
      }
      set_institutional_position: {
        Args: {
          p_notes?: string
          p_person_id: string
          p_position: string
          p_term_end: string
          p_term_start: string
        }
        Returns: string
      }
      set_service_request_status: {
        Args: { p_note?: string; p_request_id: string; p_status: string }
        Returns: Json
      }
      set_user_status: {
        Args: { p_status: string; p_user_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      stage_import_rows: {
        Args: { p_batch_id: string; p_rows: Json }
        Returns: Json
      }
      sync_field_readings: { Args: { p_readings: Json }; Returns: Json }
      sync_senior_benefit: {
        Args: { p_reference_date?: string; p_subscriber_id: string }
        Returns: Json
      }
      unlink_bank_transaction: {
        Args: { p_transaction_id: string }
        Returns: Json
      }
      update_incident: {
        Args: { p_id: string; p_payload: Json }
        Returns: Json
      }
      update_my_subscriber_profile: { Args: { p_payload: Json }; Returns: Json }
      update_organization_settings: { Args: { p_payload: Json }; Returns: Json }
      update_subscriber: {
        Args: { p_payload: Json; p_subscriber_id: string }
        Returns: Json
      }
      update_water_connection: {
        Args: { p_connection_id: string; p_payload: Json }
        Returns: Json
      }
      update_work_order: {
        Args: { p_id: string; p_notes?: string; p_status: string }
        Returns: Json
      }
      update_work_order_v2: {
        Args: { p_id: string; p_payload: Json }
        Returns: Json
      }
      upload_field_photo: {
        Args: { p_bucket: string; p_path: string; p_reading_id: string }
        Returns: Json
      }
      upsert_compliance_status: {
        Args: { p_compliance_id: string; p_evidence?: string; p_status: string }
        Returns: undefined
      }
      upsert_meter_reading: {
        Args: { p_batch_id: string; p_payload: Json }
        Returns: Json
      }
      validate_field_reading: {
        Args: { p_id: string; p_status: string }
        Returns: Json
      }
      verify_receipt_public: { Args: { p_token: string }; Returns: Json }
      void_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: Json
      }
      void_payment_with_document: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: Json
      }
      write_audit_event: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type: string
          p_new?: Json
          p_old?: Json
          p_reason?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      acta_status: "borrador" | "aprobada" | "firmada" | "enmendada"
      arrangement_status: "activo" | "cumplido" | "incumplido" | "cancelado"
      bank_txn_type: "debito" | "credito"
      calendar_event_kind:
        | "regulatorio"
        | "institucional"
        | "operativo"
        | "financiero"
        | "social"
      cash_session_status: "open" | "closed"
      chlorination_point: "entrada" | "salida" | "tanque" | "red"
      committee_type:
        | "agua"
        | "saneamiento"
        | "ambiente"
        | "control_fiscal"
        | "compras"
        | "protocolo"
        | "otro"
      compliance_status:
        | "pendiente"
        | "en_proceso"
        | "cumplido"
        | "vencido"
        | "requiere_validacion"
      connection_status: "active" | "suspended" | "cancelled" | "pending"
      contract_status: "activo" | "suspendido" | "cancelado" | "extinto"
      contract_type: "servicio_agua" | "servicio_alcantarillado" | "ambos"
      data_import_kind: "subscribers" | "meter_readings"
      data_import_status:
        | "draft"
        | "validated"
        | "completed"
        | "failed"
        | "cancelled"
      debt_operation:
        | "solvency_certificate"
        | "reconnection"
        | "ownership_change"
        | "new_connection"
        | "general_consultation"
        | "receive_payment"
      expense_status:
        | "requested"
        | "approved"
        | "rejected"
        | "confirmed"
        | "voided"
      field_reading_status: "captured" | "synced" | "validated" | "rejected"
      frequency_enum: "semanal" | "quincenal" | "mensual"
      identity_document_type: "dni" | "passport" | "other"
      import_row_status: "pending" | "valid" | "imported" | "skipped" | "error"
      incident_category:
        | "fuga"
        | "calidad_agua"
        | "corte"
        | "facturacion"
        | "baja_presion"
        | "medidor"
        | "infraestructura"
        | "saneamiento"
        | "otro"
      institutional_position:
        | "presidente"
        | "vicepresidente"
        | "secretario"
        | "tesorero"
        | "fiscal"
        | "vocal"
      meter_reading_status: "valid" | "warning" | "error" | "posted"
      obligation_source:
        | "annual_generation"
        | "manual"
        | "system_adjustment"
        | "meter_reading"
      obligation_state: "pending" | "partial" | "paid" | "overdue" | "cancelled"
      payment_method: "cash" | "transfer" | "deposit" | "check" | "mixed"
      payment_status: "confirmed" | "voided" | "partially_refunded" | "refunded"
      person_gender: "femenino" | "masculino" | "otro"
      position_period_status: "vigente" | "finalizado" | "revocado"
      project_funding:
        | "fondo_propio"
        | "cooperacion"
        | "fideicomiso"
        | "municipal"
        | "mixto"
      project_status:
        | "propuesta"
        | "aprobado"
        | "en_ejecucion"
        | "finalizado"
        | "suspendido"
      property_type:
        | "residencial"
        | "comercial"
        | "comunitaria"
        | "institucional"
      purchase_status:
        | "borrador"
        | "aprobada"
        | "ordenada"
        | "recibida"
        | "cancelada"
      rational_status: "programado" | "vigente" | "finalizado" | "cancelado"
      rational_type:
        | "racionamiento"
        | "corte_planificado"
        | "horario_restriccion"
      reading_batch_status: "draft" | "validated" | "posted" | "cancelled"
      recon_status: "pendiente" | "conciliado" | "descartado"
      report_doc_kind:
        | "informe_anual"
        | "estado_financiero"
        | "transparencia"
        | "rendicion_cuentas"
      request_channel:
        | "presencial"
        | "telefonico"
        | "whatsapp"
        | "portal"
        | "correo"
      request_status:
        | "recibida"
        | "en_revision"
        | "en_proceso"
        | "resuelta"
        | "cerrada"
        | "rechazada"
      request_type: "solicitud" | "reclamo" | "consulta" | "felicitacion"
      resolution_status: "borrador" | "aprobada" | "publicada" | "revocada"
      resolution_type:
        | "tarifa"
        | "reglamento_interno"
        | "gobierno"
        | "financiera"
        | "operativa"
        | "sancion"
        | "otra"
      reunion_status: "programada" | "en_curso" | "celebrada" | "cancelada"
      reunion_type:
        | "asamblea_general"
        | "junta_directiva"
        | "comite"
        | "informe"
      sample_status: "pendiente" | "en_laboratorio" | "resultado" | "rechazada"
      source_status: "activa" | "mantenimiento" | "inactiva"
      source_type:
        | "manantial"
        | "pozo"
        | "rio"
        | "quebrada"
        | "naciente"
        | "toma_superficial"
      subscriber_status: "active" | "inactive" | "suspended" | "archived"
      tariff_category:
        | "annual_fee"
        | "new_connection"
        | "reconnection"
        | "late_fee"
        | "repair"
        | "ownership_change"
        | "inspection"
        | "fine"
        | "other"
        | "consumption"
      tariff_status: "active" | "inactive"
      work_order_status:
        | "open"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      acta_status: ["borrador", "aprobada", "firmada", "enmendada"],
      arrangement_status: ["activo", "cumplido", "incumplido", "cancelado"],
      bank_txn_type: ["debito", "credito"],
      calendar_event_kind: [
        "regulatorio",
        "institucional",
        "operativo",
        "financiero",
        "social",
      ],
      cash_session_status: ["open", "closed"],
      chlorination_point: ["entrada", "salida", "tanque", "red"],
      committee_type: [
        "agua",
        "saneamiento",
        "ambiente",
        "control_fiscal",
        "compras",
        "protocolo",
        "otro",
      ],
      compliance_status: [
        "pendiente",
        "en_proceso",
        "cumplido",
        "vencido",
        "requiere_validacion",
      ],
      connection_status: ["active", "suspended", "cancelled", "pending"],
      contract_status: ["activo", "suspendido", "cancelado", "extinto"],
      contract_type: ["servicio_agua", "servicio_alcantarillado", "ambos"],
      data_import_kind: ["subscribers", "meter_readings"],
      data_import_status: [
        "draft",
        "validated",
        "completed",
        "failed",
        "cancelled",
      ],
      debt_operation: [
        "solvency_certificate",
        "reconnection",
        "ownership_change",
        "new_connection",
        "general_consultation",
        "receive_payment",
      ],
      expense_status: [
        "requested",
        "approved",
        "rejected",
        "confirmed",
        "voided",
      ],
      field_reading_status: ["captured", "synced", "validated", "rejected"],
      frequency_enum: ["semanal", "quincenal", "mensual"],
      identity_document_type: ["dni", "passport", "other"],
      import_row_status: ["pending", "valid", "imported", "skipped", "error"],
      incident_category: [
        "fuga",
        "calidad_agua",
        "corte",
        "facturacion",
        "baja_presion",
        "medidor",
        "infraestructura",
        "saneamiento",
        "otro",
      ],
      institutional_position: [
        "presidente",
        "vicepresidente",
        "secretario",
        "tesorero",
        "fiscal",
        "vocal",
      ],
      meter_reading_status: ["valid", "warning", "error", "posted"],
      obligation_source: [
        "annual_generation",
        "manual",
        "system_adjustment",
        "meter_reading",
      ],
      obligation_state: ["pending", "partial", "paid", "overdue", "cancelled"],
      payment_method: ["cash", "transfer", "deposit", "check", "mixed"],
      payment_status: ["confirmed", "voided", "partially_refunded", "refunded"],
      person_gender: ["femenino", "masculino", "otro"],
      position_period_status: ["vigente", "finalizado", "revocado"],
      project_funding: [
        "fondo_propio",
        "cooperacion",
        "fideicomiso",
        "municipal",
        "mixto",
      ],
      project_status: [
        "propuesta",
        "aprobado",
        "en_ejecucion",
        "finalizado",
        "suspendido",
      ],
      property_type: [
        "residencial",
        "comercial",
        "comunitaria",
        "institucional",
      ],
      purchase_status: [
        "borrador",
        "aprobada",
        "ordenada",
        "recibida",
        "cancelada",
      ],
      rational_status: ["programado", "vigente", "finalizado", "cancelado"],
      rational_type: [
        "racionamiento",
        "corte_planificado",
        "horario_restriccion",
      ],
      reading_batch_status: ["draft", "validated", "posted", "cancelled"],
      recon_status: ["pendiente", "conciliado", "descartado"],
      report_doc_kind: [
        "informe_anual",
        "estado_financiero",
        "transparencia",
        "rendicion_cuentas",
      ],
      request_channel: [
        "presencial",
        "telefonico",
        "whatsapp",
        "portal",
        "correo",
      ],
      request_status: [
        "recibida",
        "en_revision",
        "en_proceso",
        "resuelta",
        "cerrada",
        "rechazada",
      ],
      request_type: ["solicitud", "reclamo", "consulta", "felicitacion"],
      resolution_status: ["borrador", "aprobada", "publicada", "revocada"],
      resolution_type: [
        "tarifa",
        "reglamento_interno",
        "gobierno",
        "financiera",
        "operativa",
        "sancion",
        "otra",
      ],
      reunion_status: ["programada", "en_curso", "celebrada", "cancelada"],
      reunion_type: [
        "asamblea_general",
        "junta_directiva",
        "comite",
        "informe",
      ],
      sample_status: ["pendiente", "en_laboratorio", "resultado", "rechazada"],
      source_status: ["activa", "mantenimiento", "inactiva"],
      source_type: [
        "manantial",
        "pozo",
        "rio",
        "quebrada",
        "naciente",
        "toma_superficial",
      ],
      subscriber_status: ["active", "inactive", "suspended", "archived"],
      tariff_category: [
        "annual_fee",
        "new_connection",
        "reconnection",
        "late_fee",
        "repair",
        "ownership_change",
        "inspection",
        "fine",
        "other",
        "consumption",
      ],
      tariff_status: ["active", "inactive"],
      work_order_status: [
        "open",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
