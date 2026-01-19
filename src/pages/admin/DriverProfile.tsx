import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { 
  MdArrowBack, MdHistory, MdLocationOn, 
  MdCircle, MdAccessTime, MdGroups, MdOutlineEmail
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
//   const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId) return;

    const unsubDriver = onSnapshot(doc(db, "users", driverId), (snap) => {
      setDriver(snap.data());
    });

    const q = query(
      collection(db, "tasks"), 
      where("driverId", "==", driverId), 
      orderBy("createdAt", "desc")
    );

    const unsubTasks = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Task[]);
      setLoading(false);
    });

    return () => { unsubDriver(); unsubTasks(); };
  }, [driverId]);

  const activeTask = tasks.find(t => t.status === "in-progress" || t.status === "assigned");
  const pastTasks = tasks.filter(t => t.status === "completed");

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-10">
      {/* Slim Header Navigation */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="hover:bg-slate-100 p-2 rounded-lg transition-colors">
            <MdArrowBack size={20} className="text-slate-600"/>
          </button>
          <h2 className="font-bold text-slate-800">Driver Profile</h2>
        </div>
        <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase text-slate-400">Live Status</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Profile Info Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 flex flex-wrap items-center gap-6 shadow-sm">
          <div className="h-16 w-16 rounded-xl bg-slate-900 text-white flex items-center justify-center text-2xl font-black">
            {driver?.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-xl font-black text-slate-900 leading-tight">{driver?.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-slate-500">
              <span className="text-xs flex items-center gap-1 font-bold"><MdOutlineEmail/> {driver?.email}</span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">ID: {driverId?.slice(-6).toUpperCase()}</span>
            </div>
          </div>
          <div className="flex gap-4 border-l border-slate-100 pl-6">
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase">Total Duties</p>
              <p className="text-lg font-black text-slate-800">{tasks.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sidebar Area: Current Duty (More compact) */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <MdCircle className="text-blue-500" size={10}/> Ongoing Duty
            </h3>
            
            {activeTask ? (
              <div className="bg-white border-2 border-blue-600 rounded-2xl p-5 shadow-lg shadow-blue-50">
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${activeTask.status === 'in-progress' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {activeTask.status}
                  </span>
                  <MdAccessTime className="text-slate-300" size={18}/>
                </div>
                <h4 className="font-black text-slate-900 truncate">{activeTask.passenger?.name}</h4>
                <div className="mt-3 space-y-2">
                  <div className="flex items-start gap-2 text-xs font-bold text-slate-600">
                    <MdLocationOn className="text-blue-500 flex-shrink-0" size={16}/>
                    <span className="leading-tight">{activeTask.tourLocation}</span>
                  </div>
                  <div className="flex items-center gap-4 pt-3 border-t border-slate-50">
                    <div className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><MdGroups size={14}/> {activeTask.paxNo} Pax</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><MdAccessTime size={14}/> {activeTask.tourTime}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-200/50 border border-dashed border-slate-300 rounded-2xl p-6 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase">No Active Task</p>
              </div>
            )}
          </div>

          {/* Main Area: History Table style */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <MdHistory className="text-slate-500" size={14}/> Duty History Log
            </h3>
            
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase">Passenger / Date</th>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase">Location</th>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pastTasks.length > 0 ? (
                      pastTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4">
                            <p className="text-sm font-black text-slate-800">{task.passenger?.name}</p>
                            <p className="text-[10px] font-bold text-slate-400">
                              {task.createdAt?.seconds ? new Date(task.createdAt.seconds * 1000).toLocaleDateString('en-GB') : 'N/A'}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                              <MdLocationOn className="text-slate-300" size={14}/> {task.tourLocation}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded uppercase">Completed</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-5 py-10 text-center text-slate-400 text-xs font-bold italic">
                          No historical logs found for this driver.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}