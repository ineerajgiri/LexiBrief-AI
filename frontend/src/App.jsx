import React, { useEffect, useMemo, useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Files,
  Scale,
  Search,
  X,
} from 'lucide-react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [typedAnalysis, setTypedAnalysis] = useState('');
  const [glitchFlash, setGlitchFlash] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dropPulse, setDropPulse] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingIds, setDeletingIds] = useState([]);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001';

  const fetchHistoryList = async () => {
    try {
      setHistoryLoading(true);
      const response = await axios.get(`${API_BASE}/api/history`);
      setHistoryList(response.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatHistoryTimestamp = (value) => {
    if (!value) return 'Unknown scan time';
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const handleHistoryItemClick = async (id) => {
    try {
      setError(null);
      const response = await axios.get(`${API_BASE}/api/history/${id}`);
      setAnalysis(response.data.aiAnalysis);
      setIsHistoryOpen(false);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to load historical analysis.');
    }
  };

  const handleDeleteHistory = async (e, id) => {
    e.stopPropagation();
    setDeletingIds((prev) => [...prev, id]);

    try {
      await axios.delete(`${API_BASE}/api/history/${id}`);
      setHistoryList((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to delete history entry.');
    } finally {
      setDeletingIds((prev) => prev.filter((entryId) => entryId !== id));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setDropPulse(true);
      setTimeout(() => setDropPulse(false), 420);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
      setDropPulse(true);
      setTimeout(() => setDropPulse(false), 420);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    const formData = new FormData();
    formData.append('document', file);

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setTypedAnalysis('');

    try {
      // Connects directly to our backend live port 5001
      const response = await axios.post(`${API_BASE}/api/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setAnalysis(response.data.aiAnalysis);
      await fetchHistoryList();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Something went wrong while analyzing the document.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryList();
  }, []);

  useEffect(() => {
    if (!analysis) return;

    let idx = 0;
    setTypedAnalysis('');

    const totalDuration = 2400;
    const stepTime = Math.max(10, Math.floor(totalDuration / Math.max(analysis.length, 1)));

    const interval = setInterval(() => {
      idx += 1;
      setTypedAnalysis(analysis.slice(0, idx));

      if (idx % 12 === 0) {
        setGlitchFlash(true);
        setTimeout(() => setGlitchFlash(false), 65);
      }

      if (idx >= analysis.length) {
        clearInterval(interval);
        setGlitchFlash(false);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [analysis]);

  const sections = useMemo(() => {
    const source = typedAnalysis || '';
    const lines = source.split('\n');
    const result = { summary: [], issues: [], risks: [], deadlines: [] };
    let active = 'summary';

    const sectionMatchers = [
      { key: 'summary', regex: /(summary|context)/i },
      { key: 'issues', regex: /(legal\s*issues?|issues?|clauses?)/i },
      { key: 'risks', regex: /(risks?|critical\s*obligations?|obligations?)/i },
      { key: 'deadlines', regex: /(deadlines?|timeline|alerts?)/i },
    ];

    lines.forEach((line) => {
      const normalized = line.trim();
      if (!normalized) {
        result[active].push('');
        return;
      }

      const isHeaderLike = /^#{1,6}\s*/.test(normalized) || /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(normalized);
      if (isHeaderLike) {
        const matched = sectionMatchers.find((item) => item.regex.test(normalized));
        if (matched) {
          active = matched.key;
          return;
        }
      }

      result[active].push(line);
    });

    return {
      summary: result.summary.join('\n').trim(),
      issues: result.issues.join('\n').trim(),
      risks: result.risks.join('\n').trim(),
      deadlines: result.deadlines.join('\n').trim(),
    };
  }, [typedAnalysis]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-linear-to-b from-[#0F172A] to-[#020617] text-slate-100 py-12 px-4 font-[Inter,ui-sans-serif,system-ui,-apple-system,Segoe_UI,Roboto,sans-serif]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-20 h-md w-md rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
        className="relative mx-auto w-full max-w-6xl rounded-3xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-xl shadow-[0_20px_80px_rgba(2,6,23,0.7)] p-6 md:p-10"
      >
        <header className="relative z-20 mb-14 pt-2 text-center md:mb-16">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsHistoryOpen(true)}
            className="absolute right-0 top-0 rounded-xl border border-cyan-300/25 bg-slate-900/55 px-3 py-2 text-xs font-semibold text-cyan-100 shadow-[0_8px_24px_rgba(8,47,73,0.45)] backdrop-blur-md md:text-sm"
          >
            📋 History Logs
          </motion.button>

          <div className="relative mx-auto max-w-4xl px-2">
            <h1 className="relative z-10 text-4xl font-extrabold tracking-tight leading-[1.2] text-transparent bg-clip-text bg-linear-to-r from-blue-300 via-cyan-200 to-teal-300 drop-shadow-[0_1px_2px_rgba(255,255,255,0.35)] md:text-5xl">
              LexiBrief AI
            </h1>
            <p className="relative z-10 mt-3 text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
              Upload legal case PDFs and receive structured, high-fidelity legal synthesis with professional precision.
            </p>
          </div>
        </header>

        <main className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <section className="flex flex-col justify-center">
            <form onSubmit={handleUpload} className="space-y-6">
              <motion.label
                whileHover={{ scale: 1.015, rotate: -0.25 }}
                whileTap={{ scale: 0.995 }}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group relative block rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition overflow-hidden shadow-inner shadow-black/40 ${
                  isDragging
                    ? 'border-cyan-300/80 bg-slate-900/70 shadow-[inset_0_0_40px_rgba(34,211,238,0.18)]'
                    : 'border-slate-500/60 hover:border-blue-400/70 bg-slate-900/45'
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 rounded-2xl transition duration-500 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.18),transparent_65%)] ${
                    isDragging ? 'opacity-100 animate-pulse' : 'opacity-0 group-hover:opacity-100'
                  }`}
                />
                <AnimatePresence>
                  {dropPulse && (
                    <motion.div
                      initial={{ opacity: 0.45, scale: 0.96 }}
                      animate={{ opacity: 0, scale: 1.06 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      className="pointer-events-none absolute inset-0 rounded-2xl border border-cyan-200/70"
                    />
                  )}
                </AnimatePresence>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className="relative flex flex-col items-center space-y-3">
                  <motion.div
                    animate={{ rotate: loading ? 360 : [0, 10, -10, 0] }}
                    transition={{
                      duration: loading ? 1.9 : 8,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="rounded-full border border-slate-600/70 bg-slate-800/80 p-4 shadow-lg shadow-black/30"
                  >
                    <Files className="w-8 h-8 text-blue-300 group-hover:text-cyan-200 transition" />
                  </motion.div>
                  <p className="text-sm font-medium text-slate-200">
                    {file ? file.name : 'Click or drag legal PDF here'}
                  </p>
                  <span className="text-xs text-slate-500">Only PDF files up to 10MB</span>
                </div>
              </motion.label>

              <AnimatePresence>
                {file && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    className="rounded-xl border border-slate-600/60 bg-linear-to-r from-slate-700/40 to-slate-800/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-cyan-300 shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-200">{file.name}</p>
                        <p className="text-xs text-slate-500">Ready for legal analysis</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2 bg-red-950/40 border border-red-500/40 text-red-300 p-3 rounded-lg text-sm"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.01, rotate: -0.2 }}
                whileTap={{ scale: 0.97 }}
                className="relative w-full overflow-hidden rounded-xl border border-cyan-300/20 bg-linear-to-b from-slate-700/80 to-slate-900/80 px-4 py-3 font-semibold text-slate-100 shadow-[0_10px_30px_rgba(8,47,73,0.45)] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span className="pointer-events-none absolute inset-x-2 top-1 h-6 rounded-full bg-white/20 blur-md" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-200" />
                      <motion.span
                        animate={{ opacity: [0.65, 1, 0.65], textShadow: ['0 0 0px #67e8f9', '0 0 10px #67e8f9', '0 0 0px #67e8f9'] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        Analyzing legal intelligence...
                      </motion.span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Analyze Document
                    </>
                  )}
                </span>
              </motion.button>
            </form>
          </section>

          <section className="border-t border-slate-700/60 pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8 flex flex-col">
            <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-teal-300" />
              AI Breakdown Engine
            </h2>

            <div className="relative flex-1 min-h-105 rounded-2xl border border-slate-600/50 bg-slate-900/50 p-5 shadow-inner shadow-black/30">
              {glitchFlash && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.2, 0] }}
                  transition={{ duration: 0.1 }}
                  className="pointer-events-none absolute inset-0 bg-cyan-300/20 mix-blend-screen"
                />
              )}

              {analysis ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <article className="rounded-xl border border-cyan-300/20 bg-slate-950/35 p-4 backdrop-blur-sm">
                    <p className="mb-2 flex items-center gap-2 font-semibold text-slate-200">
                      <FileText className="h-4 w-4 text-cyan-300 drop-shadow-[0_0_6px_rgba(103,232,249,0.7)]" />
                      <span>📋 Summary & Context</span>
                    </p>
                    <p className="max-h-44 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                      {sections.summary || 'No summary/context extracted from this document yet.'}
                    </p>
                  </article>

                  <article className="rounded-xl border border-indigo-300/20 bg-slate-950/35 p-4 backdrop-blur-sm">
                    <p className="mb-2 flex items-center gap-2 font-semibold text-slate-200">
                      <Scale className="h-4 w-4 text-indigo-300 drop-shadow-[0_0_6px_rgba(165,180,252,0.7)]" />
                      <span>⚖️ Core Legal Issues & Clauses</span>
                    </p>
                    <p className="max-h-44 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                      {sections.issues || 'No explicit legal issues or clauses detected in this document.'}
                    </p>
                  </article>

                  <article className="rounded-xl border border-rose-300/20 bg-slate-950/35 p-4 backdrop-blur-sm">
                    <p className="mb-2 flex items-center gap-2 font-semibold text-slate-200">
                      <AlertCircle className="h-4 w-4 text-rose-300 drop-shadow-[0_0_6px_rgba(253,164,175,0.7)]" />
                      <span>⚠️ Key Risks & Critical Obligations</span>
                    </p>
                    <p className="max-h-44 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                      {sections.risks || 'No explicit risks or critical obligations detected in this document.'}
                    </p>
                  </article>

                  <article className="rounded-xl border border-teal-300/20 bg-slate-950/35 p-4 backdrop-blur-sm">
                    <p className="mb-2 flex items-center gap-2 font-semibold text-slate-200">
                      <Search className="h-4 w-4 text-teal-300 drop-shadow-[0_0_6px_rgba(94,234,212,0.7)]" />
                      <span>📅 Detected Deadlines & Timeline Alerts</span>
                    </p>
                    <p className="max-h-44 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                      {sections.deadlines || 'No explicit deadlines or timeline alerts detected in this document.'}
                    </p>
                  </article>
                </div>
              ) : (
                <p className="text-slate-500 italic text-center my-auto text-sm">
                  Upload a document on the left to review the legal parameters here.
                </p>
              )}
            </div>
          </section>
        </main>
      </motion.div>

      <AnimatePresence>
        {isHistoryOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close history panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-cyan-300/20 bg-slate-900/70 p-5 shadow-[-20px_0_60px_rgba(2,6,23,0.75)] backdrop-blur-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-100">📋 History Logs</h3>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="rounded-lg border border-slate-600/70 bg-slate-800/70 p-2 text-slate-300 transition hover:text-cyan-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {historyLoading && (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                    Loading scan history...
                  </div>
                )}

                {!historyLoading && historyList.length === 0 && (
                  <p className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-4 text-center text-sm italic text-slate-500">
                    No recent scans on record
                  </p>
                )}

                <AnimatePresence initial={false}>
                  {!historyLoading &&
                    historyList.map((item) => (
                      <motion.div
                        key={item._id}
                        layout
                        initial={{ opacity: 0, x: 16 }}
                        animate={{
                          opacity: deletingIds.includes(item._id) ? 0 : 1,
                          x: deletingIds.includes(item._id) ? 24 : 0,
                          scale: deletingIds.includes(item._id) ? 0.96 : 1,
                        }}
                        exit={{ opacity: 0, x: 24, scale: 0.96 }}
                        transition={{ duration: 0.25 }}
                        className="group"
                      >
                        <div className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-600/60 bg-slate-950/45 p-3 transition hover:border-cyan-300/40 hover:bg-slate-900/70">
                          <button
                            type="button"
                            onClick={() => handleHistoryItemClick(item._id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="truncate text-sm font-medium text-slate-100">{item.fileName}</p>
                            <p className="mt-1 text-xs text-slate-400">
                              {formatHistoryTimestamp(item.timestamp)}
                            </p>
                          </button>
                          <button
                            type="button"
                            aria-label="Delete history entry"
                            onClick={(e) => handleDeleteHistory(e, item._id)}
                            className="shrink-0 rounded-md border border-rose-400/30 bg-rose-950/30 px-2 py-1 text-sm transition hover:bg-rose-900/50"
                          >
                            🗑️
                          </button>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;