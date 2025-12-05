import React from "react";
import { Routes, Route } from "react-router-dom";
import HospitalLogin from "./pages/HospitalLogin";
import HospitalDashboard from "./pages/HospitalDashboard";
import HospitalRequestData from "./pages/HospitalRequestData";
import HospitalAcceptedRequests from "./pages/HospitalAcceptedRequests";
import HospitalPatientDetail from "./pages/HospitalPatientDetail";
import HospitalProtectedRoute from "./components/HospitalProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HospitalLogin />} />

      {/* Protected Hospital routes */}
      <Route
        path="/hospital-dashboard"
        element={
          <HospitalProtectedRoute>
            <HospitalDashboard />
          </HospitalProtectedRoute>
        }
      />
      <Route
        path="/hospital-request-data"
        element={
          <HospitalProtectedRoute>
            <HospitalRequestData />
          </HospitalProtectedRoute>
        }
      />
      <Route
        path="/hospital-accepted-requests"
        element={
          <HospitalProtectedRoute>
            <HospitalAcceptedRequests />
          </HospitalProtectedRoute>
        }
      />
      <Route
        path="/hospital-accepted-request/:patient_id"
        element={
          <HospitalProtectedRoute>
            <HospitalPatientDetail />
          </HospitalProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
