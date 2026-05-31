/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, DragEvent, ChangeEvent } from "react";
import { Upload, FolderPlus, Play, Pause, XCircle, FileImage, ShieldAlert } from "lucide-react";
import { AnimalRecord } from "../types";

interface UploadZoneProps {
  onRecordProcessed: (record: AnimalRecord, fileBlob: Blob) => void;
  onQueueComplete: () => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  status: "pending" | "processing" | "completed" | "failed";
}

export default function UploadZone({
  onRecordProcessed,
  onQueueComplete,
  isProcessing,
  setIsProcessing,
}: UploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [currentProgress, setCurrentProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const isPauseRef = useRef(false);
  const [isPaused, setIsPaused] = useState(false);

  // Helper to trigger standard file picker
  const triggerFileSelect = () => fileInputRef.current?.click();
  const triggerFolderSelect = () => folderInputRef.current?.click();

  // Drag handlers
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files) as File[];
      addFilesToQueue(filesArray);
    }
  };

  // Add files to current processing queue
  const addFilesToQueue = (files: File[]) => {
    const validFiles = files.filter((file) =>
      /\.(jpe?g|png|webp)$/i.test(file.name)
    );

    if (validFiles.length === 0) return;

    const newQueued: QueuedFile[] = validFiles.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      name: file.name,
      status: "pending",
    }));

    setQueue((prev) => [...prev, ...newQueued]);
    
    // Automatically trigger processing
    if (!isProcessing) {
      startProcessingQueue([...queue, ...newQueued]);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files) as File[]);
    }
  };

  // HTML5 Client-Side Canvas Image Processor (High Quality Resizing / Crop-fit)
  const preprocessImage = (
    file: File,
    maxDim: number,
    forceAspect: boolean = false
  ): Promise<{ dataUrl: string; width: number; height: number; blob: Blob }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Process dimensions preserving aspect ratio
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          if (forceAspect) {
            // Equalize into perfect 1:1 Crop ratio square for beautiful thumbnail display
            const size = Math.min(img.width, img.height);
            canvas.width = maxDim;
            canvas.height = maxDim;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";
              ctx.drawImage(
                img,
                (img.width - size) / 2,
                (img.height - size) / 2,
                size,
                size,
                0,
                0,
                maxDim,
                maxDim
              );
            }
          } else {
            // standard fitting preserving proportions
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "high";
              ctx.drawImage(img, 0, 0, width, height);
            }
          }

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
                resolve({ dataUrl, width, height, blob });
              } else {
                reject(new Error("Canvas conversion to Blob failed"));
              }
            },
            "image/jpeg",
            0.85
          );
        };
        img.onerror = () => reject(new Error("Failed to load image element"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("File reading failed"));
      reader.readAsDataURL(file);
    });
  };

  // Start executing the processing pipeline
  const startProcessingQueue = async (currentQueue: QueuedFile[]) => {
    if (isProcessing) return;
    setIsProcessing(true);
    isPauseRef.current = false;
    setIsPaused(false);

    let activeQueue = [...currentQueue];
    let localProcessed = processedCount;
    let localFailed = failedCount;

    while (activeQueue.some((item) => item.status === "pending" || item.status === "processing")) {
      // Check pause
      if (isPauseRef.current) {
        setIsPaused(true);
        setIsProcessing(false);
        return;
      }

      // Find first pending item
      const nextIndex = activeQueue.findIndex((item) => item.status === "pending");
      if (nextIndex === -1) break;

      const currentItem = activeQueue[nextIndex];
      currentItem.status = "processing";
      setQueue([...activeQueue]);

      try {
        // Step 1. Downscale original image into uniform thumbnail size 180x180 for quick grid
        const thumbResult = await preprocessImage(currentItem.file, 180, true);
        
        // Step 2. Downscale into optimal Gemini classifier target 480px width for fast API transfer
        const classifierResult = await preprocessImage(currentItem.file, 480, false);

        // Convert classifier payload to base64 for API call
        const base64ForClassifier = classifierResult.dataUrl.split(",")[1];

        // Step 3. Dispatch to secure Express backend server
        const response = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64Data: base64ForClassifier,
            mimeType: "image/jpeg",
            filename: currentItem.file.name,
          }),
        });

        if (!response.ok) {
          throw new Error(`Classifier service returned status ${response.status}`);
        }

        const classification = await response.json();

        // Construct official complete record
        const completeRecord: AnimalRecord = {
          id: currentItem.id,
          imageName: currentItem.file.name,
          animalName: classification.animalName || "Unknown",
          category: classification.category || "Mammals",
          confidence: classification.confidence != null ? classification.confidence : 0.85,
          uploadDate: new Date().toISOString(),
          thumbnailUrl: thumbResult.dataUrl, // ultra-small compressed thumbnail Base64 (10-15KB)
          originalSize: currentItem.file.size,
          aspectRatio: classifierResult.width / classifierResult.height,
          description: classification.description,
          tags: classification.tags || [],
        };

        // Notify parent grid to persist metadata and Blob
        await onRecordProcessed(completeRecord, currentItem.file);

        currentItem.status = "completed";
        localProcessed++;
        setProcessedCount(localProcessed);
      } catch (err) {
        console.error("Pipeline failure on queued item:", currentItem.name, err);
        currentItem.status = "failed";
        localFailed++;
        setFailedCount(localFailed);
      }

      // Calculate state progress percentage
      const completedOrFailed = activeQueue.filter(
        (x) => x.status === "completed" || x.status === "failed"
      ).length;
      setCurrentProgress(Math.round((completedOrFailed / activeQueue.length) * 100));
      setQueue([...activeQueue]);
    }

    // Finished completely! Clear items and notify
    setIsProcessing(false);
    setQueue([]);
    setProcessedCount(0);
    setFailedCount(0);
    setCurrentProgress(0);
    onQueueComplete();
  };

  const handlePauseToggle = () => {
    if (isPauseRef.current) {
      isPauseRef.current = false;
      setIsPaused(false);
      setIsProcessing(true);
      // Resume
      startProcessingQueue(queue);
    } else {
      isPauseRef.current = true;
      setIsPaused(true);
    }
  };

  const handleCancelAll = () => {
    isPauseRef.current = true;
    setIsPaused(false);
    setIsProcessing(false);
    setQueue([]);
    setProcessedCount(0);
    setFailedCount(0);
    setCurrentProgress(0);
  };

  return (
    <div className="space-y-6">
      {/* Interactive Uploader Container with Glassmorphism Borders */}
      <div
        className={`relative flex flex-col items-center justify-center min-h-[190px] border-2 border-dashed rounded-2xl p-6 transition-all duration-300 backdrop-blur-lg cursor-pointer ${
          dragActive
            ? "border-cyan-500 bg-cyan-500/10 scale-[0.99] shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            : "border-white/10 hover:border-cyan-500/50 hover:bg-white/10 bg-white/5 shadow-md"
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        id="uploader-container"
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleFileSelect}
          accept="image/png, image/jpeg, image/jpg, image/webp"
        />

        {/* Webkit folders picker input */}
        <input
          type="file"
          ref={folderInputRef}
          className="hidden"
          onChange={handleFileSelect}
          accept="image/png, image/jpeg, image/jpg, image/webp"
          {...({
            webkitdirectory: "",
            directory: "",
            multiple: true,
          } as any)}
        />

        <div className="flex flex-col items-center text-center space-y-3 pointer-events-none">
          <div className="p-3.5 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Upload className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">
              Drag & Drop your animal images here
            </p>
            <p className="text-xs text-slate-400">
              Supports JPG, PNG, WEBP files
            </p>
          </div>

          <div className="flex items-center gap-2 mt-2 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={triggerFileSelect}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-500/20 transition-all duration-200 cursor-pointer"
            >
              <FileImage className="w-3.5 h-3.5" />
              Select Files
            </button>
            <button
              onClick={triggerFolderSelect}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-slate-200 rounded-xl shadow-sm transition-all duration-200 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
              Upload Folder
            </button>
          </div>
        </div>
      </div>

      {/* Progress Queue Manager Bar */}
      {queue.length > 0 && (
        <div className="p-5 border border-white/10 bg-white/5 rounded-2xl shadow-xl backdrop-blur-lg animate-fade-in space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? "bg-amber-400" : "bg-cyan-400"}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isPaused ? "bg-amber-500" : "bg-cyan-500"}`}></span>
                </span>
                {isPaused ? "Image Processing Paused" : "Automatic Classification Queue"}
              </h3>
              <p className="text-xs text-slate-300">
                Processed <span className="font-semibold text-white">{processedCount}</span> of{" "}
                <span className="font-semibold text-white">{queue.length}</span> images
                {failedCount > 0 && (
                  <span className="text-rose-400 ml-1.5">({failedCount} failures)</span>
                )}
              </p>
            </div>

            {/* Queue Operations Panel */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePauseToggle}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 rounded-lg text-slate-200 border border-white/10 transition-all cursor-pointer"
              >
                {isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-cyan-400" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-amber-500" />
                    Pause
                  </>
                )}
              </button>
              <button
                onClick={handleCancelAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-rose-400 border border-rose-500/25 transition-all cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel All
              </button>
            </div>
          </div>

          {/* Smooth custom Animated Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden shadow-inner flex">
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  isPaused ? "bg-amber-500" : "bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                }`}
                style={{ width: `${currentProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>{currentProgress}% COMPLETED</span>
              {!isPaused && isProcessing && (
                <span className="animate-pulse text-cyan-400 font-bold">ANALYZING SPECIMENS...</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
