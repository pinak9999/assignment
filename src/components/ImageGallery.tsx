/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  Download,
  Trash2,
  Calendar,
  Sparkles,
  Info,
  Tag,
  BookOpen,
  ChevronRight,
  HardDrive,
  FileDown,
  Edit3,
  Check,
  X,
} from "lucide-react";
import { AnimalRecord } from "../types";
import { getImageRecord } from "../services/db";

interface ImageGalleryProps {
  records: AnimalRecord[];
  onDeleteRecord: (id: string) => void;
  onUpdateRecord: (record: AnimalRecord) => void;
  searchQuery: string;
}

const ITEMS_PER_PAGE = 24;

export default function ImageGallery({
  records,
  onDeleteRecord,
  onUpdateRecord,
  searchQuery,
}: ImageGalleryProps) {
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [originalBlobUrl, setOriginalBlobUrl] = useState<string | null>(null);
  const [isLoadingOriginal, setIsLoadingOriginal] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(ITEMS_PER_PAGE);

  // Edit status states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTagsString, setEditTagsString] = useState("");

  // Start edit loader
  const startEditing = () => {
    if (!selectedRecord) return;
    setEditName(selectedRecord.animalName);
    setEditCategory(selectedRecord.category);
    setEditDescription(selectedRecord.description || "");
    setEditTagsString((selectedRecord.tags || []).join(", "));
    setIsEditing(true);
  };

  // Save changes handler
  const handleSaveEdit = () => {
    if (!selectedRecord) return;
    const updatedTags = editTagsString
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updated: AnimalRecord = {
      ...selectedRecord,
      animalName: editName.trim() || "Unknown",
      category: editCategory as any,
      description: editDescription.trim(),
      tags: updatedTags,
    };

    onUpdateRecord(updated);
    setIsEditing(false);
  };

  // Lazy loading "Load More" helper
  const handleLoadMore = () => {
    setVisibleLimit((prev) => prev + ITEMS_PER_PAGE);
  };

  // Reset lazy load limit when records change
  React.useEffect(() => {
    setVisibleLimit(ITEMS_PER_PAGE);
  }, [records]);

  // Track currently selected record details
  const selectedRecord = useMemo(() => {
    return records.find((r) => r.id === selectedRecordId) || null;
  }, [selectedRecordId, records]);

  // Fetch original high resolution Blob when modal opens
  React.useEffect(() => {
    if (!selectedRecordId) {
      setOriginalBlobUrl(null);
      setIsEditing(false);
      return;
    }

    setIsLoadingOriginal(true);
    getImageRecord(selectedRecordId)
      .then((entry) => {
        if (entry && entry.originalBlob) {
          const url = URL.createObjectURL(entry.originalBlob);
          setOriginalBlobUrl(url);
        }
      })
      .catch((err) => {
        console.error("Failed to load original picture:", err);
      })
      .finally(() => {
        setIsLoadingOriginal(false);
      });

    return () => {
      if (originalBlobUrl) {
        URL.revokeObjectURL(originalBlobUrl);
      }
    };
  }, [selectedRecordId]);

  // Download high-resolution original file helper
  const handleDownloadOriginal = async (record: AnimalRecord) => {
    try {
      const entry = await getImageRecord(record.id);
      if (!entry) throw new Error("Record not found in database cache");

      const url = URL.createObjectURL(entry.originalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = record.imageName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Could not trigger download. The item might be cached only as thumbnail.");
    }
  };

  // Human-readable bytes format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Display matched items header: "Zebra Found: 37" style matching exact criteria
  const matchSummaryText = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    // Group identical items
    const counts: { [key: string]: number } = {};
    records.forEach((r) => {
      const name = r.animalName;
      counts[name] = (counts[name] || 0) + 1;
    });

    const matchItems = Object.keys(counts).map((sp) => `${sp} Found: ${counts[sp]}`);
    if (matchItems.length === 0) return `No matches found for "${searchQuery}"`;
    return matchItems.join(" | ");
  }, [records, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Grid Match summaries header */}
      {matchSummaryText && (
        <div className="px-5 py-3.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl text-xs font-bold font-mono tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.1)] mb-4 animate-fade-in">
          {matchSummaryText}
        </div>
      )}

      {records.length > 0 ? (
        <>
          {/* Main uniform thumbnails grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4" id="thumbnails-grid">
            {records.slice(0, visibleLimit).map((record) => {
              // Convert 0.95 -> 95
              const confPct = Math.round(record.confidence * 100);
              
              return (
                <div
                  key={record.id}
                  onClick={() => setSelectedRecordId(record.id)}
                  className="group relative flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:border-cyan-500/50 hover:bg-white/10 transition-all duration-300 cursor-pointer animate-fade-in"
                  title={record.animalName}
                >
                  {/* Thumbnail Picture frame */}
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-950/80">
                    <img
                      src={record.thumbnailUrl}
                      alt={record.animalName}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />

                    {/* Confidence pill on float */}
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-bold bg-slate-950/90 text-white backdrop-blur-md rounded-md flex items-center gap-0.5 border border-white/10">
                      <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                      {confPct}%
                    </div>

                    {/* Taxonomy badge on float bottom */}
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 text-[9px] font-semibold bg-cyan-500/85 backdrop-blur-md text-white rounded-md uppercase tracking-wider shadow-sm">
                      {record.category}
                    </div>
                  </div>

                  {/* Subtitle labels */}
                  <div className="p-2.5 space-y-0.5 flex-1 flex flex-col justify-between">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                      {record.animalName}
                    </h4>
                    <div className="flex justify-between items-center text-[9px] text-slate-450 font-mono">
                      <span className="truncate max-w-[70px]">
                        {record.imageName}
                      </span>
                      <span>
                        {new Date(record.uploadDate).toLocaleDateString(undefined, {
                          month: "numeric",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lazy loader triggers */}
          {records.length > visibleLimit && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 hover:text-white rounded-xl transition-all cursor-pointer shadow-md"
              >
                Load More Specimens
                <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-white/10 rounded-2xl p-6 bg-white/5 text-center space-y-3 backdrop-blur-md">
          <Info className="w-8 h-8 text-slate-500 animate-bounce" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-200">
              No matching records found
            </p>
            <p className="text-xs text-slate-400">
              Refine your searches or drop fresh images to auto index classifications!
            </p>
          </div>
        </div>
      )}

      {/* Detail Showcase Lightbox Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedRecordId(null)}
          id="gallery-modal"
        >
          <div
            className="relative w-full max-w-3xl bg-[#0f172a]/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh] sm:max-h-[80vh] md:max-h-[500px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left side: Original Image panel */}
            <div className="relative md:w-1/2 bg-slate-950/90 flex items-center justify-center h-[240px] md:h-full border-r border-white/5">
              {isLoadingOriginal ? (
                <div className="text-center text-xs text-slate-400 animate-pulse">
                  Querying original binary record blob...
                </div>
              ) : originalBlobUrl ? (
                <img
                  src={originalBlobUrl}
                  alt={selectedRecord.animalName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={selectedRecord.thumbnailUrl}
                  alt={selectedRecord.animalName}
                  className="w-full h-full object-cover filter blur-sm"
                />
              )}

              {/* Full high-resolution resolution scale indicators */}
              <div className="absolute bottom-3 left-3 px-2 py-0.5 text-[9px] font-mono bg-slate-900/80 text-white rounded-md border border-white/5">
                Aspect: {selectedRecord.aspectRatio?.toFixed(2)}:1
              </div>
            </div>

            {/* Right side: Detailed Taxon panel */}
            <div className="md:w-1/2 p-6 overflow-y-auto flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                {isEditing ? (
                  <div className="space-y-3.5 text-slate-205">
                    <h4 className="text-sm font-bold text-cyan-300 uppercase tracking-wider">Manual Classification Calibration</h4>
                    
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Specimen Common Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-900 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Biological Classification</label>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      >
                        <option value="Mammals">Mammals</option>
                        <option value="Birds">Birds</option>
                        <option value="Reptiles">Reptiles</option>
                        <option value="Amphibians">Amphibians</option>
                        <option value="Fish">Fish</option>
                        <option value="Invertebrates">Invertebrates</option>
                        <option value="Not an Animal">Not an Animal</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Natural History Desk Fact</label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 text-xs bg-slate-900 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none font-sans"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Specimen Tags (comma-separated)</label>
                      <input
                        type="text"
                        value={editTagsString}
                        onChange={(e) => setEditTagsString(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-900 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header title */}
                    <div className="space-y-1.5">
                      <span className="px-2 py-0.5 text-[9.5px] font-bold bg-cyan-600/30 text-cyan-300 border border-cyan-500/25 rounded-md uppercase tracking-wider">
                        {selectedRecord.category}
                      </span>
                      <h3 className="text-xl font-extrabold text-white leading-tight">
                        {selectedRecord.animalName}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                        Classification Confidence:{" "}
                        <span className="font-bold text-cyan-300">
                          {Math.round(selectedRecord.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Fun Facts Scientific Fact file panel */}
                    {selectedRecord.description && (
                      <div className="p-3 bg-white/5 rounded-xl space-y-1 border border-white/10">
                        <div className="flex items-center gap-1.5 text-[9.5px] font-bold text-cyan-400 uppercase tracking-widest leading-none">
                          <BookOpen className="w-3 h-3" />
                          <span>Natural History Desk</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {selectedRecord.description}
                        </p>
                      </div>
                    )}

                    {/* Behavioral Tags */}
                    {selectedRecord.tags && selectedRecord.tags.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          <Tag className="w-3 h-3 text-cyan-400" />
                          <span>Specimen Properties</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {selectedRecord.tags.map((tg) => (
                            <span
                              key={tg}
                              className="px-2.5 py-1 text-[10px] font-bold bg-cyan-500/10 text-cyan-300 rounded-md border border-cyan-500/20"
                            >
                              {tg}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Technical properties block */}
                <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] font-mono text-slate-400">
                  <div className="space-y-0.5">
                    <span className="block text-slate-500">REGISTERED DATE</span>
                    <span className="block font-semibold text-slate-250">
                      {new Date(selectedRecord.uploadDate).toLocaleString()}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-slate-500">FILE PROFILE</span>
                    <span className="block font-semibold text-slate-250 truncate" title={selectedRecord.imageName}>
                      {selectedRecord.imageName}
                    </span>
                  </div>
                  <div className="space-y-0.5 col-span-2">
                    <span className="block text-slate-500">SPECIMEN UUID</span>
                    <span className="block font-semibold text-slate-250 truncate" title={selectedRecord.id}>
                      {selectedRecord.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              {isEditing ? (
                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/25 cursor-pointer transition-all animate-fade-in"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save Taxonomy
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3.5 py-2 text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-slate-350 rounded-xl cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 pt-4 border-t border-white/10 animate-fade-in">
                  <button
                    onClick={startEditing}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 rounded-xl cursor-pointer transition-all"
                    title="Correct Specimen Taxonomy"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Correct</span>
                  </button>
                  <button
                    onClick={() => handleDownloadOriginal(selectedRecord)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
                    title="Download File"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Specimen
                  </button>
                  <button
                    onClick={() => {
                      onDeleteRecord(selectedRecord.id);
                      setSelectedRecordId(null);
                    }}
                    className="flex items-center justify-center p-2 text-rose-450 hover:bg-rose-500/10 text-rose-450 rounded-xl border border-rose-500/20 cursor-pointer transition-all"
                    title="Purge Specimen Record"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
