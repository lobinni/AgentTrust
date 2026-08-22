"use client";

// ============================================================
// AgentTrust — GenLayer client (browser)
// MetaMask (EIP-1193) → genlayer-js → contract on studionet.
// Contract is the SINGLE SOURCE OF TRUTH.
// ============================================================

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import {
  TransactionStatus,
  transactionResultNumberToName,
} from "genlayer-js/types";

import type {
  ContractTask,
  ContractProfile,
  TaskState,
  ContractStats,
  ContractConfig,
} from "./types";

export const CONTRACT_ADDRESS = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  "0xFf7cCC740271Ee6664398503D8564380578b612c"
) as `0x${string}`;

export const CHAIN = {
  id: studionet.id,                                                       // 61999
  hex: ("0x" + studionet.id.toString(16)).toLowerCase(),                   // "0xf22f"
  rpc: studionet.rpcUrls?.default?.http?.[0] || "https://studio.genlayer.com/api",
  explorer: "https://explorer-studio.genlayer.com",
  name: "GenLayer Studionet",
};

declare global {
  interface Window { ethereum?: any }
}

// ── Helpers ──

export function hasMetaMask(): boolean {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

/** Compare chain IDs case-insensitively (MetaMask may return "0xF22F" or "0xf22f") */
function sameChain(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Get current MetaMask chain ID */
async function getCurrentChainId(): Promise<string> {
  return (await window.ethereum.request({ method: "eth_chainId" })) as string;
}

// ── Chain management ──

/**
 * Add GenLayer Studionet network to MetaMask.
 * Called when switch fails with 4902 (chain not added).
 */
async function addStudionetChain(): Promise<void> {
  await window.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [{
      chainId: CHAIN.hex,
      chainName: CHAIN.name,
      nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
      rpcUrls: [CHAIN.rpc],
      blockExplorerUrls: [CHAIN.explorer],
    }],
  });
}

/**
 * Switch MetaMask to GenLayer Studionet.
 * If the chain doesn't exist yet, adds it first, then switches again.
 */
async function switchToStudionet(): Promise<void> {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN.hex }],
    });
  } catch (switchError: any) {
    // 4902 = chain not added to MetaMask
    const needsAdd =
      switchError?.code === 4902 ||
      switchError?.data?.originalError?.code === 4902 ||
      /unrecognized chain|not added|unknown chain/i.test(switchError?.message || "");

    if (needsAdd) {
      await addStudionetChain();
      // After adding, MetaMask may auto-switch. Verify and switch again if needed.
      const afterAdd = await getCurrentChainId();
      if (!sameChain(afterAdd, CHAIN.hex)) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN.hex }],
        });
      }
    } else if (switchError?.code === 4001) {
      // User rejected the switch — throw specific error
      throw new Error("REJECTED_SWITCH");
    } else {
      throw switchError;
    }
  }
}

/**
 * Ensure MetaMask is on GenLayer Studionet.
 * Returns true if on correct chain, false if user rejected switch.
 */
export async function ensureChain(): Promise<boolean> {
  if (!window.ethereum) return false;

  const current = await getCurrentChainId();
  if (sameChain(current, CHAIN.hex)) return true;

  try {
    await switchToStudionet();
    // Verify final state
    const final = await getCurrentChainId();
    return sameChain(final, CHAIN.hex);
  } catch (e: any) {
    if (e?.message === "REJECTED_SWITCH" || e?.code === 4001) {
      return false; // user rejected, don't throw
    }
    throw e;
  }
}

/**
 * Check if MetaMask is currently on the correct chain.
 * Does NOT attempt to switch. Read-only check.
 */
export async function checkChain(): Promise<boolean> {
  if (!window.ethereum) return false;
  try {
    const current = await getCurrentChainId();
    return sameChain(current, CHAIN.hex);
  } catch {
    return false;
  }
}

// ── Connect ──

/**
 * Full MetaMask connect flow:
 * 1. Check/add/switch to GenLayer Studionet
 * 2. Request accounts
 * Returns the connected address.
 */
export async function connectMetaMask(): Promise<string> {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Get it at https://metamask.io");
  }

  // Step 1: ensure correct chain
  const onCorrectChain = await ensureChain();
  if (!onCorrectChain) {
    throw new Error(
      `Please switch MetaMask to ${CHAIN.name} (Chain ID: ${CHAIN.id}) to use AgentTrust.`
    );
  }

  // Step 2: request accounts
  const accs: string[] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  if (!accs?.[0]) throw new Error("No account returned by MetaMask.");
  return accs[0];
}

// ── Write ──

function mmClient(address: string) {
  return createClient({
    chain: studionet,
    account: address as `0x${string}`,
    provider: window.ethereum,
  });
}

export class GenLayerTransactionError extends Error {
  hash: string;
  result: string;
  executionError: string;

  constructor(hash: string, result: string, executionError: string) {
    const friendlyResult = result
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    super(`Transaction failed (${friendlyResult}). ${executionError}`);
    this.name = "GenLayerTransactionError";
    this.hash = hash;
    this.result = result;
    this.executionError = executionError;
  }
}

