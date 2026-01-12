import { useEffect, useState } from "react";
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
} from "react-icons/md";

/* ================= TYPES ================= */

interface Driver {
  id: string;
  name?: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    lastUpdated?: any;
  };
}

/* ================= CUSTOM ICON ================= */

const driverIcon = new L.DivIcon({
  className: "",
  html: `
    <div style="
      width:12px;
      height:12px;
      background:#2563EB;
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 0 10px rgba(0,0,0,0.3);
    "></div>
  `,
});

/* ================= AUTO CENTER MAP ================= */

function AutoCenter({ drivers }: { drivers: Driver[] }) {
  const map = useMap();

  useEffect(() => {
    if (drivers.length > 0) {
      const { latitude, longitude } = drivers[0].currentLocation;
      map.setView([latitude, longitude], 14);
    }
  }, [drivers, map]);

  return null;
}

/* ================= MAIN COMPONENT ================= */

export default function LiveTracking() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= FIRESTORE LISTENER ================= */
  useEffect(() => {
    const q = query(collection(db, "drivers"), where("active", "==", true));

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Driver, "id">),
        }))
        .filter(
          (d) =>
            d.currentLocation &&
            d.currentLocation.latitude &&
            d.currentLocation.longitude
        );

      setDrivers(list);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white">

      {/* ================= HEADER ================= */}
      <div className="flex items-center gap-4 px-5 py-4 border-b bg-white">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-slate-100"
        >
          <MdChevronLeft className="text-2xl text-slate-900" />
        </button>

        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Live Fleet Map
          </h1>
          <p className="text-xs font-semibold text-slate-500">
            AMPL Real-time Tracking
          </p>
        </div>
      </div>

      {/* ================= MAP ================= */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <MapContainer
            center={[22.5726, 88.3639]} // fallback (Kolkata)
            zoom={13}
            zoomControl={false}
            className="h-full w-full z-0"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <AutoCenter drivers={drivers} />

            {drivers.map((driver) => (
              <Marker
                key={driver.id}
                position={[
                  driver.currentLocation.latitude,
                  driver.currentLocation.longitude,
                ]}
                icon={driverIcon}
              >
                <Popup>
                  <strong>{driver.name || "Driver"}</strong>
                  <br />
                  Live Location
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* ================= FOOTER ================= */}
      <div className="px-5 py-4 border-t bg-white">
        <div className="flex items-center justify-center gap-3">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-sm font-bold text-slate-800">
            Tracking {drivers.length} Active Personnel
          </p>
        </div>
      </div>
    </div>
  );
}
