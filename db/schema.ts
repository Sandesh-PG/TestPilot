import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  clerkId: text("clerk_id").unique(),

  name: text("name"),
  email: text("email").notNull().unique(),

  createdAt: timestamp("created_at").defaultNow().notNull(),

  credits: integer("credits").default(10).notNull(),
});

export const repositories = pgTable(
  "repositories",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    githubRepoId: integer("github_repo_id").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    owner: text("owner").notNull(),
    url: text("url").notNull(),
    defaultBranch: text("default_branch").notNull(),
    isPrivate: boolean("is_private").notNull().default(false),
    description: text("description"),
    language: text("language"),
    targetEnvironmentUrl: text("target_environment_url").default("http://localhost:3000"),
    connectedAt: timestamp("connected_at").defaultNow().notNull(),
    lastSync: timestamp("last_sync"),
  },
  (table) => [
    unique("repositories_user_id_github_repo_id_unique").on(
      table.userId,
      table.githubRepoId
    ),
  ]
);

export const testCases = pgTable("test_cases", {
  id: serial("id").primaryKey(),

  repositoryId: integer("repository_id")
    .notNull()
    .references(() => repositories.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  description: text("description").notNull(),

  type: text("type").notNull(),
  priority: text("priority").notNull(),

  targetRoute: text("target_route").notNull(),

  targetFiles: jsonb("target_files").notNull(),

  expectedResult: text("expected_result").notNull(),

  actionSteps: jsonb("action_steps"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const testExecutions = pgTable("test_executions", {
  id: serial("id").primaryKey(),

  testCaseId: integer("test_case_id")
    .notNull()
    .references(() => testCases.id, { onDelete: "cascade" }),

  status: text("status").notNull().default("pending"),

  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),

  sessionId: text("session_id"),
  sessionUrl: text("session_url"),

  logs: text("logs"),
  error: text("error"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Repository = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;


export type TestCase = typeof testCases.$inferSelect;
export type NewTestCase = typeof testCases.$inferInsert;

export type TestExecution = typeof testExecutions.$inferSelect;
export type NewTestExecution = typeof testExecutions.$inferInsert;