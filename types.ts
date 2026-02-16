
export enum TripType {
  LOCAL = 'Local',
  OUTSTATION = 'Outstation',
  AIRPORT = 'Airport Transfer',
  PERSONAL = 'Personal Use'
}

export enum FuelType {
  CNG = 'CNG',
  PETROL = 'Petrol'
}

export enum PaymentMode {
  CASH = 'Cash',
  UPI = 'UPI',
  BANK_TRANSFER = 'Bank Transfer',
  CREDIT = 'Credit'
}

export enum ExpenseCategory {
  DRIVER_SALARY = 'Driver Salary',
  DRIVER_BATA = 'Driver Bata',
  TOLL = 'Toll',
  PARKING = 'Parking',
  WASH = 'Car Wash',
  MAINTENANCE = 'Maintenance',
  SERVICE = 'Service Cost',
  INSURANCE = 'Insurance',
  EMI = 'EMI',
  PERMIT = 'Permit/Tax',
  OTHER = 'Unexpected'
}

export interface Vehicle {
  id: string;
  name: string;
  number: string;
  currentKm: number;
  insuranceExpiry: string;
  permitExpiry: string;
  lastServiceKm: number;
}

export interface DailyLog {
  id: string;
  date: string;
  vehicleId: string;
  driverName: string;
  openingKm: number;
  closingKm: number;
  totalKm: number;
  tripType: TripType;
  customerName: string;
  customerContact: string;
  routeDetails: string;
  income: number;
  paymentMode: PaymentMode;
  isPaymentPending: boolean;
  synced?: boolean;
}

export interface FuelLog {
  id: string;
  date: string;
  vehicleId: string;
  fuelType: FuelType;
  quantity: number;
  cost: number;
  stationName: string;
  synced?: boolean;
}

export interface ExpenseLog {
  id: string;
  date: string;
  vehicleId: string;
  category: ExpenseCategory;
  amount: number;
  notes: string;
  synced?: boolean;
}

export interface AppState {
  vehicles: Vehicle[];
  dailyLogs: DailyLog[];
  fuelLogs: FuelLog[];
  expenseLogs: ExpenseLog[];
  googleSyncUrl?: string;
}
