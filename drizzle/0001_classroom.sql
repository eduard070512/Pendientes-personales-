CREATE TABLE "classroom_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" text NOT NULL,
	"course_id" text DEFAULT '' NOT NULL,
	"course_name" text DEFAULT '' NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"due_date" date,
	"due_time" text,
	"state" text DEFAULT 'pendiente' NOT NULL,
	"late" boolean DEFAULT false NOT NULL,
	"max_points" numeric(8, 2),
	"grade" numeric(8, 2),
	"work_type" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'api' NOT NULL,
	"task_id" integer,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "classroom_items" ADD CONSTRAINT "classroom_items_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "classroom_items_external_idx" ON "classroom_items" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "classroom_items_due_idx" ON "classroom_items" USING btree ("due_date");