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
} from "react-icons/md";

/* ================= TYPES ================= */
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

/* ================= HELPERS ================= */
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

  /* ================= FIRESTORE (Logic preserved) ================= */
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

  /* ================= ACTIONS (Logic preserved) ================= */
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
      await updateDoc(doc(db, "drivers", uid), {
        activeStatus: "in-progress",
        active: false,
      });
      setShowStartModal(false);
      setStartingKm("");
      setSelectedTask(null);
      alert("Journey started");
    } catch (error) {
      alert("Failed to start journey");
    }
  }

  async function startJourney(task: Task) {
    setSelectedTask(task);
    setShowStartModal(true);
  }

  async function handleLogout() {
    try { await signOut(auth); navigate("/login"); } catch (error) { alert("Failed to logout"); }
  }

  async function completeJourney() {
    if (!selectedTask) return;
    const close = Number(completion.closingKm);
    const open = (selectedTask as any).openingKm;
    if (isNaN(close) || isNaN(open) || close <= open) { alert("Invalid closing KM (must be greater than opening KM)"); return; }
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
      alert("Journey completed");
    } finally { setSubmitting(false); }
  }

  const todayTasks = tasks.filter((t) => isToday(t) && t.status !== "completed");
  const pastTasks = tasks.filter((t) => !isToday(t) || t.status === "completed");

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      {/* HEADER SECTION */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-5 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">
               {auth.currentUser?.displayName?.charAt(0) || "D"}
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">On-Duty Driver</p>
                <h1 className="text-lg font-black text-slate-900 leading-none">
                  {auth.currentUser?.displayName || "My Profile"}
                </h1>
             </div>
          </div>
          <button onClick={handleLogout} className="p-2.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl transition-all active:scale-95">
            <MdLogout size={22} />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 mt-6">
        {/* STATS GRID */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Stat icon={<MdMap className="text-blue-600"/>} label="Total KM" value={stats.totalKms.toLocaleString()} color="blue" />
          <Stat icon={<MdCheckCircle className="text-emerald-600"/>} label="Finished" value={stats.completed} color="emerald" />
          <Stat icon={<MdAccessTime className="text-amber-600"/>} label="Pending" value={stats.pending} color="amber" />
        </div>

        {/* TASK SECTION */}
        <div className="space-y-8">
          {/* CURRENT TASKS */}
          <section>
            <div className="flex items-center gap-2 mb-4">
               <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
               <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Assigned Today</h2>
            </div>

            {loading ? (
              <div className="py-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
            ) : todayTasks.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-8 text-center">
                <p className="text-sm font-bold text-slate-400">No active tasks for today.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {todayTasks.map((task) => (
                  <div key={task.id} className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                             <MdPerson size={22} />
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Passenger Name</p>
                              <h3 className="font-black text-slate-900">{task.passenger?.name || "Standard Guest"}</h3>
                           </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${task.status === 'in-progress' ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-blue-100 text-blue-700'}`}>
                           {task.status}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
                         <MdLocationOn className="text-blue-600" size={20} />
                         <p className="text-sm font-bold text-slate-600 leading-tight">
                            {task.tourLocation ?? (task.pickup && task.drop ? `${task.pickup} → ${task.drop}` : (task.pickup || task.drop || "Location not set"))}
                         </p>
                      </div>
                    </div>

                    {task.status === "assigned" ? (
                      <button onClick={() => startJourney(task)} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3">
                        <MdPlayCircle size={20}/> Start Trip Now
                      </button>
                    ) : (
                      <button onClick={() => { setSelectedTask(task); setShowModal(true); }} className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3">
                        <MdFlag size={20}/> Complete Duty
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* HISTORY SECTION */}
          <section>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Duty Log</h2>
            <div className="space-y-3">
              {pastTasks.map((task) => (
                <div key={task.id} className="bg-white rounded-2xl p-5 border border-slate-100 flex items-center justify-between group hover:border-emerald-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                       <MdCheckCircle size={20} className="group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm leading-none mb-1">{task.passenger?.name || "Completed Task"}</p>
                      <p className="text-xs text-slate-400 font-medium truncate max-w-[180px]">{task.tourLocation || "Trip Record"}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg uppercase">Success</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* MODAL - COMPLETION (Bottom Sheet Design) */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-black text-2xl text-slate-900 tracking-tight">Complete Duty</h3>
                <p className="text-sm font-bold text-slate-400">Fill closing KM & fuel logs</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><MdClose size={24}/></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <LogInput icon={<MdSpeed/>} label="Closing KM" value={completion.closingKm} onChange={(v)=>setCompletion({...completion, closingKm: v})} />
              <LogInput icon={<MdLocalGasStation/>} label="Fuel (Ltrs)" value={completion.fuelQuantity} onChange={(v)=>setCompletion({...completion, fuelQuantity: v})} />
              <LogInput icon={<MdPerson/>} label="Amount" value={completion.amount} onChange={(v)=>setCompletion({...completion, amount: v})} />
            </div>

            <button onClick={completeJourney} disabled={submitting} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] disabled:opacity-50 shadow-xl shadow-slate-200">
              {submitting ? "Processing..." : "Submit Records"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL - START TRIP (Opening KM) */}
      {showStartModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-black text-2xl text-slate-900 tracking-tight">Start Journey</h3>
                <p className="text-sm font-bold text-slate-400">Enter opening odometer reading</p>
              </div>
              <button onClick={() => setShowStartModal(false)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><MdClose size={24}/></button>
            </div>

            <div className="mb-6">
              <LogInput icon={<MdSpeed/>} label="Opening KM" value={startingKm} onChange={(v)=>setStartingKm(v)} />
            </div>

            <button onClick={handleStartTrip} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-200">
              Start Trip Now
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: ReactNode; label: string; value: string | number; color: string }) {
  const colors:any = { blue: 'bg-blue-50 text-blue-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700' };
  return (
    <div className={`rounded-3xl p-4 text-center border border-white shadow-sm ${colors[color]}`}>
      <div className="mx-auto mb-2 text-2xl flex justify-center">{icon}</div>
      <p className="text-xl font-black leading-none mb-1">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</p>
    </div>
  );
}

function LogInput({ icon, label, value, onChange }: any) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
      <input
        type="number"
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
      />
    </div>
  );
}