
import XLSX from 'xlsx';
import { AppState } from '../types';

/**
 * PREMIUM STYLING CONFIGURATION
 */
const STYLES = {
  HEADER: {
    fill: { fgColor: { rgb: "334155" } }, // Slate 700
    font: { color: { rgb: "FFFFFF" }, bold: true, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  },
  DATA: {
    font: { sz: 11 },
    alignment: { vertical: "center", horizontal: "left" },
    border: {
      bottom: { style: "thin", color: { rgb: "F1F5F9" } }
    }
  },
  TOTAL_ROW: {
    fill: { fgColor: { rgb: "F1F5F9" } },
    font: { bold: true, sz: 11 },
    border: {
      top: { style: "medium", color: { rgb: "4F46E5" } }
    }
  },
  PROFIT: { font: { color: { rgb: "166534" }, bold: true } },
  LOSS: { font: { color: { rgb: "991B1B" }, bold: true } },
  TITLE: { font: { bold: true, sz: 16, color: { rgb: "1E293B" } }, alignment: { horizontal: "center" } }
};

function createStyledSheet(title: string, subtitle: string, data: any[]) {
  if (!data || data.length === 0) {
    const ws = XLSX.utils.json_to_sheet([{ "System Message": "No records found for this period." }]);
    ws['!cols'] = [{ wch: 40 }];
    return ws;
  }

  const headers = Object.keys(data[0]);
  const wsData = [
    [title],
    [subtitle],
    [], // Spacer
    headers,
    ...data.map(item => Object.values(item))
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  // Merging Title and Subtitle rows
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }
  ];

  // Apply Styles to all cells
  for (let r = 0; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) continue;

      let style: any = { ...STYLES.DATA };

      if (r === 0) style = STYLES.TITLE;
      else if (r === 1) style = { font: { italic: true, sz: 10, color: { rgb: "64748B" } }, alignment: { horizontal: "center" } };
      else if (r === 3) style = STYLES.HEADER;
      else if (r > 3) {
        const headerName = headers[c].toLowerCase();
        const val = ws[cellRef].v;

        // Money/Profit Highlighting
        if (headerName.includes('profit') || headerName.includes('net') || headerName.includes('revenue')) {
          if (typeof val === 'number') {
            style = { ...style, ...(val >= 0 ? STYLES.PROFIT : STYLES.LOSS), alignment: { horizontal: "right" } };
          }
        }
        
        // Check for summary/total row
        const firstColVal = ws[XLSX.utils.encode_cell({ r, c: 0 })]?.v?.toString().toUpperCase() || "";
        if (firstColVal.includes("TOTAL") || firstColVal.includes("SUMMARY")) {
          style = { ...style, ...STYLES.TOTAL_ROW };
        }
      }

      ws[cellRef].s = style;
    }
  }

  // Width calculation
  ws['!cols'] = headers.map((h, i) => {
    let maxLen = h.toString().length;
    for (let r = 4; r <= Math.min(range.e.r, 100); r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: i })];
      if (cell && cell.v) {
        const len = cell.v.toString().length;
        if (len > maxLen) maxLen = len;
      }
    }
    return { wch: Math.min(50, maxLen + 5) };
  });

  return ws;
}

