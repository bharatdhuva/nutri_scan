import type { PackagedProduct } from '@/types/nutrition';
import type { Profile } from '@/types/database';

export interface EvaluatedHealth {
  score: number;
  status: 'Excellent' | 'Good' | 'Moderate' | 'Poor';
  explanation: string;
  suggestions: string[];
  ingredients: string[];
  allergens: string[];
  additives: string[];
  dietaryWarnings: string[];
}

const COMMON_ALLERGEN_KEYWORDS: Record<string, string> = {
  milk: 'Milk / Dairy',
  whey: 'Milk (Whey)',
  casein: 'Milk (Casein)',
  butter: 'Dairy (Butter)',
  cheese: 'Dairy (Cheese)',
  cream: 'Dairy (Cream)',
  egg: 'Egg',
  eggs: 'Egg',
  gluten: 'Gluten / Wheat',
  wheat: 'Wheat',
  barley: 'Gluten (Barley)',
  rye: 'Gluten (Rye)',
  oat: 'Oats',
  soy: 'Soy',
  soya: 'Soy',
  soybean: 'Soy',
  peanut: 'Peanut',
  peanuts: 'Peanut',
  almond: 'Tree Nut (Almond)',
  cashew: 'Tree Nut (Cashew)',
  walnut: 'Tree Nut (Walnut)',
  hazelnut: 'Tree Nut (Hazelnut)',
  pistachio: 'Tree Nut (Pistachio)',
  pecan: 'Tree Nut (Pecan)',
  fish: 'Fish',
  salmon: 'Fish (Salmon)',
  tuna: 'Fish (Tuna)',
  crustacean: 'Crustaceans / Shellfish',
  shrimp: 'Shellfish (Shrimp)',
  crab: 'Shellfish (Crab)',
  lobster: 'Shellfish (Lobster)',
  sesame: 'Sesame',
  mustard: 'Mustard',
  celery: 'Celery',
  sulfite: 'Sulfites',
  sulphite: 'Sulfites',
  mollusc: 'Molluscs',
};

const NON_VEG_KEYWORDS = [
  'chicken', 'beef', 'pork', 'lamb', 'mutton', 'meat', 'bacon', 'ham',
  'poultry', 'gelatin', 'gelatine', 'fish', 'tuna', 'salmon', 'shrimp',
  'crab', 'anchovy', 'rennet', 'lard', 'animal fat'
];

const NON_VEGAN_KEYWORDS = [
  ...NON_VEG_KEYWORDS,
  'milk', 'cheese', 'butter', 'whey', 'casein', 'cream', 'yogurt',
  'egg', 'eggs', 'albumin', 'honey', 'beeswax', 'carmine', 'cochineal', 'ghee'
];

/**
 * Parses raw ingredient text into a clean array of readable ingredients.
 */
export function parseIngredientsText(rawText?: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  // Strip percentages like (45%), 12.5%, etc.
  const cleaned = rawText
    .replace(/\b\d+(\.\d+)?\s*%/g, '')
    // Normalize dashes and bullets
    .replace(/[•·*]/g, ',')
    // Remove underscores often used for allergens in OFF: _milk_ -> milk
    .replace(/_([^_]+)_/g, '$1');

  // Split by commas or semicolons that are NOT inside parentheses
  const tokens: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '(' || char === '[' || char === '{') {
      depth++;
      current += char;
    } else if (char === ')' || char === ']' || char === '}') {
      depth = Math.max(0, depth - 1);
      current += char;
    } else if ((char === ',' || char === ';') && depth === 0) {
      if (current.trim()) tokens.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) tokens.push(current.trim());

  // Clean each ingredient string
  const result: string[] = [];
  for (const token of tokens) {
    let item = token
      .replace(/^\d+[\s.)-]+/, '') // leading numbers like "1."
      .replace(/\s+/g, ' ')
      .trim();

    // Remove empty or trivial punctuation
    if (!item || item.length < 2 || /^[:/.,()-]+$/.test(item)) continue;


    // Capitalize first letter
    item = item.charAt(0).toUpperCase() + item.slice(1);
    if (!result.includes(item)) {
      result.push(item);
    }
    if (result.length >= 15) break;
  }

  return result;
}

/**
 * Extracts and standardizes allergen names from tags and ingredients.
 */
export function extractAllergens(product: PackagedProduct, ingredientsText: string): string[] {
  const detected = new Set<string>();

  if (Array.isArray(product.allergens_tags)) {
    for (const tag of product.allergens_tags) {
      const clean = tag.replace(/^[a-z]{2}:/, '').replace(/[-_]/g, ' ').trim();
      if (clean) {
        detected.add(clean.charAt(0).toUpperCase() + clean.slice(1));
      }
    }
  }

  const textLower = ingredientsText.toLowerCase();
  for (const [kw, label] of Object.entries(COMMON_ALLERGEN_KEYWORDS)) {
    // Word boundary match
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(textLower)) {
      detected.add(label);
    }
  }

  return Array.from(detected);
}

