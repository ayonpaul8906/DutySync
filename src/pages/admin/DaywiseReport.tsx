import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import { MdArrowBack, MdFileDownload, MdEvent } from "react-icons/md";
import * as XLSX from "xlsx";

export default function DaywiseReport() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const qTasks = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
    const qDrivers = query(collection(db, "users"), where("role", "==", "driver"));

    const unsubDrivers = onSnapshot(qDrivers, (driverSnap) => {
      const drivers = driverSnap.docs.map(d => ({ id: d.id, name: d.data().name }));

      const unsubTasks = onSnapshot(qTasks, (taskSnap) => {
        const allTasks = taskSnap.docs.map(doc => {
          const data = doc.data();
          const taskDate = data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : data.date;
          return { id: doc.id, ...data, dateOnly: taskDate };
        });

        const filtered = allTasks
          .filter(t => t.dateOnly === selectedDate)
          .map(t => ({
            ...t,
            driverName: drivers.find(d => d.id === t.driverId)?.name || "Not Assigned"
          }));

        setTasks(filtered);
        setLoading(false);
      });
      return () => unsubTasks();
    });
    return () => unsubDrivers();
  }, [selectedDate]);

  const exportToExcel = () => {
    if (tasks.length === 0) {
      alert("No data to export for the selected date");
      return;
    }

    const reportData = tasks.map(t => {
      const opening = t.openingKm || 0;
      const closing = t.closingKm || 0;
      const totalKm = closing > 0 && opening >= 0 ? closing - opening : 0;

      return {
        "Date": t.dateOnly,
        "Passenger Name": t.passenger?.name || "",
        "Driver": t.driverName,
        "Location": t.tourLocation || "",
        "Time": t.tourTime || "",
        "Heads": t.passenger?.heads || 0,
        "Status": t.status?.toUpperCase() || "PENDING",
        "Opening KM": opening,
        "Closing KM": closing,
        "Total KM": totalKm,
        "Fuel Quantity": t.fuelQuantity || 0,
        "Fuel Amount": t.fuelAmount || 0
      };
    });

    try {
      const ws = XLSX.utils.json_to_sheet(reportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Daywise Report");
      XLSX.writeFile(wb, `AMPL_Report_${selectedDate}.xlsx`);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export Excel file");
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="h-1.5 w-full bg-indigo-600"></div>
      <div className="max-w-6xl mx-auto px-6 py-10">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/admin-dashboard")} className="p-3 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all">
              <MdArrowBack size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Daywise <span className="text-indigo-600">Report</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operational Analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <MdEvent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 font-bold text-slate-700 outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>
            <button 
              onClick={exportToExcel}
              disabled={tasks.length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
            >
              <MdFileDownload size={20}/> Export Excel
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Passenger / Driver</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Location</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Usage (KM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold">Syncing Records...</td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan={4} className="py-20 text-center text-slate-400 font-bold">No records for {selectedDate}</td></tr>
              ) : tasks.map(task => (
                <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-black text-slate-900 leading-none">{task.passenger?.name}</p>
                    <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-tight">{task.driverName}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-slate-600">{task.tourLocation}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{task.tourTime}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                      task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900 text-sm">
                    {task.closingKm ? `${task.closingKm - task.openingKm} KM` : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}