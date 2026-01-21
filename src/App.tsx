import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

/* PAGES */
import LandingPage from "./pages/LandingPage";
import Login from "./pages/auth/Login";

import AdminDashboard from "./pages/admin/Dashboard";
import AssignDuty from "./pages/admin/AssignDuty";
import ManageDrivers from "./pages/admin/ManageDrivers";
import LiveTracking from "./pages/admin/LiveTracking";

import DriverDashboard from "./pages/driver/Dashboard";
import DutyRecords from "./pages/admin/DutyRecords";
import DriverProfile from "./pages/admin/DriverProfile";
import DaywiseReport from "./pages/admin/DaywiseReport";

/* ================= APP ================= */

export default function App() {
  const { user, role, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* ================= PUBLIC ================= */}

        {/* Landing Page (BEFORE login) */}
        <Route
          path="/"
          element={
            !user ? (
              <LandingPage />
            ) : role === "admin" ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/driver" />
            )
          }
        />

        {/* Login */}
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/" />}
        />

        {/* ================= ADMIN ================= */}

        <Route
          path="/admin"
          element={
            user && role === "admin" ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route
          path="/assign-duty"
          element={
            user && role === "admin" ? (
              <AssignDuty />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        <Route path="/daywise-report" element={<DaywiseReport />} />
        <Route path="/duty-records/:status" element={<DutyRecords />} />
        <Route path="/manage-drivers/:status?" element={<ManageDrivers />} />
        <Route path="/admin/driver-profile/:driverId" element={<DriverProfile />} />

        <Route
          path="/live-tracking"
          element={
            user && role === "admin" ? (
              <LiveTracking />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* ================= DRIVER ================= */}

        <Route
          path="/driver"
          element={
            user && role === "driver" ? (
              <DriverDashboard />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* ================= FALLBACK ================= */}
        <Route path="*" element={<Navigate to="/" />} />

      </Routes>
    </BrowserRouter>
  );
}
