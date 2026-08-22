"use client";

import React, { useEffect, useState } from "react";
import type { ContractStats, ContractConfig } from "@/lib/types";
import { shortenAddress } from "@/lib/utils";
import { getStats, getConfig, CONTRACT_ADDRESS, addressUrl } from "@/lib/genlayer-client";

export default function NetworkStats() {
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [config, setConfig] = useState<ContractConfig | null>(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
    getConfig().then(setConfig).catch(() => {});
  }, []);

  const items = [
    { label: "Tasks", value: stats ? Number(stats.task_count) : "—" },
    { label: "Participants", value: stats ? Number(stats.profile_count) : "—" },
    { label: "Review Period", value: config ? `${Number(config.review_period) / 3600}h` : "—" },
    { label: "Min Reward", value: config ? String(config.min_reward) : "—" },
    { label: "Min Bond", value: config ? String(config.min_dispute_bond) : "—" },
  ];

  return (
    <div className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <a href={addressUrl(CONTRACT_ADDRESS)} target="_blank" rel="noopener noreferrer"
          className="text-xs font-mono text-gen-green hover:underline">
          {shortenAddress(CONTRACT_ADDRESS, 8)} ↗
        </a>
        {config?.owner && (
          <span className="text-xs text-gray-500">
            Owner: <a href={addressUrl(config.owner)} target="_blank" rel="noopener noreferrer"
              className="font-mono hover:text-gen-green">{shortenAddress(config.owner, 6)}</a>
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {items.map((item) => (
          <div key={item.label} className="card-glass p-4 hover:glow-border transition-shadow">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">{item.label}</p>
            <p className="text-xl font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
