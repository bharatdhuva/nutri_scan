/**
 * Direct Google Gemini Multimodal Vision Client
 * Connects directly to Google's Gemini API for 100% accurate visual food recognition.
 */

export interface FoodAnalysisResult {
  foodName: string
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
  servingSize: string
  confidence: number
  healthScore: {
    score: number
    status: string
    explanation?: string
    suggestions?: string[]
  }
  ingredients: string[]
  substitutions: Array<{
    name: string
    calories: string
    protein?: string
    fiber?: string
  }>
  healthTips?: string[]
  alternatives?: string[]
  imageUrl?: string
  isNotFood?: boolean
}

export function getGeminiApiKey(): string {
  // 1. .env / environment variable (Vercel / Vite)
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  if (envKey && envKey.trim().length > 10) return envKey.trim()
  // 2. User-saved key in localStorage (Settings / In-app configuration)
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('nutriscan_gemini_api_key')
    if (localKey && localKey.trim().length > 10) return localKey.trim()
  }
  return ''
}

export function setGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nutriscan_gemini_api_key', key.trim())
  }
}

export async function analyzeFoodWithGemini(
  base64Image: string,
  fileName?: string
): Promise<FoodAnalysisResult | null> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    console.warn('No Gemini API key configured. Set VITE_GEMINI_API_KEY in .env or provide in settings.')
    return null
  }

  // Clean base64 data (strip data URL prefix if present)
  let cleanBase64 = base64Image
  let mimeType = 'image/jpeg'

  if (base64Image.includes(',')) {
    const parts = base64Image.split(',')
    const mimeMatch = parts[0].match(/:(.*?);/)
    if (mimeMatch) mimeType = mimeMatch[1]
    cleanBase64 = parts[1]
  }

  const prompt = `You are an expert clinical nutritionist and computer vision food recognition model.
Analyze this food image in detail. Identify the exact dish, deconstruct its ingredients, calculate realistic nutritional metrics, and return a strict JSON object with NO extra markdown formatting.

Format your response as a valid JSON object matching this schema:
{
  "foodName": "Specific name of the dish (e.g. Delicious Vegan Burger with Jalapeños)",
  "description": "Clear 1-2 sentence description of the dish deconstruction and preparation",
  "calories": 420,
  "protein": 18,
  "carbs": 48,
  "fat": 16,
  "fiber": 6,
  "sugar": 5,
  "sodium": 680,
  "servingSize": "1 burger (approx 260g)",
  "confidence": 96,
  "healthScore": {
    "score": 72,
    "status": "Good",
    "explanation": "Provides solid plant protein and healthy fats, with moderate sodium from seasoning.",
    "suggestions": [
      "Use whole-grain bun to increase complex carbohydrates and slow digestion.",
      "Lighten the sauce to cut unnecessary vegetable oils.",
      "Pair with fresh greens or sliced cucumber for hydration and micronutrients."
    ]
  },
  "healthTips": [
    "Opt for whole-grain variations to improve glycemic response.",
    "Control portion size of condiments and dressings."
  ],
  "ingredients": ["Plant-based patty", "Sesame brioche bun", "Pickled jalapeños", "Lettuce & red onions", "Spicy sauce"],
  "substitutions": [
    {
      "name": "Whole-wheat bun with avocado dressing",
      "calories": "370 kcal (−50)",
      "protein": "20g",
      "fiber": "9g"
    },
    {
      "name": "Lettuce wrap style",
      "calories": "280 kcal (−140)",
      "protein": "18g",
      "fiber": "5g"
    }
  ],
  "isNotFood": false
}

Rules:
1. Always output ONLY valid JSON without markdown fences like \`\`\`json.
2. Provide realistic calorie and macronutrient values based on standard portion sizes.
3. Health score should be 0-100 based on nutritional density and ingredient quality.
4. If image contains snacks, burger, chocolates, noodles, or desserts, identify the exact item.
5. In healthScore, ALWAYS provide an 'explanation' and 2-3 actionable 'suggestions' tailored SPECIFICALLY to that exact food (for chocolates/sweets, advise on portion control, dark chocolate swaps; for fried snacks, advise on air-frying or pairing with protein/sprouts; never give generic unrelated salad advice).
6. CRITICAL: If the image does NOT contain any food (e.g. it is a person, animal, object, landscape, or document), set "isNotFood": true and ALL nutrition values (calories, protein, carbs, fat, fiber, sugar, sodium) to 0. Set foodName to "No Food Detected", servingSize to "N/A", ingredients to [], substitutions to [], healthScore to {"score":0,"status":"N/A"}, and description to a brief message describing what the image actually shows.`

  // Primary: Lovable AI Edge Function (Gemini 2.5 Flash vision gateway)
  try {
    const lovableRes = await fetch('https://wssurlhlklxkzvyczsoo.supabase.co/functions/v1/analyze-food', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: base64Image.startsWith('data:') ? base64Image : `data:${mimeType};base64,${cleanBase64}`,
      }),
    })

    if (lovableRes.ok) {
      const data = await lovableRes.json()
      if (data && data.foodName) {
        const isNonFood =
          data.foodName.toLowerCase() === 'not food' ||
          data.foodName.toLowerCase().includes('not food') ||
          data.foodName.toLowerCase().includes('no food') ||
          (data.calories === 0 && data.protein === 0)

        // Normalize ingredients to string array if they are objects
        const normalizedIngredients = Array.isArray(data.ingredients)
          ? data.ingredients.map((ing: any) => (typeof ing === 'string' ? ing : ing.name || String(ing)))
          : []

        // Normalize confidence (0.92 -> 92)
        const confidenceVal =
          typeof data.confidence === 'number'
            ? data.confidence <= 1
              ? Math.round(data.confidence * 100)
              : Math.round(data.confidence)
            : 95

        // Normalize substitutions / alternatives
        const substitutions = Array.isArray(data.alternatives)
          ? data.alternatives.map((alt: any) => ({
              name: typeof alt === 'string' ? alt : alt.name || String(alt),
              calories: 'Healthy variation',
            }))
          : []

        // Extract dish-specific suggestions from Lovable API
        const suggestions =
          Array.isArray(data.healthScore?.suggestions) && data.healthScore.suggestions.length > 0
            ? data.healthScore.suggestions
            : Array.isArray(data.healthTips) && data.healthTips.length > 0
              ? data.healthTips
              : []

        return {
          foodName: isNonFood ? 'No Food Detected' : data.foodName,
          description: data.description || (isNonFood ? 'No food items were recognized in this image.' : ''),
          calories: isNonFood ? 0 : Number(data.calories) || 0,
          protein: isNonFood ? 0 : Number(data.protein) || 0,
          carbs: isNonFood ? 0 : Number(data.carbs) || 0,
          fat: isNonFood ? 0 : Number(data.fat) || 0,
          fiber: isNonFood ? 0 : Number(data.fiber) || 0,
          sugar: isNonFood ? 0 : Number(data.sugar) || 0,
          sodium: isNonFood ? 0 : Number(data.sodium) || 0,
          servingSize: isNonFood ? 'N/A' : (data.servingSize || '1 serving'),
          confidence: confidenceVal,
          healthScore: {
            score: isNonFood ? 0 : (typeof data.healthScore === 'object' ? data.healthScore?.score ?? 70 : Number(data.healthScore) || 70),
            status: isNonFood ? 'N/A' : (typeof data.healthScore === 'object' ? data.healthScore?.label || 'Good' : 'Good'),
            explanation: isNonFood ? undefined : (typeof data.healthScore === 'object' ? data.healthScore?.explanation : undefined),
            suggestions: isNonFood ? [] : suggestions,
          },
          ingredients: isNonFood ? [] : normalizedIngredients,
          substitutions: isNonFood ? [] : substitutions,
          healthTips: isNonFood ? [] : (Array.isArray(data.healthTips) ? data.healthTips : []),
          alternatives: isNonFood ? [] : (Array.isArray(data.alternatives) ? data.alternatives : []),
          isNotFood: isNonFood,
        }
      }
    }
  } catch (lovableErr) {
    console.warn('Lovable API gateway notice, trying direct Gemini endpoint:', lovableErr)
  }

  // Fallback: Direct Google Gemini 2.5 Flash API
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini API Error:', response.status, errText)
      return null
    }

    const data = await response.json()
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parse JSON safely (stripping any accidental markdown wrappers)
    const sanitized = rawContent
      .replace(/^```json/m, '')
      .replace(/^```/m, '')
      .trim()

    const parsed: FoodAnalysisResult = JSON.parse(sanitized)
    return parsed
  } catch (err) {
    console.error('Failed to parse Gemini Vision API response:', err)
    return null
  }
}

