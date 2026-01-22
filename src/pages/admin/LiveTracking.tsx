import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  MdChevronLeft,
  MdSearch,
  MdMyLocation,
  MdDirectionsCar,
  MdHistory,
  MdLocationOff,
} from "react-icons/md";

/* ================= TYPES ================= */
interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  lastUpdated?: any;
  isOnline: boolean;
}

/* ================= MAP CONTROLLER ================= */
function MapController({ selectedLocation }: { selectedLocation: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedLocation) {
      map.flyTo(selectedLocation, 16, { duration: 2 });
    }
  }, [selectedLocation, map]);
  return null;
}

/* ================= CUSTOM VEHICLE ICON ================= */
const driverIcon = new L.DivIcon({
  className: "custom-driver-marker",
  iconSize: [50, 50],
  iconAnchor: [25, 25],
  html: `
    <div style="position: relative; display: flex; justify-content: center; align-items: center;">
      <div class="marker-pulse"></div>
      <div class="car-wrapper">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 10l1.5-4.5h11L19 10H5z"/>
        </svg>
      </div>
    </div>
  `,
});

export default function LiveTracking() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  /* ================= FETCH & MERGE COLLECTIONS ================= */
  useEffect(() => {
    // 1. Listen to all drivers from 'users' collection
    const qUsers = query(collection(db, "users"), where("role", "==", "driver"));
    
    const unsubUsers = onSnapshot(qUsers, (userSnap) => {
      const userList = userSnap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || "Unknown Driver",
        email: doc.data().email || "",
        phone: doc.data().phone || ""
      }));

      // 2. Listen to real-time location updates from 'drivers' collection
      const unsubLocations = onSnapshot(collection(db, "drivers"), (locSnap) => {
        const locations = locSnap.docs.reduce((acc: any, doc) => {
          acc[doc.id] = doc.data();
          return acc;
        }, {});

        // MERGE logic: Keep all drivers, but flag those without location
        const mergedDrivers = userList.map(user => {
          const locData = locations[user.id];
          const lat = locData?.latitude || locData?.currentLocation?.latitude;
          const lng = locData?.longitude || locData?.currentLocation?.longitude;

          return {
            ...user,
            latitude: lat,
            longitude: lng,
            lastUpdated: locData?.lastUpdated,
            isOnline: !!(lat && lng) // Online if they have coordinates
          };
        });

        setDrivers(mergedDrivers);
        setLoading(false);
      });

      return () => unsubLocations();
    });

    return () => unsubUsers();
  }, []);

  const filteredDrivers = useMemo(() => 
    drivers.filter(d => d.name?.toLowerCase().includes(searchQuery.toLowerCase())),
    [drivers, searchQuery]
  );

  const selectedLocation = useMemo(() => {
    const d = drivers.find(d => d.id === selectedDriverId);
    return d?.latitude && d?.longitude ? [d.latitude, d.longitude] as [number, number] : null;
  }, [selectedDriverId, drivers]);

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col z-[1001] shadow-xl">
        <div className="p-6 border-b border-slate-100">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest mb-4 flex items-center gap-1">
            <MdChevronLeft size={18} /> Exit Map
          </button>
          <h1 className="text-xl font-black text-slate-900">Live <span className="text-blue-600">Tracking</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
            {drivers.filter(d => d.isOnline).length} / {drivers.length} Drivers Online
          </p>
        </div>

        <div className="p-4">
          <div className="relative">
            <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search driver..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-10">
          {loading ? (
            <div className="flex justify-center p-10"><div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" /></div>
          ) : filteredDrivers.map((driver) => (
            <button
              key={driver.id}
              onClick={() => driver.isOnline && setSelectedDriverId(driver.id)}
              className={`w-full text-left p-3 rounded-xl mb-1 flex items-center gap-3 transition-all ${
                selectedDriverId === driver.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : driver.isOnline ? 'hover:bg-slate-50 text-slate-600' : 'opacity-50 cursor-not-allowed text-slate-400'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                selectedDriverId === driver.id ? 'bg-white/20' : driver.isOnline ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {driver.isOnline ? <MdDirectionsCar size={20} /> : <MdLocationOff size={20} />}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-sm truncate">{driver.name}</p>
                <div className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    driver.isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-300'
                  }`}></span>
                  <p className={`text-[9px] font-black uppercase ${selectedDriverId === driver.id ? 'text-blue-100' : 'text-slate-400'}`}>
                    {driver.isOnline ? "Transmitting" : "No GPS Signal"}
                  </p>
                </div>
              </div>
              {driver.isOnline && <MdMyLocation className={selectedDriverId === driver.id ? 'text-white' : 'text-slate-200'} size={16} />}
            </button>
          ))}
        </div>
      </div>

      {/* MAP SECTION */}
      <div className="flex-1 relative">
        <MapContainer center={[22.5726, 88.3639]} zoom={12} zoomControl={false} className="h-full w-full z-0">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController selectedLocation={selectedLocation} />

          {drivers.filter(d => d.isOnline).map((driver) => (
            <Marker
              key={driver.id}
              position={[driver.latitude!, driver.longitude!]}
              icon={driverIcon}
              eventHandlers={{ click: () => setSelectedDriverId(driver.id) }}
            >
              <Popup>
                <div className="p-4 min-w-[220px]">
                  <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Live Information</p>
                  <h3 className="font-black text-slate-900 text-base mb-1">{driver.name}</h3>
                  <p className="text-xs font-bold text-slate-400 mb-4">{driver.phone || driver.email}</p>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase">Status</p>
                      <p className="text-[10px] font-black text-green-600 uppercase">Active</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase">GPS</p>
                      <p className="text-[10px] font-black text-blue-600 uppercase">Fixed</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate(`/admin/driver-profile/${driver.id}`)}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                  >
                    <MdHistory size={14}/> Trip History
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="absolute top-6 right-6 z-[1000] bg-white px-4 py-2 rounded-xl shadow-xl border border-slate-100 flex items-center gap-3">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Global Fleet Link</span>
        </div>
      </div>

      <style>{`
        .marker-pulse { position: absolute; width: 40px; height: 40px; background: rgba(37, 99, 235, 0.2); border-radius: 50%; animation: pulse-ring 2s infinite ease-in-out; }
        .car-wrapper { position: relative; width: 36px; height: 36px; background: #2563EB; border: 3px solid white; border-radius: 10px; display: flex; justify-content: center; align-items: center; box-shadow: 0 10px 15px -3px rgba(37,99,235,0.4); }
        @keyframes pulse-ring { 0% { transform: scale(0.5); opacity: 1; } 80%, 100% { transform: scale(1.4); opacity: 0; } }
        .leaflet-popup-content-wrapper { border-radius: 1.25rem !important; }
      `}</style>
    </div>
  );
}