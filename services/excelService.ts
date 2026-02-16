
import * as XLSX from 'xlsx-js-style';
import { AppState } from '../types';

/**
 * PREMIUM STYLING CONFIGURATION
 * Designed for a high-end corporate look (Slate/Indigo palette)
 */
const STYLES = {
  HEADER: {
    fill: { fgColor: { rgb: "334155" } }, // Slate 700
    font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11 },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  },
  DATA: {
    font: { sz: 10 },
    alignment: { vertical: "center", horizontal: "left", wrapText: true },
    border: {
      bottom: { style: "thin", color: { rgb: "F1F5F9" } }
    }
  },
  MONEY: {
    font: { sz: 10 },
    alignment: { vertical: "center", horizontal: "right" },
    border: {
      bottom: { style: "thin", color: { rgb: "F1F5F9" } }
    }
  },
  TOTAL_ROW: {
    fill: { fgColor: { rgb: "F1F5F9" } },
    font: { bold: true, sz: 10, color: { rgb: "1E293B" } },
    border: {
      top: { style: "medium", color: { rgb: "4F46E5" } },
      bottom: { style: "medium", color: { rgb: "4F46E5" } }
    }
  },
  PROFIT: { font: { color: { rgb: "166534" }, bold: true } },
  LOSS: { font: { color: { rgb: "991B1B" }, bold: true } },
  TITLE: { font: { bold: true, sz: 16, color: { rgb: "1E293B" } }, alignment: { horizontal: "center" } },
  SUBTITLE: { font: { italic: true, sz: 10, color: { rgb: "64748B" } }, alignment: { horizontal: "center" } }
};

