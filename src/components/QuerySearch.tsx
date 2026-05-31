/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Search, SlidersHorizontal, ArrowUpDown, Calendar, RefreshCw } from "lucide-react";
import { SearchFilters } from "../types";

interface QuerySearchProps {
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
  availableCategories: string[];
}

export default function QuerySearch({
  filters,
  setFilters,
  availableCategories,
}: QuerySearchProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, searchQuery: e.target.value }));
  };

  const handleCategorySelect = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      animalType: prev.animalType === category ? "all" : category,
    }));
  };

  const resetFilters = () => {
    setFilters({
      searchQuery: "",
      animalType: "all",
      minConfidence: 0,
      sortBy: "date_desc",
      dateRange: "all",
    });
  };

  const hasActiveFilters = 
    filters.searchQuery !== "" || 
    filters.animalType !== "all" || 
    filters.minConfidence > 0 || 
    filters.sortBy !== "date_desc" || 
    filters.dateRange !== "all";

  return (
    <div className="w-full space-y-4">
      {/* Primary search row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={handleSearchChange}
            placeholder='Search animals (e.g. "Zebra", "Tiger", "Carnivore")...'
            className="w-full pl-10.5 pr-4 py-3 text-sm bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all shadow-md text-white placeholder-slate-400 backdrop-blur-md"
            id="search-input"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Advanced toggle button */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              showAdvanced || hasActiveFilters
                ? "bg-cyan-600 border-cyan-500 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
            }`}
            id="toggle-filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-2 w-2 rounded-full bg-cyan-400"></span>
            )}
          </button>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold bg-white/5 text-slate-300 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              title="Reset Filters"
              id="reset-filters"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Categories Horizontal scrolling pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setFilters((p) => ({ ...p, animalType: "all" }))}
          className={`shrink-0 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
            filters.animalType === "all"
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm"
              : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
          }`}
        >
          All Classes
        </button>
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategorySelect(cat)}
            className={`shrink-0 px-3.5 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
              filters.animalType === cat
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Advanced Filters Drawer Panel (Animated accordion) */}
      {showAdvanced && (
        <div className="p-5 border border-white/10 bg-white/5 rounded-2xl shadow-lg backdrop-blur-xl grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in text-white">
          {/* Filter Range block: Confidence Threshold */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 tracking-wider uppercase flex justify-between">
              <span>Confidence Threshold</span>
              <span className="font-mono text-cyan-300 font-bold">
                ≥ {Math.round(filters.minConfidence * 100)}%
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={filters.minConfidence}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  minConfidence: parseFloat(e.target.value),
                }))
              }
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Any</span>
              <span>80%+ (High)</span>
              <span>100%</span>
            </div>
          </div>

          {/* Filter block: Date Filters */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 tracking-wider uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400" />
              <span>Time Horizon</span>
            </label>
            <select
              value={filters.dateRange}
              onChange={(e: any) =>
                setFilters((prev) => ({ ...prev, dateRange: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 text-xs bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="all">All-Time Historic</option>
              <option value="today">Past 24 Hours</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
            </select>
          </div>

          {/* Filter block: Sorter Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 tracking-wider uppercase flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-cyan-400" />
              <span>Sort Order</span>
            </label>
            <select
              value={filters.sortBy}
              onChange={(e: any) =>
                setFilters((prev) => ({ ...prev, sortBy: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 text-xs bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="date_desc">Upload Date: Newest First</option>
              <option value="date_asc">Upload Date: Oldest First</option>
              <option value="confidence_desc">Confidence: High to Low</option>
              <option value="confidence_asc">Confidence: Low to High</option>
              <option value="name_asc">Species: Alphabetical</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
