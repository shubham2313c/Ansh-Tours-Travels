
import { AppState, Vehicle, DailyLog, FuelLog, ExpenseLog } from '../types';

const STORAGE_KEY = 'ansh_tours_data';

const initialVehicles: Vehicle[] = [
  { 
    id: 'v1', 
    name: 'Swift Dzire (White)', 
    number: 'MH05GD3666', 
    currentKm: 12500, 
    insuranceExpiry: '2025-10-12', 
    permitExpiry: '2025-12-01', 
    lastServiceKm: 10000 
  },
  { 
    id: 'v2', 
    name: 'Swift Dzire (Silver)', 
    number: 'MH05GD3665', 
    currentKm: 8900, 
    insuranceExpiry: '2025-09-15', 
    permitExpiry: '2025-11-20', 
    lastServiceKm: 5000 
  },
  { 
    id: 'v3', 
    name: 'Ertiga (Grey)', 
    number: 'MH05GD3974', 
    currentKm: 24300, 
    insuranceExpiry: '2025-08-22', 
    permitExpiry: '2025-08-22', 
    lastServiceKm: 20000 
  },
];

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const loadState = (): AppState => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    return {
      vehicles: initialVehicles,
      dailyLogs: [],
      fuelLogs: [],
      expenseLogs: [],
      googleSyncUrl: ''
    };
  }
  return JSON.parse(data);
};

export const syncToCloud = async (url: string, type: 'trip' | 'fuel' | 'expense', payload: any) => {
  if (!url) return;
  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Apps Script requires no-cors for simple redirects
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload })
    });
    return true;
  } catch (e) {
    console.error("Cloud Sync Error:", e);
    return false;
  }
};

// Added missing exportRawData function to support JSON backup downloads
export const exportRawData = (state: AppState) => {
  const dataStr = JSON.stringify(state, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const exportFileDefaultName = `ansh_tours_backup_${new Date().toISOString().split('T')[0]}.json`;

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};
