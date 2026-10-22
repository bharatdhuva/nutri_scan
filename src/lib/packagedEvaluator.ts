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
  const sugar = nutriments['sugars_100g'] ?? nutriments['sugars'] ?? 0;
  const sodiumMg = (nutriments['sodium_100g'] ?? 0) * 1000 || ((nutriments['salt_100g'] ?? 0) * 400);
  const satFat = nutriments['saturated-fat_100g'] ?? nutriments['saturated_fat_100g'] ?? 0;
  const fiber = nutriments['fiber_100g'] ?? nutriments['fiber'] ?? 0;
  const protein = nutriments['proteins_100g'] ?? nutriments['proteins'] ?? 0;

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
    const servingCals = servingCaloriesOverride ?? nutriments['energy-kcal_100g'] ?? 0;
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
