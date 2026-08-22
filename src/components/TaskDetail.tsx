"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useWallet } from "./WalletContext";
import type { ContractTask, TaskState } from "@/lib/types";
import { shortenAddress, formatTimestamp, formatWei, friendlyStatus, friendlyVerdict } from "@/lib/utils";
import {
  getTask, getTaskState, writeAndFinalize, reviewWork,
  txUrl, addressUrl, CONTRACT_ADDRESS, GenLayerTransactionError,
} from "@/lib/genlayer-client";

interface Props { taskId: string; onBack: () => void }

const AI_PHASES = [
  { icon: "🌐", label: "Validators fetch evidence URL independently" },
  { icon: "🤖", label: "AI evaluates evidence against task terms" },
  { icon: "⚖️", label: "Consensus on verdict + score" },
];

export default function TaskDetail({ taskId, onBack }: Props) {
  const { address, mmAvailable } = useWallet();
  const [task, setTask] = useState<ContractTask | null>(null);
  const [state, setState] = useState<TaskState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceNote, setEvidenceNote] = useState("");
  const [bond, setBond] = useState("");

  const [busy, setBusy] = useState(false);
  const [aiPhase, setAiPhase] = useState(0);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string; tx?: string } | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([getTask(taskId), getTaskState(taskId)]);
      setTask(t); setState(s); setError(null);
    } catch (e: any) { setError(e?.message || "Cannot read task"); }
    finally { setLoading(false); }
  }, [taskId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (poll.current) clearInterval(poll.current);
    const active = task && ["REVIEWING", "DISPUTED", "SUBMITTED"].includes(task.status);
    if (active && !busy) poll.current = setInterval(load, 10000);
    return () => { if (poll.current) clearInterval(poll.current); };
  }, [task?.status, load, busy]);

  const run = async (
    fn: string,
    args: (string | number | bigint | boolean)[],
    value = BigInt(0),
    useAI = false,
  ) => {
    if (!address) return;
    setBusy(true); setMsg(null); setAiPhase(0);

    if (useAI) {
      AI_PHASES.forEach((_, i) =>
        setTimeout(() => setAiPhase(i + 1), i * 8000 + 1000),
      );
    }

    try {
      const { hash } = await writeAndFinalize({ address, functionName: fn, args, value });
      setMsg({ type: "ok", text: "Transaction confirmed", tx: hash });
      setEvidenceUrl(""); setEvidenceNote(""); setBond("");
      await load();
    } catch (e: any) {
      setMsg({
        type: "err",
        text: e?.code === 4001 ? "Rejected." : (e?.message || String(e)),
        tx: e instanceof GenLayerTransactionError ? e.hash : undefined,
      });
    } finally { setBusy(false); setAiPhase(0); }
  };

  const runReview = async () => {
    if (!address) return;
    setBusy(true); setMsg(null); setAiPhase(0);
    AI_PHASES.forEach((_, i) =>
      setTimeout(() => setAiPhase(i + 1), i * 8000 + 1000),
    );
    try {
      const { hash } = await reviewWork(address, taskId);
      setMsg({ type: "ok", text: "AI Review completed", tx: hash });
      await load();
    } catch (e: any) {
      setMsg({
        type: "err",
        text: e?.code === 4001 ? "Rejected." : (e?.message || String(e)),
        tx: e instanceof GenLayerTransactionError ? e.hash : undefined,
      });
    } finally { setBusy(false); setAiPhase(0); }
  };

  // AgentTrust v5 performs submission and AI review atomically in one
  // transaction. The client sees SUBMITTED only after consensus records
  // ai_verdict, ai_score, ai_reason, and reviewed_at.
  const submitAndReview = async () => {
    if (!address || !evidenceUrl) return;
    setBusy(true); setMsg(null); setAiPhase(0);
    AI_PHASES.forEach((_, i) =>
      setTimeout(() => setAiPhase(i + 1), i * 8000 + 1000),
    );
    try {
      const { hash } = await writeAndFinalize({
        address,
        functionName: "submit_work",
        args: [taskId, evidenceUrl, evidenceNote],
      });
      setEvidenceUrl("");
      setEvidenceNote("");
      setMsg({ type: "ok", text: "Evidence submitted and AI Review completed", tx: hash });
      await load();
    } catch (e: any) {
      await load();
      setMsg({
        type: "err",
        text: e?.code === 4001 ? "Transaction rejected." : e?.message || String(e),
        tx: e instanceof GenLayerTransactionError ? e.hash : undefined,
      });
    } finally {
      setBusy(false);
      setAiPhase(0);
    }
  };

  if (loading) return (
    <div className="max-w-3xl mx-auto card-glass p-8 animate-pulse">
      <div className="h-6 bg-dark-500 rounded w-1/2 mb-4" /><div className="h-4 bg-dark-500 rounded w-3/4" />
    </div>
  );
  if (!task) return (
    <div className="max-w-3xl mx-auto card-glass p-8 text-center">
      <p className="text-red-400">⚠ {error || "Task not found"}</p>
      <button onClick={onBack} className="btn-ghost mt-4">← Back</button>
    </div>
  );

  const isClient = address?.toLowerCase() === task.client.toLowerCase();
  const isWorker = !!address && !!task.worker && address.toLowerCase() === task.worker.toLowerCase();
  const resolved = ["COMPLETED", "REFUNDED", "CANCELLED"].includes(task.status);
  const pill = (s: string) => `pill pill-${s.toLowerCase().replace(/ing$/, "")}`;
  const hasAI = !!task.ai_verdict;
  const aiApproved = task.ai_verdict === "APPROVED";

  const tl: { label: string; done: boolean }[] = [];
  tl.push({ label: "Created", done: true });
  tl.push({ label: "Accepted", done: task.accepted_at > 0 });
  tl.push({ label: "Evidence Submitted", done: task.submitted_at > 0 });
  if (task.reviewed_at) tl.push({ label: `AI: ${friendlyVerdict(task.ai_verdict)} (${task.ai_score}/100)`, done: true });
  if (task.disputed_at) tl.push({ label: "Disputed", done: true });
  if (task.resolved_at) tl.push({ label: friendlyStatus(task.status), done: true });

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white">← Back to Marketplace</button>

      {/* Task info */}
      <div className="card-glass p-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={pill(task.status)}>{friendlyStatus(task.status)}</span>
          {hasAI && <span className={`pill ${aiApproved ? "pill-open" : "pill-refunded"}`}>AI: {friendlyVerdict(task.ai_verdict)}</span>}
          {task.decision && <span className={pill(task.decision)}>{friendlyVerdict(task.decision)}</span>}
          <a href={addressUrl(CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer"
            className="ml-auto text-[10px] text-gray-500 hover:text-gen-green font-mono">explorer ↗</a>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{task.title}</h1>
        <p className="text-gray-400 text-sm whitespace-pre-wrap">{task.terms}</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5">
          <div><p className="text-xs text-gray-500">Escrow</p><p className="text-lg font-bold text-amber-400">{formatWei(task.reward)}</p></div>
          <div><p className="text-xs text-gray-500">Deadline</p><p className="text-sm text-white">{formatTimestamp(task.deadline)}</p></div>
          <div><p className="text-xs text-gray-500">Client</p>
            <a href={addressUrl(task.client)} target="_blank" rel="noopener noreferrer" className="text-sm font-mono text-white hover:text-gen-green">{shortenAddress(task.client,4)}</a>
          </div>
          <div><p className="text-xs text-gray-500">Worker</p>
            {task.worker
              ? <a href={addressUrl(task.worker)} target="_blank" rel="noopener noreferrer" className="text-sm font-mono text-white hover:text-gen-green">{shortenAddress(task.worker,4)}</a>
              : <p className="text-sm text-gray-500">—</p>}
          </div>
          {task.review_deadline > 0 && task.submitted_at > 0 && (
            <div><p className="text-xs text-gray-500">Review Deadline</p><p className="text-sm text-white">{formatTimestamp(task.review_deadline)}</p></div>
          )}
          {task.dispute_bond > 0 && (
            <div><p className="text-xs text-gray-500">Bond</p><p className="text-sm text-orange-400">{formatWei(task.dispute_bond)}</p></div>
          )}
        </div>
      </div>

      {/* Timeline */}
      {tl.length > 1 && (
        <div className="card-glass px-5 py-4">
          <div className="flex flex-wrap items-center gap-1">
            {tl.map((e, i) => (
              <React.Fragment key={i}>
                <div className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                  e.done
                    ? e.label === "Disputed"
                      ? "bg-orange-500/15 text-orange-300 border border-orange-500/20"
: e.label.startsWith("AI:")
    ? e.label.includes("Approved")
      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
      : "bg-red-500/15 text-red-300 border border-red-500/20"
                        : "bg-gen-blue/15 text-gen-blue border border-gen-blue/20"
                    : "bg-dark-700 text-gray-500 border border-dark-500"
                }`}>{e.label}</div>
                {i < tl.length - 1 && <span className="text-gray-600 text-xs">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Evidence */}
      {task.evidence_url && (
        <div className={`card-glass overflow-hidden ${hasAI ? (aiApproved ? "border-emerald-500/30" : "border-red-500/30") : "border-dark-500"}`}
          style={{ borderWidth: "1px" }}>
          <div className={`px-6 py-3 border-b border-dark-500/40 ${
            hasAI ? (aiApproved ? "bg-emerald-500/10" : "bg-red-500/10") : task.status === "REVIEWING" ? "bg-gen-purple/10" : "bg-dark-700/50"
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                {hasAI ? (
                  aiApproved ? <span className="text-emerald-400">✅ Approved</span>
                             : <span className="text-red-400">❌ Rejected</span>
                ) : task.status === "REVIEWING" ? (
                  <span className="text-gen-purple">🔄 AI is reviewing</span>
                ) : (
                  <span className="text-gray-300">📎 EVIDENCE</span>
                )}
                <span className="text-gray-500 font-normal">from worker</span>
              </h3>
              {hasAI && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 rounded-full bg-dark-700 overflow-hidden">
                    <div className={`h-full rounded-full ${aiApproved ? "bg-emerald-400" : "bg-red-400"}`}
                      style={{ width: `${task.ai_score}%` }} />
                  </div>
                  <span className={`text-sm font-bold font-mono ${aiApproved ? "text-emerald-400" : "text-red-400"}`}>
                    {task.ai_score}/100
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-5 space-y-3">
            <div>
              <a href={task.evidence_url} target="_blank" rel="noopener noreferrer"
                className="text-gen-green hover:underline break-all text-sm font-mono">
                {task.evidence_url} ↗
              </a>
            </div>
            {task.evidence_note && (
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{task.evidence_note}</p>
            )}

            {hasAI && (
              <div className={`rounded-lg p-4 ${aiApproved ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-red-500/5 border border-red-500/20"}`}>
                <p className="text-sm text-white leading-relaxed mb-2">&quot;{task.ai_reason}&quot;</p>
                <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                  <span>Verdict: <strong className={aiApproved ? "text-emerald-400" : "text-red-400"}>{friendlyVerdict(task.ai_verdict)}</strong></span>
                  <span>Score: <strong className="text-white font-mono">{task.ai_score}/100</strong></span>
                  {task.reviewed_at > 0 && <span>Reviewed: <span className="font-mono">{formatTimestamp(task.reviewed_at)}</span></span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settlement */}
      {resolved && (
        <div className={`card-glass p-6 ${
          task.status === "COMPLETED" ? "border border-emerald-500/20" :
          task.status === "REFUNDED" ? "border border-gen-blue/20" : "border border-gray-500/20"
        }`}>
          <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-gray-400">
            {task.status === "COMPLETED" ? "💰 Settlement — Worker Paid" :
             task.status === "REFUNDED" ? "💸 Client Refunded" :
             "✋ Cancelled — Client Refunded"}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-gray-500">Reward</p><p className="font-semibold text-amber-400">{formatWei(task.reward)}</p></div>
            <div><p className="text-xs text-gray-500">Bond</p><p className="font-semibold text-orange-400">{formatWei(task.dispute_bond)}</p></div>
            <div><p className="text-xs text-gray-500">Total → {task.decision ? friendlyVerdict(task.decision) : "Client"}</p><p className="font-semibold text-white">{formatWei(task.reward + task.dispute_bond)}</p></div>
            <div><p className="text-xs text-gray-500">Resolved</p><p className="text-white font-mono">{formatTimestamp(task.resolved_at)}</p></div>
          </div>
          {task.reason && <p className="mt-4 text-sm text-gray-400 italic">&quot;{task.reason}&quot;</p>}
        </div>
      )}

      {/* AI animation */}
      {busy && aiPhase > 0 && (
        <div className="card-glass p-6 glow-border">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-gen-purple animate-pulse" />
            <h3 className="text-sm font-bold text-gen-purple uppercase tracking-wider">GenLayer AI</h3>
          </div>
          {AI_PHASES.map((p, i) => (
            <div key={i} className={`flex items-center gap-3 mb-2 ${i < aiPhase ? "text-gen-purple" : i === aiPhase ? "text-white" : "text-gray-600"}`}>
              <span className={i === aiPhase ? "animate-pulse" : ""}>{i < aiPhase ? "✅" : p.icon}</span>
              <span className="text-sm">{p.label}</span>
            </div>
          ))}
        </div>
      )}
      {busy && aiPhase === 0 && (
        <div className="card-glass p-6 glow-border">
          <p className="text-sm text-gen-green animate-pulse">⛓ Waiting for transaction finality…</p>
        </div>
      )}

      {/* TX message */}
      {msg && (
        <div className={`rounded-xl border p-4 ${msg.type === "ok" ? "border-gen-green/30 bg-gen-green/10" : "border-red-500/30 bg-red-500/10"}`}>
          <p className={`text-sm ${msg.type === "ok" ? "text-gen-green" : "text-red-400"}`}>
            {msg.type === "ok" ? "✅" : "❌"} {msg.text}
          </p>
          {msg.tx && <a href={txUrl(msg.tx)} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs font-mono text-gray-400 break-all hover:text-gen-green">{msg.tx} ↗</a>}
        </div>
      )}

      {/* ── Actions ── */}
      {address ? (
        <div className="card-glass p-6">
          <div className="space-y-3">

            {/* OPEN */}
            {task.status === "OPEN" && (
              <>
                {!isClient && state?.can_accept && (
                  <button onClick={() => run("accept_task", [taskId])} disabled={busy} className="btn-primary w-full py-3">
                    Accept Task
                  </button>
                )}
                {isClient && (
                  <button onClick={() => run("cancel_task", [taskId])} disabled={busy}
                    className="btn-ghost w-full border-red-500/30 text-red-400 hover:bg-red-500/10">
                    Cancel Task
                  </button>
                )}
                {state?.can_claim_expired && (
                  <button onClick={() => run("claim_expired", [taskId])} disabled={busy}
                    className="btn-ghost w-full border-amber-500/30 text-amber-300 hover:bg-amber-500/10">
                    Refund After Deadline
                  </button>
                )}
              </>
            )}

            {/* ACCEPTED */}
            {task.status === "ACCEPTED" && (
              <>
                {isWorker && (
                  <div className="space-y-3">
                    <input type="url" value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)}
                      placeholder="Evidence URL (public webpage)" className="input-dark font-mono" />
                    <textarea value={evidenceNote} onChange={e => setEvidenceNote(e.target.value)}
                      placeholder="Additional notes (optional)…" rows={3} className="input-dark resize-none" />
                    <button onClick={submitAndReview}
                      disabled={busy || !evidenceUrl} className="btn-primary w-full py-3">
                      Submit Work + AI Review
                    </button>
                  </div>
                )}
                {state?.can_claim_expired && (
                  <button onClick={() => run("claim_expired", [taskId])} disabled={busy}
                    className="btn-ghost w-full border-amber-500/30 text-amber-300 hover:bg-amber-500/10">
                    Refund After Deadline
                  </button>
                )}
              </>
            )}

            {/* REVIEWING */}
            {task.status === "REVIEWING" && (
              <button onClick={runReview} disabled={busy} className="btn-primary w-full py-3">
                🤖 Run AI Review
              </button>
            )}

            {/* SUBMITTED */}
            {task.status === "SUBMITTED" && (
              <>
                {isClient && (
                  <div className="space-y-3">
                    {state?.can_approve && (
                      <button onClick={() => run("approve_task", [taskId])} disabled={busy} className="btn-primary w-full py-3">
                        Approve — pay worker {formatWei(task.reward)}
                      </button>
                    )}
                    {state?.can_dispute && (
                      <div className="flex gap-3">
                        <input type="number" min="0" step="0.001" value={bond}
                          onChange={e => setBond(e.target.value)} placeholder="Bond (GEN)"
                          className="input-dark flex-1" />
                        <button onClick={() => {
                          const w = BigInt(Math.floor(parseFloat(bond || "0") * 1e18));
                          run("open_dispute", [taskId, w], w);
                        }} disabled={busy || !bond}
                          className="btn-ghost px-5 border-orange-500/30 text-orange-300 hover:bg-orange-500/10">
                          Dispute
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {isWorker && (
                  <p className="text-xs text-gray-500 text-center py-2">
                    Waiting for client approval · {formatTimestamp(task.review_deadline)} · payment releases automatically after the review period
                  </p>
                )}
                {state?.can_auto_release && (
                  <button onClick={() => run("auto_release", [taskId])} disabled={busy} className="btn-primary w-full py-3">
                    ⏳ Release Funds Now
                  </button>
                )}
              </>
            )}

            {/* DISPUTED */}
            {task.status === "DISPUTED" && (
              <button onClick={() => run("adjudicate", [taskId], BigInt(0), true)} disabled={busy} className="btn-primary w-full py-4 text-base">
                ⚖️ Run GenLayer Court
              </button>
            )}

            {resolved && <p className="text-center text-sm text-gray-400 py-2">Settled</p>}
          </div>
        </div>
      ) : (
        <div className="card-glass p-6 text-center text-sm text-gray-400">
          {mmAvailable ? "🦊 Connect wallet to interact" : "Install MetaMask to interact"}
        </div>
      )}
    </div>
  );
}
