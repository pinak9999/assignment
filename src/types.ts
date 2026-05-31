/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AnimalRecord {
  id: string;
  imageName: string;
  animalName: string;
  category: string; // e.g. Mammal, Bird, Reptile, etc.
  confidence: number; // Decimal between 0 and 1
  uploadDate: string; // ISO String
  thumbnailUrl: string; // Uniform compressed client-side size base64 or objectUrl
  originalSize: number; // in bytes
  aspectRatio: number; // width / height
  description?: string; // brief facts about the animal
  tags: string[]; // e.g. predatory, Herbivore, nocturnal
}

export interface DashboardStats {
  totalImages: number;
  totalAnimalTypes: number;
  averageConfidence: number;
  categoryDistribution: { name: string; value: number }[];
  animalDistribution: { name: string; count: number; percentage: number }[];
  recentUploadsCount: number;
}

export interface ClassificationResponse {
  animalName: string;
  category: string;
  confidence: number;
  description: string;
  tags: string[];
}

export interface SearchFilters {
  searchQuery: string;
  animalType: string; // "all" or specific
  minConfidence: number; // 0 to 1
  sortBy: 'date_desc' | 'date_asc' | 'confidence_desc' | 'confidence_asc' | 'name_asc';
  dateRange: 'all' | 'today' | 'week' | 'month';
}
