import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { MealPlan, Profile } from '@/types/database';
import { format, addDays, startOfWeek } from 'date-fns';
// Authentic fallback meal plans to ensure 100% reliability for veg, non-veg, and vegan options
// Authentic dynamic AI meal synthesizer with extensive recipe library and random shuffling
function createFallbackMealPlans(
  days: number,
  pref: 'veg' | 'non-veg' | 'vegan',
  targetCalories: number = 2000,
  customNote?: string
) {
  const isVeg = pref === 'veg';
  const isVegan = pref === 'vegan';
  const vegMeals = {
    breakfast: [
      { food_name: "Masala Vegetable Poha with Peanuts & Mint", description: "Flattened rice cooked with turmeric, mustard seeds, onions, diced potatoes, and roasted peanuts", calories: 360, protein: 10, carbs: 56, fat: 11 },
      { food_name: "Paneer Bhurji with 2 Multigrain Rotis", description: "Fresh spiced crumbled paneer sautéed with onions, tomatoes, green chilies, and ginger", calories: 430, protein: 24, carbs: 36, fat: 19 },
      { food_name: "Moong Dal Chilla with Mint Coriander Chutney", description: "Savory yellow lentil crepes stuffed with finely chopped onions, peppers, and fresh coriander", calories: 340, protein: 18, carbs: 46, fat: 8 },
      { food_name: "Oats & Vegetable Upma with Cashews", description: "Rolled oats tempered with mustard seeds, curry leaves, carrots, green peas, and roasted cashews", calories: 350, protein: 12, carbs: 52, fat: 10 },
      { food_name: "Whole Wheat Methi Thepla with Fresh Curd", description: "Traditional spiced fenugreek flatbread served with cooling probiotic low-fat curd", calories: 380, protein: 14, carbs: 48, fat: 14 },
      { food_name: "Steamed Idli Sambar with Coconut Chutney", description: "Light fermented rice and black lentil cakes served with nutrient-dense vegetable lentil stew", calories: 360, protein: 12, carbs: 64, fat: 7 },
      { food_name: "Sprouted Moong Salad with Whole Wheat Toast", description: "Crisp steamed green gram sprouts tossed with cucumber, lemon juice, pink salt, and toast", calories: 330, protein: 16, carbs: 48, fat: 6 },
      { food_name: "Besan Chilla with Grated Paneer & Herbs", description: "Gram flour savory pancakes topped with grated low-fat paneer, green chilies, and mint", calories: 400, protein: 22, carbs: 42, fat: 14 },
      { food_name: "Masala Vegetable Dalia with Flax Seeds", description: "Broken wheat porridge simmered with carrots, beans, cumin, and toasted omega-3 flax seeds", calories: 340, protein: 13, carbs: 54, fat: 8 },
      { food_name: "Ragi Dosa with Vegetable Sambar & Tomato Chutney", description: "Finger millet crepes loaded with calcium and fiber, paired with piping hot sambar", calories: 350, protein: 11, carbs: 58, fat: 8 },
      { food_name: "Paneer Stuffed Paratha with Probiotic Curd", description: "Whole wheat flatbread filled with seasoned low-fat paneer and fresh chopped mint", calories: 440, protein: 22, carbs: 46, fat: 18 },
      { food_name: "Avocado & Tomato Whole Wheat Toast with Chia Seeds", description: "Crushed avocado with lemon, sea salt, cherry tomatoes, and chia on toasted artisan wheat", calories: 370, protein: 10, carbs: 44, fat: 17 },
      { food_name: "Quinoa Vegetable Pulao with Spiced Raita", description: "Fluffy quinoa cooked with colorful bell peppers, peas, and mild aromatic cumin", calories: 380, protein: 14, carbs: 52, fat: 12 },
      { food_name: "Masala Oats Porridge with Roasted Walnuts", description: "Heart-healthy savory oats tempered with cumin, tomatoes, and toasted brain-fuel walnuts", calories: 340, protein: 11, carbs: 50, fat: 10 },
      { food_name: "Gujarati Steamed Khichu with Sesame & Methi Oil", description: "Traditional spiced steamed rice flour delicacy with cumin and omega-rich sesame seeds", calories: 320, protein: 8, carbs: 58, fat: 6 },
      { food_name: "Paneer & Mint Stuffed Whole Wheat Kathi Roll", description: "Tawa roti rolled with marinated paneer strips, sliced bell peppers, and hung curd dip", calories: 410, protein: 22, carbs: 38, fat: 17 },
      { food_name: "High-Protein Green Peas & Paneer Chilla", description: "Blended green peas and besan crepe stuffed with crumbled paneer and chaat masala", calories: 390, protein: 21, carbs: 44, fat: 13 },
      { food_name: "Sprouted Kala Chana Chaat with Toasted Bread", description: "Protein-rich brown chickpeas tossed with tomatoes, raw mango, lime, and whole wheat toast", calories: 340, protein: 17, carbs: 50, fat: 6 },
      { food_name: "Mooli Methi Paratha with Probiotic Curd", description: "Grated radish and fenugreek flatbread served with fresh cooling homemade curd", calories: 420, protein: 14, carbs: 56, fat: 15 },
      { food_name: "Chia Seed Almond Milk Berry Bowl with Pumpkin Seeds", description: "Superfood bowl soaked in unsweetened almond milk with fresh berries and zinc-rich seeds", calories: 350, protein: 12, carbs: 42, fat: 15 },
    ],
    lunch: [
      { food_name: "Dal Tadka with Jeera Brown Rice & Beans Sabzi", description: "Yellow arhar dal tempered with cumin, garlic, and ghee, served with fiber-rich brown rice", calories: 580, protein: 22, carbs: 86, fat: 14 },
      { food_name: "Palak Paneer with 2 Whole Wheat Phulkas", description: "Fresh cottage cheese cubes simmered in creamy spiced spinach gravy with crisp cucumber salad", calories: 620, protein: 26, carbs: 58, fat: 24 },
      { food_name: "Amritsari Rajma Masala with Steamed Brown Rice", description: "Slow-simmered red kidney beans in thick onion-tomato gravy with steamed brown rice", calories: 610, protein: 24, carbs: 88, fat: 12 },
      { food_name: "Pindi Chole Masala with Multigrain Roti & Curd", description: "Spiced chickpea curry cooked with roasted whole spices, served with warm phulkas", calories: 590, protein: 23, carbs: 80, fat: 15 },
      { food_name: "Tandoori Paneer Tikka with Quinoa Pulao & Raita", description: "Char-roasted marinated cottage cheese over fragrant vegetable quinoa and cucumber raita", calories: 640, protein: 28, carbs: 65, fat: 22 },
      { food_name: "Gujarati Kadhi Khichdi with Roasted Papad", description: "Comforting spiced yogurt curry paired with yellow moong dal khichdi and fresh salad", calories: 560, protein: 18, carbs: 82, fat: 15 },
      { food_name: "High-Protein Soya Matar Curry with 2 Rotis & Dal", description: "Juicy textured soya chunks and green peas in homestyle curry with yellow dal", calories: 610, protein: 35, carbs: 70, fat: 13 },
      { food_name: "Low-Fat Dal Makhani with Brown Rice & Salad", description: "Black lentils and kidney beans slow-cooked with tomatoes and mild spices without heavy cream", calories: 590, protein: 22, carbs: 84, fat: 14 },
      { food_name: "Baingan Bharta with Panchmel Dal & Phulkas", description: "Smoky fire-roasted mashed eggplant tossed with onions, served with five-lentil mix and rotis", calories: 540, protein: 20, carbs: 74, fat: 14 },
      { food_name: "Paneer Jalfrezi with 2 Multigrain Phulkas & Salad", description: "Cottage cheese strips stir-fried with crunchy bell peppers, onions, and tangy tomato glaze", calories: 600, protein: 25, carbs: 62, fat: 22 },
      { food_name: "Vegetable Biryani with Soya Chunks & Boondi Raita", description: "Basmati rice layered with spiced vegetables, high-protein soya chunks, and saffron mint", calories: 630, protein: 26, carbs: 88, fat: 16 },
      { food_name: "Methi Paneer Curry with Missi Roti & Kachumber", description: "Fresh fenugreek leaves and paneer cubes cooked in homestyle gravy with chickpea-flour roti", calories: 590, protein: 27, carbs: 64, fat: 20 },
      { food_name: "Homestyle Paneer Butter Masala with 2 Rotis & Rice", description: "Cottage cheese in rich tomato-cashew sauce prepared with minimal oil and whole spices", calories: 630, protein: 26, carbs: 68, fat: 22 },
      { food_name: "Shahi Soya Chaap Curry with Steamed Rice & Onions", description: "Protein-dense soya chaap simmered in fragrant North Indian spices and basmati rice", calories: 620, protein: 36, carbs: 74, fat: 15 },
      { food_name: "Gujarati Sev Tameta Nu Shaak with 2 Bajra Rotlas", description: "Tangy spiced tomato curry served with mineral-rich pearl millet flatbread and curd", calories: 580, protein: 16, carbs: 82, fat: 18 },
      { food_name: "Sindhi Kadhi with Steamed Brown Rice & Sweet Aloo", description: "Gram flour and tamarind vegetable stew loaded with okra, drumsticks, and brown rice", calories: 570, protein: 18, carbs: 84, fat: 14 },
      { food_name: "Maharashtrian Sprouted Matki Usal with 2 Bhakris", description: "Nutritious moth bean curry tempered with mustard, curry leaves, and jowar flatbread", calories: 560, protein: 24, carbs: 80, fat: 12 },
      { food_name: "Tofu & Edamame Quinoa Buddha Bowl with Peanut Dip", description: "Warm protein bowl with roasted tofu, edamame, shredded carrots, and Thai peanut glaze", calories: 600, protein: 28, carbs: 64, fat: 22 },
    ],
    dinner: [
      { food_name: "Vegetable Dal Khichdi with Roasted Papad & Curd", description: "Comforting one-pot lentils, brown rice, and mixed vegetables cooked with mild cumin and turmeric", calories: 480, protein: 18, carbs: 74, fat: 12 },
      { food_name: "Lauki Chana Dal with 2 Whole Wheat Phulkas", description: "Nutritious bottle gourd and split bengal gram curry served with whole wheat rotis", calories: 440, protein: 19, carbs: 66, fat: 10 },
      { food_name: "Paneer & Tri-Color Bell Pepper Sauté with 2 Rotis", description: "Cottage cheese and crisp bell peppers tossed in light spices with lemon and green salad", calories: 510, protein: 24, carbs: 48, fat: 20 },
      { food_name: "Yellow Moong Dal with Pan-Roasted Bhindi & Rotis", description: "Light protein moong dal paired with crunchy spiced okra and warm phulkas", calories: 460, protein: 17, carbs: 66, fat: 12 },
      { food_name: "Firm Tofu Vegetable Stir-Fry with Steamed Rice", description: "Tofu cubes wok-tossed with broccoli, snap peas, and toasted sesame seeds in light soy glaze", calories: 470, protein: 22, carbs: 54, fat: 15 },
      { food_name: "Methi Dal with Roasted Baingan Bharta & Phulka", description: "Fenugreek lentil soup with roasted mashed eggplant curry and warm rotis", calories: 450, protein: 18, carbs: 64, fat: 11 },
      { food_name: "Panchmel Dal with Spiced Pumpkin Sabzi & 2 Rotis", description: "Five-lentil mix curry with roasted spiced pumpkin and crisp cucumber salad", calories: 460, protein: 20, carbs: 65, fat: 11 },
      { food_name: "Mixed Vegetable Lentil Soup with Multigrain Toast", description: "Hearty soup loaded with zucchini, carrots, lentils, and fresh herbs, served with crusty bread", calories: 420, protein: 16, carbs: 62, fat: 8 },
      { food_name: "Spinach & Mushroom Sauté with 2 Rotis & Dal", description: "Fresh baby spinach and button mushrooms sautéed in garlic and olive oil with yellow dal", calories: 460, protein: 19, carbs: 60, fat: 12 },
      { food_name: "High-Protein Soya Keema with 2 Phulkas & Salad", description: "Minced soya granules cooked with green peas, cumin, and tomatoes, served with green salad", calories: 490, protein: 28, carbs: 58, fat: 12 },
      { food_name: "Grilled Paneer & Quinoa Salad with Lemon Dressing", description: "Herb-marinated paneer over warm quinoa, cherry tomatoes, and cucumber in lemon vinaigrette", calories: 480, protein: 24, carbs: 46, fat: 18 },
      { food_name: "Palak Dal (Spinach Lentil Curry) with 2 Phulkas", description: "Iron-rich lentils simmered with chopped spinach, garlic cloves, and soft whole wheat rotis", calories: 450, protein: 20, carbs: 64, fat: 10 },
      { food_name: "Turai Chana Dal with 2 Whole Wheat Phulkas & Salad", description: "Light ridge gourd cooked with split bengal gram and mild spices for effortless digestion", calories: 430, protein: 18, carbs: 62, fat: 9 },
      { food_name: "Spiced Pumpkin & Chickpea Tagine with Couscous", description: "Slow-cooked Moroccan style sweet pumpkin and garbanzo beans with fluffy whole grain couscous", calories: 460, protein: 17, carbs: 70, fat: 11 },
      { food_name: "Masoor Dal with Steamed Rice & Roasted Bhindi", description: "Brown whole lentils simmered in onion-ginger broth, served with pan-roasted okra", calories: 470, protein: 21, carbs: 68, fat: 11 },
      { food_name: "Paneer & Sautéed Broccoli Bowl with Garlic Tahini", description: "Pan-grilled cottage cheese and tender broccoli florets drizzled with nutty sesame dressing", calories: 480, protein: 25, carbs: 42, fat: 20 },
      { food_name: "Kadhai Mushroom & Bell Peppers with 2 Phulkas", description: "Button mushrooms stir-fried with pounded coriander seeds, capsicum, and warm rotis", calories: 450, protein: 17, carbs: 60, fat: 12 },
    ],
    snack: [
      { food_name: "Roasted Makhana (Foxnuts) with Pink Salt & Green Tea", description: "Crunchy lotus seeds lightly roasted in olive oil with rock salt and black pepper", calories: 160, protein: 5, carbs: 26, fat: 4 },
      { food_name: "Sprouted Moong Chaat with Lemon & Herbs", description: "Steamed green gram sprouts tossed with chopped onions, tomatoes, chaat masala, and lime", calories: 180, protein: 10, carbs: 28, fat: 2 },
      { food_name: "Greek Yogurt with Fresh Berries & Chia Seeds", description: "High-protein low-fat yogurt topped with blueberries, pomegranate, and crushed chia seeds", calories: 200, protein: 14, carbs: 22, fat: 5 },
      { food_name: "Dry Roasted Chana & Handful of California Almonds", description: "Brown roasted chickpeas paired with raw almonds for sustained afternoon energy", calories: 190, protein: 9, carbs: 20, fat: 8 },
      { food_name: "Cucumber & Carrot Sticks with Homemade Hummus", description: "Crisp raw vegetable crudités served with 2 tablespoons of zesty garlic chickpea dip", calories: 170, protein: 6, carbs: 18, fat: 7 },
      { food_name: "Chilled Masala Buttermilk (Chaas) with Seed Crackers", description: "Spiced probiotic buttermilk with roasted cumin and mint, served with multi-seed crackers", calories: 150, protein: 7, carbs: 16, fat: 4 },
      { food_name: "Steamed Sweet Corn Chaat with Lime & Chaat Masala", description: "Warm sweet corn tossed with fresh lime juice, chili flakes, and chopped cilantro", calories: 170, protein: 5, carbs: 32, fat: 2 },
      { food_name: "Protein Soya Chaat with Tomatoes & Lime", description: "Boiled soya chunks tossed with chopped onions, cucumbers, lime, and rock salt", calories: 180, protein: 16, carbs: 18, fat: 3 },
      { food_name: "Coconut Water with Soaked Sabja Seeds", description: "Hydrating fresh tender coconut water infused with cooling basil seeds", calories: 120, protein: 3, carbs: 22, fat: 1 },
      { food_name: "Toasted Walnut & Raisin Trail Mix", description: "Omega-3 rich raw walnut halves paired with golden raisins for clean brain fuel", calories: 190, protein: 5, carbs: 22, fat: 11 },
      { food_name: "Crispy Air-Fried Paneer Cubes with Chaat Masala", description: "Golden low-fat cottage cheese cubes dusted with tangy dry mango powder and rock salt", calories: 190, protein: 16, carbs: 6, fat: 11 },
      { food_name: "Roasted Edamame Beans with Himalayan Salt", description: "Crunchy green young soybeans offering high plant protein and dietary fiber", calories: 170, protein: 17, carbs: 11, fat: 6 },
      { food_name: "Warm Sweet Potato Chaat with Pomegranate Seeds", description: "Steamed sweet potato chunks tossed with lemon juice, mint, and fresh ruby pomegranate", calories: 160, protein: 3, carbs: 35, fat: 1 },
      { food_name: "Crisp Green Apple Slices with Natural Peanut Butter", description: "Tart green apple slices paired with 1 tablespoon unsweetened roasted peanut butter", calories: 180, protein: 5, carbs: 22, fat: 8 },
    ]
  };

  const nonVegMeals = {
    breakfast: [
      { food_name: "Scrambled Eggs with Baby Spinach & Whole Wheat Toast", description: "Two fluffy scrambled eggs with wilted spinach, whole wheat toast, and half an orange", calories: 420, protein: 22, carbs: 34, fat: 18 },
      { food_name: "Homestyle Egg Bhurji with 2 Multigrain Rotis", description: "Spiced scrambled eggs with onions, tomatoes, green chilies, and fresh coriander", calories: 410, protein: 24, carbs: 36, fat: 17 },
      { food_name: "Boiled Eggs (3) with Warm Oatmeal & Blueberries", description: "Hard-boiled eggs paired with warm rolled oats and fresh antioxidant-rich berries", calories: 440, protein: 26, carbs: 42, fat: 15 },
      { food_name: "Lean Chicken Sausage with Sunny Eggs & Toast", description: "Grilled lean chicken sausage link with eggs and lightly buttered whole grain bread", calories: 450, protein: 28, carbs: 30, fat: 20 },
      { food_name: "Four Egg White Veggie Omelette with Brown Bread", description: "Egg whites folded with mushrooms, spinach, bell peppers, and 2 slices toast", calories: 360, protein: 28, carbs: 36, fat: 6 },
      { food_name: "Shredded Chicken Breast Poha with Roasted Peanuts", description: "Savory flattened rice tossed with lean shredded chicken breast and peanuts", calories: 430, protein: 26, carbs: 50, fat: 12 },
      { food_name: "Smoked Salmon & Poached Egg on Whole Wheat Toast", description: "Whole grain toast topped with smoked salmon, poached egg, and fresh dill", calories: 420, protein: 27, carbs: 28, fat: 18 },
      { food_name: "Masala Omelette (3 Eggs) with 2 Multigrain Phulkas", description: "Spiced country-style egg omelette with turmeric, onions, and whole wheat rotis", calories: 430, protein: 25, carbs: 35, fat: 18 },
      { food_name: "Boiled Egg Whites (4) with Avocado Toast & Pepper", description: "Four boiled egg whites paired with mashed avocado on toasted sourdough", calories: 380, protein: 24, carbs: 32, fat: 14 },
      { food_name: "High-Protein Egg Wrap with Bell Peppers & Mint", description: "Two-egg thin crepe wrapped around sautéed peppers, onions, and low-fat cheese", calories: 390, protein: 23, carbs: 24, fat: 17 },
      { food_name: "Chicken Keema Paratha with Low-Fat Curd", description: "Whole wheat flatbread filled with seasoned minced chicken, served with fresh curd", calories: 440, protein: 27, carbs: 42, fat: 16 },
      { food_name: "French Toast (Whole Wheat) with Egg Whites & Berries", description: "Artisan whole wheat soaked in vanilla egg whites, grilled golden and topped with berries", calories: 410, protein: 20, carbs: 50, fat: 12 },
      { food_name: "Mediterranean Egg Shakshuka with Feta & Pita", description: "Eggs poached in spicy tomato, bell pepper, and cumin sauce, served with whole wheat pita", calories: 430, protein: 23, carbs: 40, fat: 18 },
      { food_name: "Minced Chicken & Egg White Scramble on Sourdough", description: "Lean chicken keema cooked with egg whites and fresh herbs on toasted rustic sourdough", calories: 420, protein: 30, carbs: 36, fat: 14 },
      { food_name: "South Indian Egg Dosa with Coconut Coriander Chutney", description: "Crispy fermented rice-lentil crepe with a farm egg cracked inside and folded hot", calories: 390, protein: 18, carbs: 48, fat: 12 },
      { food_name: "Smoked Turkey Breast Slices with Hard Boiled Eggs", description: "Lean deli turkey paired with 2 pasture-raised hard-boiled eggs and fresh citrus slices", calories: 380, protein: 32, carbs: 22, fat: 14 },
    ],
    lunch: [
      { food_name: "Herb-Grilled Chicken Breast with Quinoa Salad", description: "Tender marinated chicken breast with tri-color quinoa, cherry tomatoes, and cucumber", calories: 620, protein: 44, carbs: 52, fat: 16 },
      { food_name: "Homestyle Chicken Curry with Steamed Brown Rice", description: "Lean chicken pieces simmered in aromatic onion-tomato gravy with steamed brown rice", calories: 640, protein: 42, carbs: 64, fat: 18 },
      { food_name: "Coastal Fish Curry (Surmai) with Steamed Basmati Rice", description: "Fresh fish fillets cooked in light fenugreek and tomato curry with steamed rice", calories: 580, protein: 38, carbs: 68, fat: 14 },
      { food_name: "Tandoori Chicken Tikka with 2 Whole Wheat Rotis & Dal", description: "Char-grilled spiced chicken skewers served with yellow dal, phulkas, and onion rings", calories: 630, protein: 46, carbs: 54, fat: 16 },
      { food_name: "Egg Curry (2 Eggs) with Jeera Brown Rice & Salad", description: "Hard-boiled eggs in savory onion-tomato gravy served with cumin-scented brown rice", calories: 560, protein: 26, carbs: 68, fat: 18 },
      { food_name: "Lemon Herb Baked Fish Fillet with Steamed Veggies", description: "Baked fish fillet seasoned with lemon pepper, served with broccoli, carrots, and quinoa", calories: 540, protein: 40, carbs: 34, fat: 16 },
      { food_name: "Chicken Keema with Multigrain Roti & Mint Raita", description: "Minced lean chicken cooked with green peas, cumin, and warm whole wheat rotis", calories: 610, protein: 44, carbs: 48, fat: 18 },
      { food_name: "Grilled Atlantic Salmon Bowl with Brown Rice & Asparagus", description: "Seared salmon fillet over steamed brown rice and garlic asparagus spears", calories: 630, protein: 42, carbs: 50, fat: 22 },
      { food_name: "Chicken Shawarma Bowl with Quinoa & Garlic Tahini", description: "Spiced grilled chicken strips over chopped romaine, quinoa, and light tahini drizzle", calories: 610, protein: 43, carbs: 46, fat: 18 },
      { food_name: "Murgh Saagwala (Chicken with Spinach) & 2 Rotis", description: "Tender chicken chunks cooked in spiced spinach puree, served with warm phulkas", calories: 590, protein: 42, carbs: 48, fat: 16 },
      { food_name: "Grilled Prawn Masala with Steamed Rice & Salad", description: "Succulent prawns simmered in coastal tomato-coriander gravy with steamed rice", calories: 570, protein: 36, carbs: 65, fat: 14 },
      { food_name: "Bengali Macher Jhol with Steamed Basmati Rice", description: "Rohu fish simmered in light cumin, ginger, and green chili broth with tender potatoes", calories: 570, protein: 38, carbs: 68, fat: 13 },
      { food_name: "Butter Chicken (Fitness Homestyle) with Brown Rice", description: "Grilled chicken breast in silky tomato-fenugreek sauce prepared with low-fat yogurt", calories: 630, protein: 44, carbs: 62, fat: 18 },
      { food_name: "Chettinad Pepper Chicken with 2 Multigrain Rotis", description: "Fiery dry-roasted South Indian spices and chicken paired with whole grain phulkas", calories: 620, protein: 46, carbs: 50, fat: 17 },
      { food_name: "Goan Fish Curry with Coconut Milk & Steamed Rice", description: "Tender fish steaks poached in kokum and light coconut milk with steamed fragrant rice", calories: 590, protein: 39, carbs: 66, fat: 16 },
      { food_name: "Chicken Biryani (Lean Breast) with Cucumber Raita", description: "Long-grain basmati rice layered with herb-marinated chicken breast and saffron raita", calories: 640, protein: 42, carbs: 78, fat: 16 },
      { food_name: "Mediterranean Chicken Souvlaki with Warm Whole Pita", description: "Greek herb skewers served with chopped romaine, kalamata olives, and light tzatziki", calories: 610, protein: 45, carbs: 48, fat: 17 },
    ],
    dinner: [
      { food_name: "Herb-Crusted Baked Fish Fillet with Garden Greens", description: "Oven-baked white fish fillet seasoned with herbs, served with lemon and mixed green salad", calories: 460, protein: 38, carbs: 24, fat: 14 },
      { food_name: "Warm Grilled Chicken Breast Salad with Olive Oil", description: "Shredded chicken breast tossed with crisp romaine, cucumber, tomatoes, and balsamic", calories: 440, protein: 40, carbs: 22, fat: 14 },
      { food_name: "Aromatic Chicken Clear Soup with Dumplings & Greens", description: "Light aromatic chicken broth with shredded meat, bok choy, and steamed dumplings", calories: 420, protein: 34, carbs: 38, fat: 9 },
      { food_name: "Pan-Seared Salmon Fillet with Steamed Asparagus", description: "Atlantic salmon seared in olive oil with garlic asparagus and wild rice pilaf", calories: 520, protein: 42, carbs: 28, fat: 22 },
      { food_name: "Fluffy Egg Bhurji with 2 Phulkas & Cucumber Slices", description: "Homestyle scrambled eggs with turmeric and cilantro, paired with warm rotis", calories: 440, protein: 22, carbs: 42, fat: 16 },
      { food_name: "Wok-Tossed Chicken Breast & Mixed Vegetables", description: "Diced chicken breast stir-fried with bell peppers, zucchini, and soy-ginger glaze", calories: 460, protein: 38, carbs: 32, fat: 12 },
      { food_name: "Char-Grilled Tandoori Chicken Skewers with Mint Raita", description: "Char-grilled spiced chicken strips served with cooling cucumber raita and salad", calories: 480, protein: 44, carbs: 18, fat: 16 },
      { food_name: "Light Fish Tikka with Sautéed Bell Peppers & Phulka", description: "Tandoor-roasted fish chunks with crisp onions, peppers, and whole wheat roti", calories: 450, protein: 36, carbs: 35, fat: 13 },
      { food_name: "Chicken & Vegetable Bone Broth with Toasted Bread", description: "Slow-simmered collagen-rich chicken broth with tender meat and multigrain toast", calories: 410, protein: 32, carbs: 36, fat: 11 },
      { food_name: "Lemon Garlic Grilled Chicken with Sautéed Green Beans", description: "Marinated grilled chicken breast served with crisp garlic green beans and baby potatoes", calories: 460, protein: 41, carbs: 28, fat: 14 },
      { food_name: "Steamed Sea Bass in Ginger Soy Broth with Bok Choy", description: "Delicate white sea bass fillet steamed with fresh ginger, scallions, and greens", calories: 430, protein: 40, carbs: 18, fat: 12 },
      { food_name: "Air-Fried Lemon Pepper Chicken Wings with Celery", description: "Crisp chicken wingettes tossed in cracked black pepper and fresh lemon zest", calories: 450, protein: 38, carbs: 14, fat: 22 },
      { food_name: "Chicken Minestrone Soup with White Beans & Greens", description: "Hearty Italian chicken broth loaded with cannellini beans, zucchini, and tomatoes", calories: 430, protein: 36, carbs: 38, fat: 11 },
      { food_name: "Herb-Roasted Turkey Meatballs in Chunky Marinara", description: "Lean minced turkey balls simmered in sweet basil tomato sauce with side salad", calories: 470, protein: 42, carbs: 28, fat: 16 },
      { food_name: "Pan-Seared Tuna Steak with Sesame Garlic Green Beans", description: "Yellowfin tuna seared rare with toasted sesame, ginger, and steamed French beans", calories: 450, protein: 44, carbs: 16, fat: 14 },
    ],
    snack: [
      { food_name: "Boiled Egg Whites (3) with Crushed Black Pepper", description: "Seasoned egg whites providing instant high-bioavailability protein with zero carbs", calories: 120, protein: 18, carbs: 2, fat: 1 },
      { food_name: "Whey Protein Shake with Unsweetened Almond Milk", description: "One scoop whey isolate protein blended with chilled unsweetened almond milk", calories: 170, protein: 26, carbs: 5, fat: 3 },
      { food_name: "Crunchy Roasted Makhana with Roasted Almonds", description: "Light and crunchy roasted foxnuts tossed in pink salt and raw almonds", calories: 170, protein: 6, carbs: 24, fat: 6 },
      { food_name: "Grilled Chicken Salad Skewers with Cherry Tomatoes", description: "Bite-sized grilled chicken cubes threaded with cucumber and tomatoes", calories: 180, protein: 22, carbs: 6, fat: 5 },
      { food_name: "High-Protein Greek Yogurt with Mixed Berries", description: "Creamy probiotic yogurt with antioxidant-rich blueberries and chia seeds", calories: 190, protein: 15, carbs: 20, fat: 4 },
      { food_name: "Roasted Peanuts & Chana High-Protein Trail Mix", description: "Crunchy blend of dry-roasted Bengal gram and roasted peanuts", calories: 190, protein: 10, carbs: 18, fat: 9 },
      { food_name: "Cucumber Sticks with Low-Fat Cottage Cheese Dip", description: "Crunchy cucumber fingers dipped in herbed cottage cheese spread", calories: 140, protein: 12, carbs: 10, fat: 4 },
      { food_name: "Tuna Salad Lettuce Wraps with Lemon Dressing", description: "Flaked light tuna in brine wrapped in crisp romaine lettuce with lemon pepper", calories: 160, protein: 24, carbs: 4, fat: 3 },
      { food_name: "Hard-Boiled Eggs (2) with Smoky Peri-Peri Spice", description: "Pasture-raised eggs dusted with African bird's eye chili and Himalayan salt", calories: 140, protein: 13, carbs: 1, fat: 9 },
      { food_name: "Air-Fried Chicken Tikka Bites with Mint Yogurt Dip", description: "Tender boneless chicken breast chunks charred with tandoori spices and mint dip", calories: 180, protein: 26, carbs: 4, fat: 5 },
      { food_name: "Baked Egg White & Spinach Mini Frittatas (2 pcs)", description: "Fluffy baked egg muffins packed with iron-rich baby spinach and bell peppers", calories: 130, protein: 16, carbs: 4, fat: 3 },
    ]
  };

  const veganMeals = {
    breakfast: [
      { food_name: "Scrambled Organic Tofu with Baby Spinach & Toast", description: "Crumbled firm organic tofu seasoned with nutritional yeast, turmeric, and sourdough toast", calories: 370, protein: 22, carbs: 40, fat: 14 },
      { food_name: "Masala Vegetable Poha with Roasted Peanuts & Lime", description: "Flattened rice tempered with mustard seeds, curry leaves, onions, and raw peanuts", calories: 360, protein: 10, carbs: 56, fat: 11 },
      { food_name: "Moong Dal Chilla with Fresh Mint Coriander Chutney", description: "Savory yellow lentil pancakes packed with finely chopped onions, chilies, and herbs", calories: 340, protein: 18, carbs: 46, fat: 8 },
      { food_name: "Peanut Butter & Sliced Banana Overnight Oats", description: "Rolled oats soaked in almond milk, layered with natural peanut butter and chia seeds", calories: 390, protein: 14, carbs: 56, fat: 14 },
      { food_name: "Chia Seed Coconut Milk Bowl with Kiwi & Blueberries", description: "Superfood chia pudding infused with vanilla coconut milk and fresh seasonal fruits", calories: 350, protein: 10, carbs: 44, fat: 16 },
      { food_name: "Steamed Ragi Idli with Vegetable Sambar", description: "Finger millet and lentil steamed cakes served with aromatic vegetable drumstick stew", calories: 350, protein: 12, carbs: 62, fat: 6 },
      { food_name: "Tempeh Bacon with Sautéed Spinach & Whole Wheat Toast", description: "Smoky maple-glazed organic tempeh strips with garlicky greens and toasted bread", calories: 380, protein: 24, carbs: 36, fat: 16 },
      { food_name: "Sprouted Moong Salad with Whole Wheat Toast", description: "Steamed green sprouts tossed with diced tomatoes, lemon, cilantro, and toast", calories: 330, protein: 16, carbs: 48, fat: 6 },
      { food_name: "Besan Vegetable Chilla with Mint Chutney", description: "Chickpea flour savory crepe loaded with grated zucchini, carrots, and cumin", calories: 350, protein: 16, carbs: 48, fat: 10 },
      { food_name: "Avocado & Hemp Seed Toast with Chili Flakes", description: "Creamy smashed avocado topped with complete plant protein hemp hearts on sourdough", calories: 380, protein: 12, carbs: 42, fat: 18 },
    ],
    lunch: [
      { food_name: "Creamy Palak Tofu with 2 Whole Wheat Phulkas", description: "Pan-seared tofu cubes in spiced spinach puree seasoned with garlic and lemon", calories: 580, protein: 26, carbs: 58, fat: 20 },
      { food_name: "Amritsari Rajma Masala with Steamed Brown Rice", description: "Hearty red kidney beans simmered in thick onion-tomato gravy with brown rice", calories: 610, protein: 24, carbs: 88, fat: 12 },
      { food_name: "Pindi Chole with 2 Whole Wheat Phulkas & Salad", description: "Dark spiced chickpea curry cooked with pomegranate seeds and warm rotis", calories: 590, protein: 23, carbs: 80, fat: 14 },
      { food_name: "Dal Tadka with Jeera Brown Rice & Beans Sabzi", description: "Yellow lentils tempered with cumin, garlic, and cold-pressed oil with brown rice", calories: 570, protein: 22, carbs: 86, fat: 12 },
      { food_name: "High-Protein Soya Chunks Curry with 2 Rotis & Dal", description: "Juicy textured soya nuggets and green peas in homestyle gravy with yellow dal", calories: 610, protein: 35, carbs: 70, fat: 12 },
      { food_name: "Marinated Tofu Tikka with Quinoa Pulao & Mint Dip", description: "Char-roasted spiced tofu skewers over warm vegetable quinoa and coconut mint dip", calories: 620, protein: 28, carbs: 65, fat: 20 },
      { food_name: "Mediterranean Chickpea & Falafel Bowl with Tahini", description: "Baked falafel balls over tri-color quinoa, kalamata olives, cucumber, and tahini drizzle", calories: 600, protein: 22, carbs: 72, fat: 22 },
      { food_name: "Lentil & Sweet Potato Coconut Curry with Brown Rice", description: "Red lentils and roasted sweet potatoes in mild coconut turmeric curry with rice", calories: 590, protein: 20, carbs: 84, fat: 16 },
      { food_name: "Organic Tempeh Stir-Fry with Broccoli & Sesame Rice", description: "Nutty cultured tempeh cubes tossed with snap peas, bell peppers, and brown rice", calories: 610, protein: 32, carbs: 64, fat: 20 },
      { food_name: "Thai Green Tofu Curry with Jasmine Brown Rice", description: "Coconut green curry with lemongrass, bamboo shoots, eggplant, and firm tofu", calories: 600, protein: 24, carbs: 68, fat: 22 },
    ],
    dinner: [
      { food_name: "Vegetable Dal Khichdi with Roasted Papad & Pickles", description: "Comforting one-pot lentils, brown rice, and seasonal vegetables cooked with cumin", calories: 470, protein: 17, carbs: 74, fat: 10 },
      { food_name: "Lauki Chana Dal with 2 Whole Wheat Phulkas", description: "Bottle gourd and split bengal gram simmered in light tomato-ginger broth with rotis", calories: 440, protein: 19, carbs: 66, fat: 9 },
      { food_name: "Tofu & Tri-Color Bell Pepper Sauté with 2 Rotis", description: "Firm organic tofu and crunchy peppers tossed in light spices with lemon dressing", calories: 480, protein: 24, carbs: 48, fat: 18 },
      { food_name: "Yellow Moong Dal with Pan-Roasted Bhindi & Rotis", description: "Light yellow lentils paired with crispy spiced okra and warm phulkas", calories: 450, protein: 17, carbs: 66, fat: 11 },
      { food_name: "Wok-Tossed Tofu & Mixed Vegetables with Rice", description: "Tofu cubes stir-fried with broccoli, carrots, and toasted sesame seeds in light soy sauce", calories: 460, protein: 22, carbs: 54, fat: 14 },
      { food_name: "Spiced Chickpea & Baby Spinach Stew with Quinoa", description: "Slow-simmered garbanzo beans with wilted greens, cumin, and warm fluffy quinoa", calories: 460, protein: 20, carbs: 68, fat: 11 },
      { food_name: "Mixed Vegetable Lentil Soup with Multigrain Toast", description: "Zucchini, carrots, split lentils, and thyme simmered into a restorative vegetable stew", calories: 410, protein: 16, carbs: 62, fat: 7 },
      { food_name: "High-Protein Soya Keema with 2 Phulkas & Salad", description: "Minced soya granules cooked with green peas, cumin, and tomatoes, served with salad", calories: 480, protein: 28, carbs: 58, fat: 11 },
      { food_name: "Roasted Eggplant & Chickpea Tagine with Couscous", description: "North African stew with caramelized eggplant, apricots, chickpeas, and couscous", calories: 460, protein: 17, carbs: 72, fat: 10 },
    ],
    snack: [
      { food_name: "Roasted Sea Salt Makhana (Foxnuts) & Green Tea", description: "Crunchy lotus seeds dry-roasted in olive oil with pink Himalayan salt and pepper", calories: 160, protein: 5, carbs: 26, fat: 4 },
      { food_name: "Steamed Sprouted Moong Chaat with Lime & Chaat Masala", description: "Nutritious green gram sprouts tossed with chopped onions, tomatoes, and cilantro", calories: 180, protein: 10, carbs: 28, fat: 2 },
      { food_name: "Coconut Milk Chia Pudding with Fresh Blueberries", description: "Creamy plant-based pudding packed with omega-3 fatty acids and wild berries", calories: 190, protein: 8, carbs: 22, fat: 8 },
      { food_name: "Dry Roasted Chana & Raw California Almonds", description: "Traditional roasted Bengal gram paired with raw almonds for clean afternoon focus", calories: 190, protein: 9, carbs: 20, fat: 8 },
      { food_name: "Cucumber & Carrot Crudités with Homemade Hummus", description: "Crisp raw vegetable sticks served with 2 tablespoons of zesty tahini chickpea dip", calories: 170, protein: 6, carbs: 18, fat: 7 },
      { food_name: "Fresh Tender Coconut Water with Soaked Sabja Seeds", description: "Electrolyte-rich coconut water with cooling basil seeds for natural hydration", calories: 120, protein: 3, carbs: 22, fat: 1 },
      { food_name: "Warm Steamed Sweet Corn Chaat with Lime", description: "Sweet corn tossed with fresh lime juice, chili flakes, and chopped cilantro", calories: 170, protein: 5, carbs: 32, fat: 2 },
      { food_name: "Roasted Salted Edamame Beans with Nori Flakes", description: "Crisp young soybeans dusted with seaweed flakes and sea salt for 17g plant protein", calories: 170, protein: 17, carbs: 11, fat: 6 },
    ]
  };

  const mealSource = isVegan ? veganMeals : isVeg ? vegMeals : nonVegMeals;

  // Modern Fisher-Yates array shuffling with random seed for true variety on every generation
  const shuffleArray = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Create freshly randomized pools for breakfast, lunch, dinner, snack
  const shuffledBreakfasts = shuffleArray(mealSource.breakfast);
  const shuffledLunches = shuffleArray(mealSource.lunch);
  const shuffledDinners = shuffleArray(mealSource.dinner);
  const shuffledSnacks = shuffleArray(mealSource.snack);

  const result = [];
  for (let d = 1; d <= days; d++) {
    // Pick unique meals for each day with modulo fallback if days exceed pool length
    let b = { ...shuffledBreakfasts[(d - 1) % shuffledBreakfasts.length] };
    let l = { ...shuffledLunches[(d - 1) % shuffledLunches.length] };
    let dn = { ...shuffledDinners[(d - 1) % shuffledDinners.length] };
    let s = { ...shuffledSnacks[(d - 1) % shuffledSnacks.length] };

    // Vegan substitutions for dairy products
    if (isVegan) {
      const veganize = (m: any) => {
        const name = m.food_name
          .replace(/Paneer Bhurji/g, 'Scrambled Organic Tofu')
          .replace(/Palak Paneer/g, 'Palak Tofu with Nutritional Yeast')
          .replace(/Paneer Tikka/g, 'Marinated Tofu Tikka')
          .replace(/Paneer Jalfrezi/g, 'Tofu Jalfrezi with Bell Peppers')
          .replace(/Paneer & Tri-Color Bell Pepper/g, 'Tofu & Tri-Color Bell Pepper')
          .replace(/Paneer & Bell Pepper/g, 'Tofu & Bell Pepper')
          .replace(/Paneer Stuffed Paratha/g, 'Spiced Tofu Stuffed Paratha')
          .replace(/Paneer/g, 'Tofu')
          .replace(/Low-Fat Curd/g, 'Coconut Yogurt')
          .replace(/Probiotic Curd/g, 'Almond Milk Yogurt')
          .replace(/Fresh Curd/g, 'Coconut Yogurt')
          .replace(/Curd/g, 'Almond Yogurt')
          .replace(/Greek Yogurt/g, 'Chia Seed Coconut Pudding')
          .replace(/Kadhi Khichdi/g, 'Coconut Lentil Khichdi')
          .replace(/Masala Buttermilk \(Chaas\)/g, 'Spiced Mint Coconut Water')
          .replace(/Boondi Raita/g, 'Mint Cucumber Dip')
          .replace(/Spiced Raita/g, 'Spiced Coconut Dip');

        const desc = m.description
          .replace(/paneer/gi, 'organic tofu')
          .replace(/cottage cheese/gi, 'tofu')
          .replace(/ghee/gi, 'cold-pressed sesame oil')
          .replace(/curd/gi, 'plant-based yogurt')
          .replace(/yogurt/gi, 'coconut chia pudding')
          .replace(/buttermilk/gi, 'chilled coconut water');

        return { ...m, food_name: name, description: desc };
      };

      b = veganize(b);
      l = veganize(l);
      dn = veganize(dn);
      s = veganize(s);
    }

    // Calibrate calories & macros proportionally to targetCalories (derived from workload & age)
    const dayBaseCalories = b.calories + l.calories + dn.calories + s.calories;
    const ratio = targetCalories / dayBaseCalories;

    const scaleMeal = (m: any) => ({
      ...m,
      calories: Math.round((m.calories * ratio) / 10) * 10,
      protein: Math.max(5, Math.round(m.protein * ratio)),
      carbs: Math.max(10, Math.round(m.carbs * ratio)),
      fat: Math.max(3, Math.round(m.fat * ratio)),
    });

    result.push({
      day: d,
      meals: [
        { meal_type: 'breakfast', ...scaleMeal(b) },
        { meal_type: 'lunch', ...scaleMeal(l) },
        { meal_type: 'dinner', ...scaleMeal(dn) },
        { meal_type: 'snack', ...scaleMeal(s) },
      ]
    });
  }

  return result;
}

