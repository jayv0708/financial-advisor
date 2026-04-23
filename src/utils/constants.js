export const CATEGORIES = [
  "Food",
  "Travel",
  "Bills",
  "Shopping",
  "Others"
];

// Colors for charts and UI
export const CATEGORY_COLORS = {
  Food: "#FF6B6B",
  Travel: "#4ECDC4",
  Bills: "#45B7D1",
  Shopping: "#F9D56E",
  Others: "#95A5A6"
};

// Vocabulary for the ML Bag of Words categorizer.
export const VOCABULARY = [
  "uber", "ola", "metro", "train", "flight", "bus", "taxi", "travel", // Travel
  "swiggy", "zomato", "restaurant", "food", "dinner", "lunch", "breakfast", "grocery", "cafe", "starbucks", "mcdonalds", "kfc", "pizza", // Food
  "electricity", "water", "rent", "internet", "wifi", "bill", "recharge", "jio", "airtel", "netflix", "prime", "subscription", // Bills
  "amazon", "flipkart", "myntra", "clothes", "shoes", "shopping", "mall", "zara", // Shopping
];

// Dummy initial data to populate the charts immediately (INR values)
export const INITIAL_EXPENSES = [
  { id: "1", text: "Rent for April", amount: 20000, category: "Bills", date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() },
  { id: "2", text: "Ola to work", amount: 350, category: "Travel", date: new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString() },
  { id: "3", text: "Cafe coffee", amount: 250, category: "Food", date: new Date(new Date().getFullYear(), new Date().getMonth(), 2).toISOString() },
  { id: "4", text: "Zomato dinner", amount: 600, category: "Food", date: new Date(new Date().getFullYear(), new Date().getMonth(), 3).toISOString() },
  { id: "5", text: "Myntra shopping", amount: 3000, category: "Shopping", date: new Date(new Date().getFullYear(), new Date().getMonth(), 5).toISOString() },
  { id: "6", text: "Electricity Bill", amount: 1500, category: "Bills", date: new Date(new Date().getFullYear(), new Date().getMonth(), 10).toISOString() },
  { id: "7", text: "Metro recharge", amount: 500, category: "Travel", date: new Date(new Date().getFullYear(), new Date().getMonth(), 12).toISOString() },
  
  // Previous month data for prediction logic
  { id: "8", text: "Rent for March", amount: 20000, category: "Bills", date: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString() },
  { id: "9", text: "Groceries", amount: 4500, category: "Food", date: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 5).toISOString() },
  { id: "10", text: "Flight ticket", amount: 6500, category: "Travel", date: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15).toISOString() },
];

/**
 * Global Rupee Formatter. Note that maxFractionDigits limits cents rendering.
 */
export const formatINR = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};
