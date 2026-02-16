
import React, { useState, useRef } from 'react';
import { AppState, TripType, PaymentMode, FuelType, ExpenseCategory, Vehicle } from '../types';
import { Check, Fuel, Receipt, Navigation, MapPin, User, Phone, AlertTriangle, Camera, Loader2, Sparkles } from 'lucide-react';
import { analyzeReceipt } from '../services/geminiService';

interface Props {
  vehicles: Vehicle[];
  onAddDaily: (log: any) => void;
  onAddFuel: (log: any) => void;
  onAddExpense: (log: any) => void;
}

const EntryForm: React.FC<Props> = ({ vehicles, onAddDaily, onAddFuel, onAddExpense }) => {
  const [tab, setTab] = useState<'daily' | 'fuel' | 'expense'>('daily');
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<any>({
    date: new Date().toISOString().split('T')[0],
    vehicleId: vehicles[0]?.id || '',
    driverName: '',
    openingKm: 0,
    closingKm: 0,
    tripType: TripType.LOCAL,
    customerName: '',
    customerContact: '',
    routeDetails: '',
    income: 0,
    paymentMode: PaymentMode.CASH,
    fuelType: FuelType.CNG,
    quantity: 0,
    cost: 0,
    category: ExpenseCategory.DRIVER_BATA,
    amount: 0,
    notes: '',
    stationName: ''
  });

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tab === 'daily') {
      if (formData.closingKm < formData.openingKm) {
        setError("Closing KM cannot be less than Opening KM");
        return;
      }
      const id = Math.random().toString(36).substr(2, 9);
      onAddDaily({
        ...formData,
        id,
        totalKm: formData.closingKm - formData.openingKm,
        isPaymentPending: formData.paymentMode === PaymentMode.CREDIT
      });
    } else if (tab === 'fuel') {
      const id = Math.random().toString(36).substr(2, 9);
      onAddFuel({ ...formData, id });
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      onAddExpense({ ...formData, id });
    }

    alert(`${tab.toUpperCase()} recorded successfully!`);
    setFormData({ 
      ...formData, 
      driverName: '', income: 0, amount: 0, notes: '', quantity: 0, cost: 0, 
      customerName: '', customerContact: '', routeDetails: '', stationName: '' 
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const result = await analyzeReceipt(base64);
      
      if (result) {
        setTab(result.type === 'fuel' ? 'fuel' : 'expense');
        setFormData(prev => ({
          ...prev,
          date: result.date || prev.date,
          amount: result.amount || 0,
          cost: result.amount || 0,
          quantity: result.quantity || 0,
          stationName: result.stationName || '',
          notes: result.notes || '',
          category: result.category ? (Object.values(ExpenseCategory).find(c => c.toLowerCase().includes(result.category!.toLowerCase())) || ExpenseCategory.OTHER) : ExpenseCategory.OTHER
        }));
      } else {
        setError("AI could not read the receipt clearly. Please try again or enter manually.");
      }
      setIsScanning(false);
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const TabButton = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
    <button
      onClick={() => { setTab(id); setError(null); }}
      className={`flex-1 flex flex-col items-center py-4 rounded-xl transition-all duration-200 ${
        tab === id 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105 z-10' 
        : 'bg-white text-slate-400 hover:bg-slate-50 border border-transparent'
      }`}
    >
      <Icon size={20} className="mb-1" />
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );

  return (
    <div className="pb-24 relative">
      {isScanning && (
        <div className="fixed inset-0 z-[70] bg-indigo-900/40 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-white/20 rounded-3xl animate-pulse"></div>
            <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" size={40} />
            <div className="absolute inset-0 bg-white/20 animate-scan pointer-events-none"></div>
          </div>
          <div className="mt-8 flex items-center gap-2 px-6 py-2 bg-indigo-600 rounded-full font-bold shadow-xl">
             <Sparkles size={18} />
             <span>Ansh AI Reading Receipt...</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4 p-1 bg-white rounded-2xl shadow-sm border border-slate-100">
        <TabButton id="daily" icon={Navigation} label="Daily Run" />
        <TabButton id="fuel" icon={Fuel} label="Fuel Log" />
        <TabButton id="expense" icon={Receipt} label="Expense" />
      </div>

      {(tab === 'fuel' || tab === 'expense') && (
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full mb-4 py-4 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-600 font-bold flex items-center justify-center gap-3 hover:bg-indigo-100 transition-colors"
        >
          <Camera size={20} />
          <span>Smart Scan Receipt</span>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
        </button>
      )}

      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
          <AlertTriangle size={20} />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-1">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date</label>
            <input 
              type="date" name="date" value={formData.date} onChange={handleChange} required
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Select Car</label>
            <select 
              name="vehicleId" value={formData.vehicleId} onChange={handleChange} required
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} - {v.number}</option>)}
            </select>
          </div>
        </div>

        {tab === 'daily' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Opening KM</label>
                <input 
                  type="number" name="openingKm" value={formData.openingKm} onChange={handleChange} required
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Closing KM</label>
                <input 
                  type="number" name="closingKm" value={formData.closingKm} onChange={handleChange} required
                  className={`w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm ${formData.closingKm < formData.openingKm ? 'text-rose-500 font-bold' : ''}`}
                />
              </div>
            </div>

            <div className="p-4 bg-indigo-50 rounded-2xl flex justify-between items-center border border-indigo-100">
              <span className="text-xs font-bold text-indigo-600 uppercase">Total KM Today</span>
              <span className="text-xl font-black text-indigo-700">{formData.closingKm - formData.openingKm} KM</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Driver Name</label>
                <input 
                  type="text" name="driverName" value={formData.driverName} onChange={handleChange} placeholder="Name" required
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Trip Type</label>
                <select name="tripType" value={formData.tripType} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm">
                  {Object.values(TripType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" name="routeDetails" value={formData.routeDetails} onChange={handleChange} placeholder="Trip Route (e.g. Pune - Mumbai)"
                  className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" name="customerName" value={formData.customerName} onChange={handleChange} placeholder="Customer Name"
                    className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" name="customerContact" value={formData.customerContact} onChange={handleChange} placeholder="Contact No"
                    className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 text-emerald-600">Trip Income (₹)</label>
                <input 
                  type="number" name="income" value={formData.income} onChange={handleChange}
                  className="w-full bg-emerald-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-emerald-700"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Payment</label>
                <select name="paymentMode" value={formData.paymentMode} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm">
                   {Object.values(PaymentMode).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </>
        )}

        {tab === 'fuel' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fuel Type</label>
                <select name="fuelType" value={formData.fuelType} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm">
                  {Object.values(FuelType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Qty (L/Kg)</label>
                <input type="number" step="0.01" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cost (₹)</label>
              <input type="number" name="cost" value={formData.cost} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-orange-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Station</label>
              <input type="text" name="stationName" value={formData.stationName} onChange={handleChange} placeholder="Fuel pump name" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm" />
            </div>
          </>
        )}

        {tab === 'expense' && (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Category</label>
              <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm">
                {Object.values(ExpenseCategory).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Amount (₹)</label>
              <input type="number" name="amount" value={formData.amount} onChange={handleChange} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-rose-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} placeholder="Add details..." className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm"></textarea>
            </div>
          </>
        )}

        <button 
          type="submit" 
          disabled={tab === 'daily' && formData.closingKm < formData.openingKm}
          className={`w-full font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all ${
            tab === 'daily' && formData.closingKm < formData.openingKm 
            ? 'bg-slate-300 cursor-not-allowed' 
            : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
          }`}
        >
          <Check size={20} />
          Complete Entry
        </button>
      </form>
    </div>
  );
};

export default EntryForm;
