export interface Ingredient {
  name: string;
  category: 'grain' | 'vegetable' | 'fruit' | 'protein' | 'dairy' | 'oil' | 'spice' | 'other';
  isMajor: boolean;
  warnings?: ('high-sugar' | 'high-fat' | 'allergen-nuts' | 'allergen-dairy' | 'allergen-gluten' | 'allergen-soy' | 'allergen-eggs')[];
}

export type HealthScoreLabel = 'excellent' | 'good' | 'average' | 'poor';

export interface HealthScore {
  score: number; // 0-100
  label: HealthScoreLabel;
  explanation: string;
  suggestions: string[];
}

export interface NutritionData {
  foodName: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  servingSize: string;
  confidence: number;
  healthTips: string[];
  alternatives: string[];
  ingredients: Ingredient[];
  insights: string[];
  healthScore: HealthScore;
}

export interface AnalysisState {
  status: "idle" | "uploading" | "analyzing" | "success" | "error";
  error?: string;
  data?: NutritionData;
  imageUrl?: string;
}

export interface PackagedProduct {
  code?: string;
  barcode?: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  allergens_tags?: string[];
  additives_tags?: string[];
  nutriscore_grade?: string;
  nova_group?: number;
  nutriments?: Record<string, number | undefined>;
  image_front_url?: string;
}

export interface PackagedAnalysis {
  foodName: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  servingSize: string;
  confidence: number;
  healthScore: {
    score: number;
    status: string;
    explanation?: string;
    suggestions?: string[];
  };
  ingredients: string[];
  substitutions: Array<{
    name: string;
    calories: string;
    protein?: string;
    fiber?: string;
  }>;
  imageUrl?: string;
  source: 'openfoodfacts' | 'label';
  barcode?: string;
  brands?: string;
  nutriscore?: string;
  nova?: number;
  allergens?: string[];
  additives?: string[];
  dietaryWarnings?: string[];
  missingFields?: string[];
  isPackaged?: boolean;
}