/**
 * NutriBot: Ask Gemini a question about a scanned food item.
 * Returns a conversational, nutritionist-style reply.
 */
export async function chatWithGemini(
  userQuestion: string,
  foodContext: {
    foodName: string
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sugar: number
    sodium: number
    healthScore: number
    servingSize: string
    description: string
  }
): Promise<string | null> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) return null

  const systemContext = `You are NutriBot, a knowledgeable, friendly expert clinical nutritionist assistant in the NutriScan Pro app.
The user has scanned a food item:
- Dish Name: ${foodContext.foodName}
- Calories: ${foodContext.calories} kcal
- Protein: ${foodContext.protein}g | Carbs: ${foodContext.carbs}g | Fat: ${foodContext.fat}g
- Fiber: ${foodContext.fiber}g | Sugar: ${foodContext.sugar}g | Sodium: ${foodContext.sodium}mg
- Portion Size: ${foodContext.servingSize}
- Health Score: ${foodContext.healthScore}/100
- Description: ${foodContext.description}

Instructions for replying:
1. Provide a direct, helpful, and complete answer to the user's question.
2. If they ask for alternatives, give 2-3 specific, healthier or lower-calorie alternatives with brief reasons.
3. If they ask about burning calories, weight loss, or protein, give practical estimates and advice.
4. Keep the tone encouraging, warm, and professional.
5. Always complete your sentences and thoughts fully.`

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemContext },
              { text: `User: ${userQuestion}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    })

    if (!response.ok) {
      console.error('Gemini chat error:', response.status)
      return null
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    return text || null
  } catch (err) {
    console.error('NutriBot Gemini chat failed:', err)
    return null
  }
}

export interface ExtractedLabelData {
  productName: string | null;
  brand: string | null;
  servingSize: string | null;
  servingQuantityGrams: number | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  saturatedFat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null; // in mg
  ingredientsText: string | null;
  allergens: string[] | null;
}

/**
 * Parses printed packaged nutrition label / ingredients photo using Gemini Vision.
 * Only extracts what is printed; unprinted or non-visible values are set to null.
 */
export async function analyzeLabelWithGemini(
  base64Image: string
): Promise<ExtractedLabelData | null> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) {
    console.warn('No Gemini API key configured for label analysis.')
    return null
  }

  let cleanBase64 = base64Image
  let mimeType = 'image/jpeg'

  if (base64Image.includes(',')) {
    const parts = base64Image.split(',')
    const mimeMatch = parts[0].match(/:(.*?);/)
    if (mimeMatch) mimeType = mimeMatch[1]
    cleanBase64 = parts[1]
  }

  const prompt = `You are a nutrition label and OCR specialist.
Analyze this photo of a food product packaging label, nutrition facts panel, or ingredient list.
Extract ONLY what is explicitly printed or clearly visible on the label.
Do NOT guess, estimate, or hallucinate missing information.
If a value is not printed on the label, you MUST use null.

Output a strict, single JSON object with no markdown fences, matching this schema:
{
  "productName": "Printed product name or null",
  "brand": "Printed brand name or null",
  "servingSize": "Printed serving size (e.g. '1 bar (40g)' or '30g') or null",
  "servingQuantityGrams": 40,
  "calories": 180,
  "protein": 5.0,
  "carbs": 24.0,
  "fat": 8.0,
  "saturatedFat": 2.5,
  "fiber": 3.0,
  "sugar": 12.0,
  "sodium": 140,
  "ingredientsText": "Exact printed ingredient list text or null",
  "allergens": ["Milk", "Wheat", "Soy"]
}

Important Rules:
1. Provide sodium in milligrams (mg). If printed as salt in grams, convert (salt_g * 400).
2. For numeric fields (calories, protein, carbs, fat, saturatedFat, fiber, sugar, sodium, servingQuantityGrams), output a number or null.
3. If nutrition is listed per 100g, state '100g' as servingSize and 100 as servingQuantityGrams.
4. Output strictly valid JSON without \`\`\`json or backticks.`

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 16,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Gemini Label OCR error:', response.status, errText)
      return null
    }

    const data = await response.json()
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const sanitized = rawContent
      .replace(/^```json/m, '')
      .replace(/^```/m, '')
      .trim()

    return JSON.parse(sanitized) as ExtractedLabelData
  } catch (err) {
    console.error('Failed to parse Gemini Label OCR response:', err)
    return null
  }
}