/**
 * Creates a professionally styled worksheet with business-standard formatting
 */
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
      else if (r === 1) style = STYLES.SUBTITLE;
      else if (r === 3) style = STYLES.HEADER;
      else if (r > 3) {
        const headerName = headers[c].toLowerCase();
        const val = ws[cellRef].v;

        // Right-align numbers and money
        if (typeof val === 'number' || headerName.includes('(₹)') || headerName.includes('km')) {
          style = { ...STYLES.MONEY };
        }

        // Color coding for financials
        if (headerName.includes('profit') || headerName.includes('revenue') || headerName.includes('income')) {
          if (typeof val === 'number') {
            style = { ...style, ...(val >= 0 ? STYLES.PROFIT : STYLES.LOSS) };
          }
        }
        
        // Highlight rows that represent totals
        const firstColVal = String(ws[XLSX.utils.encode_cell({ r, c: 0 })]?.v || "").toUpperCase();
        if (firstColVal.includes("TOTAL") || firstColVal.includes("GRAND")) {
          style = { ...style, ...STYLES.TOTAL_ROW };
        }
      }

      ws[cellRef].s = style;
    }
  }

  // Auto-width adjustment logic
  ws['!cols'] = headers.map((h, i) => {
    let maxLen = h.toString().length;
    for (let r = 3; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: i })];
      if (cell && cell.v) {
        const len = cell.v.toString().length;
        if (len > maxLen) maxLen = len;
      }
    }
    return { wch: Math.min(45, maxLen + 4) };
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
    // 1. DAILY FLEET PERFORMANCE (Vehicle Summary)
    const summaryData = vehicles.map(v => {
      const vLogs = dailyLogs.filter(l => l.vehicleId === v.id && l.date === todayStr);
      const vFuel = fuelLogs.filter(f => f.vehicleId === v.id && f.date === todayStr);
      const vExp = expenseLogs.filter(e => e.vehicleId === v.id && e.date === todayStr);

      const income = vLogs.reduce((s, l) => s + l.income, 0);
      const fuelCost = vFuel.reduce((s, f) => s + f.cost, 0);
      const expCost = vExp.reduce((s, e) => s + e.amount, 0);
      
      const opening = vLogs.length > 0 ? Math.min(...vLogs.map(l => l.openingKm)) : 0;
      const closing = vLogs.length > 0 ? Math.max(...vLogs.map(l => l.closingKm)) : 0;

      return {
        'Vehicle Name': v.name,
        'Vehicle Number': v.number,
        'Start Odo (KM)': opening || 'N/A',
        'End Odo (KM)': closing || 'N/A',
        'Net KM Run': opening && closing ? closing - opening : 0,
        'Revenue (₹)': income,
        'Total Costs (₹)': fuelCost + expCost,
        'Net Profit (₹)': income - (fuelCost + expCost)
      };
    });

    // Add Grand Total Row for Summary
    const totalRev = summaryData.reduce((s, i) => s + (typeof i['Revenue (₹)'] === 'number' ? i['Revenue (₹)'] : 0), 0);
    const totalProfit = summaryData.reduce((s, i) => s + (typeof i['Net Profit (₹)'] === 'number' ? i['Net Profit (₹)'] : 0), 0);
    summaryData.push({
      'Vehicle Name': 'GRAND TOTAL',
      'Vehicle Number': '',
      'Start Odo (KM)': '',
      'End Odo (KM)': '',
      'Net KM Run': summaryData.reduce((s, i) => s + (typeof i['Net KM Run'] === 'number' ? i['Net KM Run'] : 0), 0),
      'Revenue (₹)': totalRev,
      'Total Costs (₹)': totalRev - totalProfit,
      'Net Profit (₹)': totalProfit
    });

    XLSX.utils.book_append_sheet(wb, createStyledSheet("ANSH TOURS: DAILY FLEET PERFORMANCE", `Summary for ${todayStr}`, summaryData), 'Fleet Summary');

    // 2. TRIP-WISE LOGS (Detailed Daily Data)
    const tripData = dailyLogs.filter(l => l.date === todayStr).map(l => ({
      'Vehicle': vehicles.find(v => v.id === l.vehicleId)?.name || '-',
      'Plate No': vehicles.find(v => v.id === l.vehicleId)?.number || '-',
      'Driver': l.driverName,
      'Customer': l.customerName || 'General',
      'Route/Purpose': l.routeDetails || '-',
      'Opening KM': l.openingKm,
      'Closing KM': l.closingKm,
      'Total Run (KM)': l.totalKm,
      'Income (₹)': l.income,
      'Payment Mode': l.paymentMode,
      'Status': l.isPaymentPending ? 'PENDING' : 'PAID'
    }));
    XLSX.utils.book_append_sheet(wb, createStyledSheet("ANSH TOURS: DAILY TRIP LEDGER", `Itemized Bookings for ${todayStr}`, tripData), 'Trip Details');

    // 3. EXPENDITURE & FUEL
    const costData = [
      ...fuelLogs.filter(f => f.date === todayStr).map(f => ({
        'Log Type': 'FUEL',
        'Vehicle': vehicles.find(v => v.id === f.vehicleId)?.name || '-',
        'Description': `${f.fuelType} Refill (${f.quantity} units) at ${f.stationName || 'Pump'}`,
        'Amount (₹)': f.cost
      })),
      ...expenseLogs.filter(e => e.date === todayStr).map(e => ({
        'Log Type': 'EXPENSE',
        'Vehicle': vehicles.find(v => v.id === e.vehicleId)?.name || '-',
        'Description': `${e.category}: ${e.notes || '-'}`,
        'Amount (₹)': e.amount
      }))
    ];
    XLSX.utils.book_append_sheet(wb, createStyledSheet("ANSH TOURS: OPERATIONAL COSTS", `Fuel and Maintenance for ${todayStr}`, costData), 'Costs Breakdown');

  } else {
    // MONTHLY REPORTING
    const month = now.getMonth();
    const year = now.getFullYear();
    const isCurrentMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getMonth() === month && d.getFullYear() === year;
    };

    // 1. MONTHLY FLEET PERFORMANCE
    const mPerf = vehicles.map(v => {
      const vLogs = dailyLogs.filter(l => l.vehicleId === v.id && isCurrentMonth(l.date));
      const vFuel = fuelLogs.filter(f => f.vehicleId === v.id && isCurrentMonth(f.date));
      const vExp = expenseLogs.filter(e => e.vehicleId === v.id && isCurrentMonth(e.date));
      
      const income = vLogs.reduce((s, l) => s + l.income, 0);
      const fuelCost = vFuel.reduce((s, f) => s + f.cost, 0);
      const expCost = vExp.reduce((s, e) => s + e.amount, 0);
      
      const startOdo = vLogs.length > 0 ? Math.min(...vLogs.map(l => l.openingKm)) : 0;
      const endOdo = vLogs.length > 0 ? Math.max(...vLogs.map(l => l.closingKm)) : 0;

      return {
        'Vehicle': v.name,
        'Plate No': v.number,
        'Start Odo (KM)': startOdo || '-',
        'End Odo (KM)': endOdo || '-',
        'Total KM Run': endOdo && startOdo ? endOdo - startOdo : 0,
        'Gross Revenue (₹)': income,
        'Fuel Cost (₹)': fuelCost,
        'Maintenance (₹)': expCost,
        'Net Profit (₹)': income - (fuelCost + expCost)
      };
    });

    const mTotalRev = mPerf.reduce((s, i) => s + (typeof i['Gross Revenue (₹)'] === 'number' ? i['Gross Revenue (₹)'] : 0), 0);
    const mTotalProfit = mPerf.reduce((s, i) => s + (typeof i['Net Profit (₹)'] === 'number' ? i['Net Profit (₹)'] : 0), 0);
    mPerf.push({
      'Vehicle': 'MONTHLY TOTAL',
      'Plate No': '',
      'Start Odo (KM)': '',
      'End Odo (KM)': '',
      'Total KM Run': mPerf.reduce((s, i) => s + (typeof i['Total KM Run'] === 'number' ? i['Total KM Run'] : 0), 0),
      'Gross Revenue (₹)': mTotalRev,
      'Fuel Cost (₹)': mPerf.reduce((s, i) => s + (typeof i['Fuel Cost (₹)'] === 'number' ? i['Fuel Cost (₹)'] : 0), 0),
      'Maintenance (₹)': mPerf.reduce((s, i) => s + (typeof i['Maintenance (₹)'] === 'number' ? i['Maintenance (₹)'] : 0), 0),
      'Net Profit (₹)': mTotalProfit
    });

    XLSX.utils.book_append_sheet(wb, createStyledSheet("ANSH TOURS: MONTHLY PERFORMANCE", `Period: ${monthName}`, mPerf), 'Monthly Summary');

    // 2. MONTHLY MASTER TRIP LOG (Detailed)
    const masterTrips = dailyLogs
      .filter(l => isCurrentMonth(l.date))
      .sort((a,b) => a.date.localeCompare(b.date))
      .map(l => ({
        'Date': l.date,
        'Vehicle': vehicles.find(v => v.id === l.vehicleId)?.name || '-',
        'Driver': l.driverName,
        'Route': l.routeDetails,
        'Opening KM': l.openingKm,
        'Closing KM': l.closingKm,
        'KM Run': l.totalKm,
        'Income (₹)': l.income,
        'Payment': l.paymentMode
      }));
    XLSX.utils.book_append_sheet(wb, createStyledSheet("ANSH TOURS: MONTHLY MASTER LEDGER", `All Trips for ${monthName}`, masterTrips), 'Monthly Trips');

    // 3. EXPENSE SUMMARY
    const mFuels = fuelLogs.filter(f => isCurrentMonth(f.date));
    const mExps = expenseLogs.filter(e => isCurrentMonth(e.date));

    const totalFuel = mFuels.reduce((s, f) => s + f.cost, 0);
    const totalExp = mExps.reduce((s, e) => s + e.amount, 0);
    
    const financialSummary = [
      { 'Component': 'GROSS REVENUE', 'Amount (₹)': mTotalRev },
      { 'Component': 'TOTAL FUEL EXPENSE', 'Amount (₹)': totalFuel },
      { 'Component': 'TOTAL MAINTENANCE/BATA', 'Amount (₹)': totalExp },
      { 'Component': '---', 'Amount (₹)': '---' },
      { 'Component': 'MONTHLY NET PROFIT', 'Amount (₹)': mTotalRev - (totalFuel + totalExp) }
    ];
    XLSX.utils.book_append_sheet(wb, createStyledSheet("EXECUTIVE FINANCIAL OVERVIEW", `P&L for ${monthName}`, financialSummary), 'P&L Analysis');
  }

  // Generate the file with a clean name
  XLSX.writeFile(wb, `Ansh_Tours_${period}_Report_${todayStr}.xlsx`);
};
