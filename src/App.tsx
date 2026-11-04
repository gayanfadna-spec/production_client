import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { FinishedGoods } from './pages/FinishedGoods';
import { RawMaterials } from './pages/RawMaterials';
import { PackingMaterials } from './pages/PackingMaterials';
import { StockTransactions } from './pages/StockTransactions';
import { BOMManagement } from './pages/BOMManagement';
import { BlendBOMPipeline } from './pages/BlendBOMPipeline';
import { ProductionCapacity } from './pages/ProductionCapacity';
import { SalesPlanning } from './pages/SalesPlanning';
import { DailyReports } from './pages/DailyReports';
import { DailyMatrixSheet } from './components/reports/DailyMatrixSheet';
import { Users } from './pages/Users';

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">Initializing Fadna Production Terminal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950/60">
          <div className="max-w-7xl mx-auto pb-12">
            {currentTab === 'dashboard' && <Dashboard onNavigate={setCurrentTab} />}
            {currentTab === 'matrix-sheet' && <DailyMatrixSheet />}
            {currentTab === 'finished-goods' && <FinishedGoods />}
            {currentTab === 'raw-materials' && <RawMaterials />}
            {currentTab === 'packing-materials' && <PackingMaterials />}
            {currentTab === 'transactions' && <StockTransactions />}
            {currentTab === 'pipeline' && <BlendBOMPipeline />}
            {currentTab === 'bom' && <BOMManagement />}
            {currentTab === 'capacity' && <ProductionCapacity />}
            {currentTab === 'sales-planning' && <SalesPlanning />}
            {currentTab === 'reports' && <DailyReports />}
            {currentTab === 'users' && <Users />}
          </div>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
