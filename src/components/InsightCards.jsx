import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const InsightCards = ({ insights }) => {
  if (!insights || insights.length === 0) return null;

  const getIcon = (type) => {
    switch(type) {
      case 'warning': return <AlertTriangle size={20} color="var(--warning)" />;
      case 'alert': return <AlertCircle size={20} color="var(--danger)" />;
      case 'success': return <CheckCircle size={20} color="var(--success)" />;
      case 'info': return <Info size={20} color="var(--info)" />;
      default: return <Info size={20} color="var(--info)" />;
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold" style={{ marginBottom: '1.5rem' }}>Intelligent Insights</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {insights.map((insight, idx) => (
          <div key={idx} className={`insight-card ${insight.type} animate-fade-in`} style={{ animationDelay: `${idx * 0.1}s` }}>
            <div style={{ flexShrink: 0, marginTop: '2px' }}>
              {getIcon(insight.type)}
            </div>
            <p className="text-sm font-medium">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InsightCards;
