import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { 
  MdArrowBack, MdHistory, MdLocationOn, MdPerson, 
  MdDirectionsCar, MdCheckCircle, MdSchedule, MdGroups 
} from "react-icons/md";

interface Task {
  id: string;
  status: string;
  tourLocation: string;
  tourTime: string;
  paxNo: string;
  passenger: { name: string; phone: string };
  createdAt: any;
}

export default function DriverProfile() {
  const { driverId } = useParams();
  const navigate = useNavigate();
  const [driver, setDriver] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId) return;

    // 1. Fetch Driver Details
    const unsubDriver = onSnapshot(doc(db, "users", driverId), (snap) => {
      setDriver(snap.data());
    });

    // 2. Fetch Driver Tasks (Sorted by newest first)
    const q = query(
      collection(db, "tasks"), 
      where("driverId", "==", driverId), 
      orderBy("createdAt", "desc")
    );

    const unsubTasks = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[]);
      setLoading(false);
    });

    return () => {
      unsubDriver();
      unsubTasks();
    };
  }, [driverId]);

  const activeTask = tasks.find(t => t.status === "in-progress" || t.status === "assigned");
  const pastTasks = tasks.filter(t => t.status === "completed");

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12">
      <div className="h-1.5 bg-slate-900 w-full" />
      
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header Navigation */}
        <button 
          onClick={() => navigate(-1)} 
          className="mb-8 p-3 bg-white rounded-2xl border border-slate-200 text-slate-600 hover:text-blue-600 shadow-sm transition-all"
        >
          <MdArrowBack size={24}/>
        </button>
        
        {/* Driver Hero Card */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 mb-10 flex flex-col md:flex-row items-center gap-8 shadow-sm">
            <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-4xl font-black shadow-lg shadow-blue-100">
                {driver?.name?.charAt(0)}
            </div>
            <div className="text-center md:text-left flex-1">
                <h1 className="text-3xl font-black text-slate-900">{driver?.name}</h1>
                <p className="font-bold text-slate-400 mb-4">{driver?.email}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    <span className="px-4 py-1.5 bg-slate-100 rounded-xl text-[10px] font-black uppercase text-slate-600 border border-slate-200">
                        ID: {driverId?.slice(-6).toUpperCase()}
                    </span>
                    <span className="px-4 py-1.5 bg-blue-50 rounded-xl text-[10px] font-black uppercase text-blue-600 border border-blue-100">
                        {tasks.length} Total Duties
                    </span>
                </div>
            </div>
        </div>

        {/* Current Active Duty Section */}
        <div className="mb-10">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                <MdDirectionsCar className="text-blue-500" size={18}/> Active Dispatch
            </h3>
            {activeTask ? (
                <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <span className="px-3 py-1 bg-blue-500 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                {activeTask.status}
                            </span>
                            <MdSchedule className="text-slate-500" size={24}/>
                        </div>
                        <h2 className="text-2xl font-black mb-1">{activeTask.passenger?.name}</h2>
                        <p className="text-blue-400 font-bold text-sm mb-6 flex items-center gap-2">
                            <MdLocationOn/> {activeTask.tourLocation}
                        </p>
                        <div className="flex gap-6 border-t border-white/10 pt-6">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase">Pax Count</p>
                                <p className="font-bold flex items-center gap-1"><MdGroups/> {activeTask.paxNo}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase">Reporting</p>
                                <p className="font-bold">{activeTask.tourTime}</p>
                            </div>
                        </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 text-white opacity-5">
                        <MdDirectionsCar size={200}/>
                    </div>
                </div>
            ) : (
                <div className="bg-white border-2 border-dashed border-slate-200 p-8 rounded-[2.5rem] text-center">
                    <p className="text-slate-400 font-bold italic">No active duty assigned at the moment.</p>
                </div>
            )}
        </div>

        {/* History Section */}
        <div>
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
                <MdHistory className="text-slate-500" size={18}/> Duty History
            </h3>
            <div className="space-y-3">
                {pastTasks.length > 0 ? (
                    pastTasks.map(task => (
                        <div key={task.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-blue-200 transition-all group">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                                    <MdCheckCircle size={20}/>
                                </div>
                                <div>
                                    <p className="font-black text-slate-800 group-hover:text-blue-600 transition-colors">{task.tourLocation}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                        Passenger: {task.passenger?.name} • {task.tourTime}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Completed</p>
                                <p className="text-[9px] font-bold text-slate-300">
                                    {task.createdAt?.seconds ? new Date(task.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10">
                        <p className="text-slate-400 text-sm font-medium">No completed tasks in the records.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}