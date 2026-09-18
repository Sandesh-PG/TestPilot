CREATE TABLE "repositories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"github_repo_id" integer NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"owner" text NOT NULL,
	"url" text NOT NULL,
	"default_branch" text NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"description" text,
	"language" text,
	"connected_at" timestamp DEFAULT now() NOT NULL,
	"last_sync" timestamp,
	CONSTRAINT "repositories_user_id_github_repo_id_unique" UNIQUE("user_id","github_repo_id")
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"repository_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"priority" text NOT NULL,
	"target_route" text NOT NULL,
	"target_files" jsonb NOT NULL,
	"expected_result" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_case_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"session_id" text,
	"session_url" text,
	"logs" text,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"credits" integer DEFAULT 10 NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_executions" ADD CONSTRAINT "test_executions_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE cascade ON UPDATE no action;