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
// This component handles the smooth movement when a driver is selected
function MapController({ selectedLocation }: { selectedLocation: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedLocation) {
      map.flyTo(selectedLocation, 16, {
        duration: 1.5,
      });
    }
  }, [selectedLocation, map]);
  return null;
}

const driverIcon = new L.DivIcon({
  className: "custom-driver-marker",
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  html: `
    <div style="position: relative;">
      <div class="marker-pulse"></div>
      <div class="marker-core"></div>
    </div>
    <style>
      .marker-pulse {
        position: absolute;
        width: 40px; height: 40px;
        background: rgba(37, 99, 235, 0.2);
        border-radius: 50%;
        animation: pulse-ring 2s infinite ease-in-out;
      }
      .marker-core {
        position: relative;
        width: 14px; height: 14px;
        background: #2563EB;
        border: 2px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
        margin: 13px;
      }
      @keyframes pulse-ring {
        0% { transform: scale(0.33); opacity: 1; }
        80%, 100% { transform: scale(1); opacity: 0; }
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

  /* ================= LOGIC ================= */
  const filteredDrivers = useMemo(() => 
    drivers.filter(d => d.name?.toLowerCase().includes(searchQuery.toLowerCase())),
    [drivers, searchQuery]
  );

  const selectedLocation = useMemo(() => {
    const d = drivers.find(d => d.id === selectedDriverId);
    return d ? [d.currentLocation.latitude, d.currentLocation.longitude] as [number, number] : null;
  }, [selectedDriverId, drivers]);

  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      
      {/* ================= SIDEBAR (MANAGEMENT) ================= */}
      <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col z-[1001] shadow-xl">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-100">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-xs uppercase tracking-widest mb-4 transition-colors"
          >
            <MdChevronLeft size={20} /> Back to Dashboard
          </button>
          <h1 className="text-xl font-black text-slate-900 leading-tight">Fleet <span className="text-blue-600">Radar</span></h1>
        </div>

        {/* Search Input */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search personnel..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Driver List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Loading Satellite...</div>
          ) : filteredDrivers.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No drivers found</div>
          ) : (
            filteredDrivers.map((driver) => (
              <button
                key={driver.id}
                onClick={() => setSelectedDriverId(driver.id)}
                className={`w-full text-left p-4 border-b border-slate-50 transition-all flex items-center gap-4 ${
                  selectedDriverId === driver.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  selectedDriverId === driver.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {driver.name?.charAt(0)}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-slate-900 truncate">{driver.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                  </p>
                </div>
                <MdMyLocation className={selectedDriverId === driver.id ? 'text-blue-600' : 'text-slate-300'} />
              </button>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
             Active Units: {drivers.length}
           </p>
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
                <div className="p-2 min-w-[160px]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                      <MdPerson size={18} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm leading-tight">{driver.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 truncate">{driver.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 border-t border-slate-100 pt-2">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-400 flex items-center gap-1"><MdAccessTime /> LAST SEEN</span>
                      <span className="text-slate-700">Just Now</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-400 flex items-center gap-1"><MdMyLocation /> STATUS</span>
                      <span className="text-green-600">MOVING</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend/Overlay Widgets */}
        <div className="absolute bottom-6 right-6 z-[1000] space-y-3 pointer-events-none">
           <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-white/50 pointer-events-auto">
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    <span className="text-[10px] font-black text-slate-600 uppercase">Driver</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-slate-600 uppercase">Live</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .leaflet-popup-content-wrapper { border-radius: 1.25rem !important; padding: 0 !important; overflow: hidden; }
        .leaflet-popup-content { margin: 0 !important; }
      `}</style>
    </div>
  );
}