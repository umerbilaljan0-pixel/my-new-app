CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" text,
	"tool" text NOT NULL,
	"status" text NOT NULL,
	"params" jsonb NOT NULL,
	"input_key" text NOT NULL,
	"input_hash" text NOT NULL,
	"input_bytes" integer,
	"input_width" integer,
	"input_height" integer,
	"input_mime" text,
	"output_key" text,
	"output_width" integer,
	"output_height" integer,
	"output_bytes" integer,
	"preview_key" text,
	"provider" text,
	"provider_job_id" text,
	"params_hash" text NOT NULL,
	"credits_charged" integer DEFAULT 0,
	"error_code" text,
	"error_message" text,
	"queued_at" timestamp with time zone DEFAULT now(),
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"duration_ms" integer,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "jobs_owner_idx" ON "jobs" USING btree ("user_id","queued_at");--> statement-breakpoint
CREATE INDEX "jobs_cache_idx" ON "jobs" USING btree ("input_hash","tool","params_hash");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");