import React, { useState, useEffect, useRef } from 'react';
import type {
  LookTab,
  LookState,
  LutDefinition,
  LutCategory,
  ColorAdjustments,
} from '../../types/lut';
import { BUILTIN_LOOK_FILTERS } from '../../data/filterLibrary';
import { lutStorageService } from '../../services/lutStorageService';
import { exportLookAsCube } from '../../utils/cubeParser';
import { parseCubeFileAsync } from '../../utils/cubeParserAsync';
import { convert3dlToCube } from '../../utils/lut3dlConverter';
import {
  X,
  Upload,
  Sliders,
  Palette,
  Film,
  Layers,
  Star,
  Trash2,
  Edit2,
  Download,
  RotateCcw,
  Search,
  Check,
  Split,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface LookStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  lookState: LookState;
  onChangeLookState: (patch: Partial<LookState>) => void;
  onResetLook: () => void;
  /** Opens the last captured photo in the editor, where BEFORE / AFTER comparison lives. */
  onCompareWithLastPhoto?: () => void;
  hasCapturedPhoto?: boolean;
}

export const LookStudioModal: React.FC<LookStudioModalProps> = ({
  isOpen,
  onClose,
  lookState,
  onChangeLookState,
  onResetLook,
  onCompareWithLastPhoto,
  hasCapturedPhoto = false,
}) => {
  const [activeTab, setActiveTab] = useState<LookTab>('luts');
  const [lutsList, setLutsList] = useState<LutDefinition[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<LutCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [renamingLutId, setRenamingLutId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [savePresetName, setSavePresetName] = useState('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize and load LUT library
  useEffect(() => {
    lutStorageService.init().then(() => {
      setLutsList(lutStorageService.getAllLuts());
    });
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter LUTs by category and search
  const filteredLuts = lutsList.filter((lut) => {
    if (selectedCategory === 'favorites' && !lut.isFavorite) return false;
    if (selectedCategory !== 'all' && selectedCategory !== 'favorites' && lut.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return lut.name.toLowerCase().includes(q) || (lut.title && lut.title.toLowerCase().includes(q));
    }
    return true;
  });

  const activeLut = lutsList.find((l) => l.id === lookState.activeLutId) || null;
  const activeFilter = BUILTIN_LOOK_FILTERS.find((f) => f.id === lookState.activeFilterId) || null;

  // Handle .cube file import
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);
    setIsImporting(true);

    try {
      // Validate file extension
      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.cube') && !lower.endsWith('.3dl')) {
        setImportError('Invalid file format. Supported 3D LUT files are .cube and .3dl (the formats Adobe Premiere, After Effects and Lightroom use).');
        setIsImporting(false);
        return;
      }

      let text = await file.text();
      if (lower.endsWith('.3dl')) {
        const converted = convert3dlToCube(text, file.name.replace(/\.3dl$/i, ''));
        if (!converted.success || !converted.cube) {
          setImportError(converted.error || 'Failed to read .3dl file.');
          setIsImporting(false);
          return;
        }
        text = converted.cube;
      }
      const parseResult = await parseCubeFileAsync(text, file.name);

      if (!parseResult.success || !parseResult.lut) {
        setImportError(parseResult.error || 'Failed to parse .cube file. The file may be corrupt or formatted incorrectly.');
        setIsImporting(false);
        return;
      }

      // Check for duplicate names
      const existing = lutsList.find(
        (l) => l.name.toLowerCase() === parseResult.lut!.name.toLowerCase() && l.size === parseResult.lut!.size
      );
      if (existing) {
        parseResult.lut.name = `${parseResult.lut.name} (Copy)`;
      }

      const saved = await lutStorageService.saveImportedLut(parseResult.lut);
      if (saved) {
        setLutsList(lutStorageService.getAllLuts());
        onChangeLookState({ activeLutId: parseResult.lut.id, lutIntensity: 100 });
        setImportSuccess(`Successfully imported "${parseResult.lut.name}" (${parseResult.lut.size}x${parseResult.lut.size}x${parseResult.lut.size})`);
      } else {
        setImportError('Failed to save LUT into persistent storage.');
      }
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Unexpected file read error occurred.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Toggle favorite
  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    lutStorageService.toggleFavorite(id);
    setLutsList(lutStorageService.getAllLuts());
  };

  // Delete imported LUT
  const handleDeleteLut = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await lutStorageService.deleteLut(id);
    setLutsList(lutStorageService.getAllLuts());
    if (lookState.activeLutId === id) {
      onChangeLookState({ activeLutId: null });
    }
  };

  // Start rename
  const handleStartRename = (e: React.MouseEvent, lut: LutDefinition) => {
    e.stopPropagation();
    setRenamingLutId(lut.id);
    setRenameValue(lut.name);
  };

  // Submit rename
  const handleSubmitRename = async (id: string) => {
    if (renameValue.trim()) {
      await lutStorageService.renameLut(id, renameValue);
      setLutsList(lutStorageService.getAllLuts());
    }
    setRenamingLutId(null);
  };

  // Export current grade as a standard .CUBE file
  const handleExportGradeAsCube = () => {
    const title = activeLut ? `${activeLut.name} Custom Grade` : 'CineGrid Custom Grade';
    const cubeText = exportLookAsCube(lookState, activeLut, title);
    const blob = new Blob([cubeText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_33x.cube`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Save current look as a preset
  const handleSavePreset = () => {
    if (!savePresetName.trim()) return;
    lutStorageService.saveUserPreset({
      id: `preset_${Date.now()}`,
      name: savePresetName.trim(),
      category: 'Custom',
      state: { ...lookState },
      createdAt: Date.now(),
      thumbnailGradient: activeLut ? activeLut.thumbnailGradient : 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
    });
    setSavePresetName('');
    setIsSavingPreset(false);
  };

  // Update single adjustment
  const handleUpdateAdjustment = (key: keyof ColorAdjustments, value: number) => {
    onChangeLookState({
      adjustments: {
        ...lookState.adjustments,
        [key]: value,
      },
    });
  };

  // Reset single adjustment
  const handleResetAdjustment = (key: keyof ColorAdjustments) => {
    handleUpdateAdjustment(key, 0);
  };

  // Reset all adjustments
  const handleResetAllAdjustments = () => {
    onChangeLookState({
      adjustments: {
        exposure: 0,
        contrast: 0,
        saturation: 0,
        temperature: 0,
        tint: 0,
        highlights: 0,
        shadows: 0,
        fade: 0,
        sharpening: 0,
      },
    });
  };

  const categories: { id: LutCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'All LUTs' },
    { id: 'favorites', label: '★ Favorites' },
    { id: 'imported', label: 'Imported' },
    { id: 'cinematic', label: 'Cinematic' },
    { id: 'film_emulation', label: 'Film Stock' },
    { id: 'vintage', label: 'Vintage' },
    { id: 'portrait', label: 'Portrait' },
    { id: 'black_white', label: 'B&W' },
    { id: 'landscape', label: 'Landscape' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        // ".cube"/".3dl" have no registered MIME type, so on Android the chooser fell back to an images-only
        // picker and a LUT file could not be selected. "*/*" opens the full file browser; the extension is
        // checked in handleFileSelect.
        accept=".cube,.3dl,text/plain,application/octet-stream,*/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main Bottom Sheet Container */}
      <div className="w-full max-w-xl mx-auto bg-[#0c0d12]/95 border-t border-white/15 rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden safe-bottom" style={{ paddingBottom: 'var(--cg-inset-bottom)' }}>
        {/* 1. Header Bar: title and status on the left, equal round icon buttons on the right */}
        <div className="px-4 pt-3 pb-2.5 flex items-center gap-2 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 truncate">
              <Palette size={16} className="text-amber-400 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">Look & Filter Studio</span>
            </h2>
            <p className="text-xs text-zinc-400 truncate mt-0.5 pl-6">
              {activeLut ? `${activeLut.name} (${lookState.lutIntensity}%)` : activeFilter ? activeFilter.name : 'Clean Raw'}
            </p>
          </div>

          {/* Before/After lives in the photo editor and compares two real images of a captured photo */}
          {onCompareWithLastPhoto && (
            <button
              type="button"
              onClick={onCompareWithLastPhoto}
              disabled={!hasCapturedPhoto}
              className="w-9 h-9 flex-shrink-0 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={hasCapturedPhoto ? 'Compare the last photo before and after editing' : 'Take a photo to compare before and after'}
              aria-label="Compare last photo"
            >
              <Split size={16} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={handleExportGradeAsCube}
            className="w-9 h-9 flex-shrink-0 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Export Current Grade as .CUBE LUT"
            aria-label="Export grade as .CUBE"
          >
            <Download size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onResetLook}
            className="w-9 h-9 flex-shrink-0 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Reset All Look Settings"
            aria-label="Reset all look settings"
          >
            <RotateCcw size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex-shrink-0 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Close Look Studio"
            aria-label="Close Look Studio"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* 2. Compact Tabs: Filters | LUTs | Adjustments */}
        <div role="tablist" className="grid grid-cols-3 gap-1.5 px-4 py-2 border-b border-white/10 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('luts')}
            className={`h-9 min-w-0 rounded-full flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'luts'
                ? 'bg-amber-400 text-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Layers size={13} />
            <span>3D LUTs</span>
          </button>

          <button
            onClick={() => setActiveTab('filters')}
            className={`h-9 min-w-0 rounded-full flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'filters'
                ? 'bg-amber-400 text-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Film size={14} aria-hidden="true" />
            <span>Filters</span>
          </button>

          <button
            onClick={() => setActiveTab('adjustments')}
            className={`h-9 min-w-0 rounded-full flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'adjustments'
                ? 'bg-amber-400 text-black'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Sliders size={13} />
            <span>Adjustments</span>
          </button>
        </div>

        {/* 3. Feedback Alert Banners */}
        {importError && (
          <div className="mx-4 mt-2 px-3 py-2 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0 text-rose-400" />
              <span>{importError}</span>
            </div>
            <button onClick={() => setImportError(null)} className="text-zinc-400 hover:text-white ml-2">
              <X size={13} />
            </button>
          </div>
        )}

        {importSuccess && (
          <div className="mx-4 mt-2 px-3 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check size={14} className="flex-shrink-0 text-emerald-400" />
              <span>{importSuccess}</span>
            </div>
            <button onClick={() => setImportSuccess(null)} className="text-zinc-400 hover:text-white ml-2">
              <X size={13} />
            </button>
          </div>
        )}

        {/* 4. Tab Body Area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* ================= TAB 1: 3D LUTS ================= */}
          {activeTab === 'luts' && (
            <div className="space-y-3">
              {/* Top Controls: Import Button & Search */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="h-9 px-4 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95 flex-shrink-0"
                >
                  <Upload size={14} />
                  <span>{isImporting ? 'Reading?' : 'Import LUT'}</span>
                </button>

                <div className="flex-1 relative flex items-center">
                  <Search size={13} className="absolute left-3.5 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search LUTs..."
                    className="w-full h-9 bg-zinc-900 border border-white/10 rounded-full pl-9 pr-8 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 text-zinc-400 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-semibold">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`h-8 px-3.5 flex items-center flex-shrink-0 rounded-full whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-zinc-100 text-black'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Live Intensity Slider for Active LUT */}
              {activeLut && (
                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">LUT Intensity</span>
                    <span className="text-amber-400 font-bold">{lookState.lutIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={lookState.lutIntensity}
                    onChange={(e) => onChangeLookState({ lutIntensity: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* LUT Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {/* None / Off Card */}
                <div
                  onClick={() => onChangeLookState({ activeLutId: null })}
                  className={`relative p-2.5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 min-h-[104px] ${
                    lookState.activeLutId === null
                      ? 'border-amber-400 bg-amber-400/10 shadow-lg'
                      : 'border-white/10 bg-zinc-900/60 hover:bg-zinc-800/80'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center text-zinc-400">
                    <RotateCcw size={16} />
                  </div>
                  <span className="text-xs font-bold text-white">None (Raw)</span>
                  <span className="text-[11px] text-zinc-400">Clean feed</span>
                </div>

                {filteredLuts.map((lut) => {
                  const isSelected = lookState.activeLutId === lut.id;
                  const isRenaming = renamingLutId === lut.id;

                  return (
                    <div
                      key={lut.id}
                      onClick={() => onChangeLookState({ activeLutId: lut.id })}
                      className={`relative p-2.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between min-h-[104px] overflow-hidden group ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/10'
                          : 'border-white/10 bg-zinc-900/60 hover:bg-zinc-800/80 hover:border-white/20'
                      }`}
                    >
                      {/* Gradient Preview Header */}
                      <div
                        className="w-full h-8 rounded-xl shadow-inner mb-2 border border-white/10 relative overflow-hidden flex items-center justify-between px-2"
                        style={{ background: lut.thumbnailGradient }}
                      >
                        <span className="text-[10px] font-bold text-white drop-shadow-md">
                          {lut.size}×{lut.size}
                        </span>

                        {/* Favorite button */}
                        <button
                          onClick={(e) => handleToggleFavorite(e, lut.id)}
                          className={`p-1 rounded-full backdrop-blur-md transition-colors ${
                            lut.isFavorite ? 'text-amber-400 bg-black/40' : 'text-white/60 hover:text-white bg-black/20'
                          }`}
                          title={lut.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
                        >
                          <Star size={11} fill={lut.isFavorite ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      {/* Name & Metadata */}
                      {isRenaming ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="w-full bg-zinc-800 text-xs px-1.5 py-0.5 rounded text-white border border-amber-400"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSubmitRename(lut.id)}
                            className="p-1 rounded bg-amber-400 text-black"
                          >
                            <Check size={11} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col truncate pr-1">
                            <span className="text-xs font-bold text-white truncate">{lut.name}</span>
                            <span className="text-[10px] text-zinc-400 capitalize">
                              {lut.isImported ? 'Imported' : lut.category.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Action icons for imported LUTs */}
                          {lut.isImported && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleStartRename(e, lut)}
                                className="text-zinc-400 hover:text-white p-0.5"
                                title="Rename LUT"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={(e) => handleDeleteLut(e, lut.id)}
                                className="text-rose-400 hover:text-rose-300 p-0.5"
                                title="Delete LUT"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAB 2: BUILT-IN FILTERS ================= */}
          {activeTab === 'filters' && (
            <div className="space-y-3">
              {/* Filter Intensity Slider */}
              {activeFilter && (
                <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Filter Strength</span>
                    <span className="text-amber-400 font-bold">{lookState.filterIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={lookState.filterIntensity}
                    onChange={(e) => onChangeLookState({ filterIntensity: parseInt(e.target.value, 10) })}
                    className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              )}

              {/* Filters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {/* None / Off Filter */}
                <div
                  onClick={() => onChangeLookState({ activeFilterId: null })}
                  className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 min-h-[104px] ${
                    lookState.activeFilterId === null
                      ? 'border-amber-400 bg-amber-400/10 shadow-lg'
                      : 'border-white/10 bg-zinc-900/60 hover:bg-zinc-800/80'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center text-zinc-400">
                    <RotateCcw size={16} />
                  </div>
                  <span className="text-xs font-bold text-white">None (Standard)</span>
                  <span className="text-[10px] text-zinc-500">Original Tones</span>
                </div>

                {BUILTIN_LOOK_FILTERS.map((flt) => {
                  const isSelected = lookState.activeFilterId === flt.id;
                  return (
                    <div
                      key={flt.id}
                      onClick={() => onChangeLookState({ activeFilterId: flt.id })}
                      className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between min-h-[95px] overflow-hidden ${
                        isSelected
                          ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/10'
                          : 'border-white/10 bg-zinc-900/60 hover:bg-zinc-800/80 hover:border-white/20'
                      }`}
                    >
                      <div
                        className="w-full h-8 rounded-xl shadow-inner mb-2 border border-white/10"
                        style={{ background: flt.previewGradient }}
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white truncate">{flt.name}</span>
                        <span className="text-[10px] text-zinc-400">{flt.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAB 3: COLOR ADJUSTMENTS ================= */}
          {activeTab === 'adjustments' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <span className="text-xs text-zinc-400">Precision Manual Controls</span>
                <button
                  onClick={handleResetAllAdjustments}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <RotateCcw size={11} />
                  <span>Reset All</span>
                </button>
              </div>

              {/* 1. Exposure */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">Exposure</span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">{lookState.adjustments.exposure > 0 ? `+${lookState.adjustments.exposure.toFixed(1)}` : lookState.adjustments.exposure.toFixed(1)} EV</span>
                    {lookState.adjustments.exposure !== 0 && (
                      <button onClick={() => handleResetAdjustment('exposure')} className="text-zinc-500 hover:text-white">
                        <RotateCcw size={10} />
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={lookState.adjustments.exposure}
                  onChange={(e) => handleUpdateAdjustment('exposure', parseFloat(e.target.value))}
                  className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* 2. Contrast */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">Contrast</span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">{lookState.adjustments.contrast > 0 ? `+${lookState.adjustments.contrast}` : lookState.adjustments.contrast}</span>
                    {lookState.adjustments.contrast !== 0 && (
                      <button onClick={() => handleResetAdjustment('contrast')} className="text-zinc-500 hover:text-white">
                        <RotateCcw size={10} />
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={lookState.adjustments.contrast}
                  onChange={(e) => handleUpdateAdjustment('contrast', parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* 3. Saturation */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">Saturation</span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">{lookState.adjustments.saturation > 0 ? `+${lookState.adjustments.saturation}` : lookState.adjustments.saturation}</span>
                    {lookState.adjustments.saturation !== 0 && (
                      <button onClick={() => handleResetAdjustment('saturation')} className="text-zinc-500 hover:text-white">
                        <RotateCcw size={10} />
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={lookState.adjustments.saturation}
                  onChange={(e) => handleUpdateAdjustment('saturation', parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* 4. Temperature */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">Temperature (Kelvin Offset)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">{lookState.adjustments.temperature > 0 ? `+${lookState.adjustments.temperature}` : lookState.adjustments.temperature}</span>
                    {lookState.adjustments.temperature !== 0 && (
                      <button onClick={() => handleResetAdjustment('temperature')} className="text-zinc-500 hover:text-white">
                        <RotateCcw size={10} />
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={lookState.adjustments.temperature}
                  onChange={(e) => handleUpdateAdjustment('temperature', parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* 5. Tint */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300">Tint (Green - Magenta)</span>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-bold">{lookState.adjustments.tint > 0 ? `+${lookState.adjustments.tint}` : lookState.adjustments.tint}</span>
                    {lookState.adjustments.tint !== 0 && (
                      <button onClick={() => handleResetAdjustment('tint')} className="text-zinc-500 hover:text-white">
                        <RotateCcw size={10} />
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={lookState.adjustments.tint}
                  onChange={(e) => handleUpdateAdjustment('tint', parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* 6. Highlights & Shadows */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">Highlights</span>
                    <span className="text-amber-400 font-bold">{lookState.adjustments.highlights}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={lookState.adjustments.highlights}
                    onChange={(e) => handleUpdateAdjustment('highlights', parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">Shadows</span>
                    <span className="text-amber-400 font-bold">{lookState.adjustments.shadows}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="1"
                    value={lookState.adjustments.shadows}
                    onChange={(e) => handleUpdateAdjustment('shadows', parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* 7. Fade & Sharpening */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">Matte Fade</span>
                    <span className="text-amber-400 font-bold">{lookState.adjustments.fade}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={lookState.adjustments.fade}
                    onChange={(e) => handleUpdateAdjustment('fade', parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300">Sharpening</span>
                    <span className="text-amber-400 font-bold">{lookState.adjustments.sharpening}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={lookState.adjustments.sharpening}
                    onChange={(e) => handleUpdateAdjustment('sharpening', parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Save As Custom Preset */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                {isSavingPreset ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="text"
                      value={savePresetName}
                      onChange={(e) => setSavePresetName(e.target.value)}
                      placeholder="Preset name..."
                      className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                      autoFocus
                    />
                    <button
                      onClick={handleSavePreset}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-bold"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsSavingPreset(false)}
                      className="px-2 py-1.5 text-xs text-zinc-400"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsSavingPreset(true)}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs flex items-center gap-1.5"
                  >
                    <FileText size={13} />
                    <span>Save Grade as Custom Preset</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
