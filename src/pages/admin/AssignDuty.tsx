import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  collection, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  doc, 
  getDoc,
  updateDoc 
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
  MdArrowBack,
  MdPerson,
  MdClose,
  MdDirectionsCar,
  MdLocationOn,
  MdEvent,
  MdSchedule,
  MdNotes,
  MdGroups,
  MdContactPhone,
  MdBusinessCenter,
  MdAssignmentInd
} from "react-icons/md";

interface DriverOption {
  label: string;
  value: string;
}

/* ================= PUSH NOTIFICATION HELPER ================= */
async function sendPushNotification(driverPushToken: string, taskDetails: any) {
  if (!driverPushToken) return;

  const message = {
    to: driverPushToken,
    sound: 'default',
    title: '🚀 New Task Assigned!',
    body: `Passenger: ${taskDetails.passenger.name}\nLocation: ${taskDetails.tourLocation}`,
    data: { taskId: taskDetails.id }, 
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error("Notification failed to send:", error);
  }
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

  const today = new Date().toISOString().slice(0, 10);

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
        console.error("Error fetching drivers:", e);
        alert("Failed to fetch drivers");
      } finally {
        setFetchingDrivers(false);
      }
    }
    fetchDrivers();
  }, []);

  function handleSavePassenger() {
    const errs: string[] = [];
    if (!passenger.name) errs.push('Passenger name');
    if (!passenger.heads || isNaN(Number(passenger.heads)) || Number(passenger.heads) < 1) errs.push('Number of heads (>=1)');
    if (!passenger.designation) errs.push('Designation');
    if (!passenger.department) errs.push('Department');
    if (!passenger.contact) errs.push('Contact (10 digits)');
    if (passenger.contact && !/^\d{10}$/.test(passenger.contact)) errs.push('Contact must be 10 digits');
    if (errs.length > 0) {
      alert('Please fix: ' + errs.join(', '));
      return;
    }
    setModalOpen(false);
  }

  /* ================= ASSIGN DUTY & NOTIFY ================= */
  async function handleAssign() {
    const errors: string[] = [];
    if (!dutyData.driverId) errors.push('Driver');
    if (!passenger.name) errors.push('Passenger name');
    if (!dutyData.tourLocation) errors.push('Tour location');
    if (!dutyData.date) errors.push('Tour date');
    if (!dutyData.time) errors.push('Tour time');

    if (errors.length > 0) {
      alert('Please fix: ' + errors.join(', '));
      return;
    }

    try {
      setLoading(true);

      // 1. Fetch the Driver's Push Token from the 'users' collection
      // (Assuming your tokens are stored in 'users' or 'drivers' with the same ID)
      const driverUserDoc = await getDoc(doc(db, "users", dutyData.driverId));
      const driverPushToken = driverUserDoc.data()?.pushToken;

      if (!driverPushToken) {
        console.warn("⚠️ No pushToken found in Firestore for UID:", dutyData.driverId);
    }

      // 2. Create the Task Payload
      const payload: any = {
        driverId: dutyData.driverId,
        driverName: dutyData.driverName,
        tourLocation: dutyData.tourLocation,
        notes: dutyData.notes,
        passenger: { ...passenger, heads: Number(passenger.heads) },
        status: "assigned",
        kilometers: 0,
        createdAt: serverTimestamp(),
      };  
      if (dutyData.date) payload.tourDate = new Date(dutyData.date);
      if (dutyData.time) payload.tourTime = dutyData.time;
      if (dutyData.date && dutyData.time) payload.tourDateTime = new Date(`${dutyData.date}T${dutyData.time}`);

      // 3. Save the Task to Firestore
      const taskRef = await addDoc(collection(db, "tasks"), payload);

      // 4. Update the Driver's status to 'assigned'
      const driverRef = doc(db, "drivers", dutyData.driverId);
      await updateDoc(driverRef, {
        activeStatus: "assigned"
      });

      // 5. SEND THE PUSH NOTIFICATION
      if (driverPushToken) {
        await sendPushNotification(driverPushToken, {
          id: taskRef.id,
          ...payload
        });
      } else {
        console.warn("No Push Token found for this driver. Notification skipped.");
      }

      alert("Duty assigned successfully and Driver notified.");
      navigate(-1);
    } catch (e) {
      console.error("Error in assignment:", e);
      alert("Failed to assign duty");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="h-2 w-full bg-blue-600"></div>

      <div className="max-w-3xl mx-auto px-5 py-8">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-3 rounded-xl bg-white shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <MdArrowBack className="text-xl text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Dispatch <span className="text-blue-600">Console</span>
              </h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Assignment Portal</p>
            </div>
          </div>
        </div>

        {/* FORM CARD */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="space-y-6">
            {/* DRIVER SECTION */}
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1 tracking-[0.1em]">
                Vehicle Operator
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-blue-600">
                  <MdDirectionsCar size={22} />
                </div>
                <select
                  required
                  className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white transition-all outline-none appearance-none font-semibold text-slate-700"
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
                    {fetchingDrivers ? "Syncing Fleet Data..." : "Select Available Driver"}
                  </option>
                  {drivers.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                    <MdSchedule size={18} />
                </div>
              </div>
            </div>

            {/* PASSENGER TOGGLE CARD */}
            <button
              onClick={() => setModalOpen(true)}
              className="w-full flex justify-between items-center bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 p-6 rounded-3xl group hover:shadow-lg hover:shadow-blue-100 transition-all duration-300 active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200">
                    <MdPerson size={24} />
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-900 leading-tight">
                    Passenger Manifest
                  </p>
                  <p className="text-xs font-bold text-blue-600 mt-1">
                    {passenger.name
                      ? `Confirmed: ${passenger.name}`
                      : "Action Required: Tap to configure"}
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-600 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <MdAssignmentInd />
              </div>
            </button>

            <Input 
                label="Destination / Tour Location" 
                value={dutyData.tourLocation} 
                icon={<MdLocationOn />}
                placeholder="e.g. Airport Terminal 3"
                onChange={(v) => setDutyData({ ...dutyData, tourLocation: v })} 
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input 
                    label="Tour Date" 
                    type="date" 
                    value={dutyData.date} 
                    min={today} 
                    icon={<MdEvent />}
                    onChange={(v) => setDutyData({ ...dutyData, date: v })} 
                />
                <Input 
                    label="Reporting Time" 
                    type="time" 
                    value={dutyData.time} 
                    icon={<MdSchedule />}
                    onChange={(v) => setDutyData({ ...dutyData, time: v })} 
                />
            </div>

            <Input
              label="Fleet Instructions / Notes"
              value={dutyData.notes}
              multiline
              icon={<MdNotes />}
              placeholder="Any specific instructions for the driver..."
              onChange={(v) => setDutyData({ ...dutyData, notes: v })}
            />
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          disabled={loading}
          onClick={handleAssign}
          className="w-full mt-8 h-16 rounded-2xl bg-blue-600 text-white font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.99] disabled:bg-slate-300 disabled:shadow-none transition-all flex items-center justify-center gap-3"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-4 border-white border-t-transparent" />
          ) : (
            <>
                <MdDirectionsCar size={24} />
                Confirm & Dispatch
            </>
          )}
        </button>
      </div>

      {/* PASSENGER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Passenger Sheet</h2>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Entry Detail manifest</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <MdClose size={24} />
              </button>
            </div>

            <div className="space-y-6">
                <Input label="Primary Passenger" value={passenger.name} icon={<MdPerson />}
                  onChange={(v) => setPassenger({ ...passenger, name: v })} />
                
                <Input label="Total Persons (Heads)" type="number" min="1" value={passenger.heads} icon={<MdGroups />}
                  onChange={(v) => setPassenger({ ...passenger, heads: v })} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Rank / Designation</label>
                        <div className="relative">
                            <MdBusinessCenter className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                            <select
                                required
                                value={passenger.designation}
                                onChange={(e) => setPassenger({ ...passenger, designation: e.target.value })}
                                className="w-full h-12 pl-12 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 appearance-none"
                            >
                                <option value="">Select Rank</option>
                                {["Advisor", "HOD", "Senior Manager", "Manager", "Asst Manager", "Executive"].map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Department</label>
                        <div className="relative">
                            <MdAssignmentInd className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" />
                            <select
                                required
                                value={passenger.department}
                                onChange={(e) => setPassenger({ ...passenger, department: e.target.value })}
                                className="w-full h-12 pl-12 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 appearance-none"
                            >
                                <option value="">Select Dept</option>
                                {["Operation", "Civil", "HR", "Admin", "Survey", "HSD", "Accounts"].map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <Input label="Contact Number" type="tel" maxLength={10} pattern="\\d{10}" value={passenger.contact} icon={<MdContactPhone />}
                  onChange={(v) => setPassenger({ ...passenger, contact: v })} />

                <button
                  onClick={handleSavePassenger}
                  className="w-full mt-4 bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                  Confirm Information
                </button> 
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  multiline,
  type = "text",
  required = false,
  min,
  maxLength,
  pattern,
  icon,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  type?: string;
  required?: boolean;
  min?: string;
  maxLength?: number;
  pattern?: string;
  icon?: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2 group">
      <label className="block text-[10px] font-black uppercase text-slate-400 ml-1 tracking-[0.1em]">
        {label}
      </label>
      <div className="relative">
        {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600">
                {icon}
            </div>
        )}
        {multiline ? (
          <textarea
            value={value}
            required={required}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-2xl bg-slate-50 border border-slate-200 p-4 pl-12 min-h-[120px] font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white transition-all"
          />
        ) : (
          <input
            type={type}
            value={value}
            required={required}
            min={min}
            placeholder={placeholder}
            maxLength={maxLength}
            pattern={pattern}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white transition-all"
          />
        )}
      </div>
    </div>
  );
}