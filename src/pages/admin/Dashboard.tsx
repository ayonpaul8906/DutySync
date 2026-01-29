import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import {
  MdLogout,
  MdCheckCircleOutline,
  MdOutlineMap,
  MdOutlineErrorOutline,
  MdOutlineAddCircle,
  MdGroups,
  MdLocationOn,
  MdBarChart,
} from "react-icons/md";

interface DashboardStats {
  total: number;       // drivers that have at least one task
  completed: number;   // drivers whose latest task is completed
  inProgress: number;  // drivers whose latest task is in-progress
  pending: number;     // drivers whose latest task is assigned
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
  });

useEffect(() => {
  const qDrivers = query(collection(db, "users"), where("role", "==", "driver"));
  const qTasks = query(collection(db, "tasks"), orderBy("createdAt", "desc"));

  const unsubDrivers = onSnapshot(qDrivers, (driverSnap) => {
    const drivers = driverSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name,
    }));

    const unsubTasks = onSnapshot(qTasks, (taskSnap) => {
      const allTasks = taskSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as any[];

      // Group tasks by driverId
      const tasksByDriver: Record<string, any[]> = {};
      allTasks.forEach((task) => {
        if (!task.driverId) return;
        if (!tasksByDriver[task.driverId]) tasksByDriver[task.driverId] = [];
        tasksByDriver[task.driverId].push(task);
      });

      // Build "latest task per driver" list (same as DutyRecords `status === "all"`)
      const latestTasksPerDriver: { driverId: string; status: string }[] = [];

      Object.keys(tasksByDriver).forEach((driverId) => {
        const driverTasks = tasksByDriver[driverId];

        const sorted = [...driverTasks].sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        });

        const latest = sorted[0];
        if (latest) {
          latestTasksPerDriver.push({
            driverId,
            status: latest.status,
          });
        }
      });

      // Now count by latest status
      const total = latestTasksPerDriver.length;
      const completed = latestTasksPerDriver.filter((t) => t.status === "completed").length;
      const inProgress = latestTasksPerDriver.filter((t) => t.status === "in-progress").length;
      const pending = latestTasksPerDriver.filter((t) => t.status === "assigned").length;

      setStats({
        total,
        completed,
        inProgress,
        pending,
      });
    });

    return () => unsubTasks();
  });

  return () => unsubDrivers();
}, []);


  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"></div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header Section */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                System Live • Admin Portal
              </p>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              AMPL <span className="text-blue-600">Control</span>
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition-all duration-300 shadow-sm"
          >
            <span className="text-sm font-bold">Logout</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-red-100 transition-colors">
              <MdLogout className="text-lg" />
            </div>
          </button>
        </div>

        {/* ================= STATS GRID (DRIVER-WISE LATEST STATUS) ================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <StatCard
            title="Total Tasks"
            value={stats.total}
            icon={<MdGroups />}
            color="indigo"
            onClick={() => navigate("/duty-records/all")}
          />
          <StatCard
            title="Active"
            value={stats.completed}
            icon={<MdCheckCircleOutline />}
            color="green"
            onClick={() => navigate("/duty-records/completed")}
          />
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            icon={<MdOutlineMap />}
            color="amber"
            onClick={() => navigate("/duty-records/in-progress")}
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={<MdOutlineErrorOutline />}
            color="slate"
            onClick={() => navigate("/duty-records/assigned")}
          />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Management Console</h2>
          <div className="h-[1px] flex-1 bg-slate-200"></div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <button
            onClick={() => navigate("/live-tracking")}
            className="group relative overflow-hidden flex flex-col items-start p-6 rounded-3xl bg-slate-900 text-white shadow-2xl shadow-slate-200 hover:scale-[1.02] transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4 backdrop-blur-md">
              <MdLocationOn className="text-2xl text-blue-400" />
            </div>
            <span className="text-lg font-bold">Live Tracking</span>
            <span className="text-slate-400 text-xs font-medium">GPS tracking</span>
          </button>

          <button
            onClick={() => navigate("/assign-duty")}
            className="group relative overflow-hidden flex flex-col items-start p-6 rounded-3xl bg-blue-600 text-white shadow-2xl shadow-blue-100 hover:scale-[1.02] transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4 backdrop-blur-md">
              <MdOutlineAddCircle className="text-2xl text-white" />
            </div>
            <span className="text-lg font-bold">Dispatch Duty</span>
            <span className="text-blue-100 text-xs font-medium">New tasks</span>
          </button>

          <button
            onClick={() => navigate("/manage-drivers")}
            className="group flex flex-col items-start p-6 rounded-3xl bg-white border border-slate-200 text-slate-800 shadow-sm hover:bg-slate-50 hover:border-blue-200 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-blue-50 transition-colors">
              <MdGroups className="text-2xl text-slate-600 group-hover:text-blue-600" />
            </div>
            <span className="text-lg font-bold text-slate-900">Manage Drivers</span>
            <span className="text-slate-500 text-xs font-medium">Personnel records</span>
          </button>

          <button
            onClick={() => navigate("/daywise-report")}
            className="group flex flex-col items-start p-6 rounded-3xl bg-white border border-slate-200 text-slate-800 shadow-sm hover:bg-indigo-50 hover:border-indigo-200 transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
              <MdBarChart className="text-2xl text-indigo-600" />
            </div>
            <span className="text-lg font-bold text-slate-900">Daywise Report</span>
            <span className="text-slate-500 text-xs font-medium">Analytics & Exports</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, onClick }: any) {
  const colorMap: any = {
    indigo: { icon: "text-indigo-600 bg-indigo-100", border: "border-indigo-100" },
    green: { icon: "text-green-600 bg-green-100", border: "border-green-100" },
    amber: { icon: "text-amber-600 bg-amber-100", border: "border-amber-100" },
    slate: { icon: "text-slate-600 bg-slate-200", border: "border-slate-200" },
  };

  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer bg-white p-6 rounded-[2rem] border ${colorMap[color].border} shadow-sm overflow-hidden group hover:shadow-md transition-all active:scale-95`}
    >
      <div
        className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300 ${colorMap[color].icon}`}
      >
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
      <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.15em]">
        {title}
      </p>
    </div>
  );
}
