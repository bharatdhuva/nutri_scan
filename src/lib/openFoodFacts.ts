import type { PackagedProduct, PackagedAnalysis } from '@/types/nutrition';
import type { Profile } from '@/types/database';
import type { ExtractedLabelData } from './gemini';
import { evaluatePackaged, estimateMacrosFromIngredients } from './packagedEvaluator';


const CACHE_PREFIX = 'nutriscan_off_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LOOKUP_TIMEOUT_MS = 15000;
const PRODUCT_FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'brands',
  'quantity',
  'serving_size',
  'serving_quantity',
  'ingredients_text',
  'ingredients_text_en',
  'allergens_tags',
  'additives_tags',
  'nutriscore_grade',
  'nutrition_grades',
  'nova_group',
  'nutriments',
  'image_front_url',
  'image_url',
].join(',');

export class BarcodeLookupError extends Error {
  constructor(
    message: string,
    public readonly kind: 'network' | 'invalid' = 'network'
  ) {
    super(message);
    this.name = 'BarcodeLookupError';
  }
}

/**
 * Strip spaces, hyphens, and other non-digits that packaging / scanners often include.
 */
export function digitsOnly(barcode: string): string {
  return (barcode || '').replace(/\D/g, '');
}

/**
 * Validates whether a given string is a valid EAN/UPC barcode (8 to 14 numeric digits).
 */
export function isValidBarcode(barcode: string): boolean {
  if (!barcode) return false;
  return /^\d{8,14}$/.test(digitsOnly(barcode));
}

/** EAN-13 check digit from the first 12 digits (odd positions ×1, even ×3, 1-indexed). */
export function ean13CheckDigit(first12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number(first12[i]);
    sum += i % 2 === 0 ? n : n * 3;
  }
  return String((10 - (sum % 10)) % 10);
}

/** UPC-A check digit from the first 11 digits. */
export function upcACheckDigit(first11: string): string {
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const n = Number(first11[i]);
    sum += i % 2 === 0 ? n * 3 : n;
  }
  return String((10 - (sum % 10)) % 10);
}

/**
 * Build lookup variants for the same physical barcode.
 * Manual entry and some scanners drop the check digit or leading zero, which Open Food Facts
 * treats as a different code (e.g. 890149110051 vs indexed 8901491100519).
 */
export function barcodeLookupCandidates(barcode: string): string[] {
  const digits = digitsOnly(barcode);
  const candidates: string[] = [];
  const add = (code: string) => {
    if (/^\d{8,14}$/.test(code) && !candidates.includes(code)) {
      candidates.push(code);
    }
  };

  if (digits.length !== 12) {
    add(digits);
  }

  if (digits.length === 8) {
    add(digits.padStart(13, '0'));
  }

  if (digits.length === 11) {
    const upc = digits + upcACheckDigit(digits);
    add(upc);
    add('0' + upc);
  }

  if (digits.length === 12) {
    const ean13 = digits + ean13CheckDigit(digits);
    // Truncated EAN-13 is the usual miss for Indian GS1-890 packs typed without the check digit.
    if (digits.startsWith('0')) {
      add(digits);
      add('0' + digits);
      add(ean13);
    } else {
      add(ean13);
      add(digits);
      add('0' + digits);
    }
  }

  if (digits.length === 13) {
    if (digits.startsWith('0')) {
      add(digits.slice(1));
    }
    const recomputed = digits.slice(0, 12) + ean13CheckDigit(digits.slice(0, 12));
    add(recomputed);
  }

  if (digits.length === 14) {
    add(digits.slice(1));
    const stripped = digits.replace(/^0+/, '');
    add(stripped);
    if (stripped.length === 12) {
      add(stripped + ean13CheckDigit(stripped));
    }
    add(stripped.padStart(13, '0'));
  }

  return candidates;
}

/**
 * Retrieve cached product from localStorage if still within 7-day TTL.
 */
function getCachedProduct(barcode: string): PackagedProduct | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${barcode}`);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (Date.now() - item.timestamp < CACHE_TTL_MS && item.data) {
      return item.data as PackagedProduct;
    }
    // Expired
    localStorage.removeItem(`${CACHE_PREFIX}${barcode}`);
  } catch (e) {
    console.warn('OFF cache read error:', e);
  }
  return null;
}

/**
 * Cache product in localStorage with timestamp.
 */
function setCachedProduct(barcode: string, data: PackagedProduct): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${barcode}`,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      })
    );
  } catch (e) {
    console.warn('OFF cache write error:', e);
  }
}

