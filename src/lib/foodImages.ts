/**
 * Intelligent Food Image Resolver
 * Comprehensive semantic dictionary mapping dishes, snacks, chocolates,
 * street food, desserts, drinks, and meals to high-quality authentic culinary photography.
 */

const foodImageDirectory: Array<{ keywords: string[]; url: string }> = [
  // 1. Chocolates & Cacao Confections
  {
    keywords: [
      'chocolate', 'choco', 'cadbury', 'kitkat', 'fudge', 'brownie',
      'truffle', 'cacao', 'cocoa', 'dark chocolate', 'nutella', 'dairy milk'
    ],
    url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=600&q=80',
  },

  // 2. Cookies & Biscuits
  {
    keywords: [
      'cookie', 'cookies', 'biscuit', 'biscuits', 'oreo', 'wafer',
      'macaron', 'shortbread', 'chocochip'
    ],
    url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=600&q=80',
  },

  // 3. Cakes, Pastries & Muffins
  {
    keywords: [
      'cake', 'pastry', 'cupcake', 'cheesecake', 'muffin', 'tart', 'pie', 'croissant', 'donut', 'doughnut'
    ],
    url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80',
  },

  // 4. Ice Cream & Frozen Treats
  {
    keywords: [
      'ice cream', 'icecream', 'gelato', 'kulfi', 'sundae', 'popsicle', 'sorbet', 'frozen yogurt'
    ],
    url: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=600&q=80',
  },

  // 5. Traditional Sweets & Mithai
  {
    keywords: [
      'gulab jamun', 'rasgulla', 'jalebi', 'ladoo', 'laddu', 'kaju katli',
      'halwa', 'mithai', 'barfi', 'peda', 'sweet', 'payasam', 'kheer'
    ],
    url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
  },

  // 6. Chips, Namkeen, Popcorn & Packaged Snacks
  {
    keywords: [
      'chips', 'crisps', 'potato chips', 'lays', 'kurkure', 'nachos',
      'doritos', 'popcorn', 'pretzel', 'namkeen', 'sev', 'bhujia', 'mixture', 'snack'
    ],
    url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80',
  },

  // 7. Samosa, Pakora, Kachori & Indian Street Snacks
  {
    keywords: [
      'samosa', 'kachori', 'pakora', 'bhajiya', 'fritter', 'vada pav',
      'bhel', 'pani puri', 'chaat', 'dahi puri', 'tikki', 'aloo tikki', 'chivda'
    ],
    url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
  },

  // 8. French Fries & Potato Wedges
  {
    keywords: [
      'fries', 'french fries', 'potato wedges', 'tater tots', 'hashbrown', 'finger chips'
    ],
    url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
  },

  // 9. Burgers & Sliders
  {
    keywords: [
      'burger', 'cheeseburger', 'hamburger', 'slider', 'patty', 'whopper', 'veggie burger'
    ],
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
  },

  // 10. Sandwiches, Subs & Paninis
  {
    keywords: [
      'sandwich', 'sub', 'panini', 'grilled cheese', 'toast', 'club sandwich', 'bocadillo'
    ],
    url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  },

  // 11. Pizza & Flatbreads
  {
    keywords: [
      'pizza', 'calzone', 'pepperoni', 'margherita', 'cheese pizza', 'thin crust'
    ],
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
  },

  // 12. Noodles, Maggi, Ramen & Pasta
  {
    keywords: [
      'noodle', 'noodles', 'maggi', 'ramen', 'chowmein', 'pasta',
      'spaghetti', 'macaroni', 'lasagna', 'hakka', 'penne', 'fusilli', 'pad thai'
    ],
    url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80',
  },

  // 13. Momos, Dumplings & Rolls
  {
    keywords: [
      'momo', 'momos', 'dumpling', 'dumplings', 'dim sum', 'spring roll',
      'wonton', 'roll', 'frankie', 'kathi roll', 'wrap', 'burrito', 'taco', 'quesadilla'
    ],
    url: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80',
  },

  // 14. Paneer & Cottage Cheese Preparations
  {
    keywords: [
      'paneer', 'cottage cheese', 'bhurji', 'paneer butter masala',
      'shahi paneer', 'palak paneer', 'kadai paneer', 'matar paneer'
    ],
    url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
  },

  // 15. Legumes, Rajma, Chole & Dal
  {
    keywords: ['rajma', 'chole', 'chickpea', 'chana', 'kidney bean'],
    url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
  },
  {
    keywords: ['dal', 'lentil', 'moong', 'tadka', 'sambar', 'rasam', 'kadi', 'dhal', 'khichdi'],
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
  },

  // 16. Biryani & Rice Bowls
  {
    keywords: ['biryani', 'pulao', 'fried rice', 'basmati', 'rice bowl', 'jeera rice'],
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
  },

  // 17. Indian Breads & Rotis
  {
    keywords: ['roti', 'chapati', 'paratha', 'naan', 'phulka', 'flatbread', 'kulcha', 'puri', 'poori'],
    url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=80',
  },

  // 18. South Indian Breakfasts
  {
    keywords: ['dosa', 'idli', 'chilla', 'uttapam', 'upma', 'poha', 'vada', 'cheela'],
    url: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80',
  },

  // 19. Oatmeal, Cereals & Smoothie Bowls
  {
    keywords: ['chia', 'berry', 'berries', 'oats', 'oatmeal', 'porridge', 'granola', 'smoothie bowl', 'almond milk', 'muesli'],
    url: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=600&q=80',
  },

  // 20. Nuts & Dry Fruits
  {
    keywords: ['walnut', 'trail mix', 'nuts', 'almond', 'raisin', 'cashew', 'peanut butter', 'pumpkin seed', 'seeds', 'peanut'],
    url: 'https://images.unsplash.com/photo-1596591606975-97ee5cef3a1e?auto=format&fit=crop&w=600&q=80',
  },

  // 21. Fresh Fruits
  {
    keywords: ['apple', 'fruit', 'banana', 'orange', 'papaya', 'mango', 'watermelon', 'grapes', 'pineapple', 'kiwi'],
    url: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?auto=format&fit=crop&w=600&q=80',
  },

  // 22. Tofu & Plant Bowls
  {
    keywords: ['tofu', 'tempeh', 'soy', 'edamame', 'tofu stir fry', 'stir-fry', 'stir fry'],
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  },

  // 23. Sautéed Vegetables, Sabzi & Greens
  {
    keywords: ['bhindi', 'okra', 'sabzi', 'gobi', 'aloo', 'baingan', 'sauté', 'vegetable', 'veggies', 'greens', 'broccoli'],
    url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
  },

  // 24. Steamed Rice & Grains
  {
    keywords: ['rice', 'steamed rice', 'white rice', 'brown rice', 'boiled rice', 'cooked rice', 'grain', 'quinoa'],
    url: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&w=600&q=80',
  },

  // 25. Chaat & Street Food
  {
    keywords: ['chaat', 'sweet potato', 'aloo chaat', 'dahi chaat', 'papdi', 'sev puri', 'bhelpuri', 'papri'],
    url: 'https://images.unsplash.com/photo-1567184109411-b28f21ee097a?auto=format&fit=crop&w=600&q=80',
  },

  // 26. Fresh Salads
  {
    keywords: ['salad', 'cucumber', 'sprout', 'sprouts', 'lettuce', 'tomato', 'greek salad'],
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
  },

  // 24. Eggs
  {
    keywords: ['egg', 'omelette', 'boiled egg', 'scramble', 'anda', 'poached', 'fried egg'],
    url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
  },

  // 25. Poultry & Meats
  {
    keywords: ['chicken', 'murgh', 'tikka', 'tandoori', 'poultry', 'wings', 'meat', 'mutton', 'lamb', 'kebab'],
    url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
  },

  // 26. Seafood & Fish
  {
    keywords: ['fish', 'salmon', 'prawn', 'shrimp', 'seafood', 'tuna', 'crab'],
    url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
  },

  // 27. Beverages: Coffee, Tea & Shakes
  {
    keywords: ['coffee', 'cappuccino', 'latte', 'espresso', 'mocha', 'cold coffee'],
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
  },
  {
    keywords: ['tea', 'chai', 'masala chai', 'green tea', 'black tea'],
    url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
  },
  {
    keywords: ['shake', 'milkshake', 'smoothie', 'juice', 'lassi', 'lemonade', 'cola', 'soda'],
    url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
  },

  // 28. Soups
  {
    keywords: ['soup', 'broth', 'shorba', 'tomato soup'],
    url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
  },
]

const mealTypeFallback: Record<string, string> = {
  breakfast: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=600&q=80',
  lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  dinner: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
  snack: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80',
}

const defaultFoodImage = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=600&q=80'

export function getFoodImage(dishName: string, mealType?: string): string {
  if (!dishName) {
    return mealType ? mealTypeFallback[mealType.toLowerCase()] || defaultFoodImage : defaultFoodImage
  }

  const normalized = dishName.toLowerCase().trim()

  for (const item of foodImageDirectory) {
    if (item.keywords.some((keyword) => normalized.includes(keyword))) {
      return item.url
    }
  }

  if (mealType && mealTypeFallback[mealType.toLowerCase()]) {
    return mealTypeFallback[mealType.toLowerCase()]
  }

  return defaultFoodImage
}
