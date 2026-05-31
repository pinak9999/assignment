/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Model Configuration & Predictions Display Component
 */

import React, { useState, useEffect } from "react";
import { Settings, Brain, Gauge, Info, AlertCircle, CheckCircle } from "lucide-react";
import { ClassificationResponse, Prediction } from "../types";

interface ModelConfigProps {
  currentConfig?: {
    detectionThreshold: number;
    classificationThreshold: number;
    maxPredictions: number;
  };
  onConfigUpdate?: (config: any) => void;
  lastClassification?: ClassificationResponse;
}

export default function ModelConfig({
  currentConfig,
  onConfigUpdate,
  lastClassification,
}: ModelConfigProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [detectionThreshold, setDetectionThreshold] = useState(currentConfig?.detectionThreshold ?? 0.5);
  const [classificationThreshold, setClassificationThreshold] = useState(
    currentConfig?.classificationThreshold ?? 0.7
  );
  const [maxPredictions, setMaxPredictions] = useState(currentConfig?.maxPredictions ?? 5);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/model/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detectionThreshold,
          classificationThreshold,
          maxPredictions,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✓ Model config updated:", data.config);
        onConfigUpdate?.(data.config);
      }
    } catch (error) {
      console.error("Failed to update model config:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Model Information Panel */}
      <div className="p-5 border border-white/10 bg-white/5 rounded-xl backdrop-blur-lg">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">Animal Recognition Pipeline</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white/5 rounded-lg border border-white/5">
            <p className="text-slate-400 mb-1">Detection Model</p>
            <p className="font-mono font-semibold text-cyan-300">YOLOv8</p>
            <p className="text-[10px] text-slate-500 mt-1">Real-time object detection</p>
          </div>

          <div className="p-3 bg-white/5 rounded-lg border border-white/5">
            <p className="text-slate-400 mb-1">Classification Model</p>
            <p className="font-mono font-semibold text-blue-300">EfficientNet-B7</p>
            <p className="text-[10px] text-slate-500 mt-1">Species identification</p>
          </div>

          <div className="p-3 bg-white/5 rounded-lg border border-white/5">
            <p className="text-slate-400 mb-1">Framework</p>
            <p className="font-mono font-semibold text-purple-300">TensorFlow.js</p>
            <p className="text-[10px] text-slate-500 mt-1">On-device inference</p>
          </div>

          <div className="p-3 bg-white/5 rounded-lg border border-white/5">
            <p className="text-slate-400 mb-1">Confidence Threshold</p>
            <p className="font-mono font-semibold text-green-300">≥ 70%</p>
            <p className="text-[10px] text-slate-500 mt-1">Minimum accuracy requirement</p>
          </div>
        </div>
      </div>

      {/* Confidence Threshold Alert */}
      {lastClassification && lastClassification.confidence < 0.7 && (
        <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-xl flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-100 mb-1">Confidence Below Threshold</p>
            <p className="text-xs text-amber-200">
              Classification confidence is below 70%. Result marked as "Unknown Animal". 
              Try adjusting detection thresholds or use a clearer image.
            </p>
          </div>
        </div>
      )}

      {/* Top Predictions */}
      {lastClassification?.predictions && lastClassification.predictions.length > 0 && (
        <div className="p-5 border border-white/10 bg-white/5 rounded-xl backdrop-blur-lg">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Top Predictions</h3>
            <span className="ml-auto text-xs font-mono text-slate-400">
              {lastClassification.predictions.length} results
            </span>
          </div>

          <div className="space-y-2">
            {lastClassification.predictions.map((pred: Prediction, idx: number) => {
              const isValid = pred.confidence >= 0.7;
              const isPrimary = idx === 0;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border transition-all ${
                    isPrimary
                      ? "border-cyan-500/50 bg-cyan-500/10"
                      : isValid
                      ? "border-white/10 bg-white/5"
                      : "border-slate-700/50 bg-slate-900/20 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">#{pred.rank}</span>
                        <span className="font-semibold text-white text-sm">{pred.label}</span>
                        {isValid && (
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-sm">
                        <span className={isValid ? "text-cyan-300" : "text-slate-500"}>
                          {Math.round(pred.confidence * 100)}%
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {isValid ? "Valid" : "Below 70%"}
                      </div>
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isValid
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                          : "bg-slate-700"
                      }`}
                      style={{ width: `${Math.min(pred.confidence * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Model Configuration Controls */}
      <div className="p-5 border border-white/10 bg-white/5 rounded-xl backdrop-blur-lg">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 w-full mb-4 p-2 hover:bg-white/5 rounded-lg transition-all"
        >
          <Settings className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-bold text-white">Model Configuration</span>
          <span className="ml-auto text-xs text-slate-400">
            {showAdvanced ? "▼" : "▶"}
          </span>
        </button>

        {showAdvanced && (
          <div className="space-y-4 mt-4 pt-4 border-t border-white/10">
            {/* Detection Threshold */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-white">Detection Threshold</label>
                <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-cyan-300">
                  {detectionThreshold.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={detectionThreshold}
                onChange={(e) => setDetectionThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Minimum confidence for object detection (0.0 - 1.0)
              </p>
            </div>

            {/* Classification Threshold */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-white">Classification Threshold</label>
                <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-cyan-300">
                  {classificationThreshold.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1"
                step="0.05"
                value={classificationThreshold}
                onChange={(e) => setClassificationThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Minimum confidence for valid classification (0.7 - 1.0)
              </p>
            </div>

            {/* Max Predictions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-white">Top Predictions to Show</label>
                <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-cyan-300">
                  {maxPredictions}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={maxPredictions}
                onChange={(e) => setMaxPredictions(parseInt(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Number of top predictions to display (1 - 10)
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="w-full mt-4 px-4 py-2 text-sm font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition-all"
            >
              {isSaving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
        )}
      </div>

      {/* Bounding Box Info */}
      {lastClassification?.detections && lastClassification.detections.length > 0 && (
        <div className="p-4 border border-white/10 bg-white/5 rounded-xl text-xs">
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <p className="font-semibold text-white">Detection Data</p>
          </div>
          <p className="text-slate-400">
            Found {lastClassification.detections.length} animal region(s) in image
          </p>
          {lastClassification.detections[0] && (
            <div className="mt-2 font-mono text-[10px] text-slate-500 space-y-1">
              <p>• Region: {Math.round(lastClassification.detections[0].boundingBox.x * 100)}%, {Math.round(lastClassification.detections[0].boundingBox.y * 100)}%</p>
              <p>• Size: {Math.round(lastClassification.detections[0].boundingBox.width * 100)}% × {Math.round(lastClassification.detections[0].boundingBox.height * 100)}%</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
