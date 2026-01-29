import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useNavigate, useParams } from "react-router-dom";
import {
  MdArrowBack,
  MdSearch,
  MdLocationOn,
  MdPerson,
  MdGroups,
  MdFilterList,
  MdEventNote,
} from "react-icons/md";

interface TaskRecord {
  id: string;
  status: string;
  tourLocation?: string;
  tourTime?: string;
  passenger?: {
    name?: string;
    phone?: string;
    heads?: number;
  };
  createdAt?: any;
  date?: string;
  pickup?: string;
  drop?: string;
}

export default function DriverDutyRecords() {
  const navigate = useNavigate();
  const { mode } = useParams(); // "all" | "active"
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const qTasks = query(
      collection(db, "tasks"),
      where("driverId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(qTasks, (snap) => {
      let list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<TaskRecord, "id">),
      }));

      if (mode === "active") {
        list = list.filter(
          (t) => t.status === "assigned" || t.status === "in-progress"
        );
      }

      setTasks(list);
      setLoading(false);
    });

    return () => unsub();
  }, [mode]);

  const filteredTasks = tasks.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.passenger?.name?.toLowerCase().includes(q) ||
      t.tourLocation?.toLowerCase().includes(q) ||
      `${t.pickup || ""} ${t.drop || ""}`.toLowerCase().includes(q)
    );
  });

  const title =
    mode === "active" ? "My Active Duties" : "My All Duties";

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="h-1.5 w-full bg-blue-600"></div>
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/driver-dashboard")}
              className="p-3 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all text-slate-600"
            >
              <MdArrowBack size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                {title}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <MdFilterList className="text-blue-600" />
                Personal duty history
              </p>
            </div>
          </div>
          <div className="bg-white px-5 py-2 rounded-2xl border border-slate-100 shadow-sm text-center">
            <span className="text-xl font-black text-blue-600 block leading-none">
              {filteredTasks.length}
            </span>
            <span className="text-[9px] font-black text-slate-400 uppercase">
              Entries
            </span>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative mb-8">
          <MdSearch
            className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
            size={24}
          />
          <input
            type="text"
            placeholder="Search my duties..."
            className="w-full h-16 bg-white border border-slate-200 rounded-2xl pl-14 pr-6 font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-sm"
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* LIST */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Loading your duties...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div
                    className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                      task.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : task.status === "in-progress"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {task.status}
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-xl font-black text-slate-800 leading-tight">
                    {task.passenger?.name || "Corporate Guest"}
                  </h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-[11px] font-black text-slate-400 uppercase tracking-tight">
                      <MdGroups className="text-blue-500" size={16} />
                      <span>{task.passenger?.heads || 0}</span>
                    </div>
                    {task.tourTime && (
                      <div className="flex items-center gap-1 text-[11px] font-black text-slate-400 uppercase tracking-tight">
                        <MdEventNote className="text-blue-500" size={16} />{" "}
                        {task.tourTime}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100/50">
                  <div className="flex items-start gap-3 text-sm text-slate-600 font-bold">
                    <MdLocationOn
                      className="text-red-500 mt-1 flex-shrink-0"
                      size={18}
                    />
                    <span>
                      {task.tourLocation ||
                        `${task.pickup || ""} → ${task.drop || ""}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-200">
                      <MdPerson size={20} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">
                        You
                      </p>
                      <p className="text-sm font-black text-slate-700">
                        AMPL Driver
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] font-bold text-slate-300 bg-slate-50 px-2 py-1 rounded-md">
                    ID: {task.id.slice(-6).toUpperCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredTasks.length === 0 && (
          <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-inner mt-6">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MdFilterList className="text-slate-200" size={40} />
            </div>
            <p className="text-slate-400 font-black uppercase text-sm tracking-widest">
              Zero entries found
            </p>
            <p className="text-slate-300 text-xs font-bold mt-2 tracking-tight">
              No duties match your current filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
