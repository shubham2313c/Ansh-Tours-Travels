
import { AppState, Vehicle } from '../types';

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
      expenseLogs: []
    };
  }
  return JSON.parse(data);
};

export const exportRawData = (state: AppState) => {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Ansh_Tours_Backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
};
