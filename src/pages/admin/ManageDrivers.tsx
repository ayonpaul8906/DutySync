import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useNavigate, useParams } from "react-router-dom";
import {
  MdArrowBack,
  MdSearch,
  MdChevronRight,
  MdLocationOn,
  MdFiberManualRecord,
  MdPeople,
} from "react-icons/md";

interface Driver {
  id: string;
  name: string;
  email: string;
  totalKms?: number;
  status?: "active" | "on-duty" | "offline";
  isVisible?: boolean; // For filtering
}

export default function ManageDrivers() {
  const navigate = useNavigate();
  const { statusFilter } = useParams(); // 'all', 'completed', 'in-progress', or 'assigned'
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch all drivers
    const qDrivers = query(collection(db, "users"), where("role", "==", "driver"));
    // 2. Fetch all tasks to check current active statuses
    const qTasks = collection(db, "tasks");

    const unsubDrivers = onSnapshot(qDrivers, (driverSnap) => {
      const driverList = driverSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Driver, "id">),
      }));

      const unsubTasks = onSnapshot(qTasks, (taskSnap) => {
        const taskList = taskSnap.docs.map(d => d.data());

        const filteredList = driverList.map(driver => {
          const driverTasks = taskList.filter(t => t.driverId === driver.id);
          
          // Logic: Does this driver have a task matching the filter?
          let isVisible = true;
          if (statusFilter && statusFilter !== "all") {
             isVisible = driverTasks.some(t => t.status === statusFilter);
          }

          // UI Status: If they have an 'in-progress' task, show 'on-duty'
          const uiStatus = driverTasks.some(t => t.status === 'in-progress') ? 'on-duty' : 'active';

          return { ...driver, status: uiStatus as any, isVisible };
        }).filter(d => d.isVisible);

        setDrivers(filteredList);
        setLoading(false);
      });

      return () => unsubTasks();
    });

    return () => unsubDrivers();
  }, [statusFilter]);

  const filteredDrivers = drivers.filter((d) =>
    d.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <div className="h-1.5 w-full bg-blue-600"></div>
      <div className="max-w-4xl mx-auto px-6 py-10">
        
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-5">
            <button
              onClick={() => navigate("/admin-dashboard")}
              className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 transition-all"
            >
              <MdArrowBack size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {statusFilter && statusFilter !== 'all' ? (
                   <span className="capitalize text-blue-600">{statusFilter.replace('-', ' ')}</span>
                ) : 'Fleet'} Personnel
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mt-1">
                Filter: {statusFilter || 'All'}
              </p>
            </div>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <span className="text-2xl font-black text-slate-900 leading-none">{drivers.length}</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Found</span>
          </div>
        </div>

        <div className="relative group mb-8">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
            <MdSearch size={22} />
          </div>
          <input
            className="w-full h-16 bg-white border border-slate-200 rounded-[1.25rem] pl-14 pr-6 text-slate-800 font-semibold placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600 shadow-sm transition-all"
            placeholder="Search filtered drivers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Applying Filters</p>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-100 shadow-sm">
            <MdPeople className="text-slate-200 text-6xl mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No personnel found</h3>
            <p className="text-slate-500 text-sm mt-1">No drivers match the current status filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredDrivers.map((driver) => (
              <DriverCard
                key={driver.id}
                driver={driver}
                onView={() => navigate(`/admin/driver-details/${driver.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DriverCard({ driver, onView }: { driver: Driver; onView: () => void; }) {
  const status = driver.status || "active";
  const statusConfig: any = {
    "on-duty": { container: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-500" },
    "active": { container: "bg-green-50 text-green-700 border-green-100", dot: "bg-green-500" },
    "offline": { container: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400" }
  };
  const currentStatus = statusConfig[status] || statusConfig["active"];

  return (
    <div onClick={onView} className="group bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer">
      <div className="flex items-center gap-5">
        <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
              <span className="text-xl font-black text-blue-600">{driver.name?.charAt(0) || "?"}</span>
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${currentStatus.dot}`}></div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <p className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{driver.name}</p>
            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${currentStatus.container}`}>
              <MdFiberManualRecord size={10} /> {status}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500">{driver.email}</p>
        </div>
        <MdChevronRight size={24} className="text-slate-300 group-hover:text-blue-600" />
      </div>
      <div className="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <MdLocationOn size={18} className="text-slate-400" />
            <div>
                <p className="text-xs font-black text-slate-900">{driver.totalKms || 0} KM</p>
                <p className="text-[9px] font-black text-slate-400 uppercase">Total Lifetime</p>
            </div>
        </div>
      </div>
    </div>
  );
}