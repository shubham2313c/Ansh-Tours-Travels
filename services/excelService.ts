
import * as XLSX from 'xlsx-js-style';
import { AppState } from '../types';

/**
 * PREMIUM ACCOUNTING STYLING
 */
const STYLES = {
  HEADER: {
    fill: { fgColor: { rgb: "1E293B" } },
    font: { color: { rgb: "FFFFFF" }, bold: true, sz: 10 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "double", color: { rgb: "000000" } }
    }
  },
  DATA: {
    font: { sz: 9 },
    alignment: { vertical: "center", horizontal: "left", wrapText: true },
    border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } }
  },
  NUMERIC: {
    font: { sz: 9 },
    alignment: { vertical: "center", horizontal: "right" },
    border: { bottom: { style: "thin", color: { rgb: "E2E8F0" } } }
  },
  TOTAL_ROW: {
    fill: { fgColor: { rgb: "F1F5F9" } },
    font: { bold: true, sz: 10 },
    border: {
      top: { style: "medium", color: { rgb: "4F46E5" } },
      bottom: { style: "medium", color: { rgb: "4F46E5" } }
    }
  },
  PROFIT: { font: { color: { rgb: "15803D" }, bold: true } },
  LOSS: { font: { color: { rgb: "B91C1C" }, bold: true } },
  TITLE: { font: { bold: true, sz: 14, color: { rgb: "1E293B" } }, alignment: { horizontal: "center" } },
  SUBTITLE: { font: { italic: true, sz: 9, color: { rgb: "64748B" } }, alignment: { horizontal: "center" } }
};

function createStyledSheet(title: string, subtitle: string, data: any[]) {
  if (!data || data.length === 0) return XLSX.utils.json_to_sheet([{ "Note": "No entries recorded for this selection." }]);

  const headers = Object.keys(data[0]);
  const wsData = [
    [title],
    [subtitle],
    [], 
    headers,
    ...data.map(item => Object.values(item))
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }
  ];

  for (let r = 0; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) continue;

      let style: any = { ...STYLES.DATA };

      if (r === 0) style = STYLES.TITLE;
      else if (r === 1) style = STYLES.SUBTITLE;
      else if (r === 3) style = STYLES.HEADER;
      else if (r > 3) {
        const val = ws[cellRef].v;
        const header = headers[c].toLowerCase();

        if (typeof val === 'number' || header.includes('(₹)') || header.includes('km') || header.includes('odo')) {
          style = { ...STYLES.NUMERIC };
        }

        if (header.includes('profit') || header.includes('revenue') || header.includes('income')) {
          if (typeof val === 'number') style = { ...style, ...(val >= 0 ? STYLES.PROFIT : STYLES.LOSS) };
        }

        if (String(ws[XLSX.utils.encode_cell({ r, c: 0 })]?.v || "").toUpperCase().includes("TOTAL")) {
          style = { ...style, ...STYLES.TOTAL_ROW };
        }
      }
      ws[cellRef].s = style;
    }
  }

  ws['!cols'] = headers.map((h, i) => {
    let max = h.length;
    for (let r = 3; r <= range.e.r; r++) {
      const c = ws[XLSX.utils.encode_cell({ r, c: i })];
      if (c && c.v) max = Math.max(max, String(c.v).length);
    }
    return { wch: Math.min(40, max + 3) };
  });

  return ws;
}

export const exportToExcel = (state: AppState, period: 'Daily' | 'Monthly') => {
  const { dailyLogs, fuelLogs, expenseLogs, vehicles } = state;
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const filterDate = (d: string) => period === 'Daily' ? d === dateStr : (new Date(d).getMonth() === now.getMonth() && new Date(d).getFullYear() === now.getFullYear());
  
  const wb = XLSX.utils.book_new();
  const filteredTrips = dailyLogs.filter(l => filterDate(l.date));
  const filteredFuel = fuelLogs.filter(f => filterDate(f.date));
  const filteredExpenses = expenseLogs.filter(e => filterDate(e.date));

  // 1. FLEET SUMMARY SHEET
  const summary = vehicles.map(v => {
    const vLogs = filteredTrips.filter(l => l.vehicleId === v.id);
    const vFuel = filteredFuel.filter(f => f.vehicleId === v.id);
    const vExp = filteredExpenses.filter(e => e.vehicleId === v.id);

    const income = vLogs.reduce((s, l) => s + l.income, 0);
    const costs = vFuel.reduce((s, f) => s + f.cost, 0) + vExp.reduce((s, e) => s + e.amount, 0);
    const startKm = vLogs.length > 0 ? Math.min(...vLogs.map(l => l.openingKm)) : 0;
    const endKm = vLogs.length > 0 ? Math.max(...vLogs.map(l => l.closingKm)) : 0;

    return {
      'Vehicle': v.name,
      'Number': v.number,
      'Opening Odo (KM)': startKm || 'N/A',
      'Closing Odo (KM)': endKm || 'N/A',
      'Net Run (KM)': endKm && startKm ? endKm - startKm : 0,
      'Gross Revenue (₹)': income,
      'Expenses (₹)': costs,
      'Net Profit (₹)': income - costs
    };
  });
  XLSX.utils.book_append_sheet(wb, createStyledSheet(`ANSH TOURS - FLEET SUMMARY`, `${period} Report - ${dateStr}`, summary), 'Summary');

  // 2. DETAILED TRIP LEDGER
  const ledger = filteredTrips.map(l => ({
    'Date': l.date,
    'Vehicle': vehicles.find(v => v.id === l.vehicleId)?.name || '-',
    'Reg No': vehicles.find(v => v.id === l.vehicleId)?.number || '-',
    'Driver': l.driverName,
    'Customer Name': l.customerName || '-',
    'Customer Contact': l.customerContact || '-',
    'Trip/Route': l.routeDetails || '-',
    'Opening KM': l.openingKm,
    'Closing KM': l.closingKm,
    'Running KM': l.totalKm,
    'Amount (₹)': l.income,
    'Payment': l.paymentMode,
    'Status': l.isPaymentPending ? 'PENDING' : 'PAID'
  }));
  XLSX.utils.book_append_sheet(wb, createStyledSheet(`ANSH TOURS - TRIP LEDGER`, `Detailed Entries for ${period}`, ledger), 'Trips');

  // 3. EXPENSE & FUEL LOG
  const expenses = [
    ...filteredFuel.map(f => ({
      'Date': f.date,
      'Type': 'FUEL',
      'Vehicle': vehicles.find(v => v.id === f.vehicleId)?.name || '-',
      'Description': `${f.fuelType} Refill at ${f.stationName || 'Pump'}`,
      'Qty': f.quantity,
      'Amount (₹)': f.cost
    })),
    ...filteredExpenses.map(e => ({
      'Date': e.date,
      'Type': 'EXPENSE',
      'Vehicle': vehicles.find(v => v.id === e.vehicleId)?.name || '-',
      'Description': `${e.category}: ${e.notes || '-'}`,
      'Qty': '-',
      'Amount (₹)': e.amount
    }))
  ].sort((a,b) => b.Date.localeCompare(a.Date));
  XLSX.utils.book_append_sheet(wb, createStyledSheet(`ANSH TOURS - OPERATIONAL COSTS`, `Itemized Expenses for ${period}`, expenses), 'Costs');

  XLSX.writeFile(wb, `Ansh_Tours_${period}_Accounting_${dateStr}.xlsx`);
};
