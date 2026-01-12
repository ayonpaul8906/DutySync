import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, query } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import {
  MdPowerSettingsNew,
  MdCheckCircleOutline,
  MdOutlineMap,
  MdOutlineErrorOutline,
  MdOutlineAddCircle,
  MdGroups,
  MdLocationOn,
} from "react-icons/md";

interface DashboardStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
  });

  // 🔥 Real-time fleet stats
  useEffect(() => {
    const q = query(collection(db, "tasks"));
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => d.data());
      setStats({
        total: docs.length,
        completed: docs.filter((d) => d.status === "completed").length,
        inProgress: docs.filter((d) => d.status === "in-progress").length,
        pending: docs.filter((d) => d.status === "assigned").length,
      });
    });

    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-5 py-6">

        {/* ================= HEADER ================= */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              System Administrator
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              AMPL Fleet Control
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center hover:scale-105 transition"
          >
            <MdPowerSettingsNew className="text-red-500 text-xl" />
          </button>
        </div>

        {/* ================= STATS GRID ================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Duties"
            value={stats.total}
            icon={<MdCheckCircleOutline />}
            color="indigo"
          />
          <StatCard
            title="Completed"
            value={stats.completed}
            icon={<MdCheckCircleOutline />}
            color="green"
          />
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            icon={<MdOutlineMap />}
            color="amber"
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={<MdOutlineErrorOutline />}
            color="slate"
          />
        </div>

        {/* ================= ACTIONS ================= */}
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          Management Console
        </h2>

        <div className="flex flex-col gap-4">

          {/* Live Tracking */}
          <button
            onClick={() => navigate("/live-tracking")}
            className="flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-slate-900 text-white font-bold text-base shadow hover:scale-[1.02] transition"
          >
            <MdLocationOn className="text-xl" />
            Live Fleet Tracking
          </button>

          {/* Assign Duty */}
          <button
            onClick={() => navigate("/assign-duty")}
            className="flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-blue-600 text-white font-bold text-base shadow hover:scale-[1.02] transition"
          >
            <MdOutlineAddCircle className="text-xl" />
            Assign New Duty
          </button>

          {/* Manage Drivers */}
          <button
            onClick={() => navigate("/manage-drivers")}
            className="flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-white border-2 border-slate-200 text-slate-800 font-bold text-base hover:bg-slate-100 transition"
          >
            <MdGroups className="text-xl" />
            Manage Drivers
          </button>

        </div>
      </div>
    </div>
  );
}

/* ================= STAT CARD ================= */

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  color: "indigo" | "green" | "amber" | "slate";
}) {
  const colorMap: any = {
    indigo: "text-indigo-500 bg-indigo-100",
    green: "text-green-500 bg-green-100",
    amber: "text-amber-500 bg-amber-100",
    slate: "text-slate-500 bg-slate-200",
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}
      >
        <span className="text-xl">{icon}</span>
      </div>

      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">
        {title}
      </p>
    </div>
  );
}
