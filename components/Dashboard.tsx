import React, { useMemo, useEffect, useState } from 'react';
import { AppState } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Fuel, DollarSign, Activity, AlertCircle, Sparkles, TrendingDown, RefreshCw } from 'lucide-react';
import { getSmartInsights } from '../services/geminiService';

interface Props {
  state: AppState;
}

const Dashboard: React.FC<Props> = ({ state }) => {
  const [aiInsights, setAiInsights] = useState<string>('Connecting to Ansh AI...');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = state.dailyLogs.filter(l => l.date === todayStr);
    const todayFuel = state.fuelLogs.filter(f => f.date === todayStr);
    const todayExp = state.expenseLogs.filter(e => e.date === todayStr);

    const kmToday = todayLogs.reduce((s, l) => s + l.totalKm, 0);
    const fuelToday = todayFuel.reduce((s, f) => s + f.cost, 0);
    const incomeToday = todayLogs.reduce((s, l) => s + l.income, 0);
    const expenseToday = todayExp.reduce((s, e) => s + e.amount, 0) + fuelToday;

    return { kmToday, fuelToday, incomeToday, expenseToday };
  }, [state]);

  const alerts = useMemo(() => {
    const activeAlerts = [];
    const todayStr = new Date().toISOString().split('T')[0];
    
    state.vehicles.forEach(v => {
      const vLogs = state.dailyLogs.filter(l => l.vehicleId === v.id && l.date === todayStr);
      const vFuel = state.fuelLogs.filter(f => f.vehicleId === v.id && f.date === todayStr);
      const vExp = state.expenseLogs.filter(e => e.vehicleId === v.id && e.date === todayStr);
      
      const income = vLogs.reduce((s, l) => s + l.income, 0);
      const costs = vFuel.reduce((s, f) => s + f.cost, 0) + vExp.reduce((s, e) => s + e.amount, 0);
      
      if (costs > income && income > 0) {
        activeAlerts.push({
          type: 'loss',
          title: `Daily Loss: ${v.name}`,
          msg: `Costs exceeded income by ₹${costs - income} today.`
        });
      }

      const totalKm = vLogs.reduce((s, l) => s + l.totalKm, 0);
      const fuelQty = vFuel.reduce((s, f) => s + f.quantity, 0);
      const mileage = fuelQty > 0 ? totalKm / fuelQty : 0;
      if (mileage > 0 && mileage < 10) {
        activeAlerts.push({
          type: 'mileage',
          title: `Efficiency Alert: ${v.name}`,
          msg: `Low mileage detected (${mileage.toFixed(1)} Km/Unit). Check fuel quality or tire pressure.`
        });
      }
    });

    return activeAlerts;
  }, [state]);

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const dayLogs = state.dailyLogs.filter(l => l.date === dateStr);
      const dayExp = state.expenseLogs.filter(e => e.date === dateStr);
      const dayFuel = state.fuelLogs.filter(f => f.date === dateStr);

      return {
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        income: dayLogs.reduce((s, l) => s + l.income, 0),
        expense: dayExp.reduce((s, e) => s + e.amount, 0) + dayFuel.reduce((s, f) => s + f.cost, 0),
      };
    });
    return days;
  }, [state]);

  const fetchInsights = async () => {
    setIsAiLoading(true);
    const result = await getSmartInsights(state);
    setAiInsights(result);
    setIsAiLoading(false);
  };

  useEffect(() => {
    fetchInsights();
  }, [state.dailyLogs.length, state.fuelLogs.length]);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Activity size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">KM Run Today</span>
          </div>
          <div className="text-2xl font-black text-slate-800">{stats.kmToday}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <DollarSign size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Today's Income</span>
          </div>
          <div className="text-2xl font-black text-emerald-600">₹{stats.incomeToday}</div>
        </div>
      </div>

      {/* AI Insights Card */}
      <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
          <Sparkles size={100} />
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-200" />
              <h3 className="font-bold text-lg tracking-tight">Ansh AI Manager</h3>
            </div>
            <button 
              onClick={fetchInsights}
              disabled={isAiLoading}
              className={`p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all ${isAiLoading ? 'animate-spin opacity-50' : 'active:scale-90'}`}
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
            {isAiLoading ? (
              <div className="space-y-2">
                <div className="h-3 bg-white/20 rounded w-3/4 animate-pulse"></div>
                <div className="h-3 bg-white/20 rounded w-full animate-pulse"></div>
                <div className="h-3 bg-white/20 rounded w-1/2 animate-pulse"></div>
              </div>
            ) : (
              <div className="text-sm leading-relaxed font-medium">
                {aiInsights.split('\n').map((line, i) => (
                  <p key={i} className="mb-1">{line}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Pulse Chart */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
          <TrendingUp size={18} className="text-indigo-600" />
          Weekly Performance
        </h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} 
              />
              <Tooltip 
                cursor={{fill: '#f8fafc'}}
                contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px'}}
              />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 4, 4]} barSize={12} />
              <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 4, 4]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Expense</span>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 px-2">
            <AlertCircle size={18} className="text-rose-500" />
            Active Fleet Alerts
          </h3>
          {alerts.map((alert, idx) => (
            <div key={idx} className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex gap-4 animate-in slide-in-from-left duration-300">
              <div className="bg-rose-100 text-rose-600 p-2 rounded-xl h-fit">
                {alert.type === 'loss' ? <TrendingDown size={18} /> : <Fuel size={18} />}
              </div>
              <div>
                <div className="font-bold text-rose-900 text-sm">{alert.title}</div>
                <div className="text-xs text-rose-700/80 leading-relaxed mt-0.5">{alert.msg}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;