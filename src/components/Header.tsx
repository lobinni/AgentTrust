"use client";

import React from "react";
import { useWallet } from "./WalletContext";
import { shortenAddress } from "@/lib/utils";
import { CHAIN } from "@/lib/genlayer-client";

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: "marketplace", label: "Marketplace", icon: "◈" },
  { id: "create",      label: "Create Task",  icon: "+" },
  { id: "my-tasks",    label: "My Tasks",     icon: "☰" },
  { id: "reputation",  label: "Reputation",   icon: "★" },
];

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  const { address, chainOk, error, mmAvailable, connect, disconnect, clearError, switchChain } = useWallet();

  return (
    <header className="sticky top-0 z-50 border-b border-dark-500/40 bg-dark-900/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex h-14 items-center justify-between gap-4">
          <button
            onClick={() => onTabChange("marketplace")}
            className="shrink-0 hover:opacity-80 transition-opacity"
          >
            <span className="text-xl font-bold gradient-text tracking-tight">AgentTrust</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-gray-500 font-mono tracking-wider uppercase">
            <span className={`inline-block h-2 w-2 rounded-full ${chainOk ? "bg-gen-green animate-pulse-slow" : "bg-orange-400"}`} />
            <span>{chainOk ? "Studionet" : "Wrong Network"}</span>
          </div>

          {address ? (
            <div className="flex items-center gap-2">
              <a
                href={`${CHAIN.explorer}/address/${address}`}
                target="_blank" rel="noopener noreferrer"
                className="btn-sm text-gen-green border-gen-green/25 hover:border-gen-green/50"
              >
                <span className="text-[13px]">🦊</span>
                <span className="font-mono text-[12px]">{shortenAddress(address, 4)}</span>
              </a>
              <button onClick={disconnect} className="btn-sm text-gray-500 border-dark-500 hover:text-red-400 hover:border-red-400/30">
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={connect} disabled={!mmAvailable} className="btn-primary text-xs px-5 py-2.5">
              🦊 Connect Wallet
            </button>
          )}
        </div>

        {address && !chainOk && (
          <div className="pb-2.5">
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-orange-300">
                <span className="text-base">⚠️</span>
                <span>Wallet is on the wrong network. Switch to <strong>{CHAIN.name}</strong> to interact.</span>
              </div>
              <button onClick={switchChain}
                className="shrink-0 rounded-lg bg-orange-500/20 border border-orange-500/40 px-4 py-1.5 text-xs font-semibold text-orange-200 hover:bg-orange-500/30 transition-colors">
                Switch Network
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="pb-2">
            <div className="rounded-lg border border-red-500/25 bg-red-500/8 px-4 py-2 text-xs text-red-300 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={clearError} className="text-red-300 hover:text-white ml-4 text-base leading-none">✕</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <nav className="flex gap-1.5 overflow-x-auto pb-3 pt-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`nav-tab ${activeTab === tab.id ? "nav-tab-active" : ""}`}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
