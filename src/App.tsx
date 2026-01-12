import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import Login from "./pages/auth/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import DriverDashboard from "./pages/driver/Dashboard";
import AssignDuty from "./pages/admin/AssignDuty";
import ManageDrivers from "./pages/admin/ManageDrivers";
import LiveTracking from "./pages/admin/LiveTracking";

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
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

        <Route
          path="/"
          element={
            user ? (
              role === "admin" ? (
                <Navigate to="/admin" />
              ) : (
                <Navigate to="/driver" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/driver" element={<DriverDashboard />} />
        <Route path="/assign-duty" element={<AssignDuty />} />
        <Route path="/manage-drivers" element={<ManageDrivers />} />
        <Route path="/live-tracking" element={<LiveTracking />} />
      </Routes>
    </BrowserRouter>
  );
}
