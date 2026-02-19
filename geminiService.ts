
import { GoogleGenAI, Type } from "@google/genai";
import { Student, AttendanceRecord, AttendanceStatus, PaymentRecord } from "./types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.ITE_API_KEY });

export const evaluateScholarships = async (
  students: Student[],
  attendance: AttendanceRecord[],
  payments: PaymentRecord[],
  monthName: string
) => {
  const stats = students.map(student => {
    const studentRecords = attendance.filter(r => r.studentId === student.id);
    const payment = payments.find(p => p.studentId === student.id && p.month === new Date().getMonth());
    
    return {
      name: `${student.firstName} ${student.lastName}`,
      id: student.id,
      presents: studentRecords.filter(r => r.status === AttendanceStatus.PRESENT).length,
      lates: studentRecords.filter(r => r.status === AttendanceStatus.LATE).length,
      absents: studentRecords.filter(r => r.status === AttendanceStatus.ABSENT).length,
      paymentPunctuality: payment ? (payment.surcharge === 0 ? "Excelente (Semana 1)" : `Retrasado (Recargo: $${payment.surcharge})`) : "No pagado",
      active: student.active
    };
  });

  const prompt = `
    Como director de la academia de baile "DanceFire", evalúa quién merece las becas mensuales.
    
    CRITERIOS PRIORITARIOS:
    1. Asistencia perfecta (10pts).
    2. Puntualidad en clase (5pts).
    3. PUNTUALIDAD DE PAGO (Vital): 
       - Pago en Semana 1: +20 puntos extra.
       - Pago en Semana 2: +5 puntos.
       - Pago en Semana 3+: 0 puntos.
    
    Datos del mes de ${monthName}:
    ${JSON.stringify(stats, null, 2)}

    Determina el 1er lugar (100% beca) y 2do lugar (50% beca). 
    Escribe una justificación motivadora usando metáforas de fuego/baile/pasión.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstPlaceId: { type: Type.STRING },
            secondPlaceId: { type: Type.STRING },
            justification: { type: Type.STRING },
          },
          required: ["firstPlaceId", "secondPlaceId", "justification"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error evaluating scholarships:", error);
    const sorted = [...stats].sort((a, b) => b.presents - a.presents);
    return {
        firstPlaceId: sorted[0]?.id || "",
        secondPlaceId: sorted[1]?.id || "",
        justification: "Basado en registros de asistencia estándar por desconexión de red."
    };
  }
};
