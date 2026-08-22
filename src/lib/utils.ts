export function shortenAddress(address: string, chars = 6): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatTimestamp(ts: number | null | undefined): string {
  if (!ts || ts === 0) return "—";
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatWei(wei: string | number | bigint): string {
  try {
    const value =
      typeof wei === "bigint"
        ? wei
        : typeof wei === "number"
          ? BigInt(Math.floor(wei))
          : BigInt(wei || 0);
    const gen = Number(value) / 1e18;
    if (gen >= 1) return gen.toFixed(4) + " GEN";
    if (gen >= 0.0001) return gen.toFixed(6) + " GEN";
    if (value > BigInt(0)) return value.toString() + " wei";
    return "0 GEN";
  } catch {
    return String(wei);
  }
}

export function deadlineFromHours(hours: number): number {
  return Math.floor(Date.now() / 1000) + hours * 3600;
}

/* ------------------------------------------------------------------ */
/*  Human readable labels for contract constants (never show raw     */
/*  snake_case / UPPER_SNAKE values to users).                        */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  ACCEPTED: "Accepted",
  REVIEWING: "Under Review",
  SUBMITTED: "Submitted",
  DISPUTED: "In Dispute",
  COMPLETED: "Completed",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

const VERDICT_LABELS: Record<string, string> = {
  APPROVED: "Approved",
  REJECTED: "Rejected",
  WORKER: "Worker",
  CLIENT: "Client",
};

/** Friendly task status label, e.g. DISPUTED -> "In Dispute" */
export function friendlyStatus(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/** Friendly verdict/decision label, e.g. WORKER -> "Worker" */
export function friendlyVerdict(value: string): string {
  if (!value) return "";
  return VERDICT_LABELS[value] ?? value;
}

/** Humanize consensus result codes, e.g. MAJORITY_DISAGREE -> "Majority Disagree" */
export function humanizeResultName(name: string): string {
  return name
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
