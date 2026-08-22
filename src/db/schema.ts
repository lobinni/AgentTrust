import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  numeric,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

// Wallets - connected users
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  address: varchar("address", { length: 66 }).notNull().unique(),
  nickname: varchar("nickname", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tasks - synced from contract (matches contract structure)
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  taskId: varchar("task_id", { length: 130 }).notNull().unique(),
  client: varchar("client", { length: 66 }).notNull(),
  worker: varchar("worker", { length: 66 }).notNull().default(""),
  title: varchar("title", { length: 255 }).notNull(),
  terms: text("terms").notNull(),
  reward: numeric("reward", { precision: 36, scale: 0 }).default("0").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("OPEN"),
  deadline: integer("deadline").notNull().default(0),
  createdAt: integer("created_at").notNull().default(0),
  acceptedAt: integer("accepted_at").notNull().default(0),
  submittedAt: integer("submitted_at").notNull().default(0),
  reviewDeadline: integer("review_deadline").notNull().default(0),
  resolvedAt: integer("resolved_at").notNull().default(0),
  evidenceUrl: text("evidence_url").notNull().default(""),
  evidenceNote: text("evidence_note").notNull().default(""),
  decision: varchar("decision", { length: 20 }).notNull().default(""),
  score: integer("score").notNull().default(0),
  reason: text("reason").notNull().default(""),
  disputeBond: numeric("dispute_bond", { precision: 36, scale: 0 }).default("0").notNull(),
  disputedAt: integer("disputed_at").notNull().default(0),
  aiVerdict: varchar("ai_verdict", { length: 20 }).notNull().default(""),
  aiScore: integer("ai_score").notNull().default(0),
  aiReason: text("ai_reason").notNull().default(""),
  reviewedAt: integer("reviewed_at").notNull().default(0),
  txHash: varchar("tx_hash", { length: 130 }),
});

// Submissions - worker evidence submissions
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  taskId: varchar("task_id", { length: 130 }).notNull(),
  workerAddress: varchar("worker_address", { length: 66 }).notNull(),
  evidenceUrl: text("evidence_url").notNull(),
  evidenceNote: text("evidence_note"),
  evidenceSnapshot: text("evidence_snapshot"),
  status: varchar("status", { length: 20 }).notNull().default("SUBMITTED"),
  txHash: varchar("tx_hash", { length: 130 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Verifications - AI judgment results
export const verifications = pgTable("verifications", {
  id: serial("id").primaryKey(),
  taskId: varchar("task_id", { length: 130 }).notNull(),
  submissionId: integer("submission_id").references(() => submissions.id),
  walletAddress: varchar("wallet_address", { length: 66 }).notNull(),
  result: varchar("result", { length: 20 }).notNull(),
  score: integer("score").default(0),
  reason: text("reason"),
  aiJudgment: jsonb("ai_judgment"),
  consensusData: jsonb("consensus_data"),
  txHash: varchar("tx_hash", { length: 130 }),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reputation - per wallet stats (matches contract profile structure)
export const reputation = pgTable("reputation", {
  id: serial("id").primaryKey(),
  address: varchar("address", { length: 66 }).notNull().unique(),
  jobsCompleted: integer("jobs_completed").default(0).notNull(),
  jobsFailed: integer("jobs_failed").default(0).notNull(),
  disputesOpened: integer("disputes_opened").default(0).notNull(),
  disputesWon: integer("disputes_won").default(0).notNull(),
  disputesLost: integer("disputes_lost").default(0).notNull(),
  totalEarned: numeric("total_earned", { precision: 36, scale: 0 }).default("0").notNull(),
  totalSpent: numeric("total_spent", { precision: 36, scale: 0 }).default("0").notNull(),
  reputation: integer("reputation").default(500).notNull(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
});

// Disputes - dispute records
export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  taskId: varchar("task_id", { length: 130 }).notNull(),
  clientAddress: varchar("client_address", { length: 66 }).notNull(),
  workerAddress: varchar("worker_address", { length: 66 }).notNull(),
  bond: numeric("bond", { precision: 36, scale: 0 }).default("0"),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"),
  decision: varchar("decision", { length: 20 }),
  score: integer("score"),
  reason: text("reason"),
  txHash: varchar("tx_hash", { length: 130 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});
