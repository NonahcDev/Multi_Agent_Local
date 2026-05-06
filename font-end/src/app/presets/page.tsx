"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookMarked, Plus, Trash2, Edit2, Check, X,
  RefreshCw, AlertTriangle, Search, Copy, Save,
  FileText, ChevronRight,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { Sidebar } from "@/components/layout/Sidebar";

const BACKEND = "http://localhost:8000";

interface Preset {
  id: string;
  name: string;
  description: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const EMPTY_FORM = { name: "", description: "", content: "" };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function PresetsPage() {
  const { isDark } = useTheme();
  const blue  = isDark ? "#7CC7E8" : "#5BAACC";
  const red   = isDark ? "#F4A8C8" : "#E07090";
  const green = isDark ? "#8ED9B9" : "#5DAF8A";
  const gold  = isDark ? "#F5C542" : "#C89A10";

  const [presets, setPresets]           = useState<Preset[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [search, setSearch]             = useState("");
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [isNew, setIsNew]               = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [dirty, setDirty]               = useState(false);
  const [saving, setSaving]             = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [copySuccess, setCopySuccess]   = useState(false);
  const [saveSuccess, setSaveSuccess]   = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND}/presets`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPresets(data.presets ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = presets.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
  });

  const selected = presets.find((p) => p.id === selectedId) ?? null;

  const selectPreset = (preset: Preset) => {
    setSelectedId(preset.id);
    setIsNew(false);
    setForm({ name: preset.name, description: preset.description, content: preset.content });
    setDirty(false);
  };

  const startNew = () => {
    setSelectedId(null);
    setIsNew(true);
    setForm(EMPTY_FORM);
    setDirty(false);
  };

  const updateForm = (key: keyof typeof EMPTY_FORM, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.content.trim() || saving) return;
    setSaving(true);
    try {
      if (isNew) {
        const res = await fetch(`${BACKEND}/presets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const created: Preset = await res.json();
        setPresets((prev) => [...prev, created]);
        setSelectedId(created.id);
        setIsNew(false);
      } else if (selectedId) {
        const res = await fetch(`${BACKEND}/presets/${selectedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updated: Preset = await res.json();
        setPresets((prev) => prev.map((p) => p.id === selectedId ? updated : p));
      }
      setDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND}/presets/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPresets((prev) => prev.filter((p) => p.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setIsNew(false);
        setForm(EMPTY_FORM);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(form.content);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const hasEditor = isNew || selectedId !== null;
  const canSave   = form.name.trim().length > 0 && form.content.trim().length > 0 && dirty;

  const inputStyle = {
    backgroundColor: "var(--surface-2)",
    borderColor: "var(--border)",
    color: "var(--text-1)",
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      <Sidebar />

      <div className="flex flex-1 min-w-0 overflow-hidden">

        {/* ─── Left panel: preset list ─── */}
        <aside
          className="w-64 shrink-0 border-r flex flex-col overflow-hidden"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          {/* header */}
          <div className="px-3 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <BookMarked className="w-4 h-4" style={{ color: gold }} />
              <p className="text-[11px] font-mono font-bold uppercase tracking-widest" style={{ color: "var(--text-1)" }}>
                Presets
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={refresh}
                title="Refresh"
                className="p-1 rounded hover:opacity-60 transition-opacity"
              >
                <RefreshCw className="w-3.5 h-3.5" style={{ color: "var(--text-2)" }} />
              </button>
              <button
                onClick={startNew}
                title="New preset"
                className="p-1 rounded transition-all"
                style={{ color: gold }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* search */}
          <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
            <div
              className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
              style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
            >
              <Search className="w-3 h-3 flex-shrink-0" style={{ color: "var(--text-2)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search presets..."
                className="flex-1 text-[10px] font-mono outline-none bg-transparent"
                style={{ color: "var(--text-1)" }}
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X className="w-3 h-3" style={{ color: "var(--text-2)" }} />
                </button>
              )}
            </div>
          </div>

          {/* list */}
          <div className="flex-1 overflow-y-auto py-1">
            {loading && (
              <p className="text-[10px] font-mono px-4 py-3" style={{ color: "var(--text-2)" }}>
                Loading...
              </p>
            )}
            {!loading && filtered.length === 0 && (
              <div className="px-4 py-6 text-center">
                <FileText className="w-6 h-6 mx-auto mb-2 opacity-30" style={{ color: "var(--text-2)" }} />
                <p className="text-[10px] font-mono" style={{ color: "var(--text-2)" }}>
                  {search ? "No matches" : "No presets yet"}
                </p>
              </div>
            )}
            {filtered.map((p) => {
              const active = selectedId === p.id;
              return (
                <div
                  key={p.id}
                  className="group flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors border-b"
                  style={{
                    backgroundColor: active ? `${gold}12` : "transparent",
                    borderColor: "var(--divider)",
                    borderLeft: active ? `2px solid ${gold}` : "2px solid transparent",
                  }}
                  onClick={() => selectPreset(p)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono font-semibold truncate" style={{ color: active ? gold : "var(--text-1)" }}>
                      {p.name}
                    </p>
                    {p.description && (
                      <p className="text-[9px] font-mono truncate mt-0.5" style={{ color: "var(--text-2)" }}>
                        {p.description}
                      </p>
                    )}
                    <p className="text-[9px] font-mono mt-1 opacity-50" style={{ color: "var(--text-2)" }}>
                      {fmtDate(p.updated_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" style={{ color: red }} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* footer stats */}
          <div className="px-3 py-2 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-[9px] font-mono" style={{ color: "var(--text-2)" }}>
              {presets.length} preset{presets.length !== 1 ? "s" : ""} · presets.json
            </p>
          </div>
        </aside>

        {/* ─── Right panel: editor ─── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

          {/* breadcrumb */}
          <div
            className="px-5 py-3 border-b shrink-0 flex items-center justify-between"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div>
              <p className="text-[10px] font-mono flex items-center gap-1" style={{ color: "var(--text-2)" }}>
                presets.json
                {hasEditor && <ChevronRight className="w-3 h-3" />}
                {hasEditor && (
                  <span style={{ color: gold }}>
                    {isNew ? "new preset" : (selected?.name ?? "")}
                  </span>
                )}
              </p>
              <h1 className="text-sm font-mono font-bold mt-0.5" style={{ color: "var(--text-1)" }}>
                {isNew ? "New Preset" : selected ? "Edit Preset" : "Pre-prompt Presets"}
                {!hasEditor && (
                  <span className="ml-2 text-[10px] font-normal" style={{ color: "var(--text-2)" }}>
                    {presets.length} presets
                  </span>
                )}
              </h1>
            </div>
            {hasEditor && (
              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {saveSuccess && (
                    <motion.span
                      initial={{ opacity: 0, x: 6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 text-[10px] font-mono"
                      style={{ color: green }}
                    >
                      <Check className="w-3 h-3" /> Saved
                    </motion.span>
                  )}
                </AnimatePresence>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-[10px] font-mono transition-all"
                  style={{ borderColor: "var(--border)", color: copySuccess ? green : "var(--text-2)" }}
                  title="Copy prompt content"
                >
                  {copySuccess ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copySuccess ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border text-[10px] font-mono font-bold transition-all"
                  style={{
                    backgroundColor: canSave ? `${gold}18` : "transparent",
                    borderColor: canSave ? `${gold}50` : "var(--border)",
                    color: canSave ? gold : "var(--text-2)",
                    opacity: saving ? 0.5 : 1,
                  }}
                >
                  <Save className="w-3 h-3" />
                  {saving ? "Saving..." : isNew ? "Create" : "Save"}
                </button>
              </div>
            )}
          </div>

          {/* error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-5 mt-4 flex items-center gap-3 px-4 py-3 rounded-lg border shrink-0"
                style={{ backgroundColor: `${red}10`, borderColor: `${red}40` }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: red }} />
                <span className="text-[11px] font-mono flex-1" style={{ color: "var(--text-1)" }}>{error}</span>
                <button onClick={() => setError(null)}>
                  <X className="w-3.5 h-3.5" style={{ color: "var(--text-2)" }} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* delete confirm */}
          <AnimatePresence>
            {confirmDelete && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mx-5 mt-4 flex items-center gap-3 px-4 py-3 rounded-lg border shrink-0"
                style={{ backgroundColor: `${red}10`, borderColor: `${red}40` }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: red }} />
                <span className="text-[11px] font-mono flex-1" style={{ color: "var(--text-1)" }}>
                  Delete &quot;{presets.find((p) => p.id === confirmDelete)?.name}&quot;? This cannot be undone.
                </span>
                <button
                  onClick={() => handleDelete(confirmDelete)}
                  className="px-3 py-1 rounded text-[10px] font-mono border font-bold"
                  style={{ borderColor: `${red}60`, color: red }}
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 py-1 rounded text-[10px] font-mono border"
                  style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* editor body */}
          <div className="flex-1 overflow-y-auto">
            {!hasEditor ? (
              /* empty state */
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${gold}12`, border: `1px solid ${gold}30` }}
                >
                  <BookMarked className="w-7 h-7" style={{ color: gold }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-mono font-bold" style={{ color: "var(--text-1)" }}>
                    Pre-prompt Presets
                  </p>
                  <p className="text-[11px] font-mono mt-1" style={{ color: "var(--text-2)" }}>
                    Select a preset to edit, or create a new one.
                  </p>
                </div>
                <button
                  onClick={startNew}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-mono font-bold transition-all"
                  style={{ backgroundColor: `${gold}18`, borderColor: `${gold}50`, color: gold }}
                >
                  <Plus className="w-3.5 h-3.5" /> New Preset
                </button>
              </div>
            ) : (
              <div className="p-5 max-w-3xl space-y-4">

                {/* name */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--text-2)" }}>
                    Name <span style={{ color: red }}>*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="e.g. Code Reviewer, Thai Translator..."
                    className="w-full px-3 py-2 rounded-lg border text-[12px] font-mono outline-none"
                    style={inputStyle}
                  />
                </div>

                {/* description */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--text-2)" }}>
                    Description
                  </label>
                  <input
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    placeholder="Short description of what this preset does..."
                    className="w-full px-3 py-2 rounded-lg border text-[12px] font-mono outline-none"
                    style={inputStyle}
                  />
                </div>

                {/* content */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "var(--text-2)" }}>
                      Pre-prompt Content <span style={{ color: red }}>*</span>
                    </label>
                    <span className="text-[9px] font-mono" style={{ color: "var(--text-2)" }}>
                      {form.content.length} chars
                    </span>
                  </div>
                  <textarea
                    value={form.content}
                    onChange={(e) => updateForm("content", e.target.value)}
                    placeholder={"You are a helpful assistant that...\n\nAlways respond in Thai.\nBe concise and direct."}
                    rows={16}
                    className="w-full px-3 py-2.5 rounded-lg border text-[12px] font-mono outline-none resize-y leading-relaxed"
                    style={inputStyle}
                  />
                </div>

