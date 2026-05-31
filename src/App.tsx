/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Sun,
  Moon,
  Database,
  Sparkles,
  Info,
  BookOpen,
  HelpCircle,
  Code,
  Github,
  Award,
} from "lucide-react";
import { AnimalRecord, DashboardStats, SearchFilters } from "./types";
import {
  getAllImageRecords,
  saveImageRecord,
  deleteImageRecord,
  clearAllRecords,
  syncWithServer,
  updateImageRecordMetadata,
} from "./services/db";
import UploadZone from "./components/UploadZone";
import QuerySearch from "./components/QuerySearch";
import Dashboard from "./components/Dashboard";
import ImageGallery from "./components/ImageGallery";

export default function App() {
  const [records, setRecords] = useState<AnimalRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  // Default Search filters state
  const [filters, setFilters] = useState<SearchFilters>({
    searchQuery: "",
    animalType: "all",
    minConfidence: 0,
    sortBy: "date_desc",
    dateRange: "all",
  });

  // Load theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("animal_dashboard_theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      // Default to crisp light theme for maximum color contrast and accessibility
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Theme toggle helper
  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("animal_dashboard_theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  // Pull all records from high-speed client-side IndexedDB Cache on launch
  const refreshRecords = async () => {
    try {
      const dbEntries = await getAllImageRecords();
      const loadedRecords = dbEntries.map((e) => e.metadata);
      setRecords(loadedRecords);
      
      // Perform server sync in the background
      await syncWithServer(loadedRecords);
    } catch (err) {
      console.error("IndexedDB load failure on startup:", err);
    }
  };

  useEffect(() => {
    refreshRecords();
  }, []);

  // Callback when an image is successfully preprocessed & classified by the queue
  const handleRecordProcessed = async (newRecord: AnimalRecord, fileBlob: Blob) => {
    // 1. Write original image + classification meta to client IndexedDB
    await saveImageRecord(newRecord, fileBlob);

    // 2. Sync to Express-backed metadata database
    try {
      await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord),
      });
    } catch (err) {
      console.warn("Offline registration: skipped server write metadata syncing", err);
    }

    // 3. Update React active state on the fly
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === newRecord.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = newRecord;
        return copy;
      }
      return [newRecord, ...prev];
    });
  };

  const handleQueueComplete = () => {
    // Pipeline finishes, make sure all records match IndexedDB
    refreshRecords();
  };

  // Purge specimen from databases
  const handleDeleteRecord = async (id: string) => {
    try {
      // Clear from local storage
      await deleteImageRecord(id);

      // Tell Express backend server to purge the metadata sync entry
      await fetch(`/api/images/${id}`, { method: "DELETE" });

      // Clean React active state
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Delete record pipeline failure:", err);
    }
  };

  // Update details of a specimen (allows user manual corrections)
  const handleUpdateRecord = async (updatedRecord: AnimalRecord) => {
    try {
      // 1. Save metadata to client IndexedDB cached database
      await updateImageRecordMetadata(updatedRecord);

      // 2. Sync metadata to Express backend server
      await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRecord),
      });

      // 3. Update React active state on the fly
      setRecords((prev) =>
        prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r))
      );
    } catch (err) {
      console.error("Update record pipeline failure:", err);
    }
  };

  // Whack everything
  const handleClearDatabase = async () => {
    if (
      window.confirm(
        "Are you absolutely certain you want to purge all animal classifications and files? This action is completely irreversible."
      )
    ) {
      await clearAllRecords();
      setRecords([]);
    }
  };

  // Compile available taxons dynamically from records for filter tabs
  const availableCategories = useMemo(() => {
    const cats = new Set(records.map((r) => r.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [records]);

  // Client-Side Heuristics Search & Fine Grained Sorting Engine
  const filteredRecords = useMemo(() => {
    return records
      .filter((record) => {
        // Query search matches animalName or tags or category
        const sQuery = filters.searchQuery.toLowerCase().trim();
        const animalMatch = record.animalName.toLowerCase().includes(sQuery);
        const categoryMatch = record.category.toLowerCase().includes(sQuery);
        const tagMatch = record.tags.some((t) => t.toLowerCase().includes(sQuery));
        const filenameMatch = record.imageName.toLowerCase().includes(sQuery);
        const matchesQuery = !sQuery || animalMatch || categoryMatch || tagMatch || filenameMatch;

        // Class type matching
        const matchesCategory =
          filters.animalType === "all" || record.category === filters.animalType;

        // Minimum confidence checks
        const matchesConfidence = record.confidence >= filters.minConfidence;

        // Time horizon check
        let matchesDate = true;
        if (filters.dateRange !== "all") {
          const uploadTime = new Date(record.uploadDate).getTime();
          const now = Date.now();
          if (filters.dateRange === "today") {
            matchesDate = uploadTime > now - 24 * 60 * 60 * 1000;
          } else if (filters.dateRange === "week") {
            matchesDate = uploadTime > now - 7 * 24 * 60 * 60 * 1000;
          } else if (filters.dateRange === "month") {
            matchesDate = uploadTime > now - 30 * 24 * 60 * 60 * 1000;
          }
        }

        return matchesQuery && matchesCategory && matchesConfidence && matchesDate;
      })
      .sort((a, b) => {
        // Multi-level sorting application
        if (filters.sortBy === "date_desc") {
          return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
        }
        if (filters.sortBy === "date_asc") {
          return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
        }
        if (filters.sortBy === "confidence_desc") {
          return b.confidence - a.confidence;
        }
        if (filters.sortBy === "confidence_asc") {
          return a.confidence - b.confidence;
        }
        if (filters.sortBy === "name_asc") {
          return a.animalName.localeCompare(b.animalName);
        }
        return 0;
      });
  }, [records, filters]);

  // Aggregate metrics dynamically on state transitions
  const stats: DashboardStats = useMemo(() => {
    const totalImages = records.length;
    
    // Group identical items
    const speciesMap: { [key: string]: number } = {};
    const categoryMap: { [key: string]: number } = {};
    let totalConfidence = 0;

    records.forEach((r) => {
      speciesMap[r.animalName] = (speciesMap[r.animalName] || 0) + 1;
      categoryMap[r.category] = (categoryMap[r.category] || 0) + 1;
      totalConfidence += r.confidence;
    });

    const categoryDistribution = Object.keys(categoryMap).map((cat) => ({
      name: cat,
      value: categoryMap[cat],
    }));

    const animalDistribution = Object.keys(speciesMap).map((sp) => ({
      name: sp,
      count: speciesMap[sp],
      percentage: totalImages > 0 ? Math.round((speciesMap[sp] / totalImages) * 105) / 100 : 0,
    })).sort((a, b) => b.count - a.count);

    return {
      totalImages,
      totalAnimalTypes: Object.keys(speciesMap).length,
      averageConfidence: totalImages > 0 ? totalConfidence / totalImages : 0,
      categoryDistribution,
      animalDistribution,
      recentUploadsCount: records.filter((r) => {
        const uploadTime = new Date(r.uploadDate).getTime();
        return uploadTime > Date.now() - 24 * 60 * 60 * 1000;
      }).length,
    };
  }, [records]);

  // Download complete catalog schema in raw UTF-8 CSV representation
  const handleExportCSV = () => {
    if (records.length === 0) return;

    const headers = [
      "ID",
      "FileName",
      "AnimalName",
      "BiologicalCategory",
      "ConfidenceLevel",
      "UploadDateISO",
      "OriginalSizeBytes",
      "Tags",
    ];
    
    const rows = records.map((r) => [
      r.id,
      `"${r.imageName.replace(/"/g, '""')}"`,
      `"${r.animalName.replace(/"/g, '""')}"`,
      r.category,
      r.confidence.toFixed(4),
      r.uploadDate,
      r.originalSize,
      `"${(r.tags || []).join(", ").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `animal_recognition_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans transition-all duration-300 flex flex-col selection:bg-cyan-500/30 relative overflow-x-hidden">
      {/* Decorative radial blur blobs to achieve the glorious Frosted Glass theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-slate-950 pointer-events-none z-0"></div>
      <div className="absolute top-[-120px] left-[-120px] w-96 h-96 bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-120px] right-[-120px] w-96 h-96 bg-purple-500/15 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Dynamic Aesthetic Header bar with Glassmorphism blur effects */}
      <header className="sticky top-0 z-40 bg-white/5 border-b border-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5 leading-none bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-350">
                ZooLogic AI Archive
                <span className="text-[9px] font-bold text-cyan-300 bg-cyan-500/20 px-1.5 py-0.5 rounded-full uppercase border border-cyan-500/30 font-mono">
                  Engine Active
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold font-mono">
                Gemini Multi-Specimen Neural Identifier
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Documentation toggle button */}
            <button
              onClick={() => setIsDocsOpen(!isDocsOpen)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isDocsOpen
                  ? "bg-cyan-500/25 border-cyan-500/40 text-cyan-300"
                  : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
              title="Installation Guide & API Deliverables Manual"
              id="documentation-panel"
            >
              <HelpCircle className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6 relative z-10">
        
        {/* Deliverables manual accordion / drawer */}
        {isDocsOpen && (
          <div className="p-6 border border-white/10 bg-white/5 rounded-2xl backdrop-blur-lg animate-fade-in space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-bold text-cyan-300 flex items-center gap-1.5">
                <BookOpen className="w-5 h-5" />
                Technical Deliverables & Deployment Manual
              </h2>
              <button
                onClick={() => setIsDocsOpen(false)}
                className="text-xs font-semibold text-slate-400 hover:text-white"
              >
                Dismiss Documentation
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300 leading-relaxed font-sans">
              <div className="space-y-3">
                <h3 className="font-extrabold text-white flex items-center gap-1">
                  <Code className="w-4 h-4 text-cyan-400" />
                  System Folder Structure
                </h3>
                <pre className="p-3 bg-black/40 rounded-xl font-mono text-[10px] whitespace-pre-wrap overflow-x-auto text-slate-400 border border-white/10">
{`├── server.ts             # Express REST Backend with Gemini Classification
├── package.json          # Node engine compile config & ESM bundler tasks
├── metadata.json         # Platform capabilities profile
├── src/
│   ├── types.ts          # TypeScript shared taxonomy declarations
│   ├── main.tsx          # React application entry mount point
│   ├── index.css         # Tailwind core style imports
│   ├── App.tsx           # Global state orchestrator + CSV tools
│   ├── services/
│   │   └── db.ts         # Native IndexedDB image storage cache engine
│   └── components/
│       ├── UploadZone.tsx     # Downscaler & parallel queuing uploader
│       ├── QuerySearch.tsx    # Keyword search & filters panel
│       ├── Dashboard.tsx      # Bento grid analytics & recharts
│       └── ImageGallery.tsx   # Lazy-loaded thumbnail grids & lightbox`}
                </pre>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-extrabold text-white flex items-center gap-1">
                    <Sun className="w-4 h-4 text-cyan-400" />
                    How to Install & Run Locally
                  </h3>
                  <ol className="list-decimal pl-4 space-y-1.5 font-sans">
                    <li>Extract ZIP deliverables or clone repository directory workspace</li>
                    <li>Ensure <span className="font-semibold text-white">Node.js 18+</span> is pre-installed locally</li>
                    <li>Install base modules: <code className="px-1 py-0.5 bg-white/10 rounded font-mono text-[10px] border border-white/5">npm install</code></li>
                    <li>Provide your Gemini Secret API key in terminal environment: <br />
                      <code className="px-1 py-0.5 bg-white/10 rounded font-mono text-[10px] border border-white/5">export GEMINI_API_KEY="YOUR_KEY"</code></li>
                    <li>Start development server: <code className="px-1 py-0.5 bg-white/10 rounded font-mono text-[10px] border border-white/5">npm run dev</code></li>
                    <li>Open browser at <span className="font-semibold font-mono text-cyan-400">http://localhost:3000</span></li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <h3 className="font-extrabold text-white flex items-center gap-1">
                    <Award className="w-4 h-4 text-cyan-400" />
                    Backend API Specifications
                  </h3>
                  <ul className="list-disc pl-4 space-y-1 font-sans font-medium">
                    <li><code className="text-cyan-400 font-bold">POST /api/classify</code> : Receives base64 image data payload and queries Gemini, yielding classification JSON.</li>
                    <li><code className="text-cyan-400 font-bold">GET /api/images</code> : Serves full metadata collection arrays for synchronization.</li>
                    <li><code className="text-cyan-400 font-bold">POST /api/images</code> : Saves or updates a taxonomy metadata record in SQLite-like disk db.</li>
                    <li><code className="text-cyan-400 font-bold">DELETE /api/images/:id</code> : Clears a matching metadata item.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bento Dashboard Statistics row */}
        <Dashboard
          stats={stats}
          records={records}
          onClearAll={handleClearDatabase}
          onExportCSV={handleExportCSV}
        />

        {/* Upload Drop Zone Section */}
        <UploadZone
          onRecordProcessed={handleRecordProcessed}
          onQueueComplete={handleQueueComplete}
          isProcessing={isProcessing}
          setIsProcessing={setIsProcessing}
        />

        {/* Search taxonomy inputs */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5">
              <h2 className="text-md font-extrabold text-white">
                Indexed Bio-Specimens List
              </h2>
              <p className="text-xs text-slate-450">
                Found <span className="font-semibold text-cyan-400">{filteredRecords.length}</span> matching{" "}
                {filteredRecords.length === 1 ? "specimen" : "specimens"} in the index matching current query (total: {records.length})
              </p>
            </div>
          </div>

          <QuerySearch
            filters={filters}
            setFilters={setFilters}
            availableCategories={availableCategories}
          />

          {/* Core Grid display */}
          <ImageGallery
            records={filteredRecords}
            onDeleteRecord={handleDeleteRecord}
            onUpdateRecord={handleUpdateRecord}
            searchQuery={filters.searchQuery}
          />
        </div>
      </main>

      {/* Decorative Minimal Page Footer */}
      <footer className="py-6 mt-12 bg-black/40 border-t border-white/10 text-center text-xs text-slate-500 font-mono tracking-wider relative z-10">
        ANIMAL RECOGNITION ACADEMIC PORTAL &copy; 2026. BUILT WITH GEMINI & EXPRESS.
      </footer>
    </div>
  );
}
