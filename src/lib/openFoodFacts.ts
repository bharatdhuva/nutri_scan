import type { PackagedProduct, PackagedAnalysis } from '@/types/nutrition';
import type { Profile } from '@/types/database';
import type { ExtractedLabelData } from './gemini';
import { evaluatePackaged } from './packagedEvaluator';


const CACHE_PREFIX = 'nutriscan_off_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Validates whether a given string is a valid EAN/UPC barcode (8 to 14 numeric digits).
 */
export function isValidBarcode(barcode: string): boolean {
  if (!barcode) return false;
  const trimmed = barcode.trim();
  return /^\d{8,14}$/.test(trimmed);
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

/**
 * Fetches raw product data from Open Food Facts API v2.
 */
export async function fetchRawProductByBarcode(barcode: string): Promise<PackagedProduct | null> {
  const cleanBarcode = barcode.trim();
  if (!isValidBarcode(cleanBarcode)) {
    return null;
  }

  // Check cache first
  const cached = getCachedProduct(cleanBarcode);
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const fields = [
    'product_name',
    'brands',
    'quantity',
    'serving_size',
    'serving_quantity',
    'ingredients_text',
    'ingredients_text_en',
    'allergens_tags',
    'additives_tags',
    'nutriscore_grade',
    'nova_group',
    'nutriments',
    'image_front_url',
  ].join(',');

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json?fields=${fields}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    if (data.status !== 1 || !data.product) {
      return null;
    }

    const product: PackagedProduct = {
      barcode: cleanBarcode,
      code: cleanBarcode,
      ...data.product,
    };

    setCachedProduct(cleanBarcode, product);
    return product;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`Open Food Facts lookup failed for barcode ${cleanBarcode}:`, err);
    return null;
  }
}

/**
 * Maps raw Open Food Facts product data into the app's standard analysis shape.
 */
export function mapProductToAnalysis(
  product: PackagedProduct,
  profile?: Profile | null
): PackagedAnalysis {
  const nutriments = product.nutriments || {};
  const missingFields: string[] = [];

  // Energy in kcal
  let energy100g: number | null = null;
  if (typeof nutriments['energy-kcal_100g'] === 'number') {
    energy100g = nutriments['energy-kcal_100g'];
  } else if (typeof nutriments['energy-kcal'] === 'number') {
    energy100g = nutriments['energy-kcal'];
  } else if (typeof nutriments['energy_100g'] === 'number') {
    energy100g = Math.round(nutriments['energy_100g'] / 4.184);
  } else {
    missingFields.push('calories');
  }

  // Macronutrients per 100g
  const protein100g = typeof nutriments['proteins_100g'] === 'number' ? nutriments['proteins_100g'] : null;
  const carbs100g = typeof nutriments['carbohydrates_100g'] === 'number' ? nutriments['carbohydrates_100g'] : null;
  const fat100g = typeof nutriments['fat_100g'] === 'number' ? nutriments['fat_100g'] : null;
  const fiber100g = typeof nutriments['fiber_100g'] === 'number' ? nutriments['fiber_100g'] : null;
  const sugar100g = typeof nutriments['sugars_100g'] === 'number' ? nutriments['sugars_100g'] : null;

  if (protein100g === null) missingFields.push('protein');
  if (carbs100g === null) missingFields.push('carbs');
  if (fat100g === null) missingFields.push('fat');
  if (fiber100g === null) missingFields.push('fiber');
  if (sugar100g === null) missingFields.push('sugar');

  // Sodium per 100g in mg
  let sodium100gMg: number | null = null;
  if (typeof nutriments['sodium_100g'] === 'number') {
    sodium100gMg = Math.round(nutriments['sodium_100g'] * 1000);
  } else if (typeof nutriments['salt_100g'] === 'number') {
    sodium100gMg = Math.round(nutriments['salt_100g'] * 400);
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

  // Compute scaled numbers (defaulting to 0 where ResultPage requires numbers)
  const calories = energy100g !== null ? Math.round(energy100g * scaleFactor) : 0;
  const protein = protein100g !== null ? Math.round((protein100g * scaleFactor) * 10) / 10 : 0;
  const carbs = carbs100g !== null ? Math.round((carbs100g * scaleFactor) * 10) / 10 : 0;
  const fat = fat100g !== null ? Math.round((fat100g * scaleFactor) * 10) / 10 : 0;
  const fiber = fiber100g !== null ? Math.round((fiber100g * scaleFactor) * 10) / 10 : 0;
  const sugar = sugar100g !== null ? Math.round((sugar100g * scaleFactor) * 10) / 10 : 0;
  const sodium = sodium100gMg !== null ? Math.round(sodium100gMg * scaleFactor) : 0;

  // Run packaged nutrition evaluator
  const evaluation = evaluatePackaged(product, profile, calories);

  const brandPrefix = product.brands ? `${product.brands.trim()} ` : '';
  const productName = product.product_name?.trim() || 'Packaged Product';
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
    missingFields,
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
  if (!rawProduct) return null;
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
  const missingFields: string[] = [];
  if (data.calories === null) missingFields.push('calories');
  if (data.protein === null) missingFields.push('protein');
  if (data.carbs === null) missingFields.push('carbs');
  if (data.fat === null) missingFields.push('fat');
  if (data.fiber === null) missingFields.push('fiber');
  if (data.sugar === null) missingFields.push('sugar');
  if (data.sodium === null) missingFields.push('sodium');

  const calories = data.calories ?? 0;
  const protein = data.protein ?? 0;
  const carbs = data.carbs ?? 0;
  const fat = data.fat ?? 0;
  const fiber = data.fiber ?? 0;
  const sugar = data.sugar ?? 0;
  const sodium = data.sodium ?? 0;

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
  const rawName = data.productName?.trim() || 'Scanned Packaged Label';
  const foodName = `${brandPrefix}${rawName}`.trim();

  const description = [
    data.brand ? `Brand: ${data.brand}` : '',
    data.servingSize ? `Serving: ${data.servingSize}` : '',
    'Extracted from packaged food label',
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
    servingSize: data.servingSize || '1 serving',
    confidence: 94,
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
    isPackaged: true,
  };
}