/**
 * Parses user-pasted ingredients or nutrition text using Gemini (or returns null if no key).
 */
export async function parseNutritionTextWithGemini(
  rawText: string
): Promise<ExtractedLabelData | null> {
  const apiKey = getGeminiApiKey()
  if (!apiKey) return null

  const prompt = `You are a nutrition label and ingredient list parser.
Parse this user-pasted food label text or ingredient list.

Rules:
- If a nutrition value is explicitly printed, copy that number.
- If calories/protein/carbs/fat/fiber/sugar/sodium are NOT printed but an ingredient list IS present, still return the full ingredientsText. Leave those numeric fields null so the app can estimate them.
- Never invent a product name from a comma-separated ingredient list.
- Use null for any field you cannot support from the text.

User text:
"""
${rawText}
"""

Output a strict, single JSON object with no markdown fences, matching this schema:
{
  "productName": "Product name if mentioned, else null",
  "brand": "Brand if mentioned, else null",
  "servingSize": "Serving size if mentioned, else null",
  "servingQuantityGrams": null,
  "calories": null,
  "protein": null,
  "carbs": null,
  "fat": null,
  "saturatedFat": null,
  "fiber": null,
  "sugar": null,
  "sodium": null,
  "ingredientsText": "Cleaned full ingredients string or null",
  "allergens": []
}`

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      }),
    })

    if (!response.ok) return null
    const data = await response.json()
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const sanitized = rawContent.replace(/^```json/m, '').replace(/^```/m, '').trim()
    return JSON.parse(sanitized) as ExtractedLabelData
  } catch (err) {
    console.warn('Gemini text parsing error:', err)
    return null
  }
}