/**
 * Extracts and simplifies additive names/codes.
 */
export function extractAdditives(product: PackagedProduct): string[] {
  const additives: string[] = [];
  if (Array.isArray(product.additives_tags)) {
    for (const tag of product.additives_tags) {
      const code = tag.replace(/^[a-z]{2}:/, '').toUpperCase().trim();
      if (code) {
        additives.push(code);
      }
    }
  }
  return additives;
}

/**
 * Evaluates packaged food using deterministic nutrition science principles:
 * Nutri-Score base, NOVA processing deduction, sugar/sodium/fat thresholds, fiber/protein rewards,
 * plus personalized alerts against user dietary profile.
 */
export function evaluatePackaged(
  product: PackagedProduct,
  profile?: Profile | null,
  servingCaloriesOverride?: number
): EvaluatedHealth {
  const nutriments = product.nutriments || {};
  const nutrient = (key: string): number => {
    const value = nutriments[key];
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  // 1. Nutri-Score Base
  const grade = (product.nutriscore_grade || '').toLowerCase();
  let score = 55;
  if (grade === 'a') score = 90;
  else if (grade === 'b') score = 75;
  else if (grade === 'c') score = 60;
  else if (grade === 'd') score = 40;
  else if (grade === 'e') score = 20;

  // 2. NOVA Group (processing level)
  const nova = product.nova_group;
  if (nova === 4) {
    score -= 14; // Ultra-processed
  } else if (nova === 3) {
    score -= 5;
  }

  // 3. Nutriments (per 100g)
  const sugar = nutrient('sugars_100g') || nutrient('sugars');
  const sodiumMg = nutrient('sodium_100g') * 1000 || nutrient('salt_100g') * 400;
  const satFat = nutrient('saturated-fat_100g') || nutrient('saturated_fat_100g');
  const fiber = nutrient('fiber_100g') || nutrient('fiber');
  const protein = nutrient('proteins_100g') || nutrient('proteins');

  // Sugar penalties
  if (sugar > 22) score -= 14;
  else if (sugar > 15) score -= 9;
  else if (sugar > 8) score -= 4;

  // Sodium penalties
  if (sodiumMg > 900) score -= 12;
  else if (sodiumMg > 600) score -= 8;
  else if (sodiumMg > 400) score -= 4;

  // Saturated fat penalties
  if (satFat > 7) score -= 10;
  else if (satFat > 4) score -= 5;

  // Fiber & Protein boosts
  if (fiber >= 6) score += 8;
  else if (fiber >= 3) score += 4;

  if (protein >= 15) score += 8;
  else if (protein >= 8) score += 4;

  // Additives penalty
  const additives = extractAdditives(product);
  if (additives.length > 5) score -= 10;
  else if (additives.length > 3) score -= 6;
  else if (additives.length >= 1) score -= 3;

  // Clamp score
  const finalScore = Math.max(5, Math.min(100, Math.round(score)));

  // Status mapping matching NutriScan app
  let status: 'Excellent' | 'Good' | 'Moderate' | 'Poor' = 'Good';
  if (finalScore >= 80) status = 'Excellent';
  else if (finalScore >= 60) status = 'Good';
  else if (finalScore >= 40) status = 'Moderate';
  else status = 'Poor';

  // Ingredients text parsing
  const rawIngText = product.ingredients_text_en || product.ingredients_text || '';
  const ingredients = parseIngredientsText(rawIngText);
  const allergens = extractAllergens(product, rawIngText);

  // Personalized checks
  const dietaryWarnings: string[] = [];
  const textLower = rawIngText.toLowerCase();

  if (profile) {
    const pref = profile.dietary_preference;
    if (pref === 'vegan') {
      const foundNonVegan = NON_VEGAN_KEYWORDS.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(textLower));
      if (foundNonVegan.length > 0) {
        dietaryWarnings.push(`Contains potential animal/dairy ingredients (${foundNonVegan.slice(0, 3).join(', ')}) conflicting with your Vegan preference.`);
      }
    } else if (pref === 'veg') {
      const foundNonVeg = NON_VEG_KEYWORDS.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(textLower));
      if (foundNonVeg.length > 0) {
        dietaryWarnings.push(`Contains animal-derived ingredients (${foundNonVeg.slice(0, 3).join(', ')}) conflicting with your Vegetarian preference.`);
      }
    }

    // Calorie portion check against daily calorie target
    const servingCals = servingCaloriesOverride ?? nutrient('energy-kcal_100g');
    if (profile.daily_calorie_target && profile.daily_calorie_target > 0 && servingCals > 0) {
      const pct = (servingCals / profile.daily_calorie_target) * 100;
      if (pct > 30) {
        dietaryWarnings.push(`One serving accounts for ${Math.round(pct)}% of your daily ${profile.daily_calorie_target} kcal target.`);
      }
    }

    if (profile.diet_goal === 'weight_loss' && sugar > 15) {
      dietaryWarnings.push('Elevated sugar content per 100g may hinder weight management goals.');
    }
  }

  // Explanation and Suggestions
  const suggestions: string[] = [];
  if (sugar > 15) {
    suggestions.push('High in added or natural sugars; enjoy in measured portions or pair with high-protein sides.');
  }
  if (sodiumMg > 600) {
    suggestions.push('Contains elevated sodium; balance your remaining daily meals with fresh whole foods and plenty of water.');
  }
  if (nova === 4) {
    suggestions.push('Ultra-processed formulation with industrial emulsifiers or flavorings; prioritize minimally processed staples.');
  }
  if (fiber < 2) {
    suggestions.push('Low in dietary fiber; combine with fresh fruit, raw nuts, or leafy vegetables to improve digestion.');
  }
  if (protein >= 8) {
    suggestions.push('Solid protein contribution per serving supporting satiety and muscle recovery.');
  }
  if (suggestions.length === 0) {
    suggestions.push('Fits well within a balanced daily diet when consumed within standard serving guidelines.');
    suggestions.push('Stay hydrated and maintain varied dietary diversity across all meals.');
  }

  const productName = product.product_name || 'This packaged product';
  const explanation = `${productName} scores ${finalScore}/100 (${status}). ${
    grade ? `Nutri-Score is rated grade '${grade.toUpperCase()}'. ` : ''
  }${
    nova ? `NOVA Group ${nova} (${nova === 4 ? 'Ultra-processed food' : nova === 3 ? 'Processed food' : 'Minimally processed'}). ` : ''
  }${
    additives.length > 0 ? `Contains ${additives.length} recorded food additives. ` : ''
  }${
    sugar > 15 ? 'Contains elevated sugar density. ' : ''
  }${
    sodiumMg > 600 ? 'Contains elevated sodium levels. ' : ''
  }`.trim();

  return {
    score: finalScore,
    status,
    explanation,
    suggestions: suggestions.slice(0, 3),
    ingredients,
    allergens,
    additives,
    dietaryWarnings,
  };
}

