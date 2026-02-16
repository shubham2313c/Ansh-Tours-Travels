
import { GoogleGenAI, Type } from "@google/genai";
import { AppState } from "../types";

export const getSmartInsights = async (state: AppState): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const summary = {
    dailyIncome: state.dailyLogs.reduce((s, l) => s + l.income, 0),
    totalKm: state.dailyLogs.reduce((s, l) => s + l.totalKm, 0),
    fuelSpend: state.fuelLogs.reduce((s, f) => s + f.cost, 0),
    otherExpenses: state.expenseLogs.reduce((s, e) => s + e.amount, 0),
    vehicleCount: state.vehicles.length,
    activeRuns: state.dailyLogs.length
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: [{ 
        parts: [{ 
          text: `Fleet data for Ansh Tours: ${JSON.stringify(summary)}. Provide a manager-level analysis.` 
        }] 
      }],
      config: {
        systemInstruction: "You are the expert Virtual Fleet Manager for 'Ansh Tours'. Provide 3-4 extremely brief, high-impact bullet points focusing on profit, maintenance, or growth. Use ₹ symbol. Keep it under 60 words.",
      },
    });

    return response.text?.trim() || "Fleet is performing as expected.";
  } catch (error) {
    console.error("Insight Error:", error);
    return "Insights are temporarily unavailable.";
  }
};

export interface ScannedReceipt {
  type: 'fuel' | 'expense';
  date: string;
  amount: number;
  category?: string;
  quantity?: number;
  stationName?: string;
  notes?: string;
}

export const analyzeReceipt = async (base64Image: string): Promise<ScannedReceipt | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: "Analyze this receipt for Ansh Tours & Travels. Determine if it's Fuel (Petrol/CNG) or Expense (Toll, Parking, Maintenance). Extract amount, date, and details precisely." },
            { inlineData: { mimeType: "image/jpeg", data: base64Image } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "Must be 'fuel' or 'expense'" },
            date: { type: Type.STRING, description: "Format YYYY-MM-DD" },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING, description: "Category like 'Fuel', 'Toll', 'Parking', 'Maintenance', 'Wash'" },
            quantity: { type: Type.NUMBER, description: "Quantity in Liters/Kg if fuel" },
            stationName: { type: Type.STRING, description: "Pump/Store name" },
            notes: { type: Type.STRING }
          },
          required: ["type", "date", "amount"]
        }
      }
    });

    return JSON.parse(response.text || "{}") as ScannedReceipt;
  } catch (error) {
    console.error("Receipt Analysis Error:", error);
    return null;
  }
};
