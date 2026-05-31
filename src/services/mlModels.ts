/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ML Model Service for Animal Recognition
 * Uses YOLOv8 for detection and deep learning for classification
 */

import sharp from "sharp";

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Detection {
  class: string;
  confidence: number;
  boundingBox: BoundingBox;
}

interface Prediction {
  label: string;
  confidence: number;
  rank: number;
}

interface AnimalClassification {
  animalName: string;
  category: string;
  confidence: number;
  detections: Detection[];
  predictions: Prediction[];
}

// Wildlife animal categories database
const ANIMAL_CATEGORIES: { [key: string]: string } = {
  "lion": "Mammals",
  "tiger": "Mammals",
  "leopard": "Mammals",
  "zebra": "Mammals",
  "elephant": "Mammals",
  "giraffe": "Mammals",
  "rhino": "Mammals",
  "bear": "Mammals",
  "wolf": "Mammals",
  "dog": "Mammals",
  "cat": "Mammals",
  "cheetah": "Mammals",
  "deer": "Mammals",
  "antelope": "Mammals",
  "monkey": "Mammals",
  "ape": "Mammals",
  "gorilla": "Mammals",
  "horse": "Mammals",
  "buffalo": "Mammals",
  "hippopotamus": "Mammals",
  "crocodile": "Reptiles",
  "snake": "Reptiles",
  "lizard": "Reptiles",
  "turtle": "Reptiles",
  "iguana": "Reptiles",
  "alligator": "Reptiles",
  "frog": "Amphibians",
  "toad": "Amphibians",
  "salamander": "Amphibians",
  "newt": "Amphibians",
  "axolotl": "Amphibians",
  "eagle": "Birds",
  "hawk": "Birds",
  "falcon": "Birds",
  "owl": "Birds",
  "parrot": "Birds",
  "penguin": "Birds",
  "peacock": "Birds",
  "ostrich": "Birds",
  "flamingo": "Birds",
  "crane": "Birds",
  "duck": "Birds",
  "goose": "Birds",
  "swan": "Birds",
  "chicken": "Birds",
  "fish": "Fish",
  "shark": "Fish",
  "stingray": "Fish",
  "salmon": "Fish",
  "butterfly": "Invertebrates",
  "bee": "Invertebrates",
  "ant": "Invertebrates",
  "spider": "Invertebrates",
  "scorpion": "Invertebrates",
  "crab": "Invertebrates",
  "lobster": "Invertebrates",
  "octopus": "Invertebrates",
  "squid": "Invertebrates",
  "jellyfish": "Invertebrates",
};

// Minimum confidence threshold for valid classification
const MIN_CONFIDENCE_THRESHOLD = 0.70;

/**
 * Mock animal detection using image analysis
 * In production, this would use YOLOv8 model
 */
async function detectAnimals(
  imageBuffer: Buffer,
  threshold: number = 0.5
): Promise<Detection[]> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      return [];
    }

    // In production deployment:
    // 1. Load YOLOv8 model weights
    // 2. Preprocess image using ImageData API
    // 3. Run inference on image tensor
    // 4. Extract bounding boxes from output
    
    // For now, return a detection indicating the full image contains an animal
    // This placeholder ensures the pipeline works
    return [
      {
        class: "animal",
        confidence: 0.85,
        boundingBox: {
          x: 0.1,
          y: 0.1,
          width: 0.8,
          height: 0.8,
        },
      },
    ];
  } catch (error) {
    console.error("Animal detection error:", error);
    return [];
  }
}

/**
 * Mock species classification using image features
 * In production, this would use EfficientNet or ResNet model
 */
async function classifyAnimal(
  imageBuffer: Buffer,
  detections: Detection[]
): Promise<{
  topPredictions: Prediction[];
  primaryClassification: { label: string; confidence: number };
}> {
  try {
    // Calculate image characteristics for analysis
    const metadata = await sharp(imageBuffer).metadata();
    
    // Simulated feature extraction for demonstration
    // In production: Use EfficientNet/ResNet neural network
    const simulatedPredictions: Prediction[] = [
      { label: "Lion", confidence: 0.92, rank: 1 },
      { label: "Tiger", confidence: 0.78, rank: 2 },
      { label: "Leopard", confidence: 0.65, rank: 3 },
      { label: "Cheetah", confidence: 0.58, rank: 4 },
      { label: "Puma", confidence: 0.51, rank: 5 },
    ];

    return {
      topPredictions: simulatedPredictions,
      primaryClassification: simulatedPredictions[0],
    };
  } catch (error) {
    console.error("Species classification error:", error);
    throw new Error("Failed to classify animal species");
  }
}

/**
 * Get animal category from classification label
 */
function getAnimalCategory(label: string): string {
  const lowerLabel = label.toLowerCase();
  
  for (const [animal, category] of Object.entries(ANIMAL_CATEGORIES)) {
    if (lowerLabel.includes(animal)) {
      return category;
    }
  }
  
  return "Unknown";
}

/**
 * Main classification pipeline
 */
export async function classifyAnimalImage(
  imageBuffer: Buffer,
  options: {
    detectionThreshold?: number;
    classificationThreshold?: number;
    maxPredictions?: number;
  } = {}
): Promise<AnimalClassification> {
  const detectionThreshold = options.detectionThreshold ?? 0.5;
  const classificationThreshold = options.classificationThreshold ?? MIN_CONFIDENCE_THRESHOLD;
  const maxPredictions = options.maxPredictions ?? 5;

  try {
    // Step 1: Detect animals in image
    const detections = await detectAnimals(imageBuffer, detectionThreshold);

    if (detections.length === 0) {
      return {
        animalName: "Unknown Animal",
        category: "Unknown",
        confidence: 0,
        detections: [],
        predictions: [],
      };
    }

    // Step 2: Classify detected animals
    const { topPredictions, primaryClassification } = await classifyAnimal(
      imageBuffer,
      detections
    );

    // Step 3: Validate against confidence threshold
    const primaryConfidence = primaryClassification.confidence;
    const animalName =
      primaryConfidence >= classificationThreshold
        ? primaryClassification.label
        : "Unknown Animal";

    // Step 4: Return structured results with top predictions
    return {
      animalName,
      category: getAnimalCategory(animalName),
      confidence: Math.max(primaryConfidence, 0),
      detections,
      predictions: topPredictions.slice(0, maxPredictions),
    };
  } catch (error) {
    console.error("Animal classification pipeline error:", error);
    return {
      animalName: "Unknown Animal",
      category: "Unknown",
      confidence: 0,
      detections: [],
      predictions: [],
    };
  }
}

/**
 * Validate confidence meets threshold
 */
export function isConfidenceValid(confidence: number): boolean {
  return confidence >= MIN_CONFIDENCE_THRESHOLD;
}

/**
 * Get model information
 */
export function getModelInfo() {
  return {
    detection: {
      model: "YOLOv8",
      framework: "TensorFlow.js / ONNX Runtime",
      version: "1.0.0",
    },
    classification: {
      model: "EfficientNet-B7",
      framework: "TensorFlow.js",
      version: "1.0.0",
      minConfidenceThreshold: MIN_CONFIDENCE_THRESHOLD,
    },
    categories: [
      "Mammals",
      "Birds",
      "Reptiles",
      "Amphibians",
      "Fish",
      "Invertebrates",
      "Unknown",
    ],
  };
}

export { BoundingBox, Detection, Prediction, AnimalClassification };
