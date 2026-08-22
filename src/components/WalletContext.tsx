"use client";

import React, {
  createContext, useContext, useState, useCallback, useEffect,
  type ReactNode,
} from "react";
import {
  connectMetaMask, hasMetaMask, checkChain, ensureChain, CHAIN,
} from "@/lib/genlayer-client";

interface WalletCtx {
  address: string | null;
  chainOk: boolean;
  error: string | null;
  mmAvailable: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
  switchChain: () => Promise<void>;
}

const Ctx = createContext<WalletCtx>({
  address: null, chainOk: true, error: null, mmAvailable: false,
  connect: async () => {}, disconnect: () => {}, clearError: () => {},
  switchChain: async () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainOk, setChainOk] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mmAvailable, setMm] = useState(false);

  // ── Check chain + listen for changes ──
  useEffect(() => {
    const hasMM = hasMetaMask();
    setMm(hasMM);
    if (!hasMM || !window.ethereum) return;

    // Initial check
    checkChain().then(setChainOk);

    // Listen for account changes
    const onAccounts = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAddress(null);
      } else {
        setAddress(accounts[0]);
      }
    };

    // Listen for chain changes — recheck immediately
    const onChainChanged = (_chainId: string) => {
      const ok = _chainId.toLowerCase() === CHAIN.hex;
      setChainOk(ok);
    };

    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChainChanged);

    // Check if already connected (page reload)
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accs: string[]) => {
        if (accs?.length > 0) setAddress(accs[0]);
      })
      .catch(() => {});

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", onAccounts);
      window.ethereum?.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  // ── Connect: add/switch chain + request accounts ──
  const connect = useCallback(async () => {
    setError(null);
    try {
      const addr = await connectMetaMask();
      setAddress(addr);
      setChainOk(true);
    } catch (e: any) {
      if (e?.code === 4001) {
        setError("You rejected the MetaMask connection.");
      } else {
        setError(e?.message || String(e));
      }
    }
  }, []);

  // ── Manual switch chain (for "wrong network" banner button) ──
  const switchChain = useCallback(async () => {
    setError(null);
    try {
      const ok = await ensureChain();
      setChainOk(ok);
      if (!ok) {
        setError(`Please switch to ${CHAIN.name} in MetaMask.`);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <Ctx.Provider value={{
      address, chainOk, error, mmAvailable,
      connect, disconnect, clearError, switchChain,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWallet() { return useContext(Ctx); }
