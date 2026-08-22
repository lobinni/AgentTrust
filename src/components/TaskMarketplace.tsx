"use client";

import React, { useEffect, useState, useCallback } from "react";
import type { ContractTask } from "@/lib/types";
import { shortenAddress, formatTimestamp, formatWei, friendlyStatus, friendlyVerdict } from "@/lib/utils";
import { getAllTasks, getOpenTasks, getTasksByStatus } from "@/lib/genlayer-client";

interface Props { onSelectTask: (id: string) => void }
type Filter = "all" | "OPEN" | "SUBMITTED" | "DISPUTED" | "COMPLETED";

export default function TaskMarketplace({ onSelectTask }: Props) {
  const [tasks, setTasks] = useState<ContractTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const fetch_ = useCallback(async (f: Filter) => {
    setLoading(true); setError(null);
    try {
      setTasks(
        f === "all" ? await getAllTasks(50) :
        f === "OPEN" ? await getOpenTasks(0, 50) :
        await getTasksByStatus(f, 0, 50)
      );
    } catch (e: any) { setError(e?.message || "Failed to read contract"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(filter); }, [filter, fetch_]);

  const pill = (s: string) => `pill pill-${s.toLowerCase().replace(/ing$/, "")}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Task Marketplace</h2>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-dark-500 overflow-hidden">
            {(["all","OPEN","SUBMITTED","DISPUTED","COMPLETED"] as Filter[]).map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter===f ? "bg-gen-green/20 text-gen-green" : "text-gray-400 hover:text-gray-200"
                }`}>
                {f==="all"?"All":friendlyStatus(f)}
              </button>
            ))}
          </div>
          <button onClick={()=>fetch_(filter)} className="btn-sm">↻ Refresh</button>
        </div>
      </div>

      {error && (
        <div className="card-glass p-8 mb-6 text-center border border-red-500/30">
          <p className="text-red-400 text-sm">⚠ {error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4,5,6].map(i=>(
            <div key={i} className="card-glass p-5 animate-pulse">
              <div className="h-5 bg-dark-500 rounded w-3/4 mb-3" />
              <div className="h-3 bg-dark-500 rounded w-full mb-2" />
              <div className="h-3 bg-dark-500 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="card-glass p-12 text-center">
          <p className="text-gray-500">No tasks yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map(t=>(
            <div key={t.task_id} onClick={()=>onSelectTask(t.task_id)}
              className="card-glass p-5 hover:glow-border transition-all cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-white group-hover:text-gen-green transition-colors line-clamp-1">
                  {t.title}
                </h3>
                <span className={pill(t.status)}>{friendlyStatus(t.status)}</span>
              </div>
              <p className="text-sm text-gray-400 line-clamp-2 mb-4">{t.terms}</p>

              {t.ai_verdict && (
                <div className={`rounded-lg px-3 py-2 mb-3 text-xs font-semibold ${
                  t.ai_verdict === "APPROVED" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-300 border border-red-500/20"
                }`}>
                  {t.ai_verdict === "APPROVED" ? "✅" : "❌"} AI {friendlyVerdict(t.ai_verdict)} · {t.ai_score}/100
                </div>
              )}

              {!t.ai_verdict && t.decision && t.reason && (
                <div className={`rounded-lg px-3 py-2 mb-3 text-xs font-semibold ${
                  t.decision === "WORKER" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-300 border border-red-500/20"
                }`}>
                  {t.decision === "WORKER" ? "✅" : "❌"} {friendlyVerdict(t.decision)} won · {t.score}/100
                </div>
              )}

              <div className="space-y-2 border-t border-dark-500/60 pt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Client</span>
                  <span className="font-mono text-gray-300">{shortenAddress(t.client,4)}</span>
                </div>
                {t.worker && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Worker</span>
                    <span className="font-mono text-gray-300">{shortenAddress(t.worker,4)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Escrow</span>
                  <span className="font-semibold text-amber-400">{formatWei(t.reward)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Deadline</span>
                  <span className="text-gray-300">{formatTimestamp(t.deadline)}</span>
                </div>
              </div>

              {t.status === "OPEN" && (
                <div className="mt-4 rounded-lg border border-gen-green/30 bg-gen-green/10 py-2 text-center text-xs font-semibold text-gen-green">
                  Accept Task →
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
