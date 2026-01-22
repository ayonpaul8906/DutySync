import React, { useEffect, useState, useMemo, useRef } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase"; 
import { 
  MdSearch, 
  MdFormatListBulleted, 
  MdDirectionsCar, 
  MdClose, 
  MdMyLocation, 
  MdPerson 
} from "react-icons/md";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Driver {
  id: string;
  name: string;
  email: string;
  latitude?: number;
  longitude?: number;
  isOnline: boolean;
}

export default function LiveTracking() {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isListVisible, setIsListVisible] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // ---------------------------
  // INITIALIZE MAP
  // ---------------------------
  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("map-container", {
        zoomControl: false,
        attributionControl: false,
      }).setView([22.5726, 88.3639], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapRef.current);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // ---------------------------
  // FIRESTORE REALTIME SYNC
  // ---------------------------
  useEffect(() => {
    // 1. Listen to Users collection for Driver details
    const qUsers = query(collection(db, "users"), where("role", "==", "driver"));
    const unsubUsers = onSnapshot(qUsers, (userSnap) => {
      const userList = userSnap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "Unknown Driver",
        email: doc.data().email || "",
      }));

      // 2. Listen to Drivers collection for live GPS
      const unsubLocations = onSnapshot(collection(db, "drivers"), (locSnap) => {
        const locations: any = {};
        locSnap.docs.forEach((doc) => {
          locations[doc.id] = doc.data();
        });

        const mergedDrivers = userList.map((user) => {
          const locData = locations[user.id];
          const lat = locData?.latitude ?? locData?.currentLocation?.latitude;
          const lng = locData?.longitude ?? locData?.currentLocation?.longitude;
          const isValid = Number.isFinite(lat) && Number.isFinite(lng);

          return {
            ...user,
            latitude: lat,
            longitude: lng,
            isOnline: isValid,
          } as Driver;
        });

        setDrivers(mergedDrivers);
        updateMarkers(mergedDrivers);
      });

      return () => unsubLocations();
    });

    return () => unsubUsers();
  }, []);

  // ---------------------------
  // MARKER MANAGEMENT
  // ---------------------------
  const updateMarkers = (driverData: Driver[]) => {
    if (!mapRef.current) return;

    driverData.forEach((d) => {
      if (!d.latitude || !d.longitude) return;
      const pos: [number, number] = [d.latitude, d.longitude];

      if (markersRef.current[d.id]) {
        markersRef.current[d.id].setLatLng(pos);
      } else {
        const carIcon = L.divIcon({
          className: "custom-marker",
          html: `
            <div class="marker-container">
              <div class="pulse"></div>
              <div class="car-card">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                  <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/>
                </svg>
              </div>
            </div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        markersRef.current[d.id] = L.marker(pos, { icon: carIcon })
          .addTo(mapRef.current!)
          .bindPopup(`<b>${d.name}</b><br/>Driver Status: Online`);
      }
    });
  };

  // ---------------------------
  // SEARCH & SUGGESTION LOGIC
  // ---------------------------
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return drivers.filter((d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [drivers, searchQuery]);

  const handleFocusDriver = (driver: Driver) => {
    if (driver.latitude && mapRef.current) {
      mapRef.current.flyTo([driver.latitude, driver.longitude!], 17, { duration: 1.5 });
      setSearchQuery(driver.name);
      setIsSearching(false);
      setIsListVisible(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-slate-100 overflow-hidden font-sans">
      {/* MAP VIEW */}
      <div id="map-container" className="absolute inset-0 z-0" />

      {/* SEARCH BAR & LIST TOGGLE */}
      <div className="absolute top-6 left-0 right-0 z-[1000] px-4 flex justify-center items-start gap-3">
        <div className="relative flex-1 max-w-md">
          {/* Input Box */}
          <div className="h-14 bg-white rounded-2xl shadow-xl border border-slate-200 flex items-center px-4 transition-all focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent">
            <MdSearch size={24} className="text-slate-400" />
            <input
              className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 placeholder-slate-400 px-3"
              placeholder="Search driver name..."
              value={searchQuery}
              onFocus={() => {
                setIsSearching(true);
                setIsListVisible(false);
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <MdClose 
                onClick={() => { setSearchQuery(""); setIsSearching(false); }} 
                className="text-slate-400 cursor-pointer hover:text-red-500 transition-colors" 
              />
            )}
          </div>

          {/* DYNAMIC SUGGESTIONS */}
          {isSearching && suggestions.length > 0 && (
            <div className="absolute top-16 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {suggestions.map((driver) => (
                <div
                  key={driver.id}
                  onClick={() => handleFocusDriver(driver)}
                  className="p-4 flex items-center justify-between hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-none transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${driver.isOnline ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                      <MdDirectionsCar size={18} />
                    </div>
                    <span className="font-bold text-slate-800">{driver.name}</span>
                  </div>
                  {driver.isOnline && (
                    <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-md">LIVE</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LIST TOGGLE BUTTON */}
        <button 
          onClick={() => {
            setIsListVisible(!isListVisible);
            setIsSearching(false);
          }}
          className={`h-14 w-14 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300 transform active:scale-90 ${
            isListVisible ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <MdFormatListBulleted size={26} />
        </button>
      </div>

      {/* FULL FLEET LIST MODAL */}
      {isListVisible && (
        <div className="absolute top-24 right-4 z-[999] w-80 bg-white/95 backdrop-blur-md rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in slide-in-from-right-8 duration-300">
          <div className="p-6 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Fleet</h3>
              <p className="text-xl font-black text-slate-900 leading-none mt-1">
                {drivers.filter(d => d.isOnline).length} <span className="text-sm font-bold text-slate-500">Online</span>
              </p>
            </div>
            <MdMyLocation className="text-blue-600 animate-pulse" size={24} />
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {drivers.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-slate-400 font-bold">No drivers found.</p>
              </div>
            ) : (
              drivers.map((driver) => (
                <div 
                  key={driver.id} 
                  onClick={() => handleFocusDriver(driver)}
                  className="p-5 flex items-center gap-4 hover:bg-blue-50 cursor-pointer transition-all border-b border-slate-50 group"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-active:scale-95 ${
                    driver.isOnline ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-200 text-slate-400'
                  }`}>
                    <MdPerson size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-slate-800">{driver.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      {driver.isOnline ? 'Live Tracking' : 'Last seen offline'}
                    </p>
                  </div>
                  {driver.isOnline && (
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MAP MARKER STYLES */}
      <style>{`
        .marker-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .car-card {
          background: #2563EB;
          border: 3px solid white;
          border-radius: 12px;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          position: relative;
          z-index: 2;
        }
        .pulse {
          position: absolute;
          width: 55px;
          height: 55px;
          background: rgba(37, 99, 235, 0.25);
          border-radius: 50%;
          animation: pulse-ring 2s infinite ease-in-out;
          z-index: 1;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.4); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 5px;
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}