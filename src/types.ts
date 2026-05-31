/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AnimalRecord {
  id: string;
  imageName: string;
  animalName: string;
  category: string;
  confidence: number;
  uploadDate: string;
  thumbnailUrl: string;
  originalSize: number;
  aspectRatio: number;
  description?: string;
  tags?: string[];
  detections?: Detection[];
  predictions?: Prediction[];
  modelVersion?: string;
}

export interface DashboardStats {
  totalImages: number;
  totalAnimalTypes: number;
  averageConfidence: number;
  categoryDistribution: { name: string; value: number }[];
  animalDistribution: { name: string; count: number; percentage: number }[];
  recentUploadsCount: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  class: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface Prediction {
  label: string;
  confidence: number;
  rank: number;
}

export interface ClassificationResponse {
  animalName: string;
  category: string;
  confidence: number;
  description?: string;
  tags?: string[];
  detections?: Detection[];
  predictions?: Prediction[];
  error?: string;
  modelVersion?: string;
}

export interface SearchFilters {
  searchQuery: string;
  animalType: string;
  minConfidence: number;
  sortBy: 'date_desc' | 'date_asc' | 'confidence_desc' | 'confidence_asc' | 'name_asc';
  dateRange: 'all' | 'today' | 'week' | 'month';
}

export interface ModelConfig {
  detectionThreshold: number; // 0-1 for YOLOv8
  classificationThreshold: number; // 0.7 minimum
  maxPredictions: number; // Top-5
  modelVersion: string;
}
