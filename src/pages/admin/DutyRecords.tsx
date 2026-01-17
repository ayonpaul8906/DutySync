import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useNavigate, useParams } from "react-router-dom";
import { 
  MdArrowBack, MdSearch, MdLocationOn, MdPerson, 
  MdGroups, MdFilterList, MdEventNote 
} from "react-icons/md";

// Updated to match your AssignDuty.tsx structure
interface TaskRecord {
  id: string;
  driverId: string;
  status: string;
  tourLocation: string;
  tourTime: string;
  paxNo: string;
  passenger: {
    name: string;
    phone: string;
  };
  createdAt: any;
  driverName?: string;
}

export default function DutyRecords() {
  const navigate = useNavigate();
  const { status } = useParams(); 
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qDrivers = query(collection(db, "users"), where("role", "==", "driver"));
    const qTasks = query(collection(db, "tasks"), orderBy("createdAt", "desc"));

    const unsubDrivers = onSnapshot(qDrivers, (driverSnap) => {
      const drivers = driverSnap.docs.map(d => ({ id: d.id, name: d.data().name }));

      const unsubTasks = onSnapshot(qTasks, (taskSnap) => {
        const allTasks = taskSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TaskRecord[];

        const filtered = allTasks
          .filter(t => (status === "all" ? true : t.status === status))
          .map(t => ({
            ...t,
            driverName: drivers.find(d => d.id === t.driverId)?.name || "Unknown Driver"
          }));

        setTasks(filtered);
        setLoading(false);
      });
      return () => unsubTasks();
    });
    return () => unsubDrivers();
  }, [status]);

  const filteredTasks = tasks.filter(t => 
    t.passenger?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.driverName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tourLocation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="h-1.5 w-full bg-blue-600"></div>
      <div className="max-w-5xl mx-auto px-6 py-10">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/admin-dashboard")} className="p-3 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all">
              <MdArrowBack size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 capitalize">
                {status === 'all' ? 'Total Duties' : `${status?.replace('-', ' ')} Duties`}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <MdFilterList /> Operational Records
              </p>
            </div>
          </div>
          <div className="bg-white px-5 py-2 rounded-2xl border border-slate-100 shadow-sm text-center">
            <span className="text-xl font-black text-blue-600 block leading-none">{filteredTasks.length}</span>
            <span className="text-[9px] font-black text-slate-400 uppercase">Results</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <MdSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
          <input 
            type="text"
            placeholder="Search by passenger, location or driver..."
            className="w-full h-16 bg-white border border-slate-200 rounded-2xl pl-14 pr-6 font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTasks.map(task => (
              <div key={task.id} className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                    task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {task.status}
                  </div>
                  <p className="text-[10px] font-bold text-slate-300">REF: {task.id.slice(-6).toUpperCase()}</p>
                </div>

                <div className="mb-4">
                  <h3 className="text-xl font-black text-slate-800 leading-tight">{task.passenger?.name}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-[11px] font-black text-slate-400 uppercase tracking-tight">
                      <MdGroups className="text-blue-500" size={16}/> <h3>{task.passenger.heads}</h3>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-black text-slate-400 uppercase tracking-tight">
                      <MdEventNote className="text-blue-500" size={16}/> {task.tourTime}
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                  <div className="flex items-start gap-3 text-sm text-slate-600 font-bold">
                    <MdLocationOn className="text-red-500 mt-1" size={18} /> 
                    <span>{task.tourLocation}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                      <MdPerson size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Driver Assigned</p>
                      <p className="text-sm font-black text-slate-700">{task.driverName}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredTasks.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
            <p className="text-slate-400 font-bold">No duty records found for this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}