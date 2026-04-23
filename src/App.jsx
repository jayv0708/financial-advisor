import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import InsightCards from './components/InsightCards';
import InvestmentAdvisor from './components/InvestmentAdvisor';

import { loadExpenses, addExpense, loadIncome, saveIncome, updateExpense, deleteExpense } from './utils/storage';
import { generateInsights } from './utils/finance-engine';
import { initModel } from './ml-model/categorizer';

function App() {
  const [expenses, setExpenses] = useState([]);
  const [insights, setInsights] = useState([]);
  const [modelReady, setModelReady] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState(0);

  useEffect(() => {
    const loadedExpenses = loadExpenses();
    const loadedIncome = loadIncome();

    setExpenses(loadedExpenses);
    setMonthlyIncome(loadedIncome);

    if (loadedExpenses.length > 0) {
      setInsights(generateInsights(loadedExpenses, loadedIncome));
    }

    // Initialize: fetch the Python-exported JSON classifier model
    const setupModel = async () => {
      try {
        await initModel();
        setModelReady(true);
      } catch (err) {
        console.error("Classifier model initialization failed:", err);
        // Even if loading fails, mark ready so form becomes interactive
        setModelReady(true);
      }
    };
    setupModel();
  }, []);

  const handleAddExpense = (newExp) => {
    const updatedExpenses = addExpense(newExp);
    setExpenses(updatedExpenses);
    setInsights(generateInsights(updatedExpenses, monthlyIncome));
  };

  const handleUpdateExpense = (id, updatedData) => {
    const updatedExpenses = updateExpense(id, updatedData);
    setExpenses(updatedExpenses);
    setInsights(generateInsights(updatedExpenses, monthlyIncome));
  };

  const handleDeleteExpense = (id) => {
    const updatedExpenses = deleteExpense(id);
    setExpenses(updatedExpenses);
    setInsights(generateInsights(updatedExpenses, monthlyIncome));
  };

  const handleUpdateIncome = (newIncome) => {
    saveIncome(newIncome);
    setMonthlyIncome(newIncome);
    setInsights(generateInsights(expenses, newIncome));
  };

  return (
    <Layout>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 className="text-3xl font-bold">Financial Overview</h1>
        <p className="text-secondary" style={{ marginTop: '0.25rem' }}>
          Intelligent Finance Advisor · Python ML Pipeline + Browser Inference · ₹ INR
        </p>
      </header>

      <Dashboard
        expenses={expenses}
        monthlyIncome={monthlyIncome}
        onUpdateIncome={handleUpdateIncome}
      />

      <div className="dashboard-grid" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <ExpenseForm onAddExpense={handleAddExpense} modelReady={modelReady} />
          <InsightCards insights={insights} />
        </div>
        <ExpenseList 
           expenses={expenses} 
           onUpdateExpense={handleUpdateExpense} 
           onDeleteExpense={handleDeleteExpense} 
        />
      </div>

      <InvestmentAdvisor expenses={expenses} monthlyIncome={monthlyIncome} />
    </Layout>
  );
}

export default App;
