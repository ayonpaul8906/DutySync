import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "../../services/firebase";
import { useNavigate } from "react-router-dom";
import {
  MdChevronLeft,
  MdCalendarMonth,
} from "react-icons/md";

/* ================= TYPES ================= */

interface Task {
  id: string;
  passengerName: string;
  pickup: string;
  drop: string;
  status: "assigned" | "in-progress" | "completed";
  date?: string;
}

/* ================= COMPONENT ================= */

export default function MyDuties() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    /**
     * NOTE:
     * Keeping SAME logic as your mobile app
     * (filter by driverName instead of driverId)
     */
    const q = query(
      collection(db, "tasks"),
      where("driverName", "==", user.displayName || "")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Task, "id">),
        }));

        // Assigned & In-progress first
        list.sort((a, b) => {
          if (a.status === "completed" && b.status !== "completed") return 1;
          if (a.status !== "completed" && b.status === "completed") return -1;
          return 0;
        });

        setTasks(list);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <div className="flex items-center gap-3 px-5 py-4 bg-white border-b">
        <button onClick={() => navigate(-1)}>
          <MdChevronLeft className="text-3xl text-slate-900" />
        </button>
        <h1 className="text-xl font-bold text-slate-900">
          Duty History
        </h1>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div className="flex justify-center items-center h-[60vh]">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
          <MdCalendarMonth className="text-6xl text-slate-300 mb-3" />
          <p className="text-slate-400 text-lg">
            No duties found in your record.
          </p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-5 py-6 space-y-5">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => {
                if (task.status !== "completed") {
                  navigate("/driver/dashboard");
                }
              }}
              className="bg-white rounded-2xl p-4 shadow border cursor-pointer hover:shadow-md transition"
            >
              <p className="font-bold text-slate-900">
                {task.passengerName || "Passenger"}
              </p>

              <p className="text-sm text-slate-500 mt-1">
                {task.pickup} → {task.drop}
              </p>

              <div className="mt-3">
                <StatusBadge status={task.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= STATUS BADGE ================= */

function StatusBadge({ status }: { status: Task["status"] }) {
  const base =
    "inline-block text-xs font-bold uppercase px-3 py-1 rounded-full";

  if (status === "completed") {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-700`}>
        Completed
      </span>
    );
  }

  if (status === "in-progress") {
    return (
      <span className={`${base} bg-amber-100 text-amber-700`}>
        In Progress
      </span>
    );
  }

  return (
    <span className={`${base} bg-blue-100 text-blue-700`}>
      Assigned
    </span>
  );
}
