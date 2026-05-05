"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Trash2, Edit2, Check, ChevronDown, ChevronRight,
  Plus, Database, MessageSquare, AlertTriangle,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAgentStore } from "@/store/agentStore";
import { useShallow } from "zustand/react/shallow";
import type { StoredSession } from "@/lib/chatStorage";
import {
  getAllSessions, deleteSession, renameSession,
  clearAllSessions, createEmptySession,
} from "@/lib/chatStorage";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function DatabasePanel({ open, onClose }: Props) {
  const { isDark } = useTheme();
  const agents = useAgentStore(useShallow((s) => s.agents.filter((a) => a.role !== "global")));

  const accentBlue = isDark ? "#7CC7E8" : "#5BAACC";
  const accentRed  = isDark ? "#F4A8C8" : "#E07090";
  const accentGreen = isDark ? "#8ED9B9" : "#5DAF8A";

  const [sessions, setSessions]       = useState<StoredSession[]>([]);
  const [expanded, setExpanded]       = useState<string | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editName, setEditName]       = useState("");
  const [creating, setCreating]       = useState(false);
  const [newName, setNewName]         = useState("");
  const [newAgentId, setNewAgentId]   = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const refresh = useCallback(() => setSessions(getAllSessions()), []);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  const startEdit = (s: StoredSession) => { setEditingId(s.id); setEditName(s.name); };

  const commitEdit = (id: string) => {
    if (editName.trim()) renameSession(id, editName.trim());
    setEditingId(null);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteSession(id);
    if (expanded === id) setExpanded(null);
    refresh();
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createEmptySession(newAgentId || (agents[0]?.id ?? "unknown"), newName.trim());
    setNewName(""); setNewAgentId(""); setCreating(false);
    refresh();
  };

  const handleClearAll = () => {
    clearAllSessions();
    setSessions([]); setExpanded(null); setConfirmClear(false);
  };

  const formatDate = (id: string) =>
    new Date(Number(id)).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });

  const navItemStyle = {
    base: "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-mono transition-all relative w-full text-left",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[420px] flex flex-col border-l overflow-hidden"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b shrink-0"
              style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4" style={{ color: accentBlue }} />
                <span className="font-mono font-bold text-sm" style={{ color: "var(--text-1)" }}>Database</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold"
                  style={{ backgroundColor: `${accentBlue}18`, color: accentBlue, border: `1px solid ${accentBlue}30` }}>
                  localStorage
                </span>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-2)" }}>
                  {sessions.length} sessions
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setCreating(!creating); setConfirmClear(false); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono border transition-colors"
                  style={{
                    backgroundColor: creating ? `${accentBlue}18` : "transparent",
                    borderColor: `${accentBlue}40`, color: accentBlue,
                  }}
                >
                  <Plus className="w-3 h-3" /> New
                </button>
                <button onClick={onClose} className="p-1.5 rounded hover:opacity-70 transition-opacity">
                  <X className="w-4 h-4" style={{ color: "var(--text-2)" }} />
                </button>
              </div>
            </div>

            {/* ── Create Form ── */}
            <AnimatePresence>
              {creating && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b shrink-0" style={{ borderColor: "var(--border)" }}
                >
                  <div className="px-4 py-3 space-y-2" style={{ backgroundColor: "var(--surface-2)" }}>
                    <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--text-2)" }}>
                      Create New Session
                    </p>
                    <input
                      autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                      placeholder="Session name..."
                      className="w-full text-[11px] font-mono px-2.5 py-1.5 rounded border outline-none"
                      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-1)" }}
                    />
                    <select
                      value={newAgentId} onChange={(e) => setNewAgentId(e.target.value)}
                      className="w-full text-[11px] font-mono px-2.5 py-1.5 rounded border outline-none"
                      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-1)" }}
                    >
                      <option value="">Select agent...</option>
                      {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreate} disabled={!newName.trim()}
                        className="flex-1 py-1.5 rounded text-[10px] font-mono font-bold border transition-all"
                        style={{
                          backgroundColor: `${accentBlue}18`, borderColor: `${accentBlue}40`,
                          color: accentBlue, opacity: !newName.trim() ? 0.4 : 1,
                        }}
                      >
                        Create
                      </button>
                      <button
                        onClick={() => { setCreating(false); setNewName(""); setNewAgentId(""); }}
                        className="px-3 py-1.5 rounded text-[10px] font-mono border"
                        style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Session List ── */}
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3"
                  style={{ color: "var(--text-2)" }}>
                  <Database className="w-10 h-10 opacity-20" />
                  <p className="text-xs font-mono opacity-40">No sessions stored</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--divider)" }}>
                  {sessions.map((s) => (
                    <div key={s.id}>
                      {/* Row */}
                      <div
                        className="flex items-center gap-2 px-4 py-3 group transition-colors"
                        style={{ backgroundColor: expanded === s.id ? "var(--surface-2)" : "transparent" }}
                      >
                        <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="flex-shrink-0">
                          {expanded === s.id
                            ? <ChevronDown  className="w-3.5 h-3.5" style={{ color: "var(--text-2)" }} />
                            : <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-2)" }} />}
                        </button>

                        <div className="flex-1 min-w-0">
                          {editingId === s.id ? (
                            <input
                              autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter")  commitEdit(s.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              onBlur={() => commitEdit(s.id)}
                              className="w-full text-[11px] font-mono px-1.5 py-0.5 rounded border outline-none"
                              style={{ backgroundColor: "var(--surface)", borderColor: accentBlue, color: "var(--text-1)" }}
                            />
                          ) : (
                            <p className="text-[11px] font-mono truncate" style={{ color: "var(--text-1)" }}>
                              {s.name}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[9px] font-mono px-1 py-px rounded"
                              style={{ backgroundColor: `${accentBlue}15`, color: accentBlue }}>
                              {s.agentId}
                            </span>
                            <span className="flex items-center gap-0.5 text-[9px] font-mono"
                              style={{ color: "var(--text-2)" }}>
                              <MessageSquare className="w-2.5 h-2.5" />
                              {s.messages.length}
                            </span>
                            <span className="text-[9px] font-mono" style={{ color: "var(--text-2)" }}>
                              {formatDate(s.id)}
                            </span>
                          </div>
                        </div>

                        {/* Actions — visible on hover */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {editingId === s.id ? (
                            <button onClick={() => commitEdit(s.id)} className="p-1.5 rounded hover:opacity-70">
                              <Check className="w-3.5 h-3.5" style={{ color: accentBlue }} />
                            </button>
                          ) : (
                            <button onClick={() => startEdit(s)} className="p-1.5 rounded hover:opacity-70">
                              <Edit2 className="w-3.5 h-3.5" style={{ color: "var(--text-2)" }} />
                            </button>
                          )}
                          <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded hover:opacity-70">
                            <Trash2 className="w-3.5 h-3.5" style={{ color: accentRed }} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Messages */}
                      <AnimatePresence>
                        {expanded === s.id && (
                          <motion.div
                            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-3 space-y-1.5 border-b"
                              style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--divider)" }}>
                              <p className="text-[9px] font-mono uppercase tracking-widest pt-2 mb-2"
                                style={{ color: "var(--text-2)" }}>
                                Messages ({s.messages.length})
                              </p>
                              {s.messages.length === 0 ? (
                                <p className="text-[10px] font-mono pb-1" style={{ color: "var(--text-2)" }}>
                                  No messages in this session
                                </p>
                              ) : (
                                s.messages.map((m, i) => (
                                  <div key={i} className="flex gap-2 items-start">
                                    <span
                                      className="text-[9px] font-mono px-1.5 py-px rounded flex-shrink-0 font-bold mt-px"
                                      style={{
                                        backgroundColor: m.role === "user"
                                          ? `${accentBlue}20` : `${accentGreen}20`,
                                        color: m.role === "user" ? accentBlue : accentGreen,
                                      }}
                                    >
                                      {m.role === "user" ? "YOU" : "AI"}
                                    </span>
                                    <p className="text-[10px] font-mono leading-relaxed break-words flex-1"
                                      style={{ color: "var(--text-1)" }}>
                                      {m.content.length > 220 ? m.content.slice(0, 217) + "…" : m.content}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="px-4 py-3 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
              {confirmClear ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accentRed }} />
                  <span className="text-[10px] font-mono flex-1" style={{ color: "var(--text-2)" }}>
                    Delete all {sessions.length} sessions?
                  </span>
                  <button onClick={handleClearAll}
                    className="px-2 py-1 rounded text-[10px] font-mono border"
                    style={{ borderColor: `${accentRed}50`, color: accentRed }}>
                    Yes, clear
                  </button>
                  <button onClick={() => setConfirmClear(false)}
                    className="px-2 py-1 rounded text-[10px] font-mono border"
                    style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)} disabled={sessions.length === 0}
                  className="flex items-center gap-1.5 text-[10px] font-mono transition-opacity"
                  style={{ color: accentRed, opacity: sessions.length === 0 ? 0.3 : 0.65 }}
                >
                  <Trash2 className="w-3 h-3" /> Clear all sessions
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
