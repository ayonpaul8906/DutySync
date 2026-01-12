import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import {
  MdArrowBack,
  MdSearch,
  MdChevronRight,
  MdLocationOn,
} from "react-icons/md";

interface Driver {
  id: string;
  name: string;
  email: string;
  totalKms?: number;
  status?: "active" | "on-duty" | "offline";
}

export default function ManageDrivers() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  /* ================= FETCH DRIVERS ================= */
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "driver"));

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Driver, "id">),
      }));
      setDrivers(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredDrivers = drivers.filter((d) =>
    d.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-6">
      <div className="max-w-5xl mx-auto">

        {/* ================= HEADER ================= */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white hover:bg-slate-100 border"
          >
            <MdArrowBack className="text-xl text-slate-800" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            Fleet Personnel
          </h1>
        </div>

        {/* ================= SEARCH ================= */}
        <div className="flex items-center gap-3 bg-white border rounded-xl px-4 h-12 mb-6">
          <MdSearch className="text-slate-400 text-lg" />
          <input
            className="flex-1 outline-none text-slate-800"
            placeholder="Search drivers by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* ================= CONTENT ================= */}
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin h-6 w-6 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : filteredDrivers.length === 0 ? (
          <p className="text-center text-slate-500 mt-10">
            No drivers found.
          </p>
        ) : (
          <div className="space-y-4">
            {filteredDrivers.map((driver) => (
              <DriverCard
                key={driver.id}
                driver={driver}
                onView={() =>
                  navigate(`/admin/driver-details/${driver.id}`)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= DRIVER CARD ================= */

function DriverCard({
  driver,
  onView,
}: {
  driver: Driver;
  onView: () => void;
}) {
  const status = driver.status || "active";

  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">

      {/* HEADER */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-lg font-bold text-blue-600">
            {driver.name?.charAt(0)}
          </span>
        </div>

        <div className="flex-1">
          <p className="font-bold text-slate-900">{driver.name}</p>
          <p className="text-sm text-slate-500">{driver.email}</p>
        </div>

        <span
          className={`px-2 py-1 rounded-lg text-xs font-bold uppercase
          ${
            status === "on-duty"
              ? "bg-amber-100 text-amber-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {status}
        </span>
      </div>

      {/* FOOTER */}
      <div className="flex justify-between items-center border-t pt-3">
        <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
          <MdLocationOn />
          {driver.totalKms || 0} km
        </div>

        <button
          onClick={onView}
          className="flex items-center gap-1 text-blue-600 font-semibold text-sm hover:underline"
        >
          View Details
          <MdChevronRight />
        </button>
      </div>
    </div>
  );
}
