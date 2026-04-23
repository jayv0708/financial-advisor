import React, { useState } from 'react';
import { format } from 'date-fns';
import { CATEGORY_COLORS, CATEGORIES, formatINR } from '../utils/constants';
import { Pencil, Trash2, X, Check } from 'lucide-react';

const ExpenseList = ({ expenses, onUpdateExpense, onDeleteExpense }) => {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ text: '', amount: '', date: '', category: '' });

  const handleEditClick = (exp) => {
    setEditingId(exp.id);
    setEditForm({ 
        text: exp.text, 
        amount: exp.amount, 
        date: exp.date.split('T')[0], 
        category: exp.category 
    });
  };

  const handleCancelClick = () => {
     setEditingId(null);
  };

  const handleSaveClick = (id) => {
    if (!editForm.text || !editForm.amount || !editForm.date) return;
    onUpdateExpense(id, {
        text: editForm.text,
        amount: Number(editForm.amount),
        date: editForm.date,
        category: editForm.category
    });
    setEditingId(null);
  };

  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <h3 className="text-lg font-semibold" style={{ marginBottom: '1.5rem' }}>Transactions</h3>
      
      {expenses.length === 0 ? (
        <p className="text-secondary text-sm">No expenses recorded yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {expenses.map((exp) => (
            <div key={exp.id} className="expense-item" style={{ alignItems: 'center' }}>
              
              {editingId === exp.id ? (
                 <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'center' }}>
                     <input className="input-field" style={{ flex: 2 }} value={editForm.text} onChange={(e) => setEditForm({...editForm, text: e.target.value})} placeholder="Title" />
                     <input className="input-field" style={{ flex: 1 }} type="number" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: e.target.value})} placeholder="Amount" />
                     <input className="input-field" style={{ flex: 1 }} type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} />
                     <select className="input-field" style={{ flex: 1.5 }} value={editForm.category} onChange={(e) => setEditForm({...editForm, category: e.target.value})}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                     <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                       <button onClick={() => handleSaveClick(exp.id)} style={{ color: 'var(--success)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem' }}><Check size={20}/></button>
                       <button onClick={handleCancelClick} style={{ color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem' }}><X size={20}/></button>
                     </div>
                 </div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <p className="font-medium text-base">{exp.text}</p>
                    <p className="text-xs text-secondary">{format(new Date(exp.date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span 
                      className="category-badge" 
                      style={{ 
                        backgroundColor: `${CATEGORY_COLORS[exp.category] || '#999'}20`, 
                        color: CATEGORY_COLORS[exp.category] || '#999',
                        border: `1px solid ${CATEGORY_COLORS[exp.category] || '#999'}40`
                      }}
                    >
                      {exp.category}
                    </span>
                    <span className="font-bold text-lg">{formatINR(exp.amount)}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', opacity: '0.6' }}>
                       <button onClick={() => handleEditClick(exp)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: '0.25rem' }}><Pencil size={18}/></button>
                       <button onClick={() => onDeleteExpense(exp.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.25rem' }}><Trash2 size={18}/></button>
                    </div>
                  </div>
                </>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
