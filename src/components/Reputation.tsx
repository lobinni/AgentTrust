"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useWallet } from "./WalletContext";
import type { ContractProfile } from "@/lib/types";
import { shortenAddress, formatWei } from "@/lib/utils";
import { getProfile, getLeaderboard, addressUrl } from "@/lib/genlayer-client";

export default function Reputation() {
  const { address, connect } = useWallet();
  const [profile, setProfile] = useState<ContractProfile | null>(null);
  const [board, setBoard] = useState<ContractProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([
        getLeaderboard(0, 50),
        address ? getProfile(address).catch(() => null) : Promise.resolve(null),
      ]);
      setBoard(b || []);
      setProfile(p);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [address]);

  useEffect(() => { load(); }, [load]);

  const medal = (i: number) => i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `#${i+1}`;
  const sc = (s: number) => s >= 800 ? "text-gen-green" : s >= 600 ? "text-gen-blue" : s >= 400 ? "text-amber-400" : "text-red-400";

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Reputation</h2>

      {address && profile && (
        <div className="card-glass p-6 mb-8 glow-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gen-green uppercase tracking-wider">Your Profile</h3>
            <a href={addressUrl(address)} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-gray-400 hover:text-gen-green">{shortenAddress(address,6)} ↗</a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center"><p className={`text-4xl font-bold font-mono ${sc(profile.reputation)}`}>{profile.reputation}</p><p className="text-xs text-gray-500 mt-1">Score (0–1000)</p></div>
            <div><p className="text-xl font-semibold text-white">{profile.jobs_completed}</p><p className="text-xs text-gray-500">Completed</p><p className="text-sm text-red-400 mt-0.5">{profile.jobs_failed} failed</p></div>
            <div><p className="text-xl font-semibold text-gen-green">{profile.disputes_won}</p><p className="text-xs text-gray-500">Disputes Won</p><p className="text-sm text-red-400 mt-0.5">{profile.disputes_lost} lost</p></div>
            <div><p className="text-xl font-semibold text-amber-400">{formatWei(profile.total_earned)}</p><p className="text-xs text-gray-500">Earned</p></div>
          </div>
        </div>
      )}

      {!address && (
        <div className="card-glass p-8 mb-8 text-center">
          <p className="text-gray-400 mb-4 text-sm">Connect wallet to view your reputation</p>
          <button onClick={connect} className="btn-primary text-sm">Connect MetaMask</button>
        </div>
      )}

      <div className="card-glass overflow-hidden">
        <div className="p-4 border-b border-dark-500 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Leaderboard</h3>
          <button onClick={load} className="btn-sm" disabled={loading}>↻ Refresh</button>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">{[1,2,3,4,5].map(i=><div key={i} className="h-12 bg-dark-700 rounded animate-pulse" />)}</div>
        ) : board.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Leaderboard appears after participation.</div>
        ) : (
          <div className="divide-y divide-dark-500/40">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-dark-700/50">
              <div className="col-span-1">#</div><div className="col-span-4">Address</div><div className="col-span-2 text-center">Jobs</div><div className="col-span-2 text-center">Disputes</div><div className="col-span-3 text-right">Score</div>
            </div>
            {board.map((e, i) => (
              <div key={e.address} className={`grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-dark-700/30 ${e.address?.toLowerCase()===address?.toLowerCase()?"bg-gen-green/5 border-l-2 border-gen-green":""}`}>
                <div className="col-span-1"><span className={`text-sm font-bold ${i<3?"text-gen-green":"text-gray-400"}`}>{medal(i)}</span></div>
                <div className="col-span-4"><a href={addressUrl(e.address)} target="_blank" rel="noopener noreferrer" className="text-sm text-white font-mono hover:text-gen-green">{shortenAddress(e.address,5)} ↗</a></div>
                <div className="col-span-2 text-center text-sm"><span className="text-gen-green">{e.jobs_completed}</span><span className="text-xs text-gray-500"> / </span><span className="text-red-400">{e.jobs_failed}</span></div>
                <div className="col-span-2 text-center text-sm"><span className="text-gen-blue">{e.disputes_won}</span><span className="text-xs text-gray-500"> / </span><span className="text-orange-400">{e.disputes_lost}</span></div>
                <div className="col-span-3 text-right flex items-center justify-end gap-2">
                  <div className="h-2 w-16 rounded-full bg-dark-600 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-gen-green to-gen-blue" style={{width:`${Math.min(e.reputation/10,100)}%`}} /></div>
                  <span className={`text-sm font-bold ${sc(e.reputation)}`}>{e.reputation}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
