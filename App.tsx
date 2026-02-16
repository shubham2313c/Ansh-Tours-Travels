
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, PlusCircle, FileSpreadsheet, Settings, Car, X, Check, Pencil, Trash2 } from 'lucide-react';
import { AppState, DailyLog, FuelLog, ExpenseLog, Vehicle } from './types';
import { loadState, saveState } from './services/dataService';
import Dashboard from './components/Dashboard';
import EntryForm from './components/EntryForm';
import Reports from './components/Reports';

const LOGO_URL = "https://res.cloudinary.com/do0t3gaf2/image/upload/v1770113124/shifter-512x512_zjgt8c.png";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'add' | 'reports' | 'fleet'>('dashboard');
  const [state, setState] = useState<AppState>(loadState());
  const [showModal, setShowModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
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

  const addDailyLog = (log: DailyLog) => {
    setState(prev => ({
      ...prev,
      dailyLogs: [log, ...prev.dailyLogs],
      vehicles: prev.vehicles.map(v => v.id === log.vehicleId ? { ...v, currentKm: log.closingKm } : v)
    }));
  };

  const addFuelLog = (log: FuelLog) => {
    setState(prev => ({
      ...prev,
      fuelLogs: [log, ...prev.fuelLogs]
    }));
  };

  const addExpenseLog = (log: ExpenseLog) => {
    setState(prev => ({
      ...prev,
      expenseLogs: [log, ...prev.expenseLogs]
    }));
  };

  const openAddModal = () => {
    setEditingVehicleId(null);
    setVehicleForm({ 
      name: '', 
      number: '', 
      currentKm: 0, 
      insuranceExpiry: new Date().toISOString().split('T')[0], 
      permitExpiry: new Date().toISOString().split('T')[0] 
    });
    setShowModal(true);
  };

  const openEditModal = (v: Vehicle) => {
    setEditingVehicleId(v.id);
    setVehicleForm({
      name: v.name,
      number: v.number,
      currentKm: v.currentKm,
      insuranceExpiry: v.insuranceExpiry,
      permitExpiry: v.permitExpiry
    });
    setShowModal(true);
  };

  const handleVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.name || !vehicleForm.number) return;

    if (editingVehicleId) {
      // Update existing
      setState(prev => ({
        ...prev,
        vehicles: prev.vehicles.map(v => v.id === editingVehicleId ? { ...v, ...vehicleForm } : v)
      }));
    } else {
      // Create new
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

  const deleteVehicle = (id: string) => {
    if (window.confirm("Are you sure you want to remove this vehicle? Historical logs will remain but the vehicle will no longer be available for new entries.")) {
      setState(prev => ({
        ...prev,
        vehicles: prev.vehicles.filter(v => v.id !== id)
      }));
    }
  };

  const NavItem = ({ id, icon: Icon, label }: { id: typeof activeTab | 'settings', icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id === 'settings' ? 'dashboard' : id)}
      className={`flex flex-col items-center gap-1 flex-1 transition-colors duration-200 ${
        activeTab === id ? 'text-indigo-600' : 'text-slate-400'
      }`}
    >
      <Icon size={24} className={activeTab === id ? 'scale-110' : ''} />
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center border-2 border-indigo-50 shadow-md overflow-hidden">
            <img src={LOGO_URL} alt="Ansh Tours Logo" className="w-full h-full object-cover scale-105" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">ANSH TOURS</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Fleet Management</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
          <Settings size={20} />
        </div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto">
        {activeTab === 'dashboard' && <Dashboard state={state} />}
        {activeTab === 'add' && (
          <EntryForm 
            vehicles={state.vehicles} 
            onAddDaily={addDailyLog} 
            onAddFuel={addFuelLog} 
            onAddExpense={addExpenseLog} 
          />
        )}
        {activeTab === 'reports' && <Reports state={state} />}
        {activeTab === 'fleet' && (
           <div className="space-y-4 pb-24">
              <div className="flex justify-between items-center mb-2 px-2">
                <h2 className="text-lg font-bold text-slate-800">Your Fleet ({state.vehicles.length})</h2>
              </div>
              
              {state.vehicles.map(v => (
                <div key={v.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <Car size={28} />
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-slate-800 uppercase text-sm tracking-tight">{v.name}</div>
                    <div className="text-xs font-bold text-slate-400 tracking-widest">{v.number}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase">Ins: {v.insuranceExpiry}</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase">Per: {v.permitExpiry}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div className="text-sm font-black text-indigo-600 leading-none">{v.currentKm.toLocaleString()}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">KM</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openEditModal(v)}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors border border-slate-100"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={() => deleteVehicle(v.id)}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors border border-slate-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button 
                onClick={openAddModal}
                className="w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 font-bold text-sm flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors bg-white/50"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <PlusCircle size={20} />
                </div>
                Register New Vehicle
              </button>
           </div>
        )}
      </main>

      {/* Vehicle Modal (Add/Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                {editingVehicleId ? 'Edit Vehicle' : 'Add Vehicle'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleVehicleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Vehicle Name / Model</label>
                <input 
                  autoFocus
                  placeholder="e.g. Maruti Dzire White"
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                  value={vehicleForm.name}
                  onChange={e => setVehicleForm({...vehicleForm, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Reg Number (Plate)</label>
                <input 
                  placeholder="MH05GDXXXX"
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 font-bold uppercase tracking-widest"
                  value={vehicleForm.number}
                  onChange={e => setVehicleForm({...vehicleForm, number: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Insurance Expiry</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                    value={vehicleForm.insuranceExpiry}
                    onChange={e => setVehicleForm({...vehicleForm, insuranceExpiry: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Permit Expiry</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
                    value={vehicleForm.permitExpiry}
                    onChange={e => setVehicleForm({...vehicleForm, permitExpiry: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Odometer Reading (KM)</label>
                <input 
                  type="number"
                  placeholder="0"
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                  value={vehicleForm.currentKm || ''}
                  onChange={e => setVehicleForm({...vehicleForm, currentKm: parseInt(e.target.value) || 0})}
                  required
                />
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all mt-4">
                <Check size={20} />
                {editingVehicleId ? 'Save Changes' : 'Confirm Registration'}
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center shadow-2xl safe-bottom z-50">
        <NavItem id="dashboard" icon={LayoutDashboard} label="Home" />
        <NavItem id="fleet" icon={Car} label="Fleet" />
        <div className="-mt-12">
          <button 
             onClick={() => setActiveTab('add')}
             className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-200 border-4 border-slate-50 active:scale-90 transition-transform"
          >
            <PlusCircle size={32} />
          </button>
        </div>
        <NavItem id="reports" icon={FileSpreadsheet} label="Reports" />
        <NavItem id="settings" icon={Settings} label="Admin" />
      </nav>
    </div>
  );
};

export default App;
