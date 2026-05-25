export interface NormalizedQuery {
  year: number | null;
  make: string | null;
  model: string | null;
  part: string;
  synonyms: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface Vehicle {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
}

export interface PartResult {
  id: string;
  name: string;
  oem?: string;
  source: 'tecdoc' | 'fipe' | 'nhtsa' | 'carquery';
  vehicle: Vehicle;
  confidence: 'high' | 'medium' | 'low';
}

export interface SearchResponse {
  results: PartResult[];
  query: NormalizedQuery;
  cached: boolean;
}

export interface ApiError {
  error: string;
  code: string;
}
