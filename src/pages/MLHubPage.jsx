/**
 * MLHubPage.jsx — ML Pipeline Hub
 * =================================
 * Combines StockPredictor, PortfolioRisk, and ModelHealthDashboard
 * into a single dedicated ML page.
 */

import React from 'react';
import { Bell } from 'lucide-react';
import Layout from '../components/Layout';
import Profile from '../components/Profile';
import StockPredictor from '../components/StockPredictor';
import PortfolioRisk from '../components/PortfolioRisk';
import ModelHealthDashboard from '../components/ModelHealthDashboard';

export default function MLHubPage() {
  return (
    <Layout>
      <header className="flex-center-between" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="font-serif" style={{ fontSize: '2.75rem', marginBottom: '0.35rem' }}>
            ML Pipeline Hub
          </h1>
          <p className="text-lg text-secondary">
            Live predictions · Portfolio risk · Model health — powered by FastAPI + MLflow
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Bell size={20} color="var(--text-secondary)" style={{ cursor: 'pointer' }} />
          <Profile />
        </div>
      </header>

      {/* Model Health — full width */}
      <section style={{ marginBottom: '2rem' }}>
        <ModelHealthDashboard />
      </section>

      {/* Two-column: predictor + risk */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '1.5rem',
      }}>
        <StockPredictor />
        <PortfolioRisk />
      </section>
    </Layout>
  );
}
