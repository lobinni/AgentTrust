import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

// Deployed on GenLayer studionet (public). Env var overrides.
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0xFf7cCC740271Ee6664398503D8564380578b612c";

// Create a read-only client for querying contract state
export function createReadClient() {
  return createClient({ chain: studionet });
}

// Read contract state (no wallet needed)
export async function readContract<T>(
  functionName: string,
  args: (string | bigint | number | boolean)[] = []
): Promise<T> {
  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address not configured");
  }

  const client = createReadClient();
  
  const result = await client.readContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    functionName,
    args,
  });

  return result as T;
}

// Contract types matching the Python contract
export interface ContractTask {
  task_id: string;
  client: string;
  worker: string;
  title: string;
  terms: string;
  reward: number;
  status: string;
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
  ai_verdict: string;
  ai_score: number;
  ai_reason: string;
  reviewed_at: number;
}

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

export interface ContractStats {
  task_count: bigint;
  profile_count: bigint;
  paused: boolean;
}

export interface ContractConfig {
  owner: string;
  paused: boolean;
  min_reward: bigint;
  min_dispute_bond: bigint;
  review_period: bigint;
  max_page: bigint;
}

// Contract read functions
export async function getTask(taskId: string): Promise<ContractTask> {
  return readContract<ContractTask>("get_task", [taskId]);
}

export async function getOpenTasks(offset = 0, limit = 50): Promise<ContractTask[]> {
  return readContract<ContractTask[]>("get_open_tasks", [BigInt(offset), BigInt(limit)]);
}

export async function getTasksByStatus(status: string, offset = 0, limit = 50): Promise<ContractTask[]> {
  return readContract<ContractTask[]>("get_tasks_by_status", [status, BigInt(offset), BigInt(limit)]);
}

export async function getTaskIds(offset = 0, limit = 50): Promise<string[]> {
  return readContract<string[]>("get_task_ids", [BigInt(offset), BigInt(limit)]);
}

export async function getProfile(address: string): Promise<ContractProfile> {
  return readContract<ContractProfile>("get_profile", [address]);
}

export async function getLeaderboard(offset = 0, limit = 50): Promise<ContractProfile[]> {
  return readContract<ContractProfile[]>("get_leaderboard", [BigInt(offset), BigInt(limit)]);
}

export async function getStats(): Promise<ContractStats> {
  return readContract<ContractStats>("get_stats", []);
}

export async function getConfig(): Promise<ContractConfig> {
  return readContract<ContractConfig>("get_config", []);
}
