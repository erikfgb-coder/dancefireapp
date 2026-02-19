
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, CalendarCheck2, CreditCard, Trophy, Plus, Trash2, 
  Search, ChevronRight, Menu, X, Loader2, Sparkles, Info, 
  Phone, DollarSign, Calendar, TrendingUp, AlertCircle, Flame
} from 'lucide-react';
import { 
  Student, AttendanceRecord, PaymentRecord, AttendanceStatus, 
  PaymentStatus, ScholarshipResult 
} from './types';
import { evaluateScholarships } from './geminiService';

const STORAGE_KEY = 'dancefire_data_v2';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'students' | 'attendance' | 'payments' | 'ranking' | 'scholarships'>('students');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scholarshipResult, setScholarshipResult] = useState<ScholarshipResult | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      setStudents(data.students || []);
      setAttendance(data.attendance || []);
      setPayments(data.payments || []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ students, attendance, payments }));
    // Lógica automática de inactividad
    const dayOfMonth = new Date().getDate();
    if (dayOfMonth > 21) {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      setStudents(prev => prev.map(s => {
        const hasPaid = payments.find(p => p.studentId === s.id && p.month === currentMonth && p.year === currentYear);
        if (!hasPaid && s.active) return { ...s, active: false };
        return s;
      }));
    }
  }, [students, attendance, payments]);

  const addStudent = (studentData: any) => {
    const newStudent: Student = {
      ...studentData,
      monthlyFee: Number(studentData.monthlyFee), // Asegurar que sea número
      id: crypto.randomUUID(),
      active: true,
      registrationDate: new Date().toISOString().split('T')[0]
    };
    setStudents(prev => [...prev, newStudent]);
  };

  const getSurchargeInfo = (day: number) => {
    if (day <= 7) return { surcharge: 0, label: 'Puntual' };
    if (day <= 14) return { surcharge: 30, label: 'Semana 2 (+30)' };
    return { surcharge: 90, label: 'Semana 3+ (+90)' };
  };

  const togglePayment = (studentId: string) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    setPayments(prev => {
      const existing = prev.find(p => p.studentId === studentId && p.month === currentMonth && p.year === currentYear);
      if (existing) {
        return prev.filter(p => p !== existing);
      } else {
        const day = new Date().getDate();
        const info = getSurchargeInfo(day);
        const base = Number(student.monthlyFee);
        return [...prev, {
          studentId,
          month: currentMonth,
          year: currentYear,
          paymentDate: new Date().toISOString(),
          baseAmount: base,
          surcharge: info.surcharge,
          totalPaid: base + info.surcharge,
          status: PaymentStatus.PAID
        }];
      }
    });
    
    // Al pagar vuelve a estar activo
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, active: true } : s));
  };

  const runEvaluation = async () => {
    setIsLoading(true);
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const result = await evaluateScholarships(students, attendance, payments, monthNames[new Date().getMonth()]);
    setScholarshipResult(result);
    setIsLoading(false);
    setActiveTab('scholarships');
  };

  const ranking = useMemo(() => {
    return [...students].map(s => {
      const stAttendance = attendance.filter(a => a.studentId === s.id);
      const score = (stAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length * 10) +
                    (stAttendance.filter(a => a.status === AttendanceStatus.LATE).length * 5) +
                    (stAttendance.filter(a => a.status === AttendanceStatus.JUSTIFIED).length * 3) -
                    (stAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length * 10);
      
      const currentPay = payments.find(p => p.studentId === s.id && p.month === new Date().getMonth());
      const payScore = currentPay ? (currentPay.surcharge === 0 ? 50 : 20) : 0;
      
      return { ...s, totalScore: score + payScore };
    }).sort((a, b) => b.totalScore - a.totalScore);
  }, [students, attendance, payments]);

  const NavItem = ({ icon: Icon, label, id }: { icon: any, label: string, id: typeof activeTab }) => (
    <button
      onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
      className={`flex items-center gap-3 w-full p-3.5 rounded-2xl transition-all ${
        activeTab === id 
        ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' 
        : 'text-slate-600 hover:bg-orange-50 hover:text-orange-600'
      }`}
    >
      <Icon size={20} />
      <span className="font-bold text-sm">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 p-6 flex flex-col transition-transform lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-12 h-12 bg-gradient-to-tr from-red-600 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-200">
            <Flame size={28} />
          </div>
          <div>
            <h1 className="font-black text-2xl tracking-tighter text-slate-900 leading-none">DANCEFIRE</h1>
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Management System</p>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <NavItem icon={Users} label="Alumnos" id="students" />
          <NavItem icon={CalendarCheck2} label="Asistencias" id="attendance" />
          <NavItem icon={CreditCard} label="Pagos" id="payments" />
          <NavItem icon={TrendingUp} label="Ranking" id="ranking" />
          <NavItem icon={Trophy} label="Becas IA" id="scholarships" />
        </nav>

        <button 
          onClick={runEvaluation}
          className="mt-6 flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-2xl font-bold hover:bg-orange-600 transition-all group"
        >
          <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
          <span>Evaluar Becas</span>
        </button>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600"><Menu /></button>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            {activeTab === 'students' && 'Control de Alumnos'}
            {activeTab === 'attendance' && 'Pase de Lista'}
            {activeTab === 'payments' && 'Caja y Mensualidades'}
            {activeTab === 'ranking' && 'Ranking de Compromiso'}
            {activeTab === 'scholarships' && 'Resultados de Becas'}
          </h2>
          <div className="flex items-center gap-4">
             <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-400">Hoy es</p>
                <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
             </div>
          </div>
        </header>

        <div className="p-6 md:p-10">
          {activeTab === 'students' && <StudentView students={students} onAdd={addStudent} setStudents={setStudents} />}
          {activeTab === 'attendance' && <AttendanceView students={students} records={attendance} onMark={(id: string, date: string, status: AttendanceStatus) => setAttendance(prev => [...prev.filter(r => !(r.studentId === id && r.date === date)), { studentId: id, date, status }])} />}
          {activeTab === 'payments' && <PaymentView students={students} payments={payments} onToggle={togglePayment} />}
          {activeTab === 'ranking' && <RankingView ranking={ranking} />}
          {activeTab === 'scholarships' && <ScholarshipView students={students} result={scholarshipResult} isLoading={isLoading} onRun={runEvaluation} />}
        </div>
      </main>
    </div>
  );
};

