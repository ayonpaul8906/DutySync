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
  MdAccessTime,
  MdPerson,
  MdDirectionsCar,
} from "react-icons/md";

/* ================= TYPES ================= */
interface Driver {
  id: string;
  name?: string;
  email?: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    lastUpdated?: any;
  };
}

/* ================= MAP CONTROLLER (FLY-TO) ================= */
function MapController({ selectedLocation }: { selectedLocation: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedLocation) {
      map.flyTo(selectedLocation, 16, {
        duration: 2, // Smooth 2-second flight
        easeLinearity: 0.25,
      });
    }
  }, [selectedLocation, map]);
  return null;
}

/* ================= PREMIUM VEHICLE ICON ================= */
const driverIcon = new L.DivIcon({
  className: "custom-driver-marker",
  iconSize: [50, 50],
  iconAnchor: [25, 25],
  html: `
    <div style="position: relative; display: flex; justify-content: center; align-items: center;">
      <div class="marker-pulse"></div>
      
      <div class="car-wrapper">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 10l1.5-4.5h11L19 10H5z"/>
        </svg>
      </div>
    </div>
    <style>
      .marker-pulse {
        position: absolute;
        width: 48px; height: 48px;
        background: rgba(37, 99, 235, 0.2);
        border-radius: 50%;
        animation: pulse-ring 2s infinite ease-in-out;
      }
      .car-wrapper {
        position: relative;
        width: 38px; height: 38px;
        background: #2563EB;
        border: 3px solid white;
        border-radius: 12px;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.4);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .custom-driver-marker:hover .car-wrapper {
        transform: scale(1.15) translateY(-5px);
        background: #1e40af;
      }
      @keyframes pulse-ring {
        0% { transform: scale(0.5); opacity: 1; }
        80%, 100% { transform: scale(1.4); opacity: 0; }
      }
    </style>
  `,
});

export default function LiveTracking() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  /* ================= FIRESTORE LISTENER ================= */
  useEffect(() => {
    const q = query(collection(db, "drivers"), where("active", "==", true));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Driver))
        .filter(d => d.currentLocation?.latitude);
      setDrivers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* ================= MEMOIZED LOGIC ================= */
  const filteredDrivers = useMemo(() => 
    drivers.filter(d => d.name?.toLowerCase().includes(searchQuery.toLowerCase())),
    [drivers, searchQuery]
  );

  const selectedLocation = useMemo(() => {
    const d = drivers.find(d => d.id === selectedDriverId);
    return d ? [d.currentLocation.latitude, d.currentLocation.longitude] as [number, number] : null;
  }, [selectedDriverId, drivers]);

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden font-sans">
      
      {/* ================= SIDEBAR ================= */}
      <div className="w-85 h-full bg-white border-r border-slate-200 flex flex-col z-[1001] shadow-2xl">
        <div className="p-6 border-b border-slate-100 bg-white">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-4 transition-colors group"
          >
            <MdChevronLeft className="group-hover:-translate-x-1 transition-transform" size={18} /> Back
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fleet <span className="text-blue-600">Map</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time Telemetry</p>
        </div>

        {/* Improved Search */}
        <div className="p-4">
          <div className="relative group">
            <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Filter by driver name..."
              className="w-full bg-slate-50 border border-slate-100 rounded-[1rem] py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Enhanced Driver List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-3">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent animate-spin rounded-full"></div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Linking...</span>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No active units</div>
          ) : (
            filteredDrivers.map((driver) => (
              <button
                key={driver.id}
                onClick={() => setSelectedDriverId(driver.id)}
                className={`w-full text-left p-4 mb-2 rounded-[1.25rem] transition-all flex items-center gap-4 ${
                  selectedDriverId === driver.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${
                  selectedDriverId === driver.id ? 'bg-white/20' : 'bg-blue-50 text-blue-600'
                }`}>
                  <MdDirectionsCar size={22} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className={`font-black truncate ${selectedDriverId === driver.id ? 'text-white' : 'text-slate-900'}`}>
                    {driver.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedDriverId === driver.id ? 'bg-blue-200' : 'bg-green-500'} animate-pulse`}></span>
                    <p className={`text-[9px] font-black uppercase tracking-tighter ${selectedDriverId === driver.id ? 'text-blue-100' : 'text-slate-400'}`}>
                      Transmitting Live
                    </p>
                  </div>
                </div>
                <MdMyLocation className={selectedDriverId === driver.id ? 'text-white/60' : 'text-slate-200'} size={18} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* ================= MAP AREA ================= */}
      <div className="flex-1 relative">
        <MapContainer
          center={[22.5726, 88.3639]} 
          zoom={13}
          zoomControl={false}
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController selectedLocation={selectedLocation} />

          {drivers.map((driver) => (
            <Marker
              key={driver.id}
              position={[driver.currentLocation.latitude, driver.currentLocation.longitude]}
              icon={driverIcon}
              eventHandlers={{
                click: () => setSelectedDriverId(driver.id),
              }}
            >
              <Popup>
                <div className="p-3 min-w-[200px]">
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                      <MdDirectionsCar size={20} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm leading-none mb-1">{driver.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">{driver.email}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-2 rounded-lg">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Status</p>
                        <p className="text-[10px] font-bold text-green-600">ACTIVE</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                        <p className="text-[8px] font-black text-slate-400 uppercase">Speed</p>
                        <p className="text-[10px] font-bold text-slate-900">34 KM/H</p>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Controls Overlay */}
        <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-3">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-white flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Satellite Link Secured</span>
            </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        .leaflet-popup-content-wrapper { border-radius: 1.5rem !important; padding: 0 !important; overflow: hidden; box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.15) !important; }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-popup-tip { display: none; }
      `}</style>
    </div>
  );
}