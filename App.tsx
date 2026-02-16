
import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, PlusCircle, FileSpreadsheet, Settings, Car, X, Check, Pencil, Trash2, History, Filter, Search, Cloud, CloudOff, CloudSync, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';
import { AppState, DailyLog, FuelLog, ExpenseLog, Vehicle } from './types';
import { loadState, saveState, syncToCloud } from './services/dataService';
import Dashboard from './components/Dashboard';
import EntryForm from './components/EntryForm';
import Reports from './components/Reports';

const LOGO_URL = "https://res.cloudinary.com/do0t3gaf2/image/upload/v1770113124/shifter-512x512_zjgt8c.png";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'add' | 'reports' | 'fleet' | 'ledger'>('dashboard');
  const [state, setState] = useState<AppState>(loadState());
  const [showModal, setShowModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [vehicleForm, setVehicleForm] = useState({
    name: '',
    number: '',
    currentKm: 0,
    insuranceExpiry: '',
    permitExpiry: ''
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const triggerCloudSync = async (type: 'trip' | 'fuel' | 'expense', id: string, data: any) => {
    if (!state.googleSyncUrl) return;
    setIsSyncing(true);
    let payload;
    if (type === 'trip') {
      const v = state.vehicles.find(veh => veh.id === data.vehicleId);
      payload = [data.date, v?.name || '?', data.driverName, data.customerName, data.customerContact, data.routeDetails, data.openingKm, data.closingKm, data.totalKm, data.income, data.paymentMode, data.isPaymentPending ? 'DUE' : 'PAID'];
    } else if (type === 'fuel') {
      const v = state.vehicles.find(veh => veh.id === data.vehicleId);
      payload = [data.date, v?.name || '?', data.fuelType, data.quantity, data.cost, data.stationName];
    } else {
      const v = state.vehicles.find(veh => veh.id === data.vehicleId);
      payload = [data.date, v?.name || '?', data.category, data.amount, data.notes];
    }
    
    const success = await syncToCloud(state.googleSyncUrl, type, payload);
    if (success) {
      setState(prev => ({
        ...prev,
        dailyLogs: type === 'trip' ? prev.dailyLogs.map(l => l.id === id ? {...l, synced: true} : l) : prev.dailyLogs,
        fuelLogs: type === 'fuel' ? prev.fuelLogs.map(l => l.id === id ? {...l, synced: true} : l) : prev.fuelLogs,
        expenseLogs: type === 'expense' ? prev.expenseLogs.map(l => l.id === id ? {...l, synced: true} : l) : prev.expenseLogs,
      }));
    }
    setIsSyncing(false);
  };

  const syncAllHistorical = async () => {
    if (!state.googleSyncUrl) return alert("Please set your Google Sync URL first.");
    const confirmSync = window.confirm("Push all unsynced data to Google Sheets?");
    if (!confirmSync) return;

    const unsyncedTrips = state.dailyLogs.filter(l => !l.synced);
    const unsyncedFuel = state.fuelLogs.filter(f => !f.synced);
    const unsyncedExpenses = state.expenseLogs.filter(e => !e.synced);

    if (unsyncedTrips.length + unsyncedFuel.length + unsyncedExpenses.length === 0) {
      return alert("Everything is already synced!");
    }

    setIsSyncing(true);
    for (const log of unsyncedTrips) await triggerCloudSync('trip', log.id, log);
    for (const log of unsyncedFuel) await triggerCloudSync('fuel', log.id, log);
    for (const log of unsyncedExpenses) await triggerCloudSync('expense', log.id, log);
    setIsSyncing(false);
    alert("Cloud Sync Complete!");
  };

  const addDailyLog = (log: DailyLog) => {
    const newLog = { ...log, synced: false };
    setState(prev => ({
      ...prev,
      dailyLogs: [newLog, ...prev.dailyLogs],
      vehicles: prev.vehicles.map(v => v.id === log.vehicleId ? { ...v, currentKm: log.closingKm } : v)
    }));
    triggerCloudSync('trip', newLog.id, newLog);
  };

  const addFuelLog = (log: FuelLog) => {
    const newLog = { ...log, synced: false };
    setState(prev => ({
      ...prev,
      fuelLogs: [newLog, ...prev.fuelLogs]
    }));
    triggerCloudSync('fuel', newLog.id, newLog);
  };

  const addExpenseLog = (log: ExpenseLog) => {
    const newLog = { ...log, synced: false };
    setState(prev => ({
      ...prev,
      expenseLogs: [newLog, ...prev.expenseLogs]
    }));
    triggerCloudSync('expense', newLog.id, newLog);
  };

  const deleteEntry = (type: 'trip' | 'fuel' | 'expense', id: string) => {
    if (!window.confirm("Accountant Notice: Delete record? This will NOT delete it from Google Sheets.")) return;
    setState(prev => ({
      ...prev,
      dailyLogs: type === 'trip' ? prev.dailyLogs.filter(l => l.id !== id) : prev.dailyLogs,
      fuelLogs: type === 'fuel' ? prev.fuelLogs.filter(f => f.id !== id) : prev.fuelLogs,
      expenseLogs: type === 'expense' ? prev.expenseLogs.filter(e => e.id !== id) : prev.expenseLogs,
    }));
  };

  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVehicleId) {
      setState(prev => ({
        ...prev,
        vehicles: prev.vehicles.map(v => v.id === editingVehicleId ? { ...v, ...vehicleForm } : v)
      }));
    } else {
      const vehicle: Vehicle = {
        ...vehicleForm,
        id: `v-${Date.now()}`,
        lastServiceKm: vehicleForm.currentKm,
      };
      setState(prev => ({
        ...prev,
        vehicles: [...prev.vehicles, vehicle]
      }));
    }
    setShowModal(false);
  };

  const unsyncedCount = useMemo(() => {
    return state.dailyLogs.filter(l => !l.synced).length +
           state.fuelLogs.filter(f => !f.synced).length +
           state.expenseLogs.filter(e => !e.synced).length;
  }, [state]);

  const NavItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center gap-1 flex-1 transition-all duration-200 ${
        activeTab === id ? 'text-indigo-600 scale-105' : 'text-slate-400 opacity-60'
      }`}
    >
      <Icon size={24} strokeWidth={activeTab === id ? 2.5 : 2} />
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-50 overflow-hidden shadow-inner">
            <img src={LOGO_URL} alt="Ansh Tours" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">ANSH TOURS</h1>
            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Professional Fleet Management</p>
          </div>
        </div>
        <div className="flex gap-2">
           <div 
            title={state.googleSyncUrl ? "Connected to Google Sheets" : "Not Syncing"}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSyncing ? 'bg-amber-100 text-amber-600 animate-pulse' : (state.googleSyncUrl ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-300')}`}
           >
            {state.googleSyncUrl ? <Cloud size={20} /> : <CloudOff size={20} />}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard state={state} />}
        {activeTab === 'add' && <EntryForm vehicles={state.vehicles} onAddDaily={addDailyLog} onAddFuel={addFuelLog} onAddExpense={addExpenseLog} />}
        {activeTab === 'reports' && <Reports state={state} />}
        
        {activeTab === 'ledger' && (
          <div className="space-y-4 pb-24 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 px-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search ledger (Driver, Vehicle, Route)..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border-none rounded-2xl pl-10 pr-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button 
                onClick={syncAllHistorical}
                className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg relative active:scale-90 transition-transform"
                title="Sync All Unsynced Data"
              >
                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
                {unsyncedCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                    {unsyncedCount}
                  </span>
                )}
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Recent Transactions</h3>
              {state.dailyLogs.filter(l => l.driverName.toLowerCase().includes(searchTerm.toLowerCase()) || l.routeDetails?.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 20).map(log => (
                <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group">
                  {log.synced && <div className="absolute top-0 right-0 p-1"><CheckCircle2 size={10} className="text-emerald-500" /></div>}
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase">{log.date} • {state.vehicles.find(v => v.id === log.vehicleId)?.name}</span>
                    <button onClick={() => deleteEntry('trip', log.id)} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-sm leading-tight">{log.driverName} <span className="text-slate-300 font-normal">for</span> {log.customerName || 'General'}</div>
                      <div className="text-xs text-slate-500 mt-1">{log.routeDetails || 'Local Trip'} • {log.totalKm} KM</div>
                      <div className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Odo: {log.openingKm} - {log.closingKm}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-600 text-sm">₹{log.income.toLocaleString()}</div>
                      <div className={`text-[9px] font-black px-1.5 py-0.5 rounded mt-1 inline-block ${log.isPaymentPending ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {log.isPaymentPending ? 'DUE' : 'PAID'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 pt-4">Operational Expenses</h3>
              {[...state.fuelLogs, ...state.expenseLogs].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 15).map((item: any) => (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center relative overflow-hidden">
                  {item.synced && <div className="absolute top-0 right-0 p-1"><CheckCircle2 size={10} className="text-emerald-500" /></div>}
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">{item.date} • {item.fuelType ? 'FUEL' : 'GENERAL'}</div>
                    <div className="text-sm font-bold text-slate-800">{item.stationName || item.category}</div>
                    <div className="text-xs text-slate-500">{state.vehicles.find(v => v.id === item.vehicleId)?.name}</div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <span className="font-black text-rose-500">₹{(item.cost || item.amount).toLocaleString()}</span>
                    <button onClick={() => deleteEntry(item.fuelType ? 'fuel' : 'expense', item.id)} className="text-slate-200 hover:text-rose-500"><X size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'fleet' && (
           <div className="space-y-4 pb-24">
              <div className="bg-indigo-900 rounded-[32px] p-7 text-white shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -top-10 bg-indigo-500/10 w-40 h-40 rounded-full blur-3xl"></div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white/10 p-2 rounded-xl"><CloudSync size={20} className="text-indigo-200" /></div>
                  <h3 className="font-bold tracking-tight">Accountant Cloud Sync</h3>
                </div>
                <p className="text-xs text-indigo-100/70 mb-5 leading-relaxed font-medium">Connect your Google Sheet to maintain a master ledger automatically for audit purposes.</p>
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Apps Script Web App URL</label>
                  <input 
                    type="text" 
                    placeholder="https://script.google.com/macros/s/..."
                    value={state.googleSyncUrl || ''}
                    onChange={(e) => setState({...state, googleSyncUrl: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs text-white placeholder:text-white/20 focus:bg-white/10 focus:border-indigo-400 transition-all"
                  />
                </div>
                <div className="mt-6 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${state.googleSyncUrl ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">{state.googleSyncUrl ? 'Live' : 'Offline'}</span>
                  </div>
                  <a href="https://sheets.new" target="_blank" className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-2 text-white hover:bg-white/20 transition-all">
                    Master Sheet <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              <div className="flex justify-between items-center mt-10 px-2">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Active Fleet ({state.vehicles.length})</h2>
              </div>
              {state.vehicles.map(v => (
                <div key={v.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-3">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-inner"><Car size={26} /></div>
                  <div className="flex-1">
                    <div className="font-black text-slate-800 uppercase text-sm tracking-tight">{v.name}</div>
                    <div className="text-xs font-bold text-slate-400 tracking-widest">{v.number}</div>
                    <div className="flex gap-3 mt-1.5">
                       <span className="text-[9px] font-bold text-indigo-400">INS: {v.insuranceExpiry}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-indigo-600 leading-none">{v.currentKm.toLocaleString()}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">TOTAL KM</div>
                  </div>
                </div>
              ))}
              <button onClick={() => { setEditingVehicleId(null); setVehicleForm({ name: '', number: '', currentKm: 0, insuranceExpiry: '', permitExpiry: '' }); setShowModal(true); }} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[32px] text-slate-400 font-bold text-sm flex flex-col items-center justify-center gap-2 bg-white/50 hover:bg-white hover:border-indigo-200 transition-all">
                <PlusCircle size={24} />
                Register New Asset
              </button>
           </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Asset Entry</h3>
              <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={20} /></button>
            </div>
            <form onSubmit={handleVehicleSubmit} className="space-y-4">
              <input placeholder="Vehicle Model (e.g. Dzire)" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-medium" value={vehicleForm.name} onChange={e => setVehicleForm({...vehicleForm, name: e.target.value})} required />
              <input placeholder="Registration Number (MH05...)" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold uppercase tracking-wider" value={vehicleForm.number} onChange={e => setVehicleForm({...vehicleForm, number: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-[9px] font-bold text-slate-400 uppercase pl-2">Insurance Expiry</label>
                   <input type="date" className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-xs font-bold" value={vehicleForm.insuranceExpiry} onChange={e => setVehicleForm({...vehicleForm, insuranceExpiry: e.target.value})} required />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[9px] font-bold text-slate-400 uppercase pl-2">Permit Expiry</label>
                   <input type="date" className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-xs font-bold" value={vehicleForm.permitExpiry} onChange={e => setVehicleForm({...vehicleForm, permitExpiry: e.target.value})} required />
                 </div>
              </div>
              <input type="number" placeholder="Opening Odometer (KM)" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold" value={vehicleForm.currentKm || ''} onChange={e => setVehicleForm({...vehicleForm, currentKm: parseInt(e.target.value) || 0})} required />
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black shadow-lg shadow-indigo-100 uppercase tracking-widest text-xs active:scale-95 transition-transform">Register Asset</button>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center shadow-2xl safe-bottom z-50">
        <NavItem id="dashboard" icon={LayoutDashboard} label="Home" />
        <NavItem id="fleet" icon={Car} label="Fleet" />
        <div className="-mt-12">
          <button onClick={() => setActiveTab('add')} className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl border-4 border-slate-50 transition-transform active:scale-90"><PlusCircle size={32} /></button>
        </div>
        <NavItem id="reports" icon={FileSpreadsheet} label="Reports" />
        <NavItem id="ledger" icon={History} label="Ledger" />
      </nav>
    </div>
  );
};

export default App;
