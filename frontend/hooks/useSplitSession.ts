"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSession, updateSession } from "@/lib/api";
import { ChargeSplitMode, Person, ReceiptItem, SplitSession } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved" | "error";

export function useSplitSession(sessionId: string) {
  const [session, setSession] = useState<SplitSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getSession(sessionId);
        setSession(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [sessionId]);

  useEffect(() => {
    if (!session) return;
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSaveState("saving");
        await updateSession(session);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [session]);

  const setItems = useCallback((items: ReceiptItem[]) => {
    setSession((prev) => (prev ? { ...prev, items } : prev));
  }, []);

  const setPeople = useCallback((people: Person[]) => {
    setSession((prev) => (prev ? { ...prev, people } : prev));
  }, []);

  const setChargeSplitMode = useCallback((chargeSplitMode: ChargeSplitMode) => {
    setSession((prev) => (prev ? { ...prev, charge_split_mode: chargeSplitMode } : prev));
  }, []);

  const setName = useCallback((name: string) => {
    setSession((prev) => (prev ? { ...prev, name } : prev));
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      error,
      saveState,
      setItems,
      setPeople,
      setChargeSplitMode,
      setName,
      setSession,
    }),
    [session, loading, error, saveState, setItems, setPeople, setChargeSplitMode, setName]
  );

  return value;
}
