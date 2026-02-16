
import React, { useState } from 'react';
import { AppState } from '../types';
import { Download, FileText, Share2, Printer, ShieldCheck, Database, Loader2 } from 'lucide-react';
import { exportToExcel } from '../services/excelService';
import { exportRawData } from '../services/dataService';

interface Props {
  state: AppState;
}

const Reports: React.FC<Props> = ({ state }) => {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExport = (period: 'Daily' | 'Monthly') => {
    setIsExporting(period);
    // Add small delay to allow UI to update
    setTimeout(() => {
      try {
        exportToExcel(state, period);
      } catch (e) {
        console.error("Excel Export Error:", e);
        alert("Failed to generate Excel. Please check your data logs.");
      } finally {
        setIsExporting(null);
      }
    }, 500);
  };

  const totalIncome = state.dailyLogs.reduce((s, l) => s + l.income, 0);
  const totalFuel = state.fuelLogs.reduce((s, f) => s + f.cost, 0);
  const totalOther = state.expenseLogs.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalIncome - (totalFuel + totalOther);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-2">
           <ShieldCheck className="text-indigo-600" size={20} />
           <h3 className="text-xl font-bold text-slate-800">Business Reporting</h3>
        </div>
        <p className="text-slate-500 text-sm mb-6">Our professional Excel engine generates multi-sheet reports with automated P&L calculations.</p>
        
        <div className="space-y-4">
          <button 
            onClick={() => handleExport('Daily')}
            disabled={isExporting !== null}
            className="w-full bg-slate-50 hover:bg-slate-100 p-5 rounded-2xl flex items-center justify-between group transition-all border border-slate-200 disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="bg-emerald-100 text-emerald-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                {isExporting === 'Daily' ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24} />}
              </div>
              <div className="text-left">
                <div className="font-bold text-slate-800">Daily Multi-Sheet Excel</div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Performance • Trips • Daily Costs</div>
              </div>
            </div>
            <Download className="text-slate-400" size={20} />
          </button>

          <button 
            onClick={() => handleExport('Monthly')}
            disabled={isExporting !== null}
            className="w-full bg-indigo-600 text-white p-5 rounded-2xl flex items-center justify-between group transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/20 text-white p-3 rounded-xl group-hover:scale-110 transition-transform">
                {isExporting === 'Monthly' ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
              </div>
              <div className="text-left">
                <div className="font-bold">Executive Monthly Report</div>
                <div className="text-[10px] opacity-80 uppercase font-bold tracking-tight">Analytics • Full P&L • Master Ledger</div>
              </div>
            </div>
            <Share2 className="text-white/60" size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
           <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
           Financial Snapshot
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-slate-50">
            <span className="text-slate-500 text-sm">Gross Revenue</span>
            <span className="font-bold text-emerald-600">₹{totalIncome.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-50">
            <span className="text-slate-500 text-sm">Operational Overhead</span>
            <span className="font-bold text-rose-600">₹{(totalFuel + totalOther).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-800 font-bold">Consolidated Net Profit</span>
            <span className={`font-black text-xl ${netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              ₹{netProfit.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex gap-4">
          <button 
            onClick={() => window.print()}
            className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-slate-50 transition-colors"
          >
            <Printer size={18} />
            Print Status
          </button>
          <button 
            onClick={() => exportRawData(state)}
            className="flex-1 bg-white border border-indigo-200 text-indigo-600 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-indigo-50 transition-colors"
          >
            <Database size={18} />
            Safe Backup
          </button>
        </div>
        <button className="w-full bg-slate-900 text-white py-5 rounded-3xl flex items-center justify-center gap-2 font-bold shadow-xl shadow-slate-200 active:scale-95 transition-transform">
          <Share2 size={18} />
          Sync Reports to WhatsApp
        </button>
      </div>
    </div>
  );
};

export default Reports;