export interface EstimatedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

type MacroProfile = EstimatedMacros;

const DEFAULT_MIXED: MacroProfile = {
  calories: 260,
  protein: 6,
  carbs: 32,
  fat: 12,
  fiber: 2,
  sugar: 8,
  sodium: 220,
};

function profileForIngredient(name: string): MacroProfile {
  const n = name.toLowerCase();

  if (/salt|sodium chloride/.test(n)) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 38700 };
  }
  if (/water|aqua/.test(n)) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
  }
  if (/emulsifier|stabiliser|stabilizer|preservative|flavour|flavor|colour|color|lecithin|vanillin|additive|\be\d{3}\b/.test(n)) {
    return { calories: 40, protein: 0, carbs: 4, fat: 2, fiber: 0, sugar: 0, sodium: 80 };
  }
  if (/sugar|sucrose|glucose|fructose|dextrose|honey|syrup|jaggery|maltose|invert/.test(n)) {
    return { calories: 387, protein: 0, carbs: 100, fat: 0, fiber: 0, sugar: 99, sodium: 2 };
  }
  if (/cocoa butter|cocoa fat/.test(n)) {
    return { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 };
  }
  if (/palm|olein|vegetable oil|sunflower|canola|rapeseed|soybean oil|coconut oil|ghee|butter|shortening|oil and fat/.test(n)) {
    return { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 };
  }
  if (/milk powder|milk solids|skimmed milk|whole milk powder|whey|casein/.test(n)) {
    return { calories: 496, protein: 26, carbs: 38, fat: 27, fiber: 0, sugar: 38, sodium: 370 };
  }
  if (/\bmilk\b|cream|yogurt|yoghurt|cheese/.test(n)) {
    return { calories: 64, protein: 3.3, carbs: 5, fat: 3.6, fiber: 0, sugar: 5, sodium: 44 };
  }
  if (/cocoa mass|cocoa powder|cocoa|chocolate/.test(n)) {
    return { calories: 228, protein: 20, carbs: 58, fat: 14, fiber: 33, sugar: 2, sodium: 20 };
  }
  if (/almond|cashew|walnut|hazelnut|pistachio|peanut|nut/.test(n)) {
    return { calories: 607, protein: 20, carbs: 21, fat: 54, fiber: 9, sugar: 4, sodium: 5 };
  }
  if (/oat|wheat|flour|rice meal|corn meal|maize|starch|maltodextrin|cereal|gram meal/.test(n)) {
    return { calories: 364, protein: 10, carbs: 76, fat: 1, fiber: 3, sugar: 1, sodium: 2 };
  }
  if (/lentil|chickpea|bean|dal|pulse/.test(n)) {
    return { calories: 350, protein: 22, carbs: 60, fat: 2, fiber: 15, sugar: 2, sodium: 15 };
  }
  if (/tomato|onion|garlic|spice|chilli|chili|pepper|seasoning|herb/.test(n)) {
    return { calories: 80, protein: 3, carbs: 15, fat: 1, fiber: 4, sugar: 5, sodium: 40 };
  }
  if (/chicken|beef|pork|meat|fish|egg/.test(n)) {
    return { calories: 180, protein: 26, carbs: 0, fat: 8, fiber: 0, sugar: 0, sodium: 70 };
  }

  return DEFAULT_MIXED;
}