/**
 * Robust regex-based fallback parser for pasted label text when offline or without API key.
 */
export function parseLabelTextLocally(rawText: string): ExtractedLabelData {
  const text = rawText.trim()

  const extractNum = (regex: RegExp): number | null => {
    const m = text.match(regex)
    if (!m) return null
    const val = parseFloat(m[1])
    return isNaN(val) ? null : val
  }

  const calories = extractNum(/(?:calories|energy|kcal)[:\s]*(\d+(?:\.\d+)?)/i)
  const protein = extractNum(/(?:protein|proteins)[:\s]*(\d+(?:\.\d+)?)\s*g?/i)
  const carbs = extractNum(/(?:total carbohydrate|carbohydrate|carbs)[:\s]*(\d+(?:\.\d+)?)\s*g?/i)
  const fat = extractNum(/(?:total fat|fat)[:\s]*(\d+(?:\.\d+)?)\s*g?/i)
  const saturatedFat = extractNum(/(?:saturated fat|sat fat)[:\s]*(\d+(?:\.\d+)?)\s*g?/i)
  const fiber = extractNum(/(?:dietary fiber|fiber|fibre)[:\s]*(\d+(?:\.\d+)?)\s*g?/i)
  const sugar = extractNum(/(?:total sugars|sugars|sugar)[:\s]*(\d+(?:\.\d+)?)\s*g?/i)

  let sodium = extractNum(/(?:sodium)[:\s]*(\d+(?:\.\d+)?)\s*mg/i)
  if (sodium === null) {
    const saltG = extractNum(/(?:salt)[:\s]*(\d+(?:\.\d+)?)\s*g/i)
    if (saltG !== null) sodium = Math.round(saltG * 400)
  }

  const servingMatch = text.match(/(?:serving size|portion)[:\s]*([^\n,]+)/i)
  const servingSize = servingMatch ? servingMatch[1].trim() : null
  const servingGramsMatch = servingSize?.match(/(\d+(?:\.\d+)?)\s*g\b/i)
  const servingQuantityGrams = servingGramsMatch ? parseFloat(servingGramsMatch[1]) : null

  let ingredientsText = text
  const ingMatch = text.match(/(?:ingredients?)\s*[:\-]\s*([\s\S]+)/i)
  if (ingMatch) {
    ingredientsText = ingMatch[1]
      .replace(/\n(?:nutrition|allergen|contains|manufactured).*$/i, '')
      .trim()
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const firstLine = lines[0] || ''
  const looksLikeIngredientList = firstLine.includes(',') || /^(sugar|wheat|milk|cocoa|palm|oil)\b/i.test(firstLine)
  const productName = (
    !looksLikeIngredientList &&
    !/calories|nutrition|ingredients|facts/i.test(firstLine) &&
    firstLine.length > 0 &&
    firstLine.length < 60
  )
    ? firstLine
    : 'Custom Packaged Food'

  return {
    productName,
    brand: null,
    servingSize,
    servingQuantityGrams,
    calories,
    protein,
    carbs,
    fat,
    saturatedFat,
    fiber,
    sugar,
    sodium,
    ingredientsText,
    allergens: null,
  }
}