export const exportToExcel = (state: AppState, period: 'Daily' | 'Monthly') => {
  const { dailyLogs, fuelLogs, expenseLogs, vehicles } = state;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  
  const wb = XLSX.utils.book_new();

  if (period === 'Daily') {
    const summaryData = vehicles.map(v => {
      const vLogs = dailyLogs.filter(l => l.vehicleId === v.id && l.date === todayStr);
      const vFuel = fuelLogs.filter(f => f.vehicleId === v.id && f.date === todayStr);
      const vExp = expenseLogs.filter(e => e.vehicleId === v.id && e.date === todayStr);

      const income = vLogs.reduce((s, l) => s + l.income, 0);
      const costs = vFuel.reduce((s, f) => s + f.cost, 0) + vExp.reduce((s, e) => s + e.amount, 0);

      return {
        'Vehicle': v.name,
        'Plate No': v.number,
        'KM Run Today': vLogs.reduce((s, l) => s + l.totalKm, 0),
        'Revenue (₹)': income,
        'Operational Cost (₹)': costs,
        'Net Profit (₹)': income - costs
      };
    });
    XLSX.utils.book_append_sheet(wb, createStyledSheet("ANSH TOURS: DAILY FLEET PERFORMANCE", `Summary for ${todayStr}`, summaryData), 'Daily Summary');

    const tripData = dailyLogs.filter(l => l.date === todayStr).map(l => ({
      'Date': l.date,
      'Vehicle': vehicles.find(v => v.id === l.vehicleId)?.name || '-',
      'Driver': l.driverName,
      'Customer': l.customerName || 'Local',
      'Route': l.routeDetails || '-',
      'Income (₹)': l.income,
      'Payment': l.paymentMode,
      'Status': l.isPaymentPending ? 'PENDING' : 'PAID'
    }));
    XLSX.utils.book_append_sheet(wb, createStyledSheet("ANSH TOURS: TRIP REGISTER", `Detailed Bookings for ${todayStr}`, tripData), 'Trip Details');

    const costData = [
      ...fuelLogs.filter(f => f.date === todayStr).map(f => ({
        'Type': 'FUEL',
        'Vehicle': vehicles.find(v => v.id === f.vehicleId)?.name || '-',
        'Details': `${f.fuelType} refill at ${f.stationName || 'Pump'}`,
        'Amount (₹)': f.cost
      })),
      ...expenseLogs.filter(e => e.date === todayStr).map(e => ({
        'Type': 'EXPENSE',
        'Vehicle': vehicles.find(v => v.id === e.vehicleId)?.name || '-',
        'Details': `${e.category}: ${e.notes || '-'}`,
        'Amount (₹)': e.amount
      }))
    ];
    XLSX.utils.book_append_sheet(wb, createStyledSheet("ANSH TOURS: DAILY EXPENDITURE", `Itemized Costs for ${todayStr}`, costData), 'Costs & Fuel');

  } else {
    const month = now.getMonth();
    const year = now.getFullYear();
    const isCurrentMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getMonth() === month && d.getFullYear() === year;
    };

    const mPerf = vehicles.map(v => {
      const vLogs = dailyLogs.filter(l => l.vehicleId === v.id && isCurrentMonth(l.date));
      const vFuel = fuelLogs.filter(f => f.vehicleId === v.id && isCurrentMonth(f.date));
      const vExp = expenseLogs.filter(e => e.vehicleId === v.id && isCurrentMonth(e.date));
      
      const income = vLogs.reduce((s, l) => s + l.income, 0);
      const fuelCost = vFuel.reduce((s, f) => s + f.cost, 0);
      const expCost = vExp.reduce((s, e) => s + e.amount, 0);

      return {
        'Vehicle': v.name,
        'Plate No': v.number,
        'Total KM': vLogs.reduce((s, l) => s + l.totalKm, 0),
        'Revenue (₹)': income,
        'Fuel Cost (₹)': fuelCost,
        'Maintenance (₹)': expCost,
        'Total Profit (₹)': income - (fuelCost + expCost)
      };
    });
    XLSX.utils.book_append_sheet(wb, createStyledSheet("MONTHLY FLEET PERFORMANCE", `Consolidated Analytics for ${monthName}`, mPerf), 'Fleet Performance');

    const mLogs = dailyLogs.filter(l => isCurrentMonth(l.date));
    const mFuels = fuelLogs.filter(f => isCurrentMonth(f.date));
    const mExps = expenseLogs.filter(e => isCurrentMonth(e.date));

    const totalRev = mLogs.reduce((s, l) => s + l.income, 0);
    const totalFuel = mFuels.reduce((s, f) => s + f.cost, 0);
    const totalExp = mExps.reduce((s, e) => s + e.amount, 0);
    
    const financialSummary = [
      { 'Metrics': 'GROSS REVENUE', 'Total (₹)': totalRev },
      { 'Metrics': 'TOTAL FUEL COST', 'Total (₹)': totalFuel },
      { 'Metrics': 'TOTAL MAINTENANCE', 'Total (₹)': totalExp },
      { 'Metrics': '------------------', 'Total (₹)': '---' },
      { 'Metrics': 'NET MONTHLY PROFIT', 'Total (₹)': totalRev - (totalFuel + totalExp) }
    ];
    XLSX.utils.book_append_sheet(wb, createStyledSheet("EXECUTIVE FINANCIAL SUMMARY", `P&L Overview for ${monthName}`, financialSummary), 'P&L Summary');

    const masterTrips = mLogs.sort((a,b) => a.date.localeCompare(b.date)).map(l => ({
      'Date': l.date,
      'Vehicle': vehicles.find(v => v.id === l.vehicleId)?.name || '-',
      'Driver': l.driverName,
      'Customer': l.customerName,
      'Route': l.routeDetails,
      'Income (₹)': l.income,
      'Payment': l.paymentMode
    }));
    XLSX.utils.book_append_sheet(wb, createStyledSheet("MONTHLY TRIP LEDGER", `Master Record for ${monthName}`, masterTrips), 'Monthly Trips');
  }

  XLSX.writeFile(wb, `Ansh_Tours_${period}_Report_${todayStr}.xlsx`);
};