function parseIngredientShares(rawText: string): Array<{ name: string; percent: number | null }> {
  const tokens: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of rawText.replace(/[•·*]/g, ',')) {
    if (char === '(' || char === '[' || char === '{') {
      depth++;
      current += char;
    } else if (char === ')' || char === ']' || char === '}') {
      depth = Math.max(0, depth - 1);
      current += char;
    } else if ((char === ',' || char === ';') && depth === 0) {
      if (current.trim()) tokens.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) tokens.push(current.trim());

  return tokens
    .map((token) => {
      const percentMatch = token.match(/(\d+(?:\.\d+)?)\s*%/);
      const name = token
        .replace(/\b\d+(?:\.\d+)?\s*%/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      return {
        name,
        percent: percentMatch ? Number(percentMatch[1]) : null,
      };
    })
    .filter((item) => item.name.length >= 2)
    .slice(0, 20);
}

/**
 * Approximate per-serving macros from a printed ingredient list when nutrition facts are missing.
 * Uses typical USDA-style densities and listed percentages when present.
 */
export function estimateMacrosFromIngredients(
  rawText: string,
  servingGrams = 100
): EstimatedMacros | null {
  const items = parseIngredientShares(rawText);
  if (items.length === 0) return null;

  const declared = items.filter((item) => item.percent !== null && (item.percent as number) > 0);
  const declaredTotal = declared.reduce((sum, item) => sum + (item.percent as number), 0);
  const remaining = Math.max(0, 100 - declaredTotal);
  const undeclared = items.filter((item) => item.percent === null);
  const geometric = undeclared.map((_, index) => Math.pow(0.55, index));
  const geoSum = geometric.reduce((sum, w) => sum + w, 0) || 1;

  const weights = items.map((item, index) => {
    const isSalt = /salt|sodium chloride/i.test(item.name);
    if (item.percent !== null && item.percent > 0) {
      return isSalt ? Math.min(item.percent, 3) : item.percent;
    }
    const undeclaredIndex = undeclared.indexOf(item);
    const share = remaining * (geometric[undeclaredIndex] / geoSum);
    if (isSalt) return Math.min(share, 1.2);
    // Tiny weight for late additives so they don't dominate
    if (index >= 8) return Math.min(share, 1.5);
    return share;
  });

  const weightSum = weights.reduce((sum, w) => sum + w, 0) || 1;
  const per100: MacroProfile = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  };

  items.forEach((item, index) => {
    const share = weights[index] / weightSum;
    const profile = profileForIngredient(item.name);
    per100.calories += profile.calories * share;
    per100.protein += profile.protein * share;
    per100.carbs += profile.carbs * share;
    per100.fat += profile.fat * share;
    per100.fiber += profile.fiber * share;
    per100.sugar += profile.sugar * share;
    per100.sodium += profile.sodium * share;
  });

  const scale = Math.max(5, servingGrams) / 100;
  const round1 = (value: number) => Math.round(value * 10) / 10;

  return {
    calories: Math.round(per100.calories * scale),
    protein: round1(per100.protein * scale),
    carbs: round1(per100.carbs * scale),
    fat: round1(per100.fat * scale),
    fiber: round1(per100.fiber * scale),
    sugar: round1(per100.sugar * scale),
    sodium: Math.round(per100.sodium * scale),
  };
}
