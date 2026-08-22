"use client";

import React, { useState, useCallback } from "react";
import { WalletProvider } from "@/components/WalletContext";
import Header from "@/components/Header";
import NetworkStats from "@/components/NetworkStats";
import TaskMarketplace from "@/components/TaskMarketplace";
import CreateTask from "@/components/CreateTask";
import TaskDetail from "@/components/TaskDetail";
import MyTasks from "@/components/MyTasks";
import Reputation from "@/components/Reputation";
import { CONTRACT_ADDRESS, CHAIN } from "@/lib/genlayer-client";

function App() {
  const [tab, setTab] = useState("marketplace");
  const [taskId, setTaskId] = useState<string | null>(null);

  const selectTask = useCallback((id: string) => setTaskId(id), []);
  const changeTab = useCallback((t: string) => { setTab(t); setTaskId(null); }, []);
  const back = useCallback(() => setTaskId(null), []);
  const created = useCallback((id: string) => { setTaskId(id); setTab("marketplace"); }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header activeTab={tab} onTabChange={changeTab} />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <NetworkStats />

          {taskId ? (
            <TaskDetail taskId={taskId} onBack={back} />
          ) : tab === "marketplace" ? (
            <TaskMarketplace onSelectTask={selectTask} />
          ) : tab === "create" ? (
            <CreateTask onCreated={created} />
          ) : tab === "my-tasks" ? (
            <MyTasks onSelectTask={selectTask} />
          ) : tab === "reputation" ? (
            <Reputation />
          ) : null}
        </div>
      </main>

      <footer className="border-t border-dark-500/30 py-5 px-4">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <span className="font-semibold gradient-text text-sm">AgentTrust</span>
          <div className="flex items-center gap-4">
            <a href={`${CHAIN.explorer}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="hover:text-gen-green transition-colors">Contract ↗</a>
            <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-gen-green transition-colors">Docs ↗</a>
            <a href="https://github.com/lobinni/AgentTrust" target="_blank" rel="noopener noreferrer" className="hover:text-gen-green transition-colors">GitHub ↗</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <WalletProvider>
      <App />
    </WalletProvider>
  );
}
