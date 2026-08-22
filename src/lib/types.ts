// ============================================================
// Types matching AgentTrust v4 contract
// ============================================================

export type TaskStatus =
  | "OPEN"
  | "ACCEPTED"
  | "REVIEWING"   // NEW: AI is reviewing evidence
  | "SUBMITTED"   // AI has reviewed, waiting for client
  | "COMPLETED"
  | "DISPUTED"
  | "REFUNDED"
  | "CANCELLED";

export type Decision = "WORKER" | "CLIENT";
export type AIVerdict = "APPROVED" | "REJECTED" | "";

/** Matches contract task dict exactly (v4). */
export interface ContractTask {
  task_id: string;
  client: string;
  worker: string;
  title: string;
  terms: string;
  reward: number;
  status: TaskStatus;
  deadline: number;
  created_at: number;
  accepted_at: number;
  submitted_at: number;
  review_deadline: number;
  resolved_at: number;
  evidence_url: string;
  evidence_note: string;
  decision: string;
  score: number;
  reason: string;
  dispute_bond: number;
  disputed_at: number;
  ai_verdict: string;       // NEW: "APPROVED" | "REJECTED" | ""
  ai_score: number;         // NEW: 0-100
  ai_reason: string;        // NEW: explanation from AI review
  reviewed_at: number;      // NEW: timestamp of AI review
}

/** Matches contract profile dict. */
export interface ContractProfile {
  address: string;
  jobs_completed: number;
  jobs_failed: number;
  disputes_opened: number;
  disputes_won: number;
  disputes_lost: number;
  total_earned: number;
  total_spent: number;
  reputation: number;
}

/** Matches get_task_state return (v4). */
export interface TaskState {
  task_id: string;
  status: TaskStatus;
  deadline: string | number;
  review_deadline: string | number;
  now: string | number;
  can_accept: boolean;
  can_submit: boolean;
  can_review: boolean;      // NEW
  can_approve: boolean;
  can_dispute: boolean;
  can_auto_release: boolean;
  can_claim_expired: boolean;
}

export interface ContractStats {
  task_count: string | number;
  profile_count: string | number;
  paused: boolean;
}

export interface ContractConfig {
  owner: string;
  paused: boolean;
  min_reward: string | number;
  min_dispute_bond: string | number;
  review_period: string | number;
  max_page: string | number;
}