const StudentView: React.FC<{ students: Student[], onAdd: any, setStudents: any }> = ({ students, onAdd, setStudents }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="space-y-8">
      <div className="flex justify-end items-center">
        <button onClick={() => setIsOpen(true)} className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-orange-100"><Plus /> Nuevo Alumno</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map(s => (
          <div key={s.id} className={`bg-white p-6 rounded-[2rem] border-2 transition-all ${s.active ? 'border-slate-100 hover:border-orange-200' : 'border-red-200 opacity-75'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${s.active ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                {s.firstName[0]}
              </div>
              {!s.active && <span className="bg-red-600 text-white text-[10px] px-2 py-1 rounded-full font-black uppercase">Inactivo</span>}
            </div>
            <h4 className="text-lg font-black text-slate-900">{s.firstName} {s.lastName}</h4>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-500"><Phone size={14} /> {s.phone}</div>
              <div className="flex items-center gap-2 text-slate-500"><DollarSign size={14} /> Mensualidad: ${s.monthlyFee}</div>
              <div className="flex items-center gap-2 text-slate-500"><Calendar size={14} /> Ingreso: {s.registrationDate}</div>
            </div>
            {s.conditions && <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 italic border-l-4 border-orange-500">"{s.conditions}"</div>}
            <button 
              onClick={() => { if(confirm('¿Eliminar?')) setStudents((p:any) => p.filter((x:any)=>x.id!==s.id))}}
              className="mt-6 w-full py-2 text-slate-400 hover:text-red-600 text-xs font-bold transition-colors"
            >Eliminar Registro</button>
          </div>
        ))}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 animate-in zoom-in duration-200">
            <h2 className="text-3xl font-black mb-6 text-slate-900">Registro de Alumno</h2>
            <form onSubmit={(e:any) => { e.preventDefault(); const d=new FormData(e.target); onAdd(Object.fromEntries(d)); setIsOpen(false); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input name="firstName" required placeholder="Nombre" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" />
                <input name="lastName" required placeholder="Apellido" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" />
              </div>
              <input name="phone" required placeholder="WhatsApp / Celular" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" />
              <div className="grid grid-cols-2 gap-4">
                <input name="dob" type="date" required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" />
                <input name="monthlyFee" type="number" required placeholder="Costo Mensualidad" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl" />
              </div>
              <textarea name="conditions" placeholder="Lesiones o condiciones médicas..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-32" />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={()=>setIsOpen(false)} className="flex-1 py-4 font-bold text-slate-500 hover:bg-slate-50 rounded-2xl">Cancelar</button>
                <button className="flex-1 py-4 bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-100">Registrar Alumno</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const AttendanceView: React.FC<{ students: Student[], records: AttendanceRecord[], onMark: any }> = ({ students, records, onMark }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-6 items-center">
        <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="w-full md:w-auto p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-orange-600" />
        <div className="flex-1 flex gap-2 overflow-x-auto pb-2 md:pb-0">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap">P = Presente</span>
          <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap">R = Retardo</span>
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap">F = Falta</span>
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black whitespace-nowrap">J = Justificada</span>
        </div>
      </div>
      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        {students.filter(s=>s.active).map(s => {
          const r = records.find(x => x.studentId === s.id && x.date === date);
          return (
            <div key={s.id} className="p-5 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <span className="font-bold text-slate-800">{s.firstName} {s.lastName}</span>
              <div className="flex gap-2">
                {[
                  {s:AttendanceStatus.PRESENT, l:'P', c:'green'}, 
                  {s:AttendanceStatus.LATE, l:'R', c:'amber'}, 
                  {s:AttendanceStatus.ABSENT, l:'F', c:'red'},
                  {s:AttendanceStatus.JUSTIFIED, l:'J', c:'blue'}
                ].map(opt => (
                  <button key={opt.s} onClick={()=>onMark(s.id, date, opt.s)} className={`w-10 h-10 rounded-xl font-black border-2 transition-all ${r?.status===opt.s ? `bg-${opt.c}-600 border-${opt.c}-700 text-white shadow-md` : 'border-slate-100 text-slate-400'}`}>{opt.l}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PaymentView: React.FC<{ students: Student[], payments: PaymentRecord[], onToggle: any }> = ({ students, payments, onToggle }) => {
  const currentMonth = new Date().getMonth();
  const day = new Date().getDate();
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-br from-red-700 to-orange-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-orange-200">
        <h3 className="text-3xl font-black mb-2">Control de Caja</h3>
        <p className="opacity-80 font-bold mb-6">Día {day} del mes actual</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/20 p-4 rounded-2xl border border-white/20">
            <p className="text-[10px] uppercase font-black tracking-widest opacity-70">Semana Actual</p>
            <p className="text-xl font-bold">{day <= 7 ? 'Semana 1 (Puntual)' : day <= 14 ? 'Semana 2 (+30)' : 'Semana 3+ (+90)'}</p>
          </div>
          <div className="bg-white/20 p-4 rounded-2xl border border-white/20">
            <p className="text-[10px] uppercase font-black tracking-widest opacity-70">Recargo Hoy</p>
            <p className="text-xl font-bold">${day <= 7 ? '0' : day <= 14 ? '30' : '90'}</p>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
        {students.map(s => {
          const p = payments.find(x => x.studentId === s.id && x.month === currentMonth);
          const surcharge = day <= 7 ? 0 : day <= 14 ? 30 : 90;
          const totalCalculated = Number(s.monthlyFee) + surcharge;
          
          return (
            <div key={s.id} className="p-6 flex items-center justify-between border-b border-slate-100">
              <div>
                <p className="font-bold text-slate-900">{s.firstName} {s.lastName}</p>
                <p className="text-xs text-slate-500">Base: ${s.monthlyFee} {p ? `| Recargo: $${p.surcharge}` : ''}</p>
              </div>
              <div className="flex items-center gap-4">
                {p && <span className="text-xs font-black text-green-600 uppercase tracking-widest">Pagado el {new Date(p.paymentDate!).toLocaleDateString()}</span>}
                <button onClick={()=>onToggle(s.id)} className={`px-6 py-3 rounded-2xl font-black text-sm transition-all ${p ? 'bg-green-600 text-white shadow-lg' : 'border-2 border-slate-100 text-slate-400 hover:border-orange-500 hover:text-orange-600'}`}>
                  {p ? 'PAGADO' : `MARCAR $${totalCalculated}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RankingView: React.FC<{ ranking: any[] }> = ({ ranking }) => (
  <div className="max-w-5xl mx-auto space-y-6">
    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2"><TrendingUp className="text-orange-600" /> Ranking de Compromiso</h3>
    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="p-6 text-left text-xs font-black uppercase text-slate-400 tracking-widest">Posición</th>
            <th className="p-6 text-left text-xs font-black uppercase text-slate-400 tracking-widest">Alumno</th>
            <th className="p-6 text-center text-xs font-black uppercase text-slate-400 tracking-widest">Score de Fuego</th>
            <th className="p-6 text-right text-xs font-black uppercase text-slate-400 tracking-widest">Estatus</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ranking.map((s, i) => (
            <tr key={s.id} className={`group hover:bg-orange-50/50 transition-colors ${i < 2 ? 'bg-orange-50/30' : ''}`}>
              <td className="p-6 font-black text-2xl text-slate-300 group-hover:text-orange-600 transition-colors">#{i + 1}</td>
              <td className="p-6">
                <p className="font-black text-slate-900">{s.firstName} {s.lastName}</p>
                <p className="text-xs text-slate-400">{s.phone}</p>
              </td>
              <td className="p-6 text-center">
                <span className={`px-4 py-2 rounded-xl font-black text-lg ${i === 0 ? 'bg-orange-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600'}`}>
                  {s.totalScore}
                </span>
              </td>
              <td className="p-6 text-right">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${s.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {s.active ? 'Activo' : 'Inactivo'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ScholarshipView: React.FC<{ students: Student[], result: ScholarshipResult | null, isLoading: boolean, onRun: any }> = ({ students, result, isLoading, onRun }) => {
  const winner1 = result ? students.find(s=>s.id===result.firstPlaceId) : null;
  const winner2 = result ? students.find(s=>s.id===result.secondPlaceId) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <div className="w-24 h-24 bg-gradient-to-br from-red-600 to-orange-500 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-orange-200">
          <Trophy size={48} />
        </div>
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Premios del mes</h2>
        <p className="text-slate-500 max-w-lg mx-auto leading-relaxed font-medium">La IA de DanceFire analiza asistencia, puntualidad y responsabilidad en pagos para otorgar las becas.</p>
        <button onClick={onRun} disabled={isLoading} className="mt-4 bg-orange-600 text-white px-10 py-4 rounded-[1.5rem] font-black shadow-xl shadow-orange-100 hover:scale-105 transition-transform disabled:opacity-50">
          {isLoading ? <Loader2 className="animate-spin" /> : 'Generar Resultados con IA'}
        </button>
      </div>

      {result && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom duration-700">
          <div className="bg-gradient-to-br from-amber-400 to-orange-600 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
            <Flame className="absolute -right-8 -top-8 w-40 h-40 opacity-10 group-hover:scale-125 transition-transform" />
            <div className="relative z-10">
              <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Primer Lugar</span>
              <h3 className="text-3xl font-black mt-4 mb-1">{winner1?.firstName} {winner1?.lastName}</h3>
              <p className="text-orange-100 font-bold italic mb-6">BECA 100% - Fuego Imparable</p>
              <div className="w-full h-1.5 bg-white/30 rounded-full" />
            </div>
          </div>
          <div className="bg-white p-8 rounded-[3rem] border-4 border-slate-100 shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <span className="bg-slate-100 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">Segundo Lugar</span>
              <h3 className="text-3xl font-black mt-4 mb-1 text-slate-900">{winner2?.firstName} {winner2?.lastName}</h3>
              <p className="text-orange-600 font-bold italic mb-6">BECA 50% - Chispa de Pasión</p>
              <div className="w-full h-1.5 bg-orange-100 rounded-full" />
            </div>
          </div>
          <div className="md:col-span-2 bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl border-b-8 border-orange-600">
            <div className="flex items-center gap-4 mb-6">
               <Sparkles className="text-orange-500" size={32} />
               <h4 className="text-2xl font-black uppercase tracking-tight">Veredicto del Director (IA)</h4>
            </div>
            <p className="text-xl leading-relaxed text-slate-300 italic">"{result.justification}"</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
