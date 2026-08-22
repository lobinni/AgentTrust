"use client";

import React, { useState } from "react";
import { useWallet } from "./WalletContext";
import {
  writeAndFinalize,
  txUrl,
  GenLayerTransactionError,
} from "@/lib/genlayer-client";
import { deadlineFromHours } from "@/lib/utils";

export default function CreateTask({ onCreated }: { onCreated: (id: string) => void }) {
  const { address, connect } = useWallet();
  const [form, setForm] = useState({ title: "", terms: "", reward: "1", hours: "48" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string; tx?: string; id?: string } | null>(null);

  const submit = async () => {
    if (!address) return;
    setBusy(true); setResult(null);
    try {
      const { hash, receipt } = await writeAndFinalize({
        address,
        functionName: "create_task",
        args: [form.title, form.terms, BigInt(deadlineFromHours(Number(form.hours) || 48))],
        value: BigInt(Math.floor(parseFloat(form.reward || "0") * 1e18)),
      });
      const tid = (receipt?.result as string) || (receipt?.rawResult as string) || "";
      setResult({ ok: true, msg: "Task created", tx: hash, id: tid });
      if (tid) { setForm({ title: "", terms: "", reward: "1", hours: "48" }); onCreated(tid); }
    } catch (e: any) {
      setResult({
        ok: false,
        msg: e?.code === 4001 ? "Rejected in MetaMask." : (e?.message || String(e)),
        tx: e instanceof GenLayerTransactionError ? e.hash : undefined,
      });
    } finally { setBusy(false); }
  };

  if (!address) return (
    <div className="card-glass p-12 text-center max-w-xl mx-auto">
      <p className="text-5xl mb-4">🦊</p>
      <h3 className="text-xl font-semibold text-white mb-2">Connect Wallet</h3>
      <button onClick={connect} className="btn-primary text-base px-8 py-3">Connect MetaMask</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Create Task</h2>

      {result && (
        <div className={`rounded-xl border p-4 mb-6 ${result.ok ? "border-gen-green/30 bg-gen-green/10" : "border-red-500/30 bg-red-500/10"}`}>
          <p className={`text-sm font-medium ${result.ok ? "text-gen-green" : "text-red-400"}`}>{result.ok ? "✅" : "❌"} {result.msg}</p>
          {result.tx && <a href={txUrl(result.tx)} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs font-mono text-gray-400 break-all hover:text-gen-green">TX: {result.tx} ↗</a>}
          <button onClick={() => setResult(null)} className="mt-3 text-xs text-gray-400 hover:text-white">Dismiss</button>
        </div>
      )}

      <div className="card-glass p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
          <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Task title" className="input-dark" disabled={busy} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Terms</label>
          <textarea value={form.terms} onChange={e => setForm({...form, terms: e.target.value})} placeholder="Describe what needs to be done" rows={5} className="input-dark resize-none" disabled={busy} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Reward (GEN)</label>
            <input type="number" min="0" step="0.001" value={form.reward} onChange={e => setForm({...form, reward: e.target.value})} className="input-dark" disabled={busy} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Deadline (hours)</label>
            <input type="number" min="1" value={form.hours} onChange={e => setForm({...form, hours: e.target.value})} className="input-dark" disabled={busy} />
          </div>
        </div>
        <button onClick={submit} disabled={busy || !form.title || !form.terms || !form.reward} className="btn-primary w-full py-3">
          {busy ? "Creating…" : "Create Task"}
        </button>
      </div>
    </div>
  );
}
