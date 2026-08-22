"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useWallet } from "./WalletContext";
import type { ContractTask } from "@/lib/types";
import { shortenAddress, formatTimestamp, formatWei, friendlyStatus, friendlyVerdict } from "@/lib/utils";
import { getMyTasks } from "@/lib/genlayer-client";

export default function MyTasks({ onSelectTask }: { onSelectTask: (id: string) => void }) {
  const { address, connect } = useWallet();
  const [client, setClient] = useState<ContractTask[]>([]);
  const [worker, setWorker] = useState<ContractTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try { const r = await getMyTasks(address); setClient(r.client); setWorker(r.worker); }
    catch { /* */ }
    finally { setLoading(false); }
  }, [address]);

  useEffect(() => { if (address) fetch_(); }, [address, fetch_]);

  if (!address) return (
    <div className="card-glass p-12 text-center max-w-xl mx-auto">
      <p className="text-5xl mb-4">🦊</p>
      <h3 className="text-xl font-semibold text-white mb-2">Connect Wallet</h3>
      <button onClick={connect} className="btn-primary">Connect MetaMask</button>
    </div>
  );

  const pill = (s: string) => `pill pill-${s.toLowerCase().replace(/ing$/, "")}`;

  const List = ({ tasks, title, empty }: { tasks: ContractTask[]; title: string; empty: string }) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      {loading ? (
        <div className="space-y-3">{[1,2].map(i=><div key={i} className="card-glass p-4 animate-pulse"><div className="h-4 bg-dark-500 rounded w-1/2"/></div>)}</div>
      ) : tasks.length === 0 ? (
        <div className="card-glass p-6 text-center text-gray-500 text-sm">{empty}</div>
      ) : (
        <div className="space-y-3">
          {tasks.map(t => (
            <div key={t.task_id} onClick={() => onSelectTask(t.task_id)} className="card-glass p-4 hover:glow-border transition-all cursor-pointer flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={pill(t.status)}>{friendlyStatus(t.status)}</span>
                  {t.decision && <span className={pill(t.decision)}>{friendlyVerdict(t.decision)}</span>}
                </div>
                <h4 className="text-white font-medium truncate">{t.title}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {t.worker ? `Worker: ${shortenAddress(t.worker,4)}` : "No worker"} · {formatTimestamp(t.created_at)}
                </p>
              </div>
              <div className="text-right ml-4">
                <p className="text-amber-400 font-semibold text-sm">{formatWei(t.reward)}</p>
                {t.score > 0 && <p className="text-xs text-gen-green">{t.score}/100</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">My Tasks</h2>
        <button onClick={fetch_} className="btn-sm" disabled={loading}>↻ Refresh</button>
      </div>
      <List tasks={client} title="Tasks I Created" empty="No tasks yet." />
      <List tasks={worker} title="Tasks I'm Working On" empty="No tasks yet." />
    </div>
  );
}
