import React, { useState } from 'react';
import type { PhotographySession, SessionCategory } from '../../types/session';
import type { CapturedPhoto, AspectRatio } from '../../types/camera';
import { sessionService } from '../../services/sessionService';
import { COMPREHENSIVE_GRID_LIBRARY } from '../../data/gridLibrary';
import { currentPhotoUrl } from '../../utils/photoVersions';
import {
  X,
  Plus,
  Camera,
  Heart,
  Calendar,
  Layers,
  Copy,
  Trash2,
  Search,
  Download,
  Split,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';

interface SessionsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSessionToShoot: (session: PhotographySession) => void;
  photos: CapturedPhoto[];
  onOpenPhotoEditor: (photo: CapturedPhoto) => void;
  onOpenExportStudio?: (photo: CapturedPhoto) => void;
}

const CATEGORIES: SessionCategory[] = [
  'Portrait',
  'Wedding',
  'Fashion',
  'Landscape',
  'Architecture',
  'Product',
  'Food',
  'Street',
  'Travel',
  'Custom',
];

const ASPECT_RATIOS: AspectRatio[] = ['4:3', '16:9', '1:1', '9:16', '2.39:1'];

export const SessionsManagerModal: React.FC<SessionsManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectSessionToShoot,
  photos,
  onOpenPhotoEditor,
  onOpenExportStudio,
}) => {
  const [sessions, setSessions] = useState<PhotographySession[]>(sessionService.getAllSessions());
  const [selectedCategory, setSelectedCategory] = useState<SessionCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'details' | 'compare'>('list');
  const [selectedSession, setSelectedSession] = useState<PhotographySession | null>(
    sessionService.getActiveSession() || (sessions.length > 0 ? sessions[0] : null)
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New session form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<SessionCategory>('Portrait');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newDesc, setNewDesc] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newGridId, setNewGridId] = useState('rule_of_thirds');
  const [newAspectRatio, setNewAspectRatio] = useState<AspectRatio>('4:3');
  const [newRefUrl, setNewRefUrl] = useState('');

  // Comparison State
  const [compareCapturedPhoto, setCompareCapturedPhoto] = useState<CapturedPhoto | null>(null);

  if (!isOpen) return null;

  const refreshSessions = () => {
    const list = sessionService.getAllSessions();
    setSessions([...list]);
    if (selectedSession) {
      setSelectedSession(sessionService.getSessionById(selectedSession.id) || null);
    }
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const refs = newRefUrl.trim()
      ? [{ id: `ref_${Date.now()}`, url: newRefUrl.trim(), title: 'Session Reference' }]
      : [];

    const created = sessionService.createSession({
      name: newName,
      category: newCategory,
      date: newDate,
      description: newDesc,
      notes: newNotes,
      selectedGridId: newGridId,
      preferredAspectRatio: newAspectRatio,
      referencePhotos: refs,
    });

    setIsCreating(false);
    setNewName('');
    setNewDesc('');
    setNewNotes('');
    setNewRefUrl('');
    refreshSessions();
    setSelectedSession(created);
    setActiveTab('details');
  };

  const handleDeleteSession = (id: string) => {
    sessionService.deleteSession(id);
    setDeleteConfirmId(null);
    refreshSessions();
    if (selectedSession?.id === id) {
      setSelectedSession(sessions.length > 1 ? sessions[0] : null);
      setActiveTab('list');
    }
  };

  const handleDuplicateSession = (id: string) => {
    const dup = sessionService.duplicateSession(id);
    refreshSessions();
    if (dup) setSelectedSession(dup);
  };

  const handleToggleFav = (id: string) => {
    sessionService.toggleFavorite(id);
    refreshSessions();
  };

  const handleExportBackup = () => {
    const json = sessionService.exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cinegrid_sessions_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Filtered session list
  const filteredSessions = sessions.filter((s) => {
    const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(query) ||
      s.category.toLowerCase().includes(query) ||
      (s.description && s.description.toLowerCase().includes(query)) ||
      (s.notes && s.notes.toLowerCase().includes(query));
    return matchesCat && matchesSearch;
  });

  // Photos belonging to the selected session
  const sessionPhotos = selectedSession
    ? photos.filter((p) => selectedSession.capturedPhotoIds.includes(p.id))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl flex flex-col text-white overflow-hidden">
        {/* HEADER: back, title, backup and new, all one height */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10 bg-zinc-900/60">
          <button
            onClick={onClose}
            aria-label="Back to camera"
            className="h-9 pl-1 pr-3 rounded-full flex items-center gap-0.5 text-sm font-semibold text-zinc-300 hover:text-white flex-shrink-0"
          >
            <ChevronLeft size={20} aria-hidden="true" />
            Back
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white truncate">Session Studio</h2>
            <p className="text-xs text-zinc-400 truncate">Shoots, directives and references</p>
          </div>
          <button
            onClick={handleExportBackup}
            className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center flex-shrink-0 transition-colors"
            title="Backup Sessions to JSON"
            aria-label="Backup sessions to JSON"
          >
            <Download size={16} aria-hidden="true" />
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="h-9 px-4 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold flex items-center justify-center gap-1.5 flex-shrink-0 active:scale-95 transition-colors"
          >
            <Plus size={14} aria-hidden="true" />
            <span>New</span>
          </button>
        </div>

        {/* TABS: one sliding row of equal-height pills */}
        <div role="tablist" className="flex items-center gap-1.5 px-3 py-2.5 overflow-x-auto no-scrollbar border-b border-white/10">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'list'}
              onClick={() => setActiveTab('list')}
              className={`h-9 px-4 rounded-full flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'list' ? 'bg-zinc-100 text-black' : 'bg-zinc-900 text-zinc-300 hover:text-white'
              }`}
            >
              All sessions ({sessions.length})
            </button>
          {selectedSession && (
            <>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'details'}
                onClick={() => setActiveTab('details')}
                className={`h-9 px-4 rounded-full flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === 'details' ? 'bg-zinc-100 text-black' : 'bg-zinc-900 text-zinc-300 hover:text-white'
                }`}
              >
                Details & gallery ({sessionPhotos.length})
              </button>
              {selectedSession.referencePhotos.length > 0 && sessionPhotos.length > 0 && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'compare'}
                  onClick={() => setActiveTab('compare')}
                  className={`h-9 px-4 rounded-full flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeTab === 'compare' ? 'bg-zinc-100 text-black' : 'bg-zinc-900 text-zinc-300 hover:text-white'
                  }`}
                >
                  <Split size={13} aria-hidden="true" />
                  <span>Compare reference</span>
                </button>
              )}
            </>
          )}
        </div>

        {selectedSession && (
          <div className="px-3 pt-2.5">
            <button
              onClick={() => {
                sessionService.setActiveSession(selectedSession.id);
                onSelectSessionToShoot(selectedSession);
                onClose();
              }}
              className="w-full h-11 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-colors"
            >
              <Camera size={16} aria-hidden="true" />
              <span>Shoot this session</span>
            </button>
          </div>
        )}

        {/* BODY AREA */}
        <div className="flex-1 overflow-hidden flex flex-col p-4">
          {/* TAB 1: SESSIONS LIST */}
          {activeTab === 'list' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Category Chips Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2.5">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`h-8 px-3.5 rounded-full flex items-center flex-shrink-0 text-xs font-semibold transition-colors whitespace-nowrap ${
                    selectedCategory === 'All'
                      ? 'bg-zinc-100 text-black'
                      : 'bg-zinc-900 text-zinc-300 hover:text-white'
                  }`}
                >
                  All Categories
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`h-8 px-3.5 rounded-full flex items-center flex-shrink-0 text-xs font-semibold transition-colors whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-zinc-100 text-black'
                        : 'bg-zinc-900 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3.5 top-3 text-zinc-400" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sessions"
                  className="w-full h-10 bg-zinc-900 border border-white/10 rounded-full pl-9 pr-4 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-400/50"
                />
              </div>

              {/* Sessions Grid */}
              <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSessions.map((sess) => {
                  const isCurrentActive = sessionService.getActiveSession()?.id === sess.id;
                  const photoCount = sess.capturedPhotoIds.length;

                  return (
                    <div
                      key={sess.id}
                      onClick={() => {
                        setSelectedSession(sess);
                        setActiveTab('details');
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                        isCurrentActive
                          ? 'bg-zinc-900/90 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/30'
                          : 'bg-zinc-900/50 hover:bg-zinc-900 border-white/10 hover:border-white/25'
                      }`}
                    >
                      {/* Top Bar: Title & Category */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-amber-300 uppercase">
                            {sess.category}
                          </span>
                          <div className="flex items-center gap-1">
                            {isCurrentActive && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                                ACTIVE IN CAMERA
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFav(sess.id);
                              }}
                              className={`p-1 transition-colors ${
                                sess.isFavorite ? 'text-rose-500' : 'text-zinc-600 hover:text-white'
                              }`}
                            >
                              <Heart size={14} fill={sess.isFavorite ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                        </div>

                        <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                          {sess.name}
                        </h3>

                        {sess.description && (
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                            {sess.description}
                          </p>
                        )}
                      </div>

                      {/* Bottom Directives & Actions */}
                      <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-col gap-2">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            <span>{sess.date}</span>
                          </span>
                          <span className="text-zinc-300 font-bold">
                            {photoCount} {photoCount === 1 ? 'shot' : 'shots'} taken
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px]">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            Ratio: {sess.preferredAspectRatio || '4:3'}
                          </span>
                          <span className="text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            <span>View Session</span>
                            <ArrowRight size={11} />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SESSION DETAILS & GALLERY */}
          {activeTab === 'details' && selectedSession && (
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
              {/* Session Overview Card */}
              <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300">
                      {selectedSession.category}
                    </span>
                    <span className="text-xs text-zinc-400">
                      Date: {selectedSession.date}
                    </span>
                    <span className="text-xs text-zinc-400">
                      Grid: {selectedSession.selectedGridId}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">{selectedSession.name}</h2>
                  {selectedSession.notes && (
                    <p className="text-xs text-zinc-300 font-sans mt-1">{selectedSession.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      sessionService.setActiveSession(selectedSession.id);
                      onSelectSessionToShoot(selectedSession);
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-md hover:from-amber-400 hover:to-amber-300"
                  >
                    <Camera size={14} />
                    <span>Launch in Camera</span>
                  </button>

                  <button
                    onClick={() => handleDuplicateSession(selectedSession.id)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                    title="Duplicate Session"
                  >
                    <Copy size={14} />
                  </button>

                  <button
                    onClick={() => setDeleteConfirmId(selectedSession.id)}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-900 text-zinc-400 hover:text-rose-200 transition-colors"
                    title="Delete Session"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Reference Photos Strip */}
              {selectedSession.referencePhotos.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase">
                    Session Reference Photographs ({selectedSession.referencePhotos.length})
                  </span>
                  <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                    {selectedSession.referencePhotos.map((ref) => (
                      <div
                        key={ref.id}
                        className="w-36 h-28 rounded-2xl overflow-hidden border border-white/15 relative flex-shrink-0 group shadow-lg"
                      >
                        <img src={ref.url} alt={ref.title || 'Reference'} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                          <span className="text-[10px] text-white truncate">{ref.title || 'Reference'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Captured Session Photographs */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-400 uppercase">
                    Captured Session Photographs ({sessionPhotos.length})
                  </span>
                </div>

                {sessionPhotos.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-zinc-900/50 border border-dashed border-white/10 text-center flex flex-col items-center justify-center gap-2">
                    <Camera size={28} className="text-zinc-500" />
                    <span className="text-xs text-zinc-400">No photos captured in this session yet.</span>
                    <button
                      onClick={() => {
                        sessionService.setActiveSession(selectedSession.id);
                        onSelectSessionToShoot(selectedSession);
                        onClose();
                      }}
                      className="px-4 py-2 mt-2 rounded-xl bg-amber-400 text-black font-bold text-xs"
                    >
                      Open Camera & Start Shooting
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {sessionPhotos.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-amber-400/60 group relative flex flex-col transition-all shadow-md"
                      >
                        <div className="w-full aspect-square relative overflow-hidden bg-black">
                          <img
                            src={currentPhotoUrl(p)}
                            alt="Captured frame"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="p-2 flex items-center justify-between gap-1 text-[10px]">
                          <button
                            onClick={() => onOpenPhotoEditor(p)}
                            className="flex-1 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-center transition-colors"
                          >
                            Edit
                          </button>
                          {onOpenExportStudio && (
                            <button
                              onClick={() => onOpenExportStudio(p)}
                              className="px-2 py-1 rounded bg-amber-400 hover:bg-amber-300 text-black font-bold transition-colors"
                              title="Export High-Res Photo"
                            >
                              Export
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: COMPARE REFERENCE VS CAPTURE */}
          {activeTab === 'compare' && selectedSession && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="text-xs text-zinc-400 mb-2">
                Side-by-Side Reference & Capture Comparison
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-hidden">
                {/* Left: Reference Photograph */}
                <div className="flex flex-col rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden">
                  <div className="p-2.5 border-b border-white/10 text-xs font-bold text-amber-300 flex items-center gap-2">
                    <Layers size={13} />
                    <span>Reference Directive</span>
                  </div>
                  <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden p-2">
                    {selectedSession.referencePhotos.length > 0 && (
                      <img
                        src={selectedSession.referencePhotos[0].url}
                        alt="Target Reference"
                        className="max-w-full max-h-full object-contain rounded"
                      />
                    )}
                  </div>
                </div>

                {/* Right: Captured Frame */}
                <div className="flex flex-col rounded-2xl bg-zinc-900 border border-white/10 overflow-hidden">
                  <div className="p-2.5 border-b border-white/10 text-xs font-bold text-emerald-400 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Camera size={13} />
                      <span>Captured Photo</span>
                    </span>
                    {sessionPhotos.length > 1 && (
                      <select
                        onChange={(e) => {
                          const found = sessionPhotos.find((p) => p.id === e.target.value);
                          if (found) setCompareCapturedPhoto(found);
                        }}
                        className="bg-zinc-800 text-white rounded px-2 py-0.5 text-[10px] outline-none"
                      >
                        {sessionPhotos.map((p, idx) => (
                          <option key={p.id} value={p.id}>
                            Shot #{idx + 1} ({new Date(p.timestamp).toLocaleTimeString()})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden p-2">
                    {sessionPhotos.length > 0 ? (
                      <img
                        src={currentPhotoUrl(compareCapturedPhoto || sessionPhotos[0])}
                        alt="Captured Shot"
                        className="max-w-full max-h-full object-contain rounded"
                      />
                    ) : (
                      <span className="text-zinc-500 text-xs">No shots taken yet.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL 1: CREATE NEW SESSION DIALOG */}
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-lg bg-zinc-950 border border-white/15 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus size={16} className="text-amber-400" />
                  <span>Create Photography Session</span>
                </h3>
                <button onClick={() => setIsCreating(false)} className="text-zinc-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateSession} className="flex flex-col gap-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-mono text-zinc-300">Session Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Sunset Bridal Portraiture"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-white outline-none font-sans"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-zinc-300">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as SessionCategory)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-zinc-300">Shoot Date</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-zinc-300">Target Composition Grid</label>
                    <select
                      value={newGridId}
                      onChange={(e) => setNewGridId(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      {COMPREHENSIVE_GRID_LIBRARY.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-mono text-zinc-300">Preferred Aspect Ratio</label>
                    <select
                      value={newAspectRatio}
                      onChange={(e) => setNewAspectRatio(e.target.value as AspectRatio)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    >
                      {ASPECT_RATIOS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-mono text-zinc-300">Reference Photo URL (Optional)</label>
                  <input
                    type="url"
                    value={newRefUrl}
                    onChange={(e) => setNewRefUrl(e.target.value)}
                    placeholder="https://example.com/reference-image.jpg"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-white outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-mono text-zinc-300">Shoot Description & Notes</label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Lighting setup, lens choices, client instructions..."
                    rows={2}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-white outline-none font-sans resize-none"
                  />
                </div>

                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-400 text-black font-bold hover:bg-amber-300 shadow-md"
                  >
                    Create Session
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: DELETE CONFIRMATION DIALOG */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-zinc-950 border border-rose-500/40 rounded-2xl p-5 shadow-2xl text-center">
              <Trash2 size={28} className="text-rose-500 mx-auto mb-2" />
              <h4 className="font-bold text-white text-sm mb-1">Delete Photography Session?</h4>
              <p className="text-xs text-zinc-400 mb-4 font-sans">
                This will remove the session directives and organization. Your captured photos in the gallery will remain safe.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteSession(deleteConfirmId)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
