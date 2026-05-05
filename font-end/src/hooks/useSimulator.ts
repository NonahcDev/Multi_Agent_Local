"use client";

import { useEffect } from "react";
import { useAgentStore } from "@/store/agentStore";

export function useSimulator(intervalMs = 1200) {
  const tickAll = useAgentStore((s) => s.tickAll);

  useEffect(() => {
    const id = setInterval(tickAll, intervalMs);
    return () => clearInterval(id);
  }, [tickAll, intervalMs]);
}
