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
  MdAssignment,
  MdCheckCircle,
  MdHistory,
} from "react-icons/md";

interface Driver {
  id: string;
  name: string;
  email: string;
  totalKms?: number;
  status?: string;
}

interface Task {
  id: string;
  driverId: string;
  status: string;
  location?: string;
  date?: any;
  title?: string;
  customerName?: string;
  driverName?: string; // We will inject this from the users collection
}

export default function ManageDrivers() {
  const navigate = useNavigate();
  const { statusFilter } = useParams(); // 'all', 'completed', 'in-progress', 'assigned'
  const [data, setData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Drivers and Tasks in parallel
    const qDrivers = query(collection(db, "users"), where("role", "==", "driver"));
    const qTasks = collection(db, "tasks");

    const unsubDrivers = onSnapshot(qDrivers, (driverSnap) => {
      const driverList = driverSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Driver),
      }));

      const unsubTasks = onSnapshot(qTasks, (taskSnap) => {
        const taskList = taskSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];

        // Logic based on Filter
        if (statusFilter === "all" || statusFilter === "completed") {
          /* SHOW TASK-CENTRIC VIEW 
             This fulfills your request for:
             1. Completed part showing all previous details + driver
             2. Total duties showing everything + driver assigned
          */
          const combinedTasks = taskList
            .filter((t) => (statusFilter === "all" ? true : t.status === "completed"))
            .map((task) => {
              const assignedDriver = driverList.find((d) => d.id === task.driverId);
              return {
                ...task,
                driverName: assignedDriver?.name || "Unassigned",
                driverEmail: assignedDriver?.email,
                viewType: "task",
              };
            });
          
          setData(combinedTasks);
        } else {
          /* SHOW DRIVER-CENTRIC VIEW 
             For 'In Progress' and 'Pending', show the drivers involved
          */
          const filteredDrivers = driverList
            .map((driver) => {
              const activeTasks = taskList.filter(
                (t) => t.driverId === driver.id && t.status === statusFilter
              );
              return {
                ...driver,
                activeTasks,
                isVisible: activeTasks.length > 0,
                viewType: "driver",
              };
            })
            .filter((d) => d.isVisible);

          setData(filteredDrivers);
        }
        setLoading(false);
      });

      return () => unsubTasks();
    });

    return () => unsubDrivers();
  }, [statusFilter]);

  const filteredData = data.filter((item) => {
    const searchLower = searchQuery.toLowerCase();
    if (item.viewType === "task") {
      return (
        item.driverName?.toLowerCase().includes(searchLower) ||
        item.customerName?.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower)
      );
    }
    return item.name?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      <div className="h-1.5 w-full bg-blue-600"></div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-5">
            <button
              onClick={() => navigate("/admin-dashboard")}
              className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 transition-all shadow-sm"
            >
              <MdArrowBack size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {statusFilter === "all" ? "Total Duties" : statusFilter === "completed" ? "Duty History" : "Fleet Status"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className={`h-2 w-2 rounded-full ${statusFilter === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  {statusFilter?.replace("-", " ")} Records
                </p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-slate-900 leading-none">{filteredData.length}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entries</p>
          </div>
        </div>

        {/* ================= SEARCH ================= */}
        <div className="relative mb-8">
          <MdSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
          <input
            className="w-full h-16 bg-white border border-slate-200 rounded-2xl pl-14 pr-6 text-slate-800 font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600 transition-all"
            placeholder="Search by driver name or duty ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* ================= CONTENT ================= */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching Data</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-slate-200">
            <MdHistory size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">No records found for this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredData.map((item) => (
              item.viewType === "task" ? (
                <TaskCard key={item.id} task={item} />
              ) : (
                <DriverCard key={item.id} driver={item} onView={() => navigate(`/admin/driver-details/${item.id}`)} />
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= COMPONENT: TASK CARD (For Completed & Total Duties) ================= */
function TaskCard({ task }: { task: any }) {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase tracking-tighter">
            ID: {task.id.slice(0, 8)}
          </span>
          <h3 className="text-lg font-black text-slate-900 mt-2">{task.customerName || "Untitled Duty"}</h3>
          <div className="flex items-center gap-2 text-slate-500 text-sm mt-1 font-medium">
            <MdLocationOn className="text-blue-500" />
            {task.location || "Location not set"}
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
          task.status === 'completed' ? 'bg-green-50 text-green-600 border border-green-100' : 
          task.status === 'in-progress' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
          'bg-slate-50 text-slate-500 border border-slate-200'
        }`}>
          {task.status}
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black">
          {task.driverName?.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-tighter leading-none">Driver Assigned</p>
          <p className="text-sm font-black text-slate-800">{task.driverName}</p>
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENT: DRIVER CARD (Existing) ================= */
function DriverCard({ driver, onView }: any) {
  return (
    <div onClick={onView} className="group bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all cursor-pointer">
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
          <span className="text-xl font-black text-blue-600">{driver.name?.charAt(0)}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <p className="font-black text-slate-900 text-lg">{driver.name}</p>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border bg-green-50 text-green-700 border-green-100 flex items-center gap-1.5">
              <MdFiberManualRecord size={10} /> Active
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500">{driver.email}</p>
        </div>
        <MdChevronRight size={24} className="text-slate-300" />
      </div>
    </div>
  );
}