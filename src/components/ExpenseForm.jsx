import React, { useState, useEffect } from 'react';
import { predictCategory } from '../ml-model/categorizer';
import { CATEGORIES, CATEGORY_COLORS } from '../utils/constants';
import { PlusCircle, Zap } from 'lucide-react';

const ExpenseForm = ({ onAddExpense, modelReady }) => {
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [predictedCat, setPredictedCat] = useState(null);

  // Real-time ML Prediction hook
  useEffect(() => {
    if (text.trim().length > 2 && modelReady) {
      const timer = setTimeout(async () => {
        const prediction = await predictCategory(text);
        setPredictedCat(prediction);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setPredictedCat(null);
    }
  }, [text, modelReady]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text || !amount) return;

    // Use predicted category if available, otherwise default to Others
    const categoryToUse = predictedCat ? predictedCat.category : 'Others';

    onAddExpense({
      id: Date.now().toString(),
      text,
      amount: Number(amount),
      category: categoryToUse,
      date: new Date().toISOString()
    });

    setText('');
    setAmount('');
    setPredictedCat(null);
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold" style={{ marginBottom: '1.5rem' }}>Add Transaction</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">What did you spend on?</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="e.g. Swiggy lunch, Uber trip..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </div>

        {/* Real-time ML Prediction Display */}
        {modelReady && predictedCat && text.length > 2 && (
          <div className="animate-fade-in" style={{
            background: 'rgba(155, 89, 182, 0.1)',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            border: '1px solid rgba(155, 89, 182, 0.3)'
          }}>
            <Zap size={18} color="var(--accent-primary)" />
            <div style={{ flex: 1 }}>
              <p className="text-sm">
                AI Prediction: <strong style={{ color: CATEGORY_COLORS[predictedCat.category] }}>{predictedCat.category}</strong>
              </p>
              <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '6px' }}>
                <div style={{ 
                  height: '100%', 
                  background: 'var(--accent-primary)', 
                  width: `${predictedCat.confidence}%`,
                  borderRadius: '2px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <p className="text-xs text-secondary" style={{ marginTop: '4px' }}>
                {predictedCat.confidence}% Confidence
              </p>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Amount (₹)</label>
          <input 
            type="number" 
            className="input-field" 
            placeholder="0.00"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={!modelReady}>
          <PlusCircle size={20} />
          {modelReady ? 'Add Expense' : 'Loading ML Model...'}
        </button>
      </form>
    </div>
  );
};

export default ExpenseForm;
