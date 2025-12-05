import React from 'react';
import { useHealthcareStaff } from '../lib/hooks/useHealthcareStaff';

const HospitalProtectedRoute = ({ children }) => {
  const { staffData, loading, error } = useHealthcareStaff();

  if (loading) {
    return (
      <div className="lr-page">
        <div className="lr-inner">
          <main className="lr-box">
            <p>Loading...</p>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lr-page">
        <div className="lr-inner">
          <main className="lr-box">
            <p style={{ color: "#b00" }}>{error}</p>
            <a href="/hospital-login" className="lr-submit">Go to Login</a>
          </main>
        </div>
      </div>
    );
  }

  if (!staffData) {
    // Redirect to hospital login if not authenticated
    window.location.href = '/hospital-login';
    return null;
  }

  return children;
};

export default HospitalProtectedRoute;