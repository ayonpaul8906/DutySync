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
  MdMap,
  MdLocationOn,
  MdPerson,
  MdLocalGasStation,
  MdSpeed,
  MdHistory,
} from "react-icons/md";

/* ================= TYPES & HELPERS (Logic Preserved) ================= */
interface Task {
  id: string;
  tourLocation?: string;
  pickup?: string;
  drop?: string;
  status: "assigned" | "in-progress" | "completed";
  passenger?: { name?: string };
  date?: string;
  createdAt?: any;
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
  const [stats, setStats] = useState({ totalKms: 0, completed: 0, pending: 0 });
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
      setStats((s) => ({ ...s, completed, pending }));
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
      {/* HEADER: Admin Style */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200">
               <MdPerson size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-0.5">Active Operator</p>
              <h1 className="text-xl font-black text-slate-900 leading-tight">
                {auth.currentUser?.displayName || "Driver Profile"}
              </h1>
            </div>
          </div>
          <button onClick={handleLogout} className="w-11 h-11 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-slate-100 flex items-center justify-center active:scale-95">
            <MdLogout size={20} />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8">
        {/* STATS: High Contrast Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <DashboardCard icon={<MdMap/>} label="Total Kilometers" value={stats.totalKms.toLocaleString()} color="indigo" />
          <DashboardCard icon={<MdCheckCircle/>} label="Duties Finished" value={stats.completed} color="emerald" />
          <DashboardCard icon={<MdAccessTime/>} label="Upcoming Tasks" value={stats.pending} color="amber" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: Active Tasks (Today) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                <h2 className="text-lg font-black text-slate-800">Assigned Roster</h2>
              </div>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase tracking-tighter">Today</span>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
            ) : todayTasks.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center">
                <p className="text-slate-400 font-bold">No active duties found for today.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayTasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden group">
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                            <MdPerson size={26} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Name</p>
                            <h3 className="text-xl font-black text-slate-900">{task.passenger?.name || "Corporate Guest"}</h3>
                          </div>
                        </div>
                        <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight ${task.status === 'in-progress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {task.status}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm">
                           <MdLocationOn size={22} />
                        </div>
                        <p className="font-bold text-slate-600 text-sm leading-relaxed">
                          {task.tourLocation ?? (task.pickup && task.drop ? `${task.pickup} → ${task.drop}` : (task.pickup || task.drop || "General Transit"))}
                        </p>
                      </div>
                    </div>

                    {task.status === "assigned" ? (
                      <button onClick={() => { setSelectedTask(task); setShowStartModal(true); }} className="w-full py-6 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3">
                        <MdPlayCircle size={20}/> Initialize Journey
                      </button>
                    ) : (
                      <button onClick={() => { setSelectedTask(task); setShowModal(true); }} className="w-full py-6 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3">
                        <MdFlag size={20}/> Terminate Duty
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: History Log */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <MdHistory className="text-slate-400" size={20} />
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Activity Log</h2>
            </div>
            
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 space-y-4 shadow-sm">
              {pastTasks.length === 0 ? (
                <p className="text-center text-xs text-slate-300 py-4 font-bold">No history available</p>
              ) : (
                pastTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                         <MdCheckCircle size={16} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-slate-800 truncate">{task.passenger?.name || "Completed"}</p>
                        <p className="text-[10px] text-slate-400 font-bold truncate tracking-tight">{task.tourLocation || "Trip Completed"}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-slate-300 uppercase shrink-0 ml-2">Done</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL SYSTEM (Glass and Smooth Animation) */}
      {[
        { show: showStartModal, set: setShowStartModal, title: "Start Journey", sub: "Verify odometer reading", icon: <MdSpeed/>, btnColor: 'bg-blue-600', btnText: 'Initialize' },
        { show: showModal, set: setShowModal, title: "Duty Report", sub: "Complete trip finalization", icon: <MdFlag/>, btnColor: 'bg-slate-900', btnText: 'Finalize Report' }
      ].map((m, i) => m.show && (
        <div key={i} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-slide-up border border-white/20">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="font-black text-3xl text-slate-900 tracking-tighter">{m.title}</h3>
                <p className="text-sm font-bold text-slate-400 mt-1">{m.sub}</p>
              </div>
              <button onClick={() => m.set(false)} className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors">
                <MdClose size={24}/>
              </button>
            </div>

            <div className="grid gap-4 mb-8">
              {m.title === "Start Journey" ? (
                <LogInput icon={<MdSpeed/>} label="Current Opening KM" value={startingKm} onChange={(v:string)=>setStartingKm(v)} />
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <LogInput icon={<MdSpeed/>} label="Final Closing KM" value={completion.closingKm} onChange={(v:string)=>setCompletion({...completion, closingKm: v})} />
                  <div className="grid grid-cols-2 gap-3">
                    <LogInput icon={<MdLocalGasStation/>} label="Fuel (L)" value={completion.fuelQuantity} onChange={(v:string)=>setCompletion({...completion, fuelQuantity: v})} />
                    <LogInput icon={<MdPerson/>} label="Cost" value={completion.amount} onChange={(v:string)=>setCompletion({...completion, amount: v})} />
                  </div>
                </div>
              )}
            </div>

            <button 
                onClick={m.title === "Start Journey" ? handleStartTrip : completeJourney} 
                disabled={submitting}
                className={`w-full ${m.btnColor} text-white py-6 rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-xl transition-transform active:scale-95 disabled:opacity-50`}
            >
              {submitting ? "Processing..." : m.btnText}
            </button>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}

function DashboardCard({ icon, label, value, color }: { icon: ReactNode; label: string; value: string | number; color: 'indigo' | 'emerald' | 'amber' }) {
  const themes = {
    indigo: 'bg-indigo-600 shadow-indigo-200',
    emerald: 'bg-emerald-600 shadow-emerald-200',
    amber: 'bg-amber-500 shadow-amber-200'
  };

  return (
    <div className={`rounded-[2rem] p-6 text-white shadow-xl ${themes[color]} relative overflow-hidden group`}>
      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
        {icon && <div className="text-8xl">{icon}</div>}
      </div>
      <div className="relative z-10">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-4">
          <span className="text-xl">{icon}</span>
        </div>
        <p className="text-2xl font-black mb-1">{value}</p>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{label}</p>
      </div>
    </div>
  );
}

function LogInput({ icon, label, value, onChange }: any) {
  return (
    <div className="relative">
      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">{icon}</div>
      <input
        type="number"
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl pl-12 pr-6 py-5 text-sm font-black text-slate-700 placeholder:text-slate-300 focus:bg-white focus:border-blue-600/20 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
      />
    </div>
  );
}