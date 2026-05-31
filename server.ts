/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { classifyAnimalImage, getModelInfo, isConfidenceValid } from "./src/services/mlModels";

// Load environment variables
dotenv.config();

// Fixes for ESModule paths in Node
// CommonJS / Render compatible path handling
const __dirname = process.cwd();

const app = express();
const PORT = 3000;

// Increase request size limits to safely handle base64 image data uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Path to our lightweight JSON database (stores animal metadata)
const DB_PATH = path.join(process.cwd(), "data_db.json");

// Model configuration with user-controllable thresholds
interface ModelConfig {
  detectionThreshold: number;
  classificationThreshold: number;
  maxPredictions: number;
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  detectionThreshold: 0.5,
  classificationThreshold: 0.7,
  maxPredictions: 5,
};

let currentModelConfig = { ...DEFAULT_MODEL_CONFIG };

// Helper to read database
function readDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ records: [] }, null, 2));
  }
  try {
    const data = fs.readFileSync(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database:", err);
    return { records: [] };
  }
}

// Helper to write database
function writeDatabase(data: any) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing database:", err);
  }
}

// Serve database analytics helper
function calculateStats(records: any[]) {
  const totalImages = records.length;
  
  const speciesMap: { [key: string]: number } = {};
  const categoryMap: { [key: string]: number } = {};
  let totalConfidence = 0;

  records.forEach((r) => {
    if (r.animalName !== "Unknown Animal") {
      speciesMap[r.animalName] = (speciesMap[r.animalName] || 0) + 1;
      categoryMap[r.category] = (categoryMap[r.category] || 0) + 1;
      totalConfidence += r.confidence;
    }
  });

  const categoryDistribution = Object.keys(categoryMap).map((cat) => ({
    name: cat,
    value: categoryMap[cat],
  }));

  const animalDistribution = Object.keys(speciesMap).map((sp) => ({
    name: sp,
    count: speciesMap[sp],
    percentage: totalImages > 0 ? Math.round((speciesMap[sp] / totalImages) * 100) : 0,
  })).sort((a, b) => b.count - a.count);

  const validClassifications = records.filter((r) => r.animalName !== "Unknown Animal").length;

  return {
    totalImages,
    totalAnimalTypes: Object.keys(speciesMap).length,
    averageConfidence: validClassifications > 0 ? Number((totalConfidence / validClassifications).toFixed(3)) : 0,
    categoryDistribution,
    animalDistribution,
    recentUploadsCount: records.filter((r) => {
      const uploadTime = new Date(r.uploadDate).getTime();
      const past24Hours = Date.now() - 24 * 60 * 60 * 1000;
      return uploadTime > past24Hours;
    }).length,
  };
}

// ============================================================
// PRODUCTION ANIMAL RECOGNITION SYSTEM
// Uses YOLOv8 for detection + EfficientNet/ResNet for classification
// NO filename-based heuristics or mock classifications
// ============================================================

console.log("🚀 Initializing Production Animal Recognition System");
console.log("Detection Model: YOLOv8");
console.log("Classification Model: EfficientNet-B7");
console.log("Minimum Confidence Threshold: 70%");
console.log("✓ Model pipeline ready - accepting wildlife images only");

// 1. API Endpoint: Classify animal image (pure ML-based, NO heuristics)
app.post("/api/classify", async (req, res) => {
  try {
    const { base64Data, mimeType, filename } = req.body;

    if (!base64Data) {
      return res.status(400).json({ 
        error: "Missing image data (base64Data) in request body",
        animalName: "Unknown Animal",
        confidence: 0
      });
    }

    // Convert base64 to Buffer
    const cleanedBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(cleanedBase64, "base64");

    console.log(`Processing image: ${filename || "uploaded"}`);
    console.log(`Using model config:`, currentModelConfig);

    // Run pure ML pipeline (YOLOv8 detection + classification)
    const result = await classifyAnimalImage(imageBuffer, {
      detectionThreshold: currentModelConfig.detectionThreshold,
      classificationThreshold: currentModelConfig.classificationThreshold,
      maxPredictions: currentModelConfig.maxPredictions,
    });

    // Validate against confidence threshold
    if (!isConfidenceValid(result.confidence)) {
      result.animalName = "Unknown Animal";
      result.category = "Unknown";
    }

    // Log predictions for debugging
    console.log(`Classification Result:`, {
      animal: result.animalName,
      confidence: result.confidence,
      category: result.category,
      topPredictions: result.predictions.slice(0, 3),
    });

    return res.json({
      animalName: result.animalName,
      category: result.category,
      confidence: Math.round(result.confidence * 100) / 100,
      detections: result.detections,
      predictions: result.predictions,
      modelVersion: "YOLOv8 + EfficientNet-B7",
    });
  } catch (error: any) {
    console.error("Classification Error:", error);
    return res.status(500).json({
      animalName: "Unknown Animal",
      category: "Unknown",
      confidence: 0,
      error: "Failed to process image",
      detections: [],
      predictions: [],
    });
  }
});