export function extractExecutionError(transaction: any): string {
  const receipts = [
    transaction?.consensus_data?.leader_receipt,
    ...(transaction?.consensus_data?.validators || []),
  ].filter(Boolean);

  const candidates = receipts
    .flatMap((receipt: any) => [
      receipt?.genvm_result?.stderr,
      receipt?.genvm_result?.stdout,
      receipt?.genvm_result?.raw_error?.causes?.join(", "),
      receipt?.genvm_result?.error_code,
    ])
    .filter((value: unknown): value is string =>
      typeof value === "string" && value.trim().length > 0
    )
    .filter((value: string) =>
      !/cancelled after quorum|VALIDATOR_QUORUM_REACHED/i.test(value)
    );

  if (candidates.length === 0) {
    return "Consensus did not accept the state change.";
  }

  const preferred =
    candidates.find((value) => /Traceback|AttributeError|UserError|Contract Error|exit_code/i.test(value)) ||
    candidates[0];

  const lines = preferred
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^File\s+"/.test(line))
    .filter((line) => !/^warnings\.warn/.test(line));

  const finalException = [...lines].reverse().find((line) =>
    /(?:Error|Exception|exit_code|UserError):?/.test(line)
  );

  return finalException || lines.at(-1) || preferred.trim();
}

export async function writeAndFinalize(opts: {
  address: string;
  functionName: string;
  args?: (string | number | bigint | boolean)[];
  value?: bigint;
}): Promise<{ hash: string; receipt: any }> {
  // Verify chain before every write
  const ok = await checkChain();
  if (!ok) {
    const switched = await ensureChain();
    if (!switched) {
      throw new Error(`Switch MetaMask to ${CHAIN.name} before signing.`);
    }
  }

  const { address, functionName, args = [], value = BigInt(0) } = opts;
  const client = mmClient(address);
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args: args as any,
    value,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    interval: 5000,
    retries: 120,
  });

  // FINALIZED means consensus ended, not necessarily that it succeeded.
  // A MAJORITY_DISAGREE transaction is final but must be surfaced as an
  // error and must never be shown to the user as confirmed.
  const finalizedTx = await client.getTransaction({ hash });
  const numericResult = Number(finalizedTx.result);
  const resultName = transactionResultNumberToName[
    String(numericResult) as keyof typeof transactionResultNumberToName
  ] || `UNKNOWN_${numericResult}`;
  const failedResults = new Set([
    "DISAGREE",
    "TIMEOUT",
    "DETERMINISTIC_VIOLATION",
    "NO_MAJORITY",
    "MAJORITY_DISAGREE",
  ]);

  if (failedResults.has(resultName)) {
    throw new GenLayerTransactionError(
      hash,
      resultName,
      extractExecutionError(finalizedTx)
    );
  }

  return { hash, receipt };
}

// ── Read (no wallet needed) ──

export async function read<T>(fn: string, args: (string | number | bigint | boolean)[] = []): Promise<T> {
  const client = createClient({ chain: studionet });
  return (await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: fn,
    args: args as any,
    jsonSafeReturn: true,
  })) as T;
}

// ── Contract read helpers ──

export const getTask = (id: string) => read<ContractTask>("get_task", [id]);
export const getTaskState = (id: string) => read<TaskState>("get_task_state", [id]);
export const getOpenTasks = (o = 0, l = 50) => read<ContractTask[]>("get_open_tasks", [BigInt(o), BigInt(l)]);
export const getTasksByStatus = (s: string, o = 0, l = 50) => read<ContractTask[]>("get_tasks_by_status", [s, BigInt(o), BigInt(l)]);
export const getTaskIds = (o = 0, l = 50) => read<string[]>("get_task_ids", [BigInt(o), BigInt(l)]);
export const getProfile = (a: string) => read<ContractProfile>("get_profile", [a]);
export const getLeaderboard = (o = 0, l = 50) => read<ContractProfile[]>("get_leaderboard", [BigInt(o), BigInt(l)]);
export const getStats = () => read<ContractStats>("get_stats", []);
export const getConfig = () => read<ContractConfig>("get_config", []);

export async function getAllTasks(limit = 50): Promise<ContractTask[]> {
  const ids = await getTaskIds(0, limit);
  const ts = await Promise.all(ids.map((id) => getTask(id).catch(() => null)));
  return ts.filter((t): t is ContractTask => Boolean(t)).reverse();
}

export async function getMyTasks(address: string, limit = 100) {
  const all = await getAllTasks(limit);
  const a = address.toLowerCase();
  return {
    client: all.filter((t) => t.client.toLowerCase() === a),
    worker: all.filter((t) => t.worker && t.worker.toLowerCase() === a),
  };
}

// ── AI Review helper ──

/**
 * Trigger AI review on a task (non-deterministic).
 * Call after submit_work. Anyone can call this.
 * Typically takes 30s–3min as validators fetch the URL and run AI judgment.
 */
export async function reviewWork(
  address: string,
  taskId: string
): Promise<{ hash: string; receipt: any }> {
  return writeAndFinalize({
    address,
    functionName: "review_work",
    args: [taskId],
  });
}

// ── Explorer links ──

export const txUrl = (h: string) => `${CHAIN.explorer}/transaction/${h}`;
export const addressUrl = (a: string) => `${CHAIN.explorer}/address/${a}`;
