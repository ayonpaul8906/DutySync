import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  MdArrowBack,
  MdPerson,
  MdClose,
  MdDirectionsCar,
} from "react-icons/md";

interface DriverOption {
  label: string;
  value: string;
}

export default function AssignDuty() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [fetchingDrivers, setFetchingDrivers] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);

  const [dutyData, setDutyData] = useState({
    driverId: "",
    driverName: "",
    tourLocation: "",
    date: "",
    time: "",
    notes: "",
  });

  const [passenger, setPassenger] = useState({
    name: "",
    heads: "",
    designation: "",
    department: "",
    contact: "",
  });

  /* ================= FETCH DRIVERS ================= */
  useEffect(() => {
    async function fetchDrivers() {
      try {
        const q = query(
          collection(db, "drivers"),
          where("active", "==", true),
          where("activeStatus", "==", "active")
        );

        const snap = await getDocs(q);
        setDrivers(
          snap.docs.map((d) => ({
            label: d.data().name || "Unnamed Driver",
            value: d.id,
          }))
        );
      } catch (e) {
        alert("Failed to fetch drivers");
      } finally {
        setFetchingDrivers(false);
      }
    }

    fetchDrivers();
  }, []);

  /* ================= ASSIGN DUTY ================= */
  async function handleAssign() {
    if (!dutyData.driverId || !passenger.name || !dutyData.tourLocation) {
      alert("Please fill required fields");
      return;
    }

    try {
      setLoading(true);

      const payload: any = {
        driverId: dutyData.driverId,
        driverName: dutyData.driverName,
        tourLocation: dutyData.tourLocation,
        notes: dutyData.notes,
        passenger,
        status: "assigned",
        kilometers: 0,
        createdAt: serverTimestamp(),
      }; 

      if (dutyData.date) {
        // store date-only as Date (00:00 local)
        payload.tourDate = new Date(dutyData.date);
      }

      if (dutyData.time) {
        // keep time string for easy display/sorting if needed
        payload.tourTime = dutyData.time;
      }

      if (dutyData.date && dutyData.time) {
        // combined datetime for scheduling
        payload.tourDateTime = new Date(`${dutyData.date}T${dutyData.time}`);
      }

      await addDoc(collection(db, "tasks"), payload);

      alert("Duty assigned successfully");
      navigate(-1);
    } catch (e) {
      alert("Failed to assign duty");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-5 py-6">
      <div className="max-w-3xl mx-auto">

        {/* ================= HEADER ================= */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-slate-200"
          >
            <MdArrowBack className="text-xl" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            Assign New Duty
          </h1>
        </div>

        {/* ================= FORM CARD ================= */}
        <div className="bg-white rounded-2xl p-5 shadow border">

          {/* DRIVER SELECT */}
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
            Select Driver
          </label>

          <div className="relative mb-5">
            <MdDirectionsCar className="absolute left-4 top-4 text-blue-600" />
            <select
              className="w-full h-14 pl-12 pr-4 rounded-xl border focus:ring-2 focus:ring-blue-500"
              value={dutyData.driverId}
              onChange={(e) => {
                const driver = drivers.find((d) => d.value === e.target.value);
                setDutyData({
                  ...dutyData,
                  driverId: e.target.value,
                  driverName: driver?.label || "",
                });
              }}
            >
              <option value="">
                {fetchingDrivers ? "Syncing drivers..." : "Choose a Driver"}
              </option>
              {drivers.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* PASSENGER TOGGLE */}
          <button
            onClick={() => setModalOpen(true)}
            className="w-full flex justify-between items-center bg-blue-50 border border-blue-200 p-4 rounded-xl mb-5"
          >
            <div>
              <p className="font-bold text-blue-800">
                Passenger Information
              </p>
              <p className="text-sm text-blue-600">
                {passenger.name
                  ? `Passenger: ${passenger.name}`
                  : "Tap to add contact details"}
              </p>
            </div>
            <MdPerson className="text-2xl text-blue-600" />
          </button>

          {/* INPUTS */}
          <Input label="Tour Location" value={dutyData.tourLocation}
            onChange={(v) => setDutyData({ ...dutyData, tourLocation: v })} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Tour Date" type="date" value={dutyData.date} 
              onChange={(v) => setDutyData({ ...dutyData, date: v })} />
            <Input label="Tour Time" type="time" value={dutyData.time}
              onChange={(v) => setDutyData({ ...dutyData, time: v })} />
          </div>

          <Input
            label="Additional Notes"
            value={dutyData.notes}
            multiline
            onChange={(v) => setDutyData({ ...dutyData, notes: v })}
          />
        </div>

        {/* SUBMIT */}
        <button
          disabled={loading}
          onClick={handleAssign}
          className="w-full mt-6 h-14 rounded-xl bg-blue-600 text-white font-bold text-lg shadow hover:opacity-90"
        >
          {loading ? "Assigning..." : "Confirm Assignment"}
        </button>
      </div>

      {/* ================= PASSENGER MODAL ================= */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-xl rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Passenger Sheet</h2>
              <button onClick={() => setModalOpen(false)}>
                <MdClose className="text-xl text-slate-500" />
              </button>
            </div>

            <Input label="Passenger Name" value={passenger.name}
              onChange={(v) => setPassenger({ ...passenger, name: v })} />
            <Input label="Number of Heads" value={passenger.heads}
              onChange={(v) => setPassenger({ ...passenger, heads: v })} />
            <Input label="Designation" value={passenger.designation}
              onChange={(v) => setPassenger({ ...passenger, designation: v })} />
            <Input label="Department" value={passenger.department}
              onChange={(v) => setPassenger({ ...passenger, department: v })} />
            <Input label="Contact" value={passenger.contact}
              onChange={(v) => setPassenger({ ...passenger, contact: v })} />

            <button
              onClick={() => setModalOpen(false)}
              className="w-full mt-5 bg-slate-900 text-white py-4 rounded-xl font-bold"
            >
              Save Passenger Info
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= REUSABLE INPUT ================= */
function Input({
  label,
  value,
  onChange,
  multiline,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border p-3 min-h-[90px]"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 rounded-xl border px-4"
        />
      )}
    </div>
  );
} 
