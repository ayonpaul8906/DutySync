import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useNavigate, useParams } from "react-router-dom";
import { 
  MdArrowBack, MdSearch, MdLocationOn, MdPerson, 
  MdAccessTime, MdOutlineHistory, MdFilterList 
} from "react-icons/md";

interface TaskRecord {
  id: string;
  driverId: string;
  status: string;
  customerName: string;
  pickupLocation: string;
  dropLocation: string;
  timestamp: any;
  driverName?: string;
}

export default function DutyRecords() {
  const navigate = useNavigate();
  const { status } = useParams(); // 'all', 'completed', 'in-progress', 'assigned'
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Drivers and Tasks
    const qDrivers = query(collection(db, "users"), where("role", "==", "driver"));
    const qTasks = collection(db, "tasks");

    const unsubDrivers = onSnapshot(qDrivers, (driverSnap) => {
      const drivers = driverSnap.docs.map(d => ({ id: d.id, name: d.data().name }));

      const unsubTasks = onSnapshot(qTasks, (taskSnap) => {
        const allTasks = taskSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TaskRecord[];

        // Filter based on the dashboard click
        const filtered = allTasks
          .filter(t => (status === "all" ? true : t.status === status))
          .map(t => ({
            ...t,
            driverName: drivers.find(d => d.id === t.driverId)?.name || "Unassigned"
          }));

        setTasks(filtered);
        setLoading(false);
      });
      return () => unsubTasks();
    });
    return () => unsubDrivers();
  }, [status]);

  const filteredTasks = tasks.filter(t => 
    t.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.driverName?.toLowerCase().includes(searchQuery.toLowerCase())
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
          <div className="bg-white px-5 py-2 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-xl font-black text-blue-600">{filteredTasks.length}</span>
            <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase">Records</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <MdSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
          <input 
            type="text"
            placeholder="Search by customer or driver name..."
            className="w-full h-16 bg-white border border-slate-200 rounded-2xl pl-14 pr-6 font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map(task => (
              <div key={task.id} className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                    task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {task.status}
                  </div>
                  <p className="text-[10px] font-bold text-slate-300">ID: {task.id.slice(-6)}</p>
                </div>

                <h3 className="text-xl font-black text-slate-800 mb-2">{task.customerName}</h3>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <MdLocationOn className="text-blue-500" /> {task.pickupLocation}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400 ml-1">
                    <div className="w-1 h-4 border-l-2 border-dashed border-slate-300 ml-1"></div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <MdLocationOn className="text-red-500" /> {task.dropLocation}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                      <MdPerson size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Driver</p>
                      <p className="text-sm font-black text-slate-700">{task.driverName}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}