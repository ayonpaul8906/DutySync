import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import {
  MdLogout,
  MdPlayCircle,
  MdFlag,
  MdClose,
  MdCheckCircle,
  MdAccessTime,
  MdMap,
} from "react-icons/md";

/* ================= TYPES ================= */

interface Task {
  id: string;
  tourLocation?: string;
  pickup?: string;
  drop?: string;
  status: "assigned" | "in-progress" | "completed";
  passenger?: { name?: string };
  date?: string;
  createdAt?: any;
} 

/* ================= HELPERS ================= */

function isToday(task: Task) {
  const today = new Date().toDateString();

  if (task.createdAt?.toDate) {
    return task.createdAt.toDate().toDateString() === today;
  }

  if (task.date) {
    return new Date(task.date).toDateString() === today;
  }

  return false;
}

/* ================= MAIN ================= */

export default function DriverDashboard() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalKms: 0,
    completed: 0,
    pending: 0,
  });

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [completion, setCompletion] = useState({
    openingKm: "",
    closingKm: "",
    fuelQuantity: "",
    amount: "",
  });

  /* ================= FIRESTORE ================= */

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setStats((s) => ({
          ...s,
          totalKms: snap.data().totalKms || 0,
        }));
      }
    });

    const q = query(
      collection(db, "tasks"),
      where("driverId", "==", user.uid)
    );

    const unsubTasks = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Task, "id">),
      }));

      const completed = list.filter((t) => t.status === "completed").length;
      const pending = list.filter((t) => t.status !== "completed").length;

      setStats((s) => ({ ...s, completed, pending }));
      setTasks(list);
      setLoading(false);
    });

    return () => {
      unsubUser();
      unsubTasks();
    };
  }, []);

  /* ================= ACTIONS ================= */

  async function startJourney(task: Task) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    await updateDoc(doc(db, "tasks", task.id), {
      status: "in-progress",
      startedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "drivers", uid), {
      activeStatus: "in-progress",
      active: false,
    });

    alert("Journey started");
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      alert("Failed to logout");
    }
  }

  async function completeJourney() {
    if (!selectedTask) return;

    const open = Number(completion.openingKm);
    const close = Number(completion.closingKm);

    if (!open || !close || close <= open) {
      alert("Invalid KM values");
      return;
    }

    const kms = close - open;
    const uid = auth.currentUser!.uid;

    try {
      setSubmitting(true);

      await updateDoc(doc(db, "tasks", selectedTask.id), {
        status: "completed",
        openingKm: open,
        closingKm: close,
        fuelQuantity: Number(completion.fuelQuantity) || 0,
        fuelAmount: Number(completion.amount) || 0,
        kilometers: kms,
        completedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "drivers", uid), {
        activeStatus: "active",
        active: true,
        totalKilometers: increment(kms),
      });

      await updateDoc(doc(db, "users", uid), {
        totalKms: increment(kms),
      });

      setShowModal(false);
      setCompletion({ openingKm: "", closingKm: "", fuelQuantity: "", amount: "" });
      alert("Journey completed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ================= SPLIT TASKS ================= */

  const todayTasks = tasks.filter(
    (t) => isToday(t) && t.status !== "completed"
  );

  const pastTasks = tasks.filter(
    (t) => !isToday(t) || t.status === "completed"
  );

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-6">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">
              Driver Console
            </p>
            <h1 className="text-2xl font-bold text-slate-900">
              {auth.currentUser?.displayName || "My Profile"}
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="p-3 bg-red-100 rounded-xl"
          >
            <MdLogout className="text-red-500 text-xl" />
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <Stat icon={<MdMap />} label="Total Kms" value={stats.totalKms} bg="bg-indigo-50" />
          <Stat icon={<MdCheckCircle />} label="Finished" value={stats.completed} bg="bg-emerald-50" />
          <Stat icon={<MdAccessTime />} label="Duties" value={stats.pending} bg="bg-amber-50" />
        </div>

        <h2 className="text-lg font-bold text-slate-800 mb-4">
          Task Roster
        </h2>

        {loading ? (
          <div className="flex justify-center mt-20">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* CURRENT */}
            <div>
              <h3 className="text-sm font-bold uppercase text-slate-500 mb-3">
                Current (Today)
              </h3>

              {todayTasks.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center text-slate-400">
                  No duties scheduled for today
                </div>
              ) : (
                <div className="space-y-5">
                  {todayTasks.map((task) => (
                    <div key={task.id} className="bg-white rounded-2xl shadow">
                      <div className="p-4">
                        <p className="font-bold">
                          {task.passenger?.name || "Passenger"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {task.tourLocation ?? (task.pickup && task.drop ? `${task.pickup} → ${task.drop}` : (task.pickup || task.drop || ""))}
                        </p>
                      </div>

                      {task.status === "assigned" && (
                        <button
                          onClick={() => startJourney(task)}
                          className="w-full py-4 bg-blue-600 text-white font-bold rounded-b-2xl flex justify-center gap-2"
                        >
                          <MdPlayCircle />
                          START JOURNEY
                        </button>
                      )}

                      {task.status === "in-progress" && (
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setShowModal(true);
                          }}
                          className="w-full py-4 bg-green-500 text-white font-bold rounded-b-2xl flex justify-center gap-2"
                        >
                          <MdFlag />
                          COMPLETE JOURNEY
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PAST */}
            <div>
              <h3 className="text-sm font-bold uppercase text-slate-500 mb-3">
                Past Duties
              </h3>

              {pastTasks.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center text-slate-400">
                  No past duties available
                </div>
              ) : (
                <div className="space-y-4">
                  {pastTasks.map((task) => (
                    <div key={task.id} className="bg-white rounded-2xl p-4 border">
                      <p className="font-bold text-slate-800">
                        {task.passenger?.name || "Passenger"}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {task.tourLocation ?? (task.pickup && task.drop ? `${task.pickup} → ${task.drop}` : (task.pickup || task.drop || ""))}
                      </p>
                      <span className="inline-block mt-3 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                        Completed
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-xl rounded-t-3xl p-6">
            <div className="flex justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">Trip Completion</h3>
                <p className="text-sm text-slate-500">Update trip logs</p>
              </div>
              <button onClick={() => setShowModal(false)}>
                <MdClose />
              </button>
            </div>

            {["openingKm", "closingKm", "fuelQuantity", "amount"].map((k) => (
              <input
                key={k}
                placeholder={k}
                value={(completion as any)[k]}
                onChange={(e) =>
                  setCompletion({ ...completion, [k]: e.target.value })
                }
                className="w-full mb-3 border rounded-xl px-4 py-3"
              />
            ))}

            <button
              onClick={completeJourney}
              disabled={submitting}
              className="w-full bg-green-500 text-white py-4 rounded-xl font-bold mt-4"
            >
              {submitting ? "Submitting..." : "Finish & Complete Duty"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STAT ================= */

function Stat({
  icon,
  label,
  value,
  bg,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  bg: string;
}) {
  return (
    <div className={`rounded-2xl p-4 text-center ${bg}`}>
      <div className="mx-auto mb-2 text-xl">{icon}</div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs font-bold uppercase text-slate-600">
        {label}
      </p>
    </div>
  );
}
