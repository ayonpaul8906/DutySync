import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import {
  MdLogout,
  MdPlayCircle,
  MdFlag,
  MdClose,
  MdCheckCircle,
  MdAccessTime,
  MdLocationOn,
  MdPerson,
  MdLocalGasStation,
  MdSpeed,
  MdHistory,
  MdAssignment,
  MdRadioButtonChecked
} from "react-icons/md";

/* ================= TYPES & HELPERS ================= */
interface Task {
  id: string;
  tourLocation?: string;
  pickup?: string;
  drop?: string;
  status: "assigned" | "in-progress" | "completed";
  passenger?: { name?: string };
  date?: string;
  createdAt?: any;
  fuelQuantity?: number; // Added to support fuel calculation
} 

function isToday(task: Task) {
  const today = new Date().toDateString();
  if (task.createdAt?.toDate) return task.createdAt.toDate().toDateString() === today;
  if (task.date) return new Date(task.date).toDateString() === today;
  return false;
}

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalKms: 0, completed: 0, pending: 0, totalFuel: 0 });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [startingKm, setStartingKm] = useState("");

  const [completion, setCompletion] = useState({
    closingKm: "",
    fuelQuantity: "",
    amount: "",
  });

  /* ================= FIRESTORE LOGIC ================= */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setStats((s) => ({ ...s, totalKms: snap.data().totalKms || 0 }));
      }
    });

    const q = query(collection(db, "tasks"), where("driverId", "==", user.uid));
    const unsubTasks = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, "id">) }));
      const completed = list.filter((t) => t.status === "completed").length;
      const pending = list.filter((t) => t.status !== "completed").length;
      
      // Real-time calculation for Total Fuels
      const totalFuel = list.reduce((acc, curr) => acc + (Number(curr.fuelQuantity) || 0), 0);
      
      setStats((s) => ({ ...s, completed, pending, totalFuel }));
      setTasks(list);
      setLoading(false);
    });

    return () => { unsubUser(); unsubTasks(); };
  }, []);

  /* ================= ACTIONS ================= */
  async function handleStartTrip() {
    if (!startingKm || isNaN(Number(startingKm)) || Number(startingKm) < 0) {
      alert("Please enter a valid opening kilometer");
      return;
    }
    if (!selectedTask) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      await updateDoc(doc(db, "tasks", selectedTask.id), {
        status: "in-progress",
        startedAt: serverTimestamp(),
        openingKm: Number(startingKm),
      });
      await updateDoc(doc(db, "drivers", uid), { activeStatus: "in-progress", active: false });
      setShowStartModal(false);
      setStartingKm("");
      setSelectedTask(null);
    } catch (error) {
      alert("Failed to start journey");
    }
  }

  async function completeJourney() {
    if (!selectedTask) return;
    const close = Number(completion.closingKm);
    const open = (selectedTask as any).openingKm;
    if (isNaN(close) || isNaN(open) || close <= open) { 
        alert("Invalid closing KM (must be greater than opening KM)"); 
        return; 
    }
    const kms = close - open;
    const uid = auth.currentUser!.uid;
    try {
      setSubmitting(true);
      await updateDoc(doc(db, "tasks", selectedTask.id), {
        status: "completed", closingKm: close,
        fuelQuantity: Number(completion.fuelQuantity) || 0,
        fuelAmount: Number(completion.amount) || 0,
        kilometers: kms, completedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "drivers", uid), { activeStatus: "active", active: true, totalKilometers: increment(kms) });
      await updateDoc(doc(db, "users", uid), { totalKms: increment(kms) });
      setShowModal(false);
      setCompletion({ closingKm: "", fuelQuantity: "", amount: "" });
      setSelectedTask(null);
    } finally { setSubmitting(false); }
  }

  const handleLogout = async () => { await signOut(auth); navigate("/login"); };

  const todayTasks = tasks.filter((t) => isToday(t) && t.status !== "completed");
  const pastTasks = tasks.filter((t) => !isToday(t) || t.status === "completed");

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-12">
      {/* HEADER: AMPL Styled */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">System Live • Driver Console</p>
            </div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              AMPL <span className="text-blue-600">Driver</span>
            </h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm active:scale-95">
            Logout <MdLogout size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        {/* STATS: Same Grid Style as Management Console */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <StatCard icon={<MdSpeed/>} label="Total Kilometers" value={stats.totalKms.toLocaleString()} color="indigo" />
          <StatCard icon={<MdCheckCircle/>} label="Completed" value={stats.completed} color="emerald" />
          <StatCard icon={<MdAccessTime/>} label="Upcoming" value={stats.pending} color="amber" />
          <StatCard icon={<MdLocalGasStation/>} label="Total Fuels (L)" value={stats.totalFuel.toFixed(1)} color="blue" />
        </div>

        <h2 className="text-xl font-black text-[#1e293b] mb-6 flex items-center gap-3">
            Assigned Roster
            <div className="flex-1 h-[1px] bg-slate-200"></div>
            <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-3 py-1 rounded-full uppercase">Today</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Duties */}
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <div className="py-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
            ) : todayTasks.length === 0 ? (
              <div className="bg-white border border-slate-200 border-dashed rounded-[2rem] p-12 text-center shadow-sm">
                <p className="text-slate-400 font-bold">No active duties assigned for today.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {todayTasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <MdPerson size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client / Passenger</p>
                            <h3 className="text-xl font-black text-slate-900">{task.passenger?.name || "Corporate Guest"}</h3>
                          </div>
                        </div>
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight ${task.status === 'in-progress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {task.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                         <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                           <MdLocationOn size={22} />
                         </div>
                         <p className="font-bold text-slate-600 text-sm">
                           {task.tourLocation ?? (task.pickup && task.drop ? `${task.pickup} → ${task.drop}` : (task.pickup || task.drop || "General Transit"))}
                         </p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100">
                      {task.status === "assigned" ? (
                        <button onClick={() => { setSelectedTask(task); setShowStartModal(true); }} className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95">
                            <MdPlayCircle size={20}/> Start Journey
                        </button>
                      ) : (
                        <button onClick={() => { setSelectedTask(task); setShowModal(true); }} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95">
                            <MdFlag size={20}/> Complete Duty
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: History Log */}
          <div className="space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                <MdHistory size={16}/> Activity Records
              </h3>
              <div className="space-y-4">
                {pastTasks.length === 0 ? (
                    <p className="text-center text-xs text-slate-300 py-4 font-bold italic">No history available</p>
                ) : (
                    pastTasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl transition-all border border-transparent hover:border-slate-100">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <MdCheckCircle size={18} />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-black text-slate-800 truncate">{task.passenger?.name || "Completed"}</p>
                            <p className="text-[10px] font-bold text-slate-400 truncate tracking-tight uppercase">{task.tourLocation || "Transit Complete"}</p>
                        </div>
                    </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL SYSTEM */}
      {[
        { show: showStartModal, set: setShowStartModal, title: "Initialize Duty", sub: "Verify starting odometer", icon: <MdSpeed/>, btnColor: 'bg-blue-600', btnText: 'Start Duty' },
        { show: showModal, set: setShowModal, title: "Duty Report", sub: "Complete final trip logs", icon: <MdFlag/>, btnColor: 'bg-slate-900', btnText: 'Submit Final Report' }
      ].map((m, i) => m.show && (
        <div key={i} className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-black text-2xl text-slate-900 tracking-tight">{m.title}</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">{m.sub}</p>
              </div>
              <button onClick={() => m.set(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                <MdClose size={20}/>
              </button>
            </div>

            <div className="space-y-3 mb-8">
              {m.title === "Initialize Duty" ? (
                <LogInput icon={<MdSpeed/>} label="Current Opening KM" value={startingKm} onChange={(v:string)=>setStartingKm(v)} />
              ) : (
                <>
                  <LogInput icon={<MdSpeed/>} label="Final Closing KM" value={completion.closingKm} onChange={(v:string)=>setCompletion({...completion, closingKm: v})} />
                  <div className="grid grid-cols-2 gap-3">
                    <LogInput icon={<MdLocalGasStation/>} label="Fuel (L)" value={completion.fuelQuantity} onChange={(v:string)=>setCompletion({...completion, fuelQuantity: v})} />
                    <LogInput icon={<MdPerson/>} label="Fuel Cost" value={completion.amount} onChange={(v:string)=>setCompletion({...completion, amount: v})} />
                  </div>
                </>
              )}
            </div>

            <button 
                onClick={m.title === "Initialize Duty" ? handleStartTrip : completeJourney} 
                disabled={submitting}
                className={`w-full ${m.btnColor} text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50`}
            >
              {submitting ? "Processing..." : m.btnText}
            </button>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes fade-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}

/* UI COMPONENTS */
function StatCard({ icon, label, value, color }: { icon: ReactNode; label: string; value: string | number; color: 'indigo' | 'emerald' | 'amber' | 'blue' }) {
    const iconStyles = {
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-500',
        blue: 'bg-blue-50 text-blue-600'
    };

    return (
        <div className="rounded-[1.5rem] p-6 border border-slate-200 bg-white shadow-sm flex flex-col hover:border-blue-200 transition-colors">
            <div className={`w-10 h-10 ${iconStyles[color]} rounded-xl flex items-center justify-center mb-4`}>
                <span className="text-xl">{icon}</span>
            </div>
            <h4 className="text-3xl font-black text-slate-900 mb-1 leading-none">{value}</h4>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        </div>
    );
}

function LogInput({ icon, label, value, onChange }: any) {
  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">{icon}</div>
      <input
        type="number"
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500/30 transition-all placeholder:text-slate-300"
      />
    </div>
  );
}