                {/* metadata (edit mode only) */}
                {selected && !isNew && (
                  <div
                    className="rounded-lg border p-3 space-y-1.5"
                    style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
                  >
                    <p className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: "var(--text-2)" }}>
                      Metadata
                    </p>
                    {[
                      { label: "ID",         value: selected.id },
                      { label: "Created",    value: fmtDate(selected.created_at) },
                      { label: "Updated",    value: fmtDate(selected.updated_at) },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center gap-4">
                        <span className="text-[10px] font-mono w-16 flex-shrink-0" style={{ color: "var(--text-2)" }}>
                          {label}
                        </span>
                        <span className="text-[10px] font-mono truncate" style={{ color: "var(--text-1)" }}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* action row */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={!canSave || saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border text-[11px] font-mono font-bold transition-all"
                    style={{
                      backgroundColor: canSave ? `${gold}18` : "transparent",
                      borderColor: canSave ? `${gold}50` : "var(--border)",
                      color: canSave ? gold : "var(--text-2)",
                      opacity: saving ? 0.5 : 1,
                    }}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? "Saving..." : isNew ? "Create Preset" : "Save Changes"}
                  </button>

                  {!isNew && selected && (
                    <button
                      onClick={() => setConfirmDelete(selected.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[11px] font-mono transition-all"
                      style={{ borderColor: `${red}40`, color: red, backgroundColor: `${red}08` }}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}

                  {dirty && (
                    <button
                      onClick={() => {
                        if (isNew) { setForm(EMPTY_FORM); setDirty(false); }
                        else if (selected) { setForm({ name: selected.name, description: selected.description, content: selected.content }); setDirty(false); }
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[11px] font-mono transition-all"
                      style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                    >
                      <X className="w-3.5 h-3.5" /> Discard
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
