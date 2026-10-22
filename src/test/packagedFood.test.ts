import { describe, it, expect } from 'vitest';
import {
  isValidBarcode,
  mapProductToAnalysis,
  mapLabelDataToAnalysis,
} from '@/lib/openFoodFacts';
import {
  evaluatePackaged,
  parseIngredientsText,
  extractAllergens,
} from '@/lib/packagedEvaluator';
import { parseLabelTextLocally } from '@/lib/gemini';
import type { PackagedProduct } from '@/types/nutrition';
import type { Profile } from '@/types/database';

describe('Barcode Validation', () => {
  it('accepts valid 8, 12, 13, 14 digit barcodes', () => {
    expect(isValidBarcode('12345678')).toBe(true); // 8 digits (EAN-8)
    expect(isValidBarcode('012345678905')).toBe(true); // 12 digits (UPC-A)
    expect(isValidBarcode('3017620422003')).toBe(true); // 13 digits (EAN-13)
    expect(isValidBarcode('12345678901234')).toBe(true); // 14 digits (ITF-14)
  });

  it('rejects invalid barcodes', () => {
    expect(isValidBarcode('')).toBe(false);
    expect(isValidBarcode('1234567')).toBe(false); // too short (<8)
    expect(isValidBarcode('123456789012345')).toBe(false); // too long (>14)
    expect(isValidBarcode('301762042200A')).toBe(false); // non-digits
    expect(isValidBarcode('barcode-123')).toBe(false);
  });
});

describe('Ingredient Parsing & Allergen Extraction', () => {
  it('cleans percentages, bullets, and nested parentheses', () => {
    const raw = 'Sugar, palm oil (20%), hazelnuts (13%), skimmed milk powder (8.7%), fat-reduced cocoa (7.4%), emulsifier: lecithins (soya), vanillin.';
    const parsed = parseIngredientsText(raw);

    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]).toBe('Sugar');
    expect(parsed.some(i => i.toLowerCase().includes('hazelnuts'))).toBe(true);
    expect(parsed.some(i => i.toLowerCase().includes('milk'))).toBe(true);
    // Should not include percentage numbers like 20%
    expect(parsed.every(i => !/\b\d+%\b/.test(i))).toBe(true);
  });

  it('extracts common allergens from ingredient text and tags', () => {
    const product: PackagedProduct = {
      allergens_tags: ['en:milk', 'en:soybeans'],
    };
    const allergens = extractAllergens(product, 'Contains wheat and peanuts');
    expect(allergens).toContain('Milk');
    expect(allergens).toContain('Soybeans');
    expect(allergens.some(a => a.toLowerCase().includes('wheat'))).toBe(true);
    expect(allergens.some(a => a.toLowerCase().includes('peanut'))).toBe(true);
  });
});

describe('Packaged Evaluator', () => {
  it('scores Nutri-Score A higher than E', () => {
    const productA: PackagedProduct = {
      nutriscore_grade: 'a',
      nova_group: 1,
      nutriments: {
        'sugars_100g': 1,
        'sodium_100g': 0.1,
        'fiber_100g': 5,
        'proteins_100g': 12,
      },
    };

    const productE: PackagedProduct = {
      nutriscore_grade: 'e',
      nova_group: 4,
      nutriments: {
        'sugars_100g': 45,
        'sodium_100g': 0.8,
        'saturated-fat_100g': 10,
      },
    };

    const evalA = evaluatePackaged(productA);
    const evalE = evaluatePackaged(productE);

    expect(evalA.score).toBeGreaterThan(evalE.score);
    expect(evalA.status).toBe('Excellent');
    expect(evalE.status).toBe('Poor');
  });

  it('warns about non-vegan ingredients when user is vegan', () => {
    const product: PackagedProduct = {
      product_name: 'Chocolate Biscuits',
      ingredients_text: 'Wheat flour, milk solids, whey powder, sugar, butter',
    };

    const veganProfile: Partial<Profile> = {
      dietary_preference: 'vegan',
      daily_calorie_target: 2000,
    };

    const evalResult = evaluatePackaged(product, veganProfile as Profile);
    expect(evalResult.dietaryWarnings.length).toBeGreaterThan(0);
    expect(evalResult.dietaryWarnings[0]).toContain('animal/dairy ingredients');
  });

  it('flags high calorie portion exceeding 30% of daily target', () => {
    const product: PackagedProduct = {
      product_name: 'Large Meal Bar',
      nutriments: {
        'energy-kcal_100g': 500,
      },
    };

    const profile: Partial<Profile> = {
      daily_calorie_target: 1800,
      dietary_preference: 'veg',
    };

    // Serving calories 700 exceeds 30% of 1800 (540 kcal)
    const evalResult = evaluatePackaged(product, profile as Profile, 700);
    expect(evalResult.dietaryWarnings.some(w => w.includes('daily'))).toBe(true);
  });
});

describe('Open Food Facts Mapper', () => {
  it('scales nutrients accurately when serving_quantity is given', () => {
    const product: PackagedProduct = {
      product_name: 'Granola Bar',
      brands: 'Nature Valley',
      serving_quantity: 40, // 40g serving
      serving_size: '40 g',
      nutriments: {
        'energy-kcal_100g': 450,
        'proteins_100g': 10,
        'carbohydrates_100g': 60,
        'fat_100g': 20,
        'sugars_100g': 25,
        'sodium_100g': 0.4, // 400mg per 100g
      },
    };

    const analysis = mapProductToAnalysis(product);
    // 40g = 0.4 scale factor
    expect(analysis.calories).toBe(180); // 450 * 0.4
    expect(analysis.protein).toBe(4); // 10 * 0.4
    expect(analysis.carbs).toBe(24); // 60 * 0.4
    expect(analysis.fat).toBe(8); // 20 * 0.4
    expect(analysis.sugar).toBe(10); // 25 * 0.4
    expect(analysis.sodium).toBe(160); // 400 * 0.4
    expect(analysis.source).toBe('openfoodfacts');
    expect(analysis.servingSize).toBe('40 g');
  });

  it('preserves missing fields list without inventing fake values', () => {
    const product: PackagedProduct = {
      product_name: 'Mystery Snack',
      nutriments: {
        'energy-kcal_100g': 120,
        'proteins_100g': 2,
        // fiber, sugar, sodium missing
      },
    };

    const analysis = mapProductToAnalysis(product);
    expect(analysis.missingFields).toContain('fiber');
    expect(analysis.missingFields).toContain('sugar');
    expect(analysis.missingFields).toContain('sodium');
  });
});

describe('Local Label Text OCR Fallback', () => {
  it('extracts nutrition and ingredients from pasted text', () => {
    const text = `
Nature's Choice Oats
Serving Size: 40g
Calories: 150
Total Fat: 3g
Total Carbohydrate: 27g
Dietary Fiber: 4g
Total Sugars: 1g
Protein: 5g
Sodium: 0mg
Ingredients: 100% Whole Grain Rolled Oats.
    `;

    const parsed = parseLabelTextLocally(text);
    expect(parsed.calories).toBe(150);
    expect(parsed.fat).toBe(3);
    expect(parsed.carbs).toBe(27);
    expect(parsed.fiber).toBe(4);
    expect(parsed.sugar).toBe(1);
    expect(parsed.protein).toBe(5);
    expect(parsed.sodium).toBe(0);
    expect(parsed.servingSize).toBe('40g');

    const mapped = mapLabelDataToAnalysis(parsed);
    expect(mapped.foodName).toContain("Nature's Choice");
    expect(mapped.calories).toBe(150);
    expect(mapped.source).toBe('label');
  });
});
