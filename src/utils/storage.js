import { INITIAL_EXPENSES } from './constants';

const STORAGE_KEY = 'expense_advisor_data';
const INCOME_KEY = 'expense_advisor_income';
const USER_KEY = 'expense_advisor_user';

// --- User Profile Storage ---
export const loadUser = () => {
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const saveUser = (user) => {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to save user:', error);
  }
};

export const clearUser = () => {
  try {
    localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Failed to clear user:', error);
  }
};

export const loadExpenses = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      saveExpenses(INITIAL_EXPENSES);
      return INITIAL_EXPENSES;
    }
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load expenses from storage:", error);
    return [];
  }
};

export const saveExpenses = (expenses) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (error) {
    console.error("Failed to save expenses to storage:", error);
  }
};

export const addExpense = (expense) => {
  const expenses = loadExpenses();
  const newExpenses = [expense, ...expenses];
  saveExpenses(newExpenses);
  return newExpenses;
};

export const updateExpense = (id, updatedData) => {
  const expenses = loadExpenses();
  const index = expenses.findIndex(exp => exp.id === id);
  if (index !== -1) {
    expenses[index] = { ...expenses[index], ...updatedData };
    saveExpenses(expenses);
  }
  return expenses;
};

export const deleteExpense = (id) => {
  const expenses = loadExpenses();
  const newExpenses = expenses.filter(exp => exp.id !== id);
  saveExpenses(newExpenses);
  return newExpenses;
};

// --- NEW: Income Storage ---

export const loadIncome = () => {
  try {
    const data = localStorage.getItem(INCOME_KEY);
    if (!data) {
      // Default placeholder income (e.g., 50k INR)
      const defaultIncome = 50000;
      saveIncome(defaultIncome);
      return defaultIncome;
    }
    return Number(data);
  } catch {
    return 50000;
  }
};

export const saveIncome = (income) => {
  try {
    localStorage.setItem(INCOME_KEY, income.toString());
  } catch (error) {
    console.error("Failed to save income:", error);
  }
};
