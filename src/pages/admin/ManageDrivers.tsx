import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import {
  MdArrowBack,
  MdSearch,
  MdChevronRight,
  MdLocationOn,
  MdFiberManualRecord,
  MdPeople,
  MdPersonAdd,
  MdClose,
  MdEmail,
  MdPhone,
  MdVpnKey,
  MdOutlineBadge
} from "react-icons/md";

interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalKms?: number;
  status?: "active" | "assigned" | "in-progress" | "offline";
}

export default function ManageDrivers() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Add Driver States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdminVerify, setShowAdminVerify] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [adminVerify, setAdminVerify] = useState({ email: "", password: "" });
  const [newDriver, setNewDriver] = useState({
    name: "",
    email: "",
    phone: "",
    vehicleNumber: "",
    password: "",
  });

  useEffect(() => {
    const qUsers = query(collection(db, "users"), where("role", "==", "driver"));
    const driversRef = collection(db, "drivers");

    // Listen to basic user profiles
    const unsubUsers = onSnapshot(qUsers, (userSnap) => {
      const userList = userSnap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Driver, "id" | "status">),
      }));

      // Listen to driver operational docs (activeStatus, active, etc.)
      const unsubOps = onSnapshot(driversRef, (opsSnap) => {
        const opsById: Record<
          string,
          { activeStatus?: string; active?: boolean }
        > = {};
        opsSnap.docs.forEach((d) => {
          const data = d.data() as any;
          opsById[d.id] = {
            activeStatus: data.activeStatus,
            active: data.active,
          };
        });

        const processedDrivers: Driver[] = userList.map((user) => {
          const ops = opsById[user.id] || {};
          let status: Driver["status"] = "offline";

          // Apply your rules:
          // active = true, activeStatus = "assigned" -> assigned
          // active = false, activeStatus = "in-progress" -> in-progress
          // active = true, activeStatus = "active" -> active
          if (ops.active === true && ops.activeStatus === "assigned") {
            status = "assigned";
          } else if (ops.active === false && ops.activeStatus === "in-progress") {
            status = "in-progress";
          } else if (ops.active === true && ops.activeStatus === "active") {
            status = "active";
          }

          return {
            ...user,
            status,
          };
        });

        setDrivers(processedDrivers);
        setLoading(false);
      });

      return () => unsubOps();
    });

    return () => unsubUsers();
  }, []);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowAdminVerify(true);
  };

  const handleConfirmAddDriver = async () => {
    setSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newDriver.email,
        newDriver.password
      );
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        name: newDriver.name,
        email: newDriver.email,
        phone: newDriver.phone,
        role: "driver",
        totalKms: 0,
        createdAt: new Date(),
      });

      await setDoc(doc(db, "drivers", uid), {
        name: newDriver.name,
        vehicleNumber: newDriver.vehicleNumber,
        activeStatus: "active",
        totalKilometers: 0,
        active: true,
        contact: newDriver.phone,
      });

      await signInWithEmailAndPassword(auth, adminVerify.email, adminVerify.password);

      setShowAddModal(false);
      setShowAdminVerify(false);
      setNewDriver({ name: "", email: "", phone: "", vehicleNumber: "", password: "" });
      setAdminVerify({ email: "", password: "" });
      alert("Driver registered successfully!");
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDrivers = drivers.filter((d) =>
    d.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                Fleet <span className="text-blue-600">Personnel</span>
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mt-1">
                Real-time Driver Directory
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <MdPersonAdd size={20} />
            <span className="hidden sm:inline">Add Driver</span>
          </button>
        </div>

        {/* ================= SEARCH BAR ================= */}
        <div className="relative group mb-8">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
            <MdSearch size={22} />
          </div>
          <input
            className="w-full h-16 bg-white border border-slate-200 rounded-[1.25rem] pl-14 pr-6 text-slate-800 font-semibold placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600 shadow-sm transition-all"
            placeholder="Search drivers by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* ================= CONTENT ================= */}
        {loading ? (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Syncing Fleet Data...
            </p>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-100 shadow-sm">
            <MdPeople className="text-slate-200 text-6xl mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No personnel found</h3>
            <p className="text-slate-500 text-sm mt-1">No driver matches your current search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredDrivers.map((driver) => (
              <DriverCard
                key={driver.id}
                driver={driver}
                onView={() => navigate(`/admin/driver-profile/${driver.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ================= MODAL: ADD DRIVER ================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Onboard Driver</h2>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                  Create new login access
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-red-500 transition-colors"
              >
                <MdClose size={24} />
              </button>
            </div>

            <form onSubmit={handleAddDriver} className="space-y-4">
              <ModalInput
                icon={<MdOutlineBadge />}
                label="Full Name"
                value={newDriver.name}
                onChange={(v) => setNewDriver({ ...newDriver, name: v })}
              />
              <ModalInput
                icon={<MdEmail />}
                label="Email Address"
                type="email"
                value={newDriver.email}
                onChange={(v) => setNewDriver({ ...newDriver, email: v })}
              />
              <ModalInput
                icon={<MdPhone />}
                label="Phone Number"
                value={newDriver.phone}
                onChange={(v) => setNewDriver({ ...newDriver, phone: v })}
              />
              <ModalInput
                icon={<MdOutlineBadge />}
                label="License Number"
                value={newDriver.vehicleNumber}
                onChange={(v) => setNewDriver({ ...newDriver, vehicleNumber: v })}
              />
              <ModalInput
                icon={<MdVpnKey />}
                label="Login Password"
                type="password"
                value={newDriver.password}
                onChange={(v) => setNewDriver({ ...newDriver, password: v })}
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50 mt-4"
              >
                {submitting ? "Processing..." : "Register Driver"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADMIN VERIFICATION ================= */}
      {showAdminVerify && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[101] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verify Admin Access</h2>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                Enter your credentials to continue
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <ModalInput
                icon={<MdEmail />}
                label="Admin Email"
                type="email"
                value={adminVerify.email}
                onChange={(v) => setAdminVerify({ ...adminVerify, email: v })}
              />
              <ModalInput
                icon={<MdVpnKey />}
                label="Admin Password"
                type="password"
                value={adminVerify.password}
                onChange={(v) => setAdminVerify({ ...adminVerify, password: v })}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAdminVerify(false);
                  setAdminVerify({ email: "", password: "" });
                }}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddDriver}
                disabled={submitting}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] shadow-xl shadow-blue-100 disabled:opacity-50 transition-all"
              >
                {submitting ? "Adding..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= HELPER COMPONENTS ================= */

function ModalInput({
  icon,
  label,
  value,
  onChange,
  type = "text",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors">
        {icon}
      </div>
      <input
        required
        type={type}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-600/20 transition-all placeholder:text-slate-300"
      />
    </div>
  );
}

function DriverCard({ driver, onView }: { driver: Driver; onView: () => void }) {
  const status = driver.status || "offline";

  const statusConfig: any = {
    "in-progress": {
      container: "bg-amber-50 text-amber-700 border-amber-100",
      dot: "bg-amber-500",
    },
    "assigned": {
      container: "bg-blue-50 text-blue-700 border-blue-100",
      dot: "bg-blue-500",
    },
    "active": {
      container: "bg-green-50 text-green-700 border-green-100",
      dot: "bg-green-500",
    },
    "offline": {
      container: "bg-slate-50 text-slate-700 border-slate-200",
      dot: "bg-slate-400",
    },
  };

  const currentStatus = statusConfig[status] || statusConfig["offline"];

  return (
    <div
      onClick={onView}
      className="group bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform duration-300">
            <span className="text-xl font-black text-blue-600">
              {driver.name?.charAt(0) || "?"}
            </span>
          </div>
          <div
            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${currentStatus.dot}`}
          ></div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <p className="font-black text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
              {driver.name}
            </p>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${currentStatus.container}`}
            >
              <MdFiberManualRecord size={10} />
              {status}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            {driver.email}
          </p>
        </div>
        <MdChevronRight
          size={24}
          className="text-slate-300 group-hover:text-blue-600"
        />
      </div>

      <div className="mt-5 pt-4 border-t border-slate-50 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <MdLocationOn size={18} className="text-slate-400" />
            <div>
              <p className="text-xs font-black text-slate-900">
                {driver.totalKms || 0} KM
              </p>
              <p className="text-[9px] font-black text-slate-400 uppercase">
                Life Mileage
              </p>
            </div>
          </div>
        </div>
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
          View Driver History →
        </span>
      </div>
    </div>
  );
}
