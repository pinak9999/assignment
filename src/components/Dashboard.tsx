/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { Image, Layers, Sparkles, Activity, FileSpreadsheet, Trash2 } from "lucide-react";
import { DashboardStats, AnimalRecord } from "../types";

interface DashboardProps {
  stats: DashboardStats;
  records: AnimalRecord[];
  onClearAll: () => void;
  onExportCSV: () => void;
}

// Creative elegant color palettes for visual data matching
const COLORS = [
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#f43f5e", // Rose
];

export default function Dashboard({
  stats,
  records,
  onClearAll,
  onExportCSV,
}: DashboardProps) {
  // Aggregate data for historical area chart (group by day)
  const timelineData = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    records.forEach((r) => {
      try {
        const dateStr = new Date(r.uploadDate).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
        counts[dateStr] = (counts[dateStr] || 0) + 1;
      } catch (e) {
        // Fallback
        counts["Generic"] = (counts["Generic"] || 0) + 1;
      }
    });

    return Object.keys(counts).map((date) => ({
      date,
      uploads: counts[date],
    })).slice(-10); // Display last 10 dates for aesthetic spacing
  }, [records]);

  // Format species distribution data for Bar chart
  const speciesChartData = React.useMemo(() => {
    return stats.animalDistribution.slice(0, 6).map((sp) => ({
      name: sp.name,
      count: sp.count,
    }));
  }, [stats.animalDistribution]);

  return (
    <div className="space-y-6">
      {/* Dynamic Summary Cards Grid (Bento Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Images */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl shadow-lg backdrop-blur-lg flex items-center gap-4 transition-all hover:border-white/20 hover:scale-[1.02]">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Image className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              Total Specimens
            </p>
            <h3 className="text-2xl font-black text-white leading-none font-mono tracking-tight">
              {stats.totalImages}
            </h3>
          </div>
        </div>

        {/* Card 2: Animal Groups */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl shadow-lg backdrop-blur-lg flex items-center gap-4 transition-all hover:border-white/20 hover:scale-[1.02]">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              Class Categories
            </p>
            <h3 className="text-2xl font-black text-white leading-none font-mono tracking-tight">
              {stats.totalAnimalTypes}
            </h3>
          </div>
        </div>

        {/* Card 3: Model Accuracy */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl shadow-lg backdrop-blur-lg flex items-center gap-4 transition-all hover:border-white/20 hover:scale-[1.02]">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              Avg. Confidence
            </p>
            <h3 className="text-2xl font-black text-white leading-none font-mono tracking-tight">
              {Math.round(stats.averageConfidence * 100)}%
            </h3>
          </div>
        </div>

        {/* Card 4: Upload Streams Velocity */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl shadow-lg backdrop-blur-lg flex items-center gap-4 transition-all hover:border-white/20 hover:scale-[1.02]">
          <div className="p-3 bg-pink-500/10 text-pink-400 rounded-xl border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.15)]">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              Velocity (24H)
            </p>
            <h3 className="text-2xl font-black text-white leading-none font-mono tracking-tight">
              +{stats.recentUploadsCount}
            </h3>
          </div>
        </div>
      </div>

      {/* Database control panel quick buttons */}
      {records.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
          <div className="text-xs text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Smart database operations: <span className="font-semibold text-cyan-400">File system synced successfully</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExportCSV}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white/5 text-slate-200 hover:bg-white/10 rounded-xl border border-white/10 transition-all cursor-pointer shadow-sm"
              id="export-csv"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Export to CSV
            </button>
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl border border-red-500/20 transition-all cursor-pointer shadow-sm"
              id="delete-database"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Database
            </button>
          </div>
        </div>
      )}

      {/* Visualizations row (Recharts Cards Box) */}
      {records.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card left: Pie Chart (Biological Class Categories Distribution) */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl shadow-lg backdrop-blur-lg flex flex-col space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white">
                Biological Class Distribution
              </h3>
              <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">
                Class distribution matching
              </p>
            </div>
            <div className="h-[240px] w-full flex items-center justify-center">
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.categoryDistribution}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {stats.categoryDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconSize={8}
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {" "}
          {/* Card Middle: Bar Chart (Top Animal Species Species Density) */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl shadow-lg backdrop-blur-lg flex flex-col space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white">
                Ranked Animal Taxonomy
              </h3>
              <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">
                Species density hierarchy
              </p>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="99%" height="100%">
                <BarChart data={speciesChartData}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                    }}
                    cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {speciesChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[(index + 1) % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {" "}
          {/* Card Right: Timeline Area Chart (Timeline Frequency) */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl shadow-lg backdrop-blur-lg flex flex-col space-y-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white">
                Registration History Timeline
              </h3>
              <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider font-semibold">
                Upload historical frequency
              </p>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="99%" height="100%">
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorUploads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      borderRadius: "12px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="uploads"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUploads)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 p-6 border border-white/10 bg-white/5 rounded-2xl backdrop-blur-md">
          <p className="text-sm font-semibold text-slate-200">
            No statistics to visualize yet
          </p>
          <p className="text-xs text-slate-400">
            Upload images of animal biological specimens above to see real-time statistics matching!
          </p>
        </div>
      )}
    </div>
  );
}
