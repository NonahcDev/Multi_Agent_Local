"use client";

import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronRight, ChevronUp, ChevronLeft,
  Trash2, Edit2, Check, X, Plus, Database, Table2,
  Search, RefreshCw, AlertTriangle, Eye, EyeOff,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAgentStore } from "@/store/agentStore";
import { useShallow } from "zustand/react/shallow";
import type { StoredSession } from "@/lib/chatStorage";
import {
  getAllSessions, deleteSession, renameSession,
  clearAllSessions, createEmptySession,
} from "@/lib/chatStorage";

type Tab      = "browse" | "structure" | "insert";
type SortCol  = "name" | "agentId" | "messages" | "createdAt";
type SortDir  = "asc" | "desc";

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

function paginationItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | "…")[] = [1];
  if (current > 3) items.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) items.push(p);
  if (current < total - 2) items.push("…");
  if (total > 1) items.push(total);
  return items;
}

export function DatabaseView() {
  const { isDark } = useTheme();
  const agents = useAgentStore(useShallow((s) => s.agents.filter((a) => a.role !== "global")));

  const blue  = isDark ? "#7CC7E8" : "#5BAACC";
  const red   = isDark ? "#F4A8C8" : "#E07090";
  const green = isDark ? "#8ED9B9" : "#5DAF8A";
  const gold  = isDark ? "#F5C542" : "#C89A10";

  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const refresh = useCallback(() => setSessions(getAllSessions()), []);
  useEffect(() => { refresh(); }, [refresh]);

  const [tab, setTab]                     = useState<Tab>("browse");
  const [search, setSearch]               = useState("");
  const [sortCol, setSortCol]             = useState<SortCol>("createdAt");
  const [sortDir, setSortDir]             = useState<SortDir>("desc");
  const [page, setPage]                   = useState(1);
  const [perPage, setPerPage]             = useState(25);
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [editingId, setEditingId]         = useState<string | null>(null);
  const [editName, setEditName]           = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | "bulk" | null>(null);
  const [iName, setIName]                 = useState("");
  const [iAgent, setIAgent]               = useState("");
  const [iSuccess, setISuccess]           = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...sessions]
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.agentId.toLowerCase().includes(q))
      .sort((a, b) => {
        const mul = sortDir === "asc" ? 1 : -1;
        if (sortCol === "name")     return mul * a.name.localeCompare(b.name);
        if (sortCol === "agentId")  return mul * a.agentId.localeCompare(b.agentId);
        if (sortCol === "messages") return mul * (a.messages.length - b.messages.length);
        return mul * (Number(a.id) - Number(b.id));
      });
  }, [sessions, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows   = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
    setPage(1);
  };

  const allSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(pageRows.map((r) => r.id)));
  const toggleOne   = (id: string) => setSelected((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const startEdit  = (s: StoredSession) => { setEditingId(s.id); setEditName(s.name); };
  const commitEdit = (id: string) => {
    if (editName.trim()) renameSession(id, editName.trim());
    setEditingId(null); refresh();
  };

  const doDelete = (id: string) => {
    deleteSession(id);
    if (expandedId === id) setExpandedId(null);
    setSelected((p) => { const n = new Set(p); n.delete(id); return n; });
    setConfirmDelete(null); refresh();
  };
  const doBulkDelete = () => {
    selected.forEach(doDelete);
    setSelected(new Set()); setConfirmDelete(null);
  };
  const handleInsert = () => {
    if (!iName.trim()) return;
    createEmptySession(iAgent || (agents[0]?.id ?? "unknown"), iName.trim());
    setIName(""); setIAgent(""); setISuccess(true);
    setTimeout(() => setISuccess(false), 2500);
    refresh();
  };
  const handleClearAll = () => { clearAllSessions(); setSessions([]); setExpandedId(null); setConfirmDelete(null); };

  const fmtDate = (id: string) =>
    new Date(Number(id)).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  const kbUsed = (JSON.stringify(sessions).length / 1024).toFixed(1);

  const SortIco = ({ col }: { col: SortCol }) =>
    sortCol !== col
      ? <ChevronDown className="w-3 h-3 opacity-25 ml-1" />
      : sortDir === "asc"
        ? <ChevronUp   className="w-3 h-3 ml-1" style={{ color: blue }} />
        : <ChevronDown className="w-3 h-3 ml-1" style={{ color: blue }} />;

  const cellBase   = "px-3 py-2.5 text-[11px] font-mono";
  const thStyle    = { color: "var(--text-2)", backgroundColor: "var(--surface-2)" };
  const inputStyle = { backgroundColor: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-1)" };

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">

      {/* ─── Left tree ─── */}
      <aside className="w-48 shrink-0 border-r flex flex-col overflow-hidden"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="px-3 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <p className="text-[9px] font-mono uppercase tracking-widest font-bold" style={{ color: "var(--text-2)" }}>
            Storage
          </p>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2">
          <div className="flex items-center gap-1.5 px-1 py-1">
            <ChevronDown className="w-3 h-3" style={{ color: "var(--text-2)" }} />
            <Database className="w-3.5 h-3.5" style={{ color: blue }} />
            <span className="text-[11px] font-mono font-bold" style={{ color: "var(--text-1)" }}>
              localStorage
            </span>
          </div>
          <div className="ml-4 mt-0.5">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md"
              style={{ backgroundColor: `${blue}12` }}>
              <Table2 className="w-3 h-3 flex-shrink-0" style={{ color: blue }} />
              <span className="text-[10px] font-mono leading-tight break-all" style={{ color: blue }}>
                n8n_chat_sessions
              </span>
            </div>
            <p className="text-[9px] font-mono pl-2 mt-0.5" style={{ color: "var(--text-2)" }}>
              {sessions.length} rows · {kbUsed} KB
            </p>
          </div>
        </div>

        <div className="px-3 py-3 border-t space-y-1" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setConfirmDelete("all")}
            disabled={sessions.length === 0}
            className="w-full flex items-center gap-1.5 text-[10px] font-mono py-1 transition-opacity disabled:opacity-30"
            style={{ color: red }}
          >
            <Trash2 className="w-3 h-3" /> Drop all rows
          </button>
        </div>
      </aside>

      {/* ─── Main panel ─── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* breadcrumb + refresh */}
        <div className="px-5 py-3 border-b shrink-0 flex items-center justify-between"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
          <div>
            <p className="text-[10px] font-mono flex items-center gap-1" style={{ color: "var(--text-2)" }}>
              localStorage
              <ChevronRight className="w-3 h-3" />
              <span style={{ color: blue }}>n8n_chat_sessions</span>
            </p>
            <h1 className="text-sm font-mono font-bold mt-0.5" style={{ color: "var(--text-1)" }}>
              Chat Sessions
              <span className="ml-2 text-[10px] font-normal" style={{ color: "var(--text-2)" }}>
                {filtered.length} rows
              </span>
            </h1>
          </div>
          <button onClick={refresh} title="Refresh" className="p-1.5 rounded hover:opacity-60 transition-opacity">
            <RefreshCw className="w-4 h-4" style={{ color: "var(--text-2)" }} />
          </button>
        </div>

        {/* tabs */}
        <div className="flex items-center border-b shrink-0 px-5"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
          {(["browse", "structure", "insert"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2.5 text-[11px] font-mono uppercase tracking-widest border-b-2 transition-colors"
              style={{
                borderBottomColor: tab === t ? blue : "transparent",
                color: tab === t ? blue : "var(--text-2)",
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* confirm delete overlay */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mx-5 mt-4 flex items-center gap-3 px-4 py-3 rounded-lg border shrink-0"
              style={{ backgroundColor: `${red}10`, borderColor: `${red}40` }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: red }} />
              <span className="text-[11px] font-mono flex-1" style={{ color: "var(--text-1)" }}>
                {confirmDelete === "bulk"
                  ? `Delete ${selected.size} selected row(s)?`
                  : confirmDelete === "all"
                  ? `Drop ALL ${sessions.length} rows? This cannot be undone.`
                  : "Delete this row?"}
              </span>
              <button onClick={() =>
                confirmDelete === "bulk" ? doBulkDelete()
                : confirmDelete === "all" ? handleClearAll()
                : doDelete(confirmDelete)
              }
                className="px-3 py-1 rounded text-[10px] font-mono border font-bold"
                style={{ borderColor: `${red}60`, color: red }}>
                Confirm
              </button>
              <button onClick={() => setConfirmDelete(null)}
                className="px-3 py-1 rounded text-[10px] font-mono border"
                style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ══ BROWSE ══ */}
          {tab === "browse" && (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-52 rounded-lg border px-3 py-1.5"
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
                  <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-2)" }} />
                  <input value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search name or agent ID..."
                    className="flex-1 text-[11px] font-mono outline-none bg-transparent"
                    style={{ color: "var(--text-1)" }}
                  />
                  {search && (
                    <button onClick={() => setSearch("")}>
                      <X className="w-3 h-3" style={{ color: "var(--text-2)" }} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono" style={{ color: "var(--text-2)" }}>Rows:</span>
                  <select value={perPage}
                    onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                    className="text-[11px] font-mono px-2 py-1.5 rounded border outline-none"
                    style={inputStyle}>
                    {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                {selected.size > 0 && (
                  <button onClick={() => setConfirmDelete("bulk")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-[10px] font-mono"
                    style={{ borderColor: `${red}50`, color: red, backgroundColor: `${red}10` }}>
                    <Trash2 className="w-3 h-3" /> Delete ({selected.size})
                  </button>
                )}
              </div>

              <div className="rounded-lg border overflow-x-auto" style={{ borderColor: "var(--border)" }}>
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr style={thStyle}>
                      <th className={`${cellBase} w-8`}>
                        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="cursor-pointer" />
                      </th>
                      {([
                        { col: "name",      label: "Name" },
                        { col: "agentId",   label: "Agent ID" },
                        { col: "messages",  label: "Messages" },
                        { col: "createdAt", label: "Created At" },
                      ] as { col: SortCol; label: string }[]).map(({ col, label }) => (
                        <th key={col} className={`${cellBase} text-left cursor-pointer select-none`}
                          style={{ color: sortCol === col ? blue : "var(--text-2)" }}
                          onClick={() => toggleSort(col)}>
                          <div className="flex items-center">{label}<SortIco col={col} /></div>
                        </th>
                      ))}
                      <th className={`${cellBase} text-left`} style={{ color: "var(--text-2)" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-[11px] font-mono"
                          style={{ color: "var(--text-2)" }}>
                          {search ? "No rows match your search" : "Table is empty"}
                        </td>
                      </tr>
                    ) : pageRows.map((s, i) => (
                      <Fragment key={s.id}>
                        <tr style={{
                          backgroundColor: selected.has(s.id)
                            ? `${blue}08`
                            : i % 2 === 0 ? "var(--surface)" : "var(--bg-primary)",
                          borderTop: "1px solid var(--divider)",
                        }}>
                          <td className={cellBase}>
                            <input type="checkbox" checked={selected.has(s.id)}
                              onChange={() => toggleOne(s.id)} className="cursor-pointer" />
                          </td>
                          <td className={`${cellBase} max-w-[220px]`}>
                            {editingId === s.id ? (
                              <input autoFocus value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")  commitEdit(s.id);
                                  if (e.key === "Escape") setEditingId(null);
                                }}
                                onBlur={() => commitEdit(s.id)}
                                className="w-full px-1.5 py-0.5 rounded border outline-none text-[11px] font-mono"
                                style={{ ...inputStyle, borderColor: blue }} />
                            ) : (
                              <span className="block truncate" style={{ color: "var(--text-1)" }}>{s.name}</span>
                            )}
                          </td>
                          <td className={cellBase}>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
                              style={{ backgroundColor: `${blue}15`, color: blue }}>
                              {s.agentId}
                            </span>
                          </td>
                          <td className={cellBase}>
                            <button
                              onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
                            >
                              <span className="font-bold" style={{ color: green }}>{s.messages.length}</span>
                              {expandedId === s.id
                                ? <EyeOff className="w-3 h-3" style={{ color: "var(--text-2)" }} />
                                : <Eye    className="w-3 h-3" style={{ color: "var(--text-2)" }} />}
                            </button>
                          </td>
                          <td className={`${cellBase} whitespace-nowrap`} style={{ color: "var(--text-2)" }}>
                            {fmtDate(s.id)}
                          </td>
                          <td className={cellBase}>
                            <div className="flex items-center gap-0.5">
                              {editingId === s.id ? (
                                <button onClick={() => commitEdit(s.id)} className="p-1.5 rounded hover:opacity-70" title="Save">
                                  <Check className="w-3.5 h-3.5" style={{ color: blue }} />
                                </button>
                              ) : (
                                <button onClick={() => startEdit(s)} className="p-1.5 rounded hover:opacity-70" title="Rename">
                                  <Edit2 className="w-3.5 h-3.5" style={{ color: "var(--text-2)" }} />
                                </button>
                              )}
                              <button onClick={() => setConfirmDelete(s.id)} className="p-1.5 rounded hover:opacity-70" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" style={{ color: red }} />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expandedId === s.id && (
                          <tr style={{ borderTop: "1px solid var(--divider)" }}>
                            <td colSpan={6} style={{ backgroundColor: "var(--bg-secondary)" }}>
                              <div className="px-8 py-4">
                                <p className="text-[9px] font-mono uppercase tracking-widest mb-3"
                                  style={{ color: "var(--text-2)" }}>
                                  messages — {s.messages.length} total
                                </p>
                                {s.messages.length === 0 ? (
                                  <p className="text-[10px] font-mono" style={{ color: "var(--text-2)" }}>
                                    No messages in this session
                                  </p>
                                ) : (
                                  <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                                    {s.messages.map((m, mi) => (
                                      <div key={mi} className="flex gap-3 items-start">
                                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                                          style={{
                                            backgroundColor: m.role === "user" ? `${blue}20` : `${green}20`,
                                            color: m.role === "user" ? blue : green,
                                          }}>
                                          {m.role === "user" ? "YOU" : "AI"}
                                        </span>
                                        <p className="text-[10px] font-mono leading-relaxed break-words flex-1"
                                          style={{ color: "var(--text-1)" }}>
                                          {m.content}
                                        </p>
                                        <span className="text-[9px] font-mono flex-shrink-0 mt-0.5"
                                          style={{ color: "var(--text-2)" }}>
                                          {new Date(m.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* pagination */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono" style={{ color: "var(--text-2)" }}>
                  {filtered.length === 0
                    ? "No rows"
                    : `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, filtered.length)} of ${filtered.length} rows`}
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded border disabled:opacity-30"
                    style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  {paginationItems(page, totalPages).map((p, i) =>
                    p === "…" ? (
                      <span key={`el-${i}`} className="w-7 text-center text-[10px] font-mono"
                        style={{ color: "var(--text-2)" }}>…</span>
                    ) : (
                      <button key={p} onClick={() => setPage(p as number)}
                        className="w-7 h-7 rounded border text-[10px] font-mono transition-colors"
                        style={{
                          backgroundColor: page === p ? `${blue}18` : "transparent",
                          borderColor: page === p ? `${blue}60` : "var(--border)",
                          color: page === p ? blue : "var(--text-2)",
                        }}>
                        {p}
                      </button>
                    )
                  )}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-1.5 rounded border disabled:opacity-30"
                    style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ STRUCTURE ══ */}
          {tab === "structure" && (
            <div className="p-5 space-y-4 max-w-3xl">
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                <table className="w-full text-[11px] font-mono">
                  <thead>
                    <tr style={thStyle}>
                      {["Column", "Type", "Null", "Key", "Description"].map((h) => (
                        <th key={h} className={`${cellBase} text-left`} style={{ color: "var(--text-2)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { col: "id",                   type: "string",               nullable: false, key: "PRI", desc: "Unix ms timestamp — primary key & n8n session_id" },
                      { col: "name",                 type: "string (max 45)",      nullable: false, key: "",    desc: "Display name, auto-set from first message" },
                      { col: "agentId",              type: "string",               nullable: false, key: "IDX", desc: "Agent this session belongs to" },
                      { col: "messages",             type: "StoredMessage[]",      nullable: false, key: "",    desc: "Array of chat messages (max context: 5 user msgs)" },
                      { col: "messages[].role",      type: `"user"|"assistant"`,   nullable: false, key: "",    desc: "Sender role" },
                      { col: "messages[].content",   type: "string",               nullable: false, key: "",    desc: "Message text" },
                      { col: "messages[].timestamp", type: "number (unix ms)",     nullable: false, key: "",    desc: "Time message was created" },
                    ].map((row, i) => (
                      <tr key={row.col} style={{
                        backgroundColor: i % 2 === 0 ? "var(--surface)" : "var(--bg-primary)",
                        borderTop: "1px solid var(--divider)",
                      }}>
                        <td className={`${cellBase} font-bold`} style={{ color: blue }}>{row.col}</td>
                        <td className={cellBase} style={{ color: green }}>{row.type}</td>
                        <td className={cellBase} style={{ color: row.nullable ? "var(--text-2)" : red }}>
                          {row.nullable ? "YES" : "NO"}
                        </td>
                        <td className={cellBase}>
                          {row.key && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                              style={{
                                backgroundColor: row.key === "PRI" ? `${gold}20` : `${blue}15`,
                                color: row.key === "PRI" ? gold : blue,
                              }}>
                              {row.key}
                            </span>
                          )}
                        </td>
                        <td className={cellBase} style={{ color: "var(--text-2)" }}>{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                <p className="text-[9px] font-mono uppercase tracking-widest mb-3" style={{ color: "var(--text-2)" }}>
                  Storage Info
                </p>
                {[
                  { label: "Engine",     value: "browser localStorage", color: blue },
                  { label: "Key",        value: "n8n_chat_sessions",    color: green },
                  { label: "Format",     value: "JSON Array",           color: gold },
                  { label: "Rows",       value: String(sessions.length),color: "var(--text-1)" },
                  { label: "Size",       value: `${kbUsed} KB`,         color: "var(--text-2)" },
                  { label: "MAX_CONTEXT",value: "5 user messages",      color: "var(--text-2)" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center gap-4 py-1 border-b last:border-0"
                    style={{ borderColor: "var(--divider)" }}>
                    <span className="text-[10px] font-mono w-28 flex-shrink-0" style={{ color: "var(--text-2)" }}>
                      {label}
                    </span>
                    <span className="text-[11px] font-mono" style={{ color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ INSERT ══ */}
          {tab === "insert" && (
            <div className="p-5 max-w-2xl">
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)" }}>
                  <p className="text-[10px] font-mono uppercase tracking-widest font-bold" style={{ color: "var(--text-2)" }}>
                    INSERT INTO n8n_chat_sessions
                  </p>
                </div>

                {[
                  {
                    field: "name", type: "string, max 45", required: true, even: true,
                    input: (
                      <input value={iName} onChange={(e) => setIName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleInsert()}
                        placeholder="Session name..."
                        className="w-full text-[11px] font-mono px-2.5 py-1.5 rounded border outline-none"
                        style={inputStyle} />
                    ),
                  },
                  {
                    field: "agentId", type: "string", required: false, even: false,
                    input: (
                      <select value={iAgent} onChange={(e) => setIAgent(e.target.value)}
                        className="w-full text-[11px] font-mono px-2.5 py-1.5 rounded border outline-none"
                        style={inputStyle}>
                        <option value="">Auto (first available agent)</option>
                        {agents.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.id}</option>)}
                      </select>
                    ),
                  },
                  {
                    field: "messages", type: "StoredMessage[]", required: false, even: true,
                    input: (
                      <span className="text-[11px] font-mono px-2.5 py-1.5 rounded inline-block"
                        style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)" }}>
                        [] — auto (empty)
                      </span>
                    ),
                  },
                  {
                    field: "id", type: "string (unix ms)", required: false, even: false,
                    input: (
                      <span className="text-[11px] font-mono px-2.5 py-1.5 rounded inline-block"
                        style={{ backgroundColor: "var(--surface-2)", color: "var(--text-2)" }}>
                        AUTO — Date.now()
                      </span>
                    ),
                  },
                ].map(({ field, type, required, even, input }) => (
                  <div key={field} className="flex items-center border-t"
                    style={{ borderColor: "var(--divider)", backgroundColor: even ? "var(--surface)" : "var(--bg-primary)" }}>
                    <div className="w-36 px-4 py-3 border-r flex-shrink-0" style={{ borderColor: "var(--border)" }}>
                      <span className="text-[11px] font-mono font-bold" style={{ color: blue }}>{field}</span>
                      {required && <span className="ml-1 text-[9px]" style={{ color: red }}>*</span>}
                      <p className="text-[9px] font-mono mt-0.5" style={{ color: "var(--text-2)" }}>{type}</p>
                    </div>
                    <div className="flex-1 px-4 py-3">{input}</div>
                  </div>
                ))}

                <div className="px-4 py-3 border-t flex items-center gap-3"
                  style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)" }}>
                  <button onClick={handleInsert} disabled={!iName.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded border text-[11px] font-mono font-bold transition-all"
                    style={{
                      backgroundColor: `${blue}18`, borderColor: `${blue}50`,
                      color: blue, opacity: !iName.trim() ? 0.4 : 1,
                    }}>
                    <Plus className="w-3.5 h-3.5" /> Insert Row
                  </button>
                  <AnimatePresence>
                    {iSuccess && (
                      <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 text-[11px] font-mono"
                        style={{ color: green }}>
                        <Check className="w-3.5 h-3.5" /> 1 row inserted
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
