CREATE TYPE "public"."agency_plan" AS ENUM('trial', 'standard', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."agency_status" AS ENUM('active', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'agency_admin', 'operator', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."pilgrim_status" AS ENUM('pending', 'active', 'completed', 'issue');--> statement-breakpoint
CREATE TABLE "agencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"country" char(2) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"contact_phone" varchar(20),
	"plan" "agency_plan" DEFAULT 'trial' NOT NULL,
	"status" "agency_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"agency_id" uuid,
	"user_id" uuid,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"leader_user_id" uuid,
	"departure_date" date,
	"return_date" date,
	"max_size" integer DEFAULT 50 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"phone" varchar(20),
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_agency_ck" CHECK (("users"."role" = 'super_admin' AND "users"."agency_id" IS NULL) OR ("users"."role" <> 'super_admin' AND "users"."agency_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "pilgrims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"passport_no" varchar(20) NOT NULL,
	"national_id" varchar(20),
	"full_name" varchar(200) NOT NULL,
	"dob" date,
	"gender" "gender" NOT NULL,
	"nationality" char(2),
	"photo_url" text,
	"emergency_contact" jsonb,
	"travel" jsonb,
	"status" "pilgrim_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"search_tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(full_name, '') || ' ' || coalesce(passport_no, '') || ' ' || coalesce(national_id, ''))) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pilgrim_groups" (
	"pilgrim_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pilgrim_groups_pilgrim_id_group_id_pk" PRIMARY KEY("pilgrim_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "qr_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pilgrim_id" uuid NOT NULL,
	"token" varchar(43) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "qr_codes_pilgrim_id_unique" UNIQUE("pilgrim_id")
);
--> statement-breakpoint
CREATE TABLE "scan_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"agency_id" uuid NOT NULL,
	"pilgrim_id" uuid NOT NULL,
	"scanned_by_user_id" uuid NOT NULL,
	"qr_token" varchar(43) NOT NULL,
	"scanned_at" timestamp with time zone NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"device_id" varchar(100),
	"was_offline" boolean DEFAULT false NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_leader_user_id_users_id_fk" FOREIGN KEY ("leader_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilgrims" ADD CONSTRAINT "pilgrims_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilgrim_groups" ADD CONSTRAINT "pilgrim_groups_pilgrim_id_pilgrims_id_fk" FOREIGN KEY ("pilgrim_id") REFERENCES "public"."pilgrims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pilgrim_groups" ADD CONSTRAINT "pilgrim_groups_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_pilgrim_id_pilgrims_id_fk" FOREIGN KEY ("pilgrim_id") REFERENCES "public"."pilgrims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_pilgrim_id_pilgrims_id_fk" FOREIGN KEY ("pilgrim_id") REFERENCES "public"."pilgrims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_logs" ADD CONSTRAINT "scan_logs_scanned_by_user_id_users_id_fk" FOREIGN KEY ("scanned_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_agencies_name_country" ON "agencies" USING btree ("name","country");--> statement-breakpoint
CREATE INDEX "ix_agencies_status" ON "agencies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_audit_logs_agency_created" ON "audit_logs" USING btree ("agency_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_audit_logs_entity" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "ix_audit_logs_user_created" ON "audit_logs" USING btree ("user_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_groups_agency" ON "groups" USING btree ("agency_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email_lower" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "ix_users_agency_role" ON "users" USING btree ("agency_id","role");--> statement-breakpoint
CREATE INDEX "ix_pilgrims_agency_status" ON "pilgrims" USING btree ("agency_id","status") WHERE "pilgrims"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "ix_pilgrims_passport" ON "pilgrims" USING btree ("passport_no");--> statement-breakpoint
CREATE INDEX "ix_pilgrims_national_id" ON "pilgrims" USING btree ("national_id");--> statement-breakpoint
CREATE INDEX "ix_pilgrims_search_tsv" ON "pilgrims" USING gin ("search_tsv");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pilgrims_agency_passport" ON "pilgrims" USING btree ("agency_id","passport_no") WHERE "pilgrims"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "ix_pilgrim_groups_group" ON "pilgrim_groups" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_qr_codes_token" ON "qr_codes" USING btree ("token");--> statement-breakpoint
CREATE INDEX "ix_scan_logs_pilgrim_scanned" ON "scan_logs" USING btree ("pilgrim_id","scanned_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_scan_logs_agency_scanned" ON "scan_logs" USING btree ("agency_id","scanned_at" DESC);--> statement-breakpoint
CREATE INDEX "ix_scan_logs_user_scanned" ON "scan_logs" USING btree ("scanned_by_user_id","scanned_at" DESC);