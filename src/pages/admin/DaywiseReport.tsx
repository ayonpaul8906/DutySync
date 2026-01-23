import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import { MdArrowBack, MdFileDownload, MdEvent, MdTimeline } from "react-icons/md";
import * as XLSX from "xlsx";

interface Task {
  id: string;
  driverId?: string;
  driverName?: string;
  dateOnly: string;
  createdAt?: any;
  passenger?: {
    name?: string;
    heads?: number;
  };
  tourLocation?: string;
  tourTime?: string;
  status?: string;
  openingKm?: number;
  closingKm?: number;
  fuelQuantity?: number;
  fuelAmount?: number;
}

export default function DaywiseReport() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date Range States
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [activePreset, setActivePreset] = useState<string>("today");

  // Presets Configuration
  const presets = [
    { label: 'Today', value: 0, id: 'today' },
    { label: '1 Week', value: 7, id: 'week' },
    { label: '1 Month', value: 30, id: 'month' },
    { label: '1 Year', value: 'year', id: 'year' }
  ];

  const setPreset = (days: number | string, id: string) => {
    const end = new Date();
    const start = new Date();
    
    if (days === 'year') {
      start.setFullYear(start.getFullYear() - 1);
    } else if (typeof days === 'number') {
      start.setDate(start.getDate() - days);
    }

    setEndDate(end.toISOString().split("T")[0]);
    setStartDate(start.toISOString().split("T")[0]);
    setActivePreset(id);
  };

  useEffect(() => {
    const qTasks = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const qDrivers = query(collection(db, "users"), where("role", "==", "driver"));

    const unsubDrivers = onSnapshot(qDrivers, (driverSnap) => {
      const drivers = driverSnap.docs.map((d) => ({
        id: d.id,
        name: d.data().name,
      }));

      const unsubTasks = onSnapshot(qTasks, (taskSnap) => {
        const allTasks: Task[] = taskSnap.docs.map((doc) => {
          const data = doc.data();
          const taskDate = data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString().split("T")[0]
            : data.date;
          return { id: doc.id, ...data, dateOnly: taskDate };
        });

        // Filter by Date Range
        const filtered = allTasks
          .filter((t) => t.dateOnly >= startDate && t.dateOnly <= endDate)
          .map((t) => ({
            ...t,
            driverName: drivers.find((d) => d.id === t.driverId)?.name || "Not Assigned",
          }));

        setTasks(filtered);
        setLoading(false);
      });
      return () => unsubTasks();
    });
    return () => unsubDrivers();
  }, [startDate, endDate]);

  const exportToExcel = () => {
    if (tasks.length === 0) {
      alert("No data to export for the selected range");
      return;
    }

    const reportData = tasks.map((t) => {
      const opening = t.openingKm || 0;
      const closing = t.closingKm || 0;
      const totalKm = closing > 0 && opening >= 0 ? closing - opening : 0;

      return {
        Date: t.dateOnly,
        "Passenger Name": t.passenger?.name || "",
        Driver: t.driverName,
        Location: t.tourLocation || "",
        Time: t.tourTime || "",
        Status: t.status?.toUpperCase() || "PENDING",
        "Opening KM": opening,
        "Closing KM": closing,
        "Total KM": totalKm,
        "Fuel (L)": t.fuelQuantity || 0,
        "Fuel Amount": t.fuelAmount || 0,
      };
    });

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fleet Report");
    XLSX.writeFile(wb, `Fleet_Report_${startDate}_to_${endDate}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="h-1.5 w-full bg-indigo-600"></div>
      
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin-dashboard")}
              className="p-3 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all active:scale-95"
            >
              <MdArrowBack size={24} className="text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Fleet <span className="text-indigo-600">Analytics</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <MdTimeline /> Tracking {tasks.length} active records
              </p>
            </div>
          </div>

          <button
            onClick={exportToExcel}
            disabled={tasks.length === 0}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:shadow-none"
          >
            <MdFileDownload size={20} /> Export Excel
          </button>
        </div>

        {/* DATE CONTROLS CARD */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 mb-8">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            
            {/* Custom Date Pickers */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <label className="absolute -top-2.5 left-4 bg-white px-2 text-[9px] font-black text-indigo-500 uppercase z-10">From Date</label>
                <div className="relative">
                  <MdEvent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setActivePreset("custom"); }}
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="h-px w-4 bg-slate-300 hidden sm:block"></div>

              <div className="relative">
                <label className="absolute -top-2.5 left-4 bg-white px-2 text-[9px] font-black text-indigo-500 uppercase z-10">To Date</label>
                <div className="relative">
                  <MdEvent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setActivePreset("custom"); }}
                    className="bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Quick Range Presets */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Filter Presets</span>
              <div className="flex flex-wrap items-center gap-2">
                {presets.map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setPreset(btn.value, btn.id)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all border ${
                      activePreset === btn.id
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 -translate-y-0.5"
                        : "bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">Details</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">Assigned Driver</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">Duty Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-tighter text-right">Trip Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-bold text-sm">Loading fleet records...</p>
                      </div>
                    </td>
                  </tr>
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-24 text-center">
                      <p className="text-slate-300 font-black text-lg uppercase tracking-widest">No Records Found</p>
                      <p className="text-slate-400 text-xs font-bold mt-1">Try selecting a different date range.</p>
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-indigo-500 mb-1">{task.dateOnly}</span>
                          <span className="font-black text-slate-900 text-base">{task.passenger?.name || 'Corporate Guest'}</span>
                          <span className="text-xs font-bold text-slate-400">{task.tourLocation || 'Location Pending'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-[10px]">
                            {task.driverName?.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-slate-600">{task.driverName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tight ${
                          task.status === "completed" 
                            ? "bg-emerald-100 text-emerald-700" 
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {task.status || 'Assigned'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-slate-900">
                        {task.closingKm && task.openingKm 
                          ? `${(task.closingKm - task.openingKm).toFixed(1)} KM` 
                          : <span className="text-slate-300">--</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}