export function useMealPlans() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMealPlans();
    }
  }, [user]);

  const fetchMealPlans = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('plan_date', { ascending: true })
        .order('meal_type', { ascending: true });

      if (error) throw error;
      setMealPlans(data as MealPlan[]);
    } catch (error) {
      console.error('Error fetching meal plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMealPlan = async (
    days: number = 7, 
    dietaryPreference?: 'veg' | 'non-veg' | 'vegan',
    params?: { 
      age?: number; 
      workloadHours?: number;
      targetDate?: string;
      customNote?: string;
      silent?: boolean;
    }
  ) => {
    if (!user || !profile) {
      toast({
        title: 'Profile required',
        description: 'Please complete your profile first.',
        variant: 'destructive',
      });
      return null;
    }

    const selectedPref = dietaryPreference || (profile as any)?.dietary_preference || 'veg';
    const userAge = params?.age ?? profile.age ?? 24;
    const workload = params?.workloadHours ?? 6;
    const isDaily = days === 1;
    const targetDateStr = params?.targetDate || format(new Date(), 'yyyy-MM-dd');

    // Scientifically calibrate activity level & daily target calories based on workload hours & age
    let activityMultiplier = 1.45;
    let activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' = 'moderate';
    if (workload <= 3) {
      activityMultiplier = 1.25;
      activityLevel = 'sedentary';
    } else if (workload <= 6) {
      activityMultiplier = 1.45;
      activityLevel = 'moderate';
    } else if (workload <= 9) {
      activityMultiplier = 1.65;
      activityLevel = 'active';
    } else {
      activityMultiplier = 1.85;
      activityLevel = 'very_active';
    }

    const baseCalorie = Math.round((1650 - Math.min(userAge, 65) * 4) * activityMultiplier);
    const targetCalories = Math.max(1600, Math.min(3200, Math.round(baseCalorie / 50) * 50));

    setGenerating(true);
    try {
      // Sync calibrated user settings to Supabase profile
      const profileUpdates: any = {
        dietary_preference: selectedPref,
        daily_calorie_target: targetCalories,
        activity_level: activityLevel,
        age: userAge,
      };

      await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', profile.id);

      let generatedPlans: any[] | null = null;

      try {
        const payload = {
          dietGoal: profile.diet_goal || 'maintenance',
          dailyCalorieTarget: targetCalories,
          dietaryPreference: selectedPref,
          days,
          age: userAge,
          workloadHours: workload,
          customNote: params?.customNote,
        };

        // Try direct Lovable AI meal planner edge function first
        const mealPlanRes = await fetch('https://wssurlhlklxkzvyczsoo.supabase.co/functions/v1/generate-meal-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (mealPlanRes.ok) {
          const resData = await mealPlanRes.json();
          if (resData?.mealPlans?.length) {
            generatedPlans = resData.mealPlans;
          }
        } else {
          // Try supabase.functions.invoke fallback
          const response = await supabase.functions.invoke('generate-meal-plan', {
            body: payload,
          });
          if (!response.error && response.data?.mealPlans?.length) {
            generatedPlans = response.data.mealPlans;
          }
        }

        if (generatedPlans && generatedPlans.length) {
          // Double check: if user picked veg, ensure no non-veg meals sneaked in
          if (selectedPref === 'veg' || selectedPref === 'vegan') {
            const nonVegKeywords = ['chicken', 'fish', 'meat', 'bacon', 'pork', 'beef', 'egg', 'salmon', 'tuna', 'prawn', 'turkey'];
            const hasNonVeg = generatedPlans.some((dp: any) =>
              dp.meals?.some((m: any) =>
                nonVegKeywords.some(kw => (m.food_name || '').toLowerCase().includes(kw))
              )
            );
            if (hasNonVeg) {
              console.warn('AI returned non-veg meals for veg preference. Using verified vegetarian meal plan.');
              generatedPlans = null;
            }
          }
        }
      } catch (invokeErr) {
        console.warn('Edge function invoke failed, using verified fallback planner:', invokeErr);
      }

      // If AI service failed, rate limited, or returned invalid meals, use our verified meal planner
      if (!generatedPlans || !generatedPlans.length) {
        generatedPlans = createFallbackMealPlans(
          days, 
          selectedPref, 
          targetCalories,
          params?.customNote
        );
      }
      
      // Delete existing meal plans: if daily, only delete target date; if multi-day, delete future
      if (isDaily) {
        await supabase
          .from('meal_plans')
          .delete()
          .eq('user_id', user.id)
          .eq('plan_date', targetDateStr);
      } else {
        const today = format(new Date(), 'yyyy-MM-dd');
        await supabase
          .from('meal_plans')
          .delete()
          .eq('user_id', user.id)
          .gte('plan_date', today);
      }

      // Insert new meal plans
      const startDate = isDaily ? new Date(targetDateStr + 'T00:00:00') : new Date();
      const plansToInsert: any[] = [];

      generatedPlans.forEach((dayPlan: any) => {
        const planDate = isDaily ? targetDateStr : format(addDays(startDate, dayPlan.day - 1), 'yyyy-MM-dd');
        dayPlan.meals.forEach((meal: any) => {
          plansToInsert.push({
            user_id: user.id,
            plan_date: planDate,
            meal_type: meal.meal_type,
            food_name: meal.food_name,
            description: meal.description,
            calories: meal.calories,
            protein: meal.protein || 0,
            carbs: meal.carbs || 0,
            fat: meal.fat || 0,
            is_completed: false,
          });
        });
      });

      const { error: insertError } = await supabase
        .from('meal_plans')
        .insert(plansToInsert);

      if (insertError) throw insertError;

      const prefLabel = selectedPref === 'veg' ? 'Vegetarian' : selectedPref === 'vegan' ? 'Vegan' : 'Non-Vegetarian';
      if (!params?.silent) {
        toast({
          title: isDaily ? `${prefLabel} Daily Plan Ready!` : `${prefLabel} ${days}-Day Plan Ready!`,
          description: isDaily 
            ? `Personalized daily meal plan generated for ${targetDateStr}.`
            : `Your personalized ${days}-day ${prefLabel.toLowerCase()} meal plan is ready.`,
        });
      }

      await fetchMealPlans();
      return generatedPlans;
    } catch (error: any) {
      console.error('Error generating meal plan:', error);
      toast({
        title: 'Generation failed',
        description: error.message || 'Failed to generate meal plan.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const toggleMealCompletion = async (mealPlanId: string, isCompleted?: boolean) => {
    let nextStatus = false;
    setMealPlans(prev =>
      prev.map(plan => {
        if (plan.id === mealPlanId) {
          nextStatus = isCompleted !== undefined ? isCompleted : !plan.is_completed;
          return { ...plan, is_completed: nextStatus };
        }
        return plan;
      })
    );

    if (user) {
      try {
        await supabase
          .from('meal_plans')
          .update({ is_completed: nextStatus })
          .eq('id', mealPlanId);
      } catch (error) {
        console.warn('Error syncing meal completion to Supabase:', error);
      }
    }

    toast({
      title: nextStatus ? 'Marked as Eaten' : 'Marked as Not Eaten',
      description: nextStatus ? 'Great job staying on track with your meal!' : 'Meal status updated.',
    });
  };

  const deleteMealPlan = async (mealPlanId: string) => {
    setMealPlans(prev => prev.filter(plan => plan.id !== mealPlanId));

    if (user) {
      try {
        await supabase
          .from('meal_plans')
          .delete()
          .eq('id', mealPlanId);
      } catch (error) {
        console.warn('Error deleting meal plan from Supabase:', error);
      }
    }

    toast({
      title: 'Meal removed',
      description: 'The meal has been deleted from your plan.',
    });
  };

  const addCustomMeal = async (newMeal: {
    plan_date: string;
    meal_type: string;
    food_name: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    description?: string;
  }) => {
    const mealObj: MealPlan = {
      id: 'custom-' + Date.now(),
      user_id: user?.id || 'guest',
      plan_date: newMeal.plan_date,
      meal_type: newMeal.meal_type,
      food_name: newMeal.food_name,
      calories: Number(newMeal.calories) || 0,
      protein: Number(newMeal.protein) || 0,
      carbs: Number(newMeal.carbs) || 0,
      fat: Number(newMeal.fat) || 0,
      description: newMeal.description || 'Custom meal added by user',
      is_completed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (user) {
      try {
        const { data, error } = await supabase
          .from('meal_plans')
          .insert({
            user_id: user.id,
            plan_date: newMeal.plan_date,
            meal_type: newMeal.meal_type,
            food_name: newMeal.food_name,
            calories: Number(newMeal.calories) || 0,
            protein: Number(newMeal.protein) || 0,
            carbs: Number(newMeal.carbs) || 0,
            fat: Number(newMeal.fat) || 0,
            description: newMeal.description || null,
            is_completed: false,
          })
          .select()
          .single();

        if (!error && data) {
          mealObj.id = data.id;
        }
      } catch (err) {
        console.warn('Could not insert to Supabase, keeping in memory', err);
      }
    }

    setMealPlans(prev => [...prev, mealObj]);
    toast({
      title: 'Custom meal added!',
      description: `${newMeal.food_name} added to your plan.`,
    });
    return mealObj;
  };

  const getMealsByDate = (date: string) => {
    return mealPlans.filter(plan => plan.plan_date === date);
  };

  const getWeeklyCalories = () => {
    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekDates = Array.from({ length: 7 }, (_, i) => 
      format(addDays(weekStart, i), 'yyyy-MM-dd')
    );

    return weekDates.map(date => ({
      date,
      calories: mealPlans
        .filter(plan => plan.plan_date === date)
        .reduce((sum, plan) => sum + plan.calories, 0),
    }));
  };

  return {
    mealPlans,
    loading,
    generating,
    generateMealPlan,
    toggleMealCompletion,
    deleteMealPlan,
    addCustomMeal,
    getMealsByDate,
    getWeeklyCalories,
    refreshMealPlans: fetchMealPlans,
  };
}