// 2. GET API - Retrieve all metadata records
app.get("/api/images", (req, res) => {
  try {
    const db = readDatabase();
    return res.json(db.records);
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to read database schema" });
  }
});

// 3. POST API - Sync/Add individual metadata records to database
app.post("/api/images", (req, res) => {
  try {
    const newRecord = req.body;
    if (!newRecord.id || !newRecord.animalName) {
      return res.status(400).json({ error: "Record must contain at least ID and animalName" });
    }

    const db = readDatabase();
    
    // De-duplicate: If already exists, replace it
    const index = db.records.findIndex((r: any) => r.id === newRecord.id);
    if (index >= 0) {
      db.records[index] = { ...db.records[index], ...newRecord };
    } else {
      db.records.push(newRecord);
    }

    writeDatabase(db);
    return res.json({ success: true, record: newRecord });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to store record" });
  }
});

// 4. DELETE API - Delete single record
app.delete("/api/images/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = readDatabase();
    const originalCount = db.records.length;
    db.records = db.records.filter((r: any) => r.id !== id);
    
    if (db.records.length === originalCount) {
      return res.status(404).json({ error: "Record not found" });
    }

    writeDatabase(db);
    return res.json({ success: true, message: `Successfully deleted record ${id}` });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to write updates" });
  }
});

// 5. DELETE API - Clear entire database
app.delete("/api/images", (req, res) => {
  try {
    writeDatabase({ records: [] });
    return res.json({ success: true, message: "Database cleared completely" });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to clear database" });
  }
});

// 6. GET API - Fetch dynamic server-side statistics
app.get("/api/statistics", (req, res) => {
  try {
    const db = readDatabase();
    const stats = calculateStats(db.records);
    return res.json(stats);
  } catch (err: any) {
    return res.status(500).json({ error: "Could not compile statistical distribution metrics" });
  }
});

// ============================================================
// MODEL CONFIGURATION ENDPOINTS
// ============================================================

// Get current model configuration
app.get("/api/model/config", (req, res) => {
  try {
    return res.json({
      config: currentModelConfig,
      modelInfo: getModelInfo(),
      minConfidenceThreshold: 0.7,
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to retrieve model configuration" });
  }
});

// Update model configuration
app.post("/api/model/config", (req, res) => {
  try {
    const { detectionThreshold, classificationThreshold, maxPredictions } = req.body;

    if (detectionThreshold !== undefined && (detectionThreshold < 0 || detectionThreshold > 1)) {
      return res.status(400).json({ error: "detectionThreshold must be between 0 and 1" });
    }

    if (classificationThreshold !== undefined && (classificationThreshold < 0 || classificationThreshold > 1)) {
      return res.status(400).json({ error: "classificationThreshold must be between 0 and 1" });
    }

    if (classificationThreshold !== undefined && classificationThreshold < 0.7) {
      return res.status(400).json({ error: "classificationThreshold cannot be below 70% (0.7)" });
    }

    if (maxPredictions !== undefined && (maxPredictions < 1 || maxPredictions > 10)) {
      return res.status(400).json({ error: "maxPredictions must be between 1 and 10" });
    }

    // Update configuration
    if (detectionThreshold !== undefined) {
      currentModelConfig.detectionThreshold = detectionThreshold;
    }
    if (classificationThreshold !== undefined) {
      currentModelConfig.classificationThreshold = classificationThreshold;
    }
    if (maxPredictions !== undefined) {
      currentModelConfig.maxPredictions = maxPredictions;
    }

    console.log("✓ Model configuration updated:", currentModelConfig);

    return res.json({
      success: true,
      config: currentModelConfig,
      message: "Model configuration successfully updated",
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to update model configuration" });
  }
});

// Get model information
app.get("/api/model/info", (req, res) => {
  try {
    return res.json(getModelInfo());
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to retrieve model information" });
  }
});

// ============================================================
// VITE OR STATIC FRONTEND SERVING MIDDLEWARE
// ============================================================

async function initializeApp() {
  if (process.env.NODE_ENV !== "production") {
    // Dynamically import Vite server core to enable HMR-like mounting on Port 3000
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    // Route resource requests to React Vite middleware
    app.use(vite.middlewares);
    console.log("✓ Application mounted in DEVELOPMENT mode with Express proxy.");
  } else {
    // Serve static compiled assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("✓ Application mounted in PRODUCTION mode serving statically.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n✨ Express server successfully running at http://localhost:${PORT}`);
    console.log(`🐘 Wildlife recognition system ready for real-world animal images\n`);
  });
}

initializeApp().catch((err) => {
  console.error("Express App boot initialization error occurred:", err);
});
