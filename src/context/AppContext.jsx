import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { loadExpenses, saveExpenses, addExpense as storageAdd, updateExpense as storageUpdate, deleteExpense as storageDelete, loadIncome, saveIncome, loadUser, saveUser } from '../utils/storage';
import { generateInsights } from '../utils/finance-engine';

const AppContext = createContext(null);

const initialState = {
  user: null,           // { name, income, riskLevel, savingsGoal }
  expenses: [],
  insights: [],
  modelReady: false,
  selectedMonth: new Date().getMonth(),
  selectedYear: new Date().getFullYear(),
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };

    case 'SET_EXPENSES': {
      const insights = generateInsights(action.payload, state.user?.income ?? 0);
      return { ...state, expenses: action.payload, insights };
    }

    case 'ADD_EXPENSE': {
      const newExpenses = [action.payload, ...state.expenses];
      const insights = generateInsights(newExpenses, state.user?.income ?? 0);
      return { ...state, expenses: newExpenses, insights };
    }

    case 'UPDATE_EXPENSE': {
      const updated = state.expenses.map(e =>
        e.id === action.payload.id ? { ...e, ...action.payload.data } : e
      );
      const insights = generateInsights(updated, state.user?.income ?? 0);
      return { ...state, expenses: updated, insights };
    }

    case 'DELETE_EXPENSE': {
      const filtered = state.expenses.filter(e => e.id !== action.payload);
      const insights = generateInsights(filtered, state.user?.income ?? 0);
      return { ...state, expenses: filtered, insights };
    }

    case 'SET_MODEL_READY':
      return { ...state, modelReady: action.payload };

    case 'SET_SELECTED_DATE':
      return { ...state, selectedMonth: action.payload.month, selectedYear: action.payload.year };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load data from localStorage on mount
  useEffect(() => {
    const user = loadUser();
    if (user) {
      dispatch({ type: 'SET_USER', payload: user });
    }
    const expenses = loadExpenses();
    dispatch({ type: 'SET_EXPENSES', payload: expenses });
  }, []);

  // Sync expenses to localStorage whenever they change
  useEffect(() => {
    if (state.expenses.length > 0) {
      saveExpenses(state.expenses);
    }
  }, [state.expenses]);

  // Sync user to localStorage
  useEffect(() => {
    if (state.user) {
      saveUser(state.user);
      saveIncome(state.user.income);
    }
  }, [state.user]);

  const actions = {
    setUser: (user) => dispatch({ type: 'SET_USER', payload: user }),

    addExpense: (expense) => {
      storageAdd(expense);
      dispatch({ type: 'ADD_EXPENSE', payload: expense });
    },

    updateExpense: (id, data) => {
      storageUpdate(id, data);
      dispatch({ type: 'UPDATE_EXPENSE', payload: { id, data } });
    },

    deleteExpense: (id) => {
      storageDelete(id);
      dispatch({ type: 'DELETE_EXPENSE', payload: id });
    },

    setModelReady: (ready) => dispatch({ type: 'SET_MODEL_READY', payload: ready }),

    setSelectedDate: (month, year) => dispatch({ type: 'SET_SELECTED_DATE', payload: { month, year } }),
  };

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