function isProductFoundPayload(data: {
  status?: number | string;
  product?: PackagedProduct | null;
}): boolean {
  if (!data?.product || typeof data.product !== 'object') return false;
  if (data.status === 0 || data.status === '0') return false;
  return data.status === 1 || data.status === '1' || data.status === 'success' || data.status === undefined;
}

function toPackagedProduct(code: string, raw: PackagedProduct): PackagedProduct {
  return {
    ...raw,
    barcode: raw.code || raw.barcode || code,
    code: raw.code || code,
    product_name: raw.product_name || raw.product_name_en,
    nutriscore_grade: raw.nutriscore_grade || raw.nutrition_grades,
    image_front_url: raw.image_front_url || raw.image_url,
  };
}

async function requestOpenFoodFactsProduct(
  code: string,
  signal: AbortSignal
): Promise<PackagedProduct | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${PRODUCT_FIELDS}`;

  const res = await fetch(url, {
    method: 'GET',
    signal,
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new BarcodeLookupError(
      `Open Food Facts returned HTTP ${res.status}. Please try again in a moment.`,
      'network'
    );
  }

  const data = await res.json();
  if (!isProductFoundPayload(data)) return null;
  return toPackagedProduct(code, data.product as PackagedProduct);
}

function cacheProductAliases(aliases: string[], product: PackagedProduct): void {
  const unique = Array.from(new Set(aliases.filter(Boolean)));
  unique.forEach((alias) => setCachedProduct(alias, product));
}

/**
 * Fetches raw product data from Open Food Facts API v2.
 * Tries check-digit / UPC-EAN variants so truncated codes still resolve.
 */
export async function fetchRawProductByBarcode(barcode: string): Promise<PackagedProduct | null> {
  const candidates = barcodeLookupCandidates(barcode);
  if (candidates.length === 0) {
    return null;
  }

  for (const code of candidates) {
    const cached = getCachedProduct(code);
    if (cached) return cached;
  }

  let lastNetworkError: unknown = null;

  for (const code of candidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);

    try {
      const product = await requestOpenFoodFactsProduct(code, controller.signal);
      clearTimeout(timeoutId);
      if (!product) continue;

      cacheProductAliases(
        [...candidates, product.code || '', product.barcode || '', digitsOnly(barcode)],
        product
      );
      return product;
    } catch (err) {
      clearTimeout(timeoutId);
      lastNetworkError = err;
      console.warn(`Open Food Facts lookup failed for barcode ${code}:`, err);
    }
  }

  if (lastNetworkError) {
    if (lastNetworkError instanceof BarcodeLookupError) throw lastNetworkError;
    throw new BarcodeLookupError(
      'Could not reach Open Food Facts. Check your connection and try again.',
      'network'
    );
  }

  return null;
}

/**
 * Maps raw Open Food Facts product data into the app's standard analysis shape.
 */
function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** True when OFF returned enough data to analyze (nutrition facts and/or ingredients). */
export function hasUsableProductData(product: PackagedProduct): boolean {
  const nutriments = product.nutriments || {};
  const hasMacro = [
    'energy-kcal_100g',
    'energy-kcal',
    'energy_100g',
    'proteins_100g',
    'carbohydrates_100g',
    'fat_100g',
    'sugars_100g',
  ].some((key) => toNumber(nutriments[key]) !== null);
  const hasIngredients = Boolean(
    (product.ingredients_text || product.ingredients_text_en || '').trim()
  );
  return hasMacro || hasIngredients;
}

function roundMacro(value: number): number {
  return Math.round(value * 10) / 10;
}

export function mapProductToAnalysis(
  product: PackagedProduct,
  profile?: Profile | null
): PackagedAnalysis {
  const nutriments = product.nutriments || {};
  const missingFields: string[] = [];

  // Energy in kcal
  let energy100g: number | null = toNumber(nutriments['energy-kcal_100g']) ?? toNumber(nutriments['energy-kcal']);
  const energyKj = toNumber(nutriments['energy_100g']) ?? toNumber(nutriments['energy-kj_100g']);
  if (energy100g === null && energyKj !== null) {
    energy100g = Math.round(energyKj / 4.184);
  }
  if (energy100g === null) {
    missingFields.push('calories');
  }

  // Macronutrients per 100g
  const protein100g = toNumber(nutriments['proteins_100g']);
  const carbs100g = toNumber(nutriments['carbohydrates_100g']);
  const fat100g = toNumber(nutriments['fat_100g']);
  const fiber100g = toNumber(nutriments['fiber_100g']);
  const sugar100g = toNumber(nutriments['sugars_100g']);

  if (protein100g === null) missingFields.push('protein');
  if (carbs100g === null) missingFields.push('carbs');
  if (fat100g === null) missingFields.push('fat');
  if (fiber100g === null) missingFields.push('fiber');
  if (sugar100g === null) missingFields.push('sugar');

  // Sodium per 100g in mg
  let sodium100gMg: number | null = null;
  const sodiumG = toNumber(nutriments['sodium_100g']);
  const saltG = toNumber(nutriments['salt_100g']);
  if (sodiumG !== null) {
    sodium100gMg = Math.round(sodiumG * 1000);
  } else if (saltG !== null) {
    sodium100gMg = Math.round(saltG * 400);
  } else {
    missingFields.push('sodium');
  }

  // Determine portion scale factor
  let scaleFactor = 1.0;
  let servingSizeText = '100g (standard portion)';

  let parsedServingQuantity: number | null = null;
  if (typeof product.serving_quantity === 'number' && product.serving_quantity > 0) {
    parsedServingQuantity = product.serving_quantity;
  } else if (typeof product.serving_quantity === 'string') {
    const num = parseFloat(product.serving_quantity);
    if (!isNaN(num) && num > 0) parsedServingQuantity = num;
  }

  // Fallback: try to extract grams from serving_size string e.g. "30 g (1 bar)" or "250 ml"
  if (!parsedServingQuantity && product.serving_size) {
    const match = product.serving_size.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)\b/i);
    if (match) {
      const num = parseFloat(match[1]);
      if (!isNaN(num) && num > 0) parsedServingQuantity = num;
    }
  }

  if (parsedServingQuantity && parsedServingQuantity > 0) {
    scaleFactor = parsedServingQuantity / 100;
    servingSizeText = product.serving_size || `${parsedServingQuantity}g`;
  } else if (product.serving_size) {
    servingSizeText = product.serving_size;
  }

  const ingredientText = product.ingredients_text_en || product.ingredients_text || '';
  const estimated = estimateMacrosFromIngredients(
    ingredientText,
    parsedServingQuantity && parsedServingQuantity > 0 ? parsedServingQuantity : 100
  );
  const estimatedFields: string[] = [];

  const takeMacro = (
    listed: number | null,
    estimatedValue: number | undefined,
    field: string,
    asInt = false
  ): number => {
    if (listed !== null) return asInt ? Math.round(listed) : roundMacro(listed);
    if (estimatedValue !== undefined) {
      estimatedFields.push(field);
      return asInt ? Math.round(estimatedValue) : roundMacro(estimatedValue);
    }
    return 0;
  };

  const calories = takeMacro(
    energy100g !== null ? energy100g * scaleFactor : null,
    estimated?.calories,
    'calories',
    true
  );
  const protein = takeMacro(
    protein100g !== null ? protein100g * scaleFactor : null,
    estimated?.protein,
    'protein'
  );
  const carbs = takeMacro(
    carbs100g !== null ? carbs100g * scaleFactor : null,
    estimated?.carbs,
    'carbs'
  );
  const fat = takeMacro(
    fat100g !== null ? fat100g * scaleFactor : null,
    estimated?.fat,
    'fat'
  );
  const fiber = takeMacro(
    fiber100g !== null ? fiber100g * scaleFactor : null,
    estimated?.fiber,
    'fiber'
  );
  const sugar = takeMacro(
    sugar100g !== null ? sugar100g * scaleFactor : null,
    estimated?.sugar,
    'sugar'
  );
  const sodium = takeMacro(
    sodium100gMg !== null ? sodium100gMg * scaleFactor : null,
    estimated?.sodium,
    'sodium',
    true
  );

  if (estimatedFields.length > 0) {
    servingSizeText = `${servingSizeText} · macros estimated from ingredients`;
  }

  // Run packaged nutrition evaluator using listed or estimated macros
  const evaluation = evaluatePackaged(
    {
      ...product,
      nutriments: {
        ...(product.nutriments || {}),
        'energy-kcal_100g': calories / scaleFactor,
        'proteins_100g': protein / scaleFactor,
        'carbohydrates_100g': carbs / scaleFactor,
        'fat_100g': fat / scaleFactor,
        'fiber_100g': fiber / scaleFactor,
        'sugars_100g': sugar / scaleFactor,
        'sodium_100g': sodium / scaleFactor / 1000,
      },
    },
    profile,
    calories
  );

  const brandPrefix = product.brands ? `${product.brands.trim()} ` : '';
  const productName = (product.product_name || product.product_name_en || '').trim() || 'Packaged Product';
  const foodName = `${brandPrefix}${productName}`.trim();

  const description = [
    product.brands ? `Brand: ${product.brands}` : '',
    product.quantity ? `Quantity: ${product.quantity}` : '',
    product.serving_size ? `Serving: ${product.serving_size}` : '',
    product.barcode ? `Barcode: ${product.barcode}` : '',
  ]
    .filter(Boolean)
    .join(' · ') || 'Verified packaged product from Open Food Facts';

  // Build helpful substitutions
  const substitutions: Array<{ name: string; calories: string; protein?: string; fiber?: string }> = [];
  if (sugar > 12) {
    substitutions.push({
      name: 'Unsweetened or zero-added-sugar alternative',
      calories: `${Math.max(20, Math.round(calories * 0.65))} kcal (−35%)`,
      fiber: `${Math.round(fiber + 2)}g`,
    });
  }
  if (sodium > 400) {
    substitutions.push({
      name: 'Low-sodium / no-salt-added version',
      calories: `${calories} kcal`,
      protein: `${protein}g`,
    });
  }
  if (substitutions.length === 0) {
    substitutions.push({
      name: 'Fresh whole-food equivalent',
      calories: `${Math.max(30, Math.round(calories * 0.75))} kcal`,
      fiber: `${Math.round(fiber + 3)}g`,
    });
  }

  return {
    foodName,
    description,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodium,
    servingSize: servingSizeText,
    confidence: 99,
    healthScore: {
      score: evaluation.score,
      status: evaluation.status,
      explanation: evaluation.explanation,
      suggestions: evaluation.suggestions,
    },
    ingredients: evaluation.ingredients,
    substitutions,
    imageUrl: product.image_front_url || undefined,
    source: 'openfoodfacts',
    barcode: product.barcode || product.code,
    brands: product.brands,
    nutriscore: product.nutriscore_grade?.toLowerCase(),
    nova: product.nova_group,
    allergens: evaluation.allergens,
    additives: evaluation.additives,
    dietaryWarnings: evaluation.dietaryWarnings,
    missingFields: missingFields.filter((field) => !estimatedFields.includes(field)),
    estimatedFields,
    nutritionEstimated: estimatedFields.length > 0,
    isPackaged: true,
  };
}

/**
 * Fetch and immediately map Open Food Facts product to NutriScan analysis format.
 */
export async function fetchProductByBarcode(
  barcode: string,
  profile?: Profile | null
): Promise<PackagedAnalysis | null> {
  const rawProduct = await fetchRawProductByBarcode(barcode);
  if (!rawProduct || !hasUsableProductData(rawProduct)) return null;
  return mapProductToAnalysis(rawProduct, profile);
}

/**
 * Maps printed food label OCR data into standard PackagedAnalysis.
 */
export function mapLabelDataToAnalysis(
  data: ExtractedLabelData,
  profile?: Profile | null,
  photoUrl?: string
): PackagedAnalysis {
  const servingGrams = data.servingQuantityGrams && data.servingQuantityGrams > 0
    ? data.servingQuantityGrams
    : 100;
  const estimated = data.ingredientsText
    ? estimateMacrosFromIngredients(data.ingredientsText, servingGrams)
    : null;

  const estimatedFields: string[] = [];
  const take = (listed: number | null, estimateValue: number | undefined, field: string): number => {
    if (listed !== null && Number.isFinite(listed)) return listed;
    if (estimateValue !== undefined) {
      estimatedFields.push(field);
      return estimateValue;
    }
    return 0;
  };

  const calories = take(data.calories, estimated?.calories, 'calories');
  const protein = take(data.protein, estimated?.protein, 'protein');
  const carbs = take(data.carbs, estimated?.carbs, 'carbs');
  const fat = take(data.fat, estimated?.fat, 'fat');
  const fiber = take(data.fiber, estimated?.fiber, 'fiber');
  const sugar = take(data.sugar, estimated?.sugar, 'sugar');
  const sodium = take(data.sodium, estimated?.sodium, 'sodium');

  const missingFields: string[] = [];
  if (data.calories === null && !estimatedFields.includes('calories')) missingFields.push('calories');
  if (data.protein === null && !estimatedFields.includes('protein')) missingFields.push('protein');
  if (data.carbs === null && !estimatedFields.includes('carbs')) missingFields.push('carbs');
  if (data.fat === null && !estimatedFields.includes('fat')) missingFields.push('fat');
  if (data.fiber === null && !estimatedFields.includes('fiber')) missingFields.push('fiber');
  if (data.sugar === null && !estimatedFields.includes('sugar')) missingFields.push('sugar');
  if (data.sodium === null && !estimatedFields.includes('sodium')) missingFields.push('sodium');

  // Build pseudo packaged product for evaluatePackaged
  const pseudoProduct: PackagedProduct = {
    product_name: data.productName || 'Packaged Item',
    brands: data.brand || undefined,
    serving_size: data.servingSize || (data.servingQuantityGrams ? `${data.servingQuantityGrams}g` : '1 serving'),
    serving_quantity: data.servingQuantityGrams ?? undefined,
    ingredients_text: data.ingredientsText || undefined,
    allergens_tags: data.allergens ? data.allergens.map(a => `en:${a.toLowerCase().replace(/\s+/g, '-')}`) : [],
    nutriments: {
      'energy-kcal_100g': calories,
      'proteins_100g': protein,
      'carbohydrates_100g': carbs,
      'fat_100g': fat,
      'saturated-fat_100g': data.saturatedFat ?? 0,
      'fiber_100g': fiber,
      'sugars_100g': sugar,
      'sodium_100g': sodium / 1000,
    },
  };

  const evaluation = evaluatePackaged(pseudoProduct, profile, calories);

  const brandPrefix = data.brand ? `${data.brand.trim()} ` : '';
  const rawName = data.productName?.trim() || (data.ingredientsText ? 'Packaged food from ingredients' : 'Scanned Packaged Label');
  const foodName = `${brandPrefix}${rawName}`.trim();
  const nutritionEstimated = estimatedFields.length > 0;

  const description = [
    data.brand ? `Brand: ${data.brand}` : '',
    data.servingSize ? `Serving: ${data.servingSize}` : '',
    nutritionEstimated
      ? 'Approximate macros estimated from the ingredient list (use the printed nutrition panel for exact values)'
      : 'Extracted from packaged food label',
  ].filter(Boolean).join(' · ');

  const substitutions: Array<{ name: string; calories: string; protein?: string; fiber?: string }> = [];
  if (sugar > 10) {
    substitutions.push({
      name: 'Lower sugar or unsweetened equivalent',
      calories: `${Math.max(20, Math.round(calories * 0.7))} kcal (−30%)`,
    });
  }
  if (sodium > 350) {
    substitutions.push({
      name: 'Reduced sodium alternative',
      calories: `${calories} kcal`,
    });
  }
  if (substitutions.length === 0) {
    substitutions.push({
      name: 'Whole-food balanced alternative',
      calories: `${Math.max(30, Math.round(calories * 0.8))} kcal`,
    });
  }

  return {
    foodName,
    description,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sugar,
    sodium,
    servingSize: data.servingSize || (nutritionEstimated ? `approx ${servingGrams}g (estimated from ingredients)` : '1 serving'),
    confidence: nutritionEstimated ? 72 : 94,
    healthScore: {
      score: evaluation.score,
      status: evaluation.status,
      explanation: evaluation.explanation,
      suggestions: evaluation.suggestions,
    },
    ingredients: evaluation.ingredients,
    substitutions,
    imageUrl: photoUrl || undefined,
    source: 'label',
    brands: data.brand || undefined,
    allergens: evaluation.allergens,
    additives: evaluation.additives,
    dietaryWarnings: evaluation.dietaryWarnings,
    missingFields,
    estimatedFields,
    nutritionEstimated,
    isPackaged: true,
  };
}

