import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  setDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import {
  MdLogout,
  MdPlayCircle,
  MdFlag,
  MdCheckCircle,
  MdAccessTime,
  MdLocationOn,
  MdPerson,
  MdLocalGasStation,
  MdSpeed,
  MdHistory,
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
  fuelQuantity?: number;
  openingKm?: number;
}

/* ================= COMPONENT ================= */
export default function DriverDashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalKms: 0,
    totalTrips: 0,
    activeDuties: 0,
    totalFuel: 0,
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [_submitting, setSubmitting] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [startingKm, setStartingKm] = useState("");
  const [gpsStatus, setGpsStatus] =
    useState<"tracking" | "error" | "searching">("searching");

  const [completion, setCompletion] = useState({
    closingKm: "",
    fuelQuantity: "",
    amount: "",
  });

  /* ================= TAB CLOSE / OFFLINE ================= */
  useEffect(() => {
    const handleTabClose = () => {
      const user = auth.currentUser;
      if (user) {
        const driverRef = doc(db, "drivers", user.uid);
        updateDoc(driverRef, { locationstatus: "offline" });
      }
    };

    window.addEventListener("beforeunload", handleTabClose);
    return () => window.removeEventListener("beforeunload", handleTabClose);
  }, []);

  /* ================= LIVE LOCATION ================= */
  useEffect(() => {
    let watchId: number;

    const startTracking = async () => {
      const user = auth.currentUser;
      if (!user) return;

      if ("geolocation" in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setGpsStatus("tracking");

            try {
              const driverRef = doc(db, "drivers", user.uid);
              await setDoc(
                driverRef,
                {
                  latitude,
                  longitude,
                  lastUpdated: serverTimestamp(),
                  driverId: user.uid,
                  locationstatus: "online",
                },
                { merge: true }
              );
            } catch (e) {
              console.error("Firestore Sync Error:", e);
            }
          },
          (err) => {
            console.error("GPS Error:", err);
            setGpsStatus("error");
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
          }
        );
      } else {
        setGpsStatus("error");
      }
    };

    startTracking();
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  /* ================= DATA FETCH ================= */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setStats((s) => ({ ...s, totalKms: snap.data().totalKms || 0 }));
      }
    });

    const q = query(collection(db, "tasks"), where("driverId", "==", user.uid));
    const unsubTasks = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Task, "id">),
      }));

      const totalTrips = list.length;
      const activeDuties = list.filter(
        (t) => t.status === "assigned" || t.status === "in-progress"
      ).length;
      const totalFuel = list.reduce(
        (acc, curr) => acc + (Number(curr.fuelQuantity) || 0),
        0
      );

      setStats((s) => ({
        ...s,
        totalTrips,
        activeDuties,
        totalFuel,
      }));
      setTasks(list);
      setLoading(false);
    });

    return () => {
      unsubUser();
      unsubTasks();
    };
  }, []);

  /* ================= ACTIONS ================= */
  async function handleStartTrip() {
    const currentStart = Number(startingKm);
    const uid = auth.currentUser?.uid;

    if (!startingKm || isNaN(currentStart)) {
      alert("Enter valid starting KM");
      return;
    }
    if (!selectedTask || !uid) return;

    try {
      const driverRef = doc(db, "drivers", uid);
      const driverSnap = await getDoc(driverRef);

      const lastTripEnd = driverSnap.exists()
        ? driverSnap.data().lastTripEndKm || 0
        : 0;

      if (currentStart < lastTripEnd) {
        alert(
          `Validation Failed: You have entered less KM than last journey (${lastTripEnd} KM).`
        );
        return;
      }

      await updateDoc(doc(db, "tasks", selectedTask.id), {
        status: "in-progress",
        startedAt: serverTimestamp(),
        openingKm: currentStart,
      });

      await updateDoc(driverRef, {
        locationstatus: "online",
        activeStatus: "in-progress",
        active: false,
      });

      setShowStartModal(false);
      setStartingKm("");
      setSelectedTask(null);
      console.log("Trip started successfully");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error starting trip:", error);
        alert("Error starting trip: " + error.message);
      } else {
        console.error("Error starting trip:", error);
        alert("Error starting trip");
      }
    }
  }

  async function completeJourney() {
    if (!selectedTask) return;

    const uid = auth.currentUser?.uid;
    const close = Number(completion.closingKm);
    const open = selectedTask.openingKm || 0;

    if (isNaN(close) || !completion.closingKm) {
      alert("Input Error: Please enter valid closing KM.");
      return;
    }

    if (close <= open) {
      alert("Validation Failed: You have entered less than initialize km");
      return;
    }

    if (!uid) return;

    try {
      setSubmitting(true);

      const driverRef = doc(db, "drivers", uid);
      const taskRef = doc(db, "tasks", selectedTask.id);
      const userRef = doc(db, "users", uid);
      const kms = close - open;

      await updateDoc(taskRef, {
        status: "completed",
        closingKm: close,
        fuelQuantity: Number(completion.fuelQuantity) || 0,
        fuelAmount: Number(completion.amount) || 0,
        kilometers: kms,
        completedAt: serverTimestamp(),
      });

      await setDoc(
        driverRef,
        {
          activeStatus: "active",
          active: true,
          lastTripEndKm: close,
          totalKilometers: increment(kms),
          locationstatus: "online",
        },
        { merge: true }
      );

      await updateDoc(userRef, {
        totalKms: increment(kms),
      });

      setShowModal(false);
      setCompletion({ closingKm: "", fuelQuantity: "", amount: "" });
      setSelectedTask(null);

      alert("Success: Journey completed successfully!");
    } catch (e) {
      if (e instanceof Error) {
        console.error("Sync Error:", e);
        alert("Sync Error: " + e.message);
      } else {
        console.error("Sync Error:", e);
        alert("Sync Error occurred");
      }
    }
  }

  const handleLogout = async () => {
    const user = auth.currentUser;
    if (user) {
      await updateDoc(doc(db, "drivers", user.uid), { locationstatus: "offline" });
    }
    await signOut(auth);
    navigate("/login");
  };

  const activeTasks = tasks.filter((t) => t.status !== "completed");

  const recentCompletedTasks = tasks
  .filter((t) => t.status === "completed")
  .sort((a, b) => {
    const aTime = a.completedAt?.toDate
      ? a.completedAt.toDate().getTime()
      : a.createdAt?.toDate
      ? a.createdAt.toDate().getTime()
      : 0;
    const bTime = b.completedAt?.toDate
      ? b.completedAt.toDate().getTime()
      : b.createdAt?.toDate
      ? b.createdAt.toDate().getTime()
      : 0;
    return bTime - aTime;
  })
  .slice(0, 4);


  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-12">
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {gpsStatus === "tracking" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    System Live • Tracking
                  </p>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                    GPS Inactive
                  </p>
                </>
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">
              AMPL <span className="text-blue-600">Driver</span>
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm active:scale-95"
          >
            Logout <MdLogout size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        {/* STATS GRID (clickable for Trips & Active Duties) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <StatCard
            icon={<MdSpeed />}
            label="Total KM"
            value={stats.totalKms.toLocaleString()}
            color="indigo"
          />
          <StatCard
            icon={<MdCheckCircle />}
            label="Total Trips"
            value={stats.totalTrips}
            color="emerald"
            onClick={() => navigate("/driver-duties/all")}
          />
          <StatCard
            icon={<MdAccessTime />}
            label="Active Duties"
            value={stats.activeDuties}
            color="amber"
            onClick={() => navigate("/driver-duties/active")}
          />
          <StatCard
            icon={<MdLocalGasStation />}
            label="Fuel (L)"
            value={stats.totalFuel.toFixed(1)}
            color="blue"
          />
        </div>

        {/* DUTY LIST SECTION (unchanged) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {loading ? (
              <div className="py-20 flex justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : activeTasks.length === 0 ? (
              <div className="bg-white border border-slate-200 border-dashed rounded-[2rem] p-12 text-center">
                <p className="text-slate-400 font-bold">No active assignments.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {activeTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all"
                  >
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                            <MdPerson size={24} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">
                              Passenger
                            </p>
                            <h3 className="text-xl font-black text-slate-900">
                              {task.passenger?.name || "Corporate Guest"}
                            </h3>
                          </div>
                        </div>
                        <span
                          className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${
                            task.status === "in-progress"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                          <MdLocationOn size={22} />
                        </div>
                        <p className="font-bold text-slate-600 text-sm">
                          {task.tourLocation || `${task.pickup} → ${task.drop}`}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100">
                      {task.status === "assigned" ? (
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setShowStartModal(true);
                          }}
                          className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                          <MdPlayCircle size={20} /> Start Trip
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setShowModal(true);
                          }}
                          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                          <MdFlag size={20} /> Complete Duty
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm h-fit">
  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
    <MdHistory size={16} /> Recent Logs
  </h3>

  {recentCompletedTasks.length === 0 ? (
    <p className="text-xs font-bold text-slate-300">
      No completed trips yet.
    </p>
  ) : (
    <div className="space-y-4">
      {recentCompletedTasks.map((t) => (
        <div
          key={t.id}
          className="border border-slate-100 rounded-2xl p-3 flex items-start gap-3 bg-slate-50"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-black">
            KM
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-slate-700 truncate">
              {t.tourLocation || `${t.pickup || ""} → ${t.drop || ""}`}
            </p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
              Status: completed
            </p>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

        </div>
      </div>

      {/* MODALS (unchanged) */}
      {showStartModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-fade-in">
            <h3 className="font-black text-2xl text-slate-900 tracking-tight">
              Initialize Trip
            </h3>
            <div className="my-6">
              <LogInput
                icon={<MdSpeed />}
                label="Start KM"
                value={startingKm}
                onChange={(v: string) => setStartingKm(v)}
              />
            </div>
            <button
              onClick={handleStartTrip}
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest"
            >
              Begin Journey
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-fade-in">
            <h3 className="font-black text-2xl text-slate-900 tracking-tight">
              Complete Duty
            </h3>
            <div className="space-y-3 my-6">
              <LogInput
                icon={<MdSpeed />}
                label="Closing KM"
                value={completion.closingKm}
                onChange={(v: string) =>
                  setCompletion({ ...completion, closingKm: v })
                }
              />
              <LogInput
                icon={<MdLocalGasStation />}
                label="Fuel (Liters)"
                value={completion.fuelQuantity}
                onChange={(v: string) =>
                  setCompletion({ ...completion, fuelQuantity: v })
                }
              />
            </div>
            <button
              onClick={completeJourney}
              className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest"
            >
              Submit Duty
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* UI COMPONENTS */
function StatCard({
  icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  color: "indigo" | "emerald" | "amber" | "blue";
  onClick?: () => void;
}) {
  const iconStyles = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-500",
    blue: "bg-blue-50 text-blue-600",
  };
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      className={`rounded-[1.5rem] p-6 border border-slate-200 bg-white shadow-sm flex flex-col ${
        clickable ? "cursor-pointer hover:border-blue-200" : ""
      } transition-colors`}
    >
      <div
        className={`w-10 h-10 ${iconStyles[color]} rounded-xl flex items-center justify-center mb-4`}
      >
        {icon}
      </div>
      <h4 className="text-3xl font-black text-slate-900 mb-1 leading-none">
        {value}
      </h4>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
    </div>
  );
}

function LogInput({ icon, label, value, onChange }: any) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
        {icon}
      </div>
      <input
        type="number"
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500/30"
      />
    </div>
  );
}
