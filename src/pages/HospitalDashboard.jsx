import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useHealthcareStaff } from "../lib/hooks/useHealthcareStaff";
import { getDashboardStats, fetchAuditLogs } from "../lib/dashboardFunctions";
import "../css/HospitalUI.css";

export default function HospitalDashboard() {
  const navigate = useNavigate();
  const { staffData, loading, error } = useHealthcareStaff();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const goToRequestData = () => {
    navigate("/hospital-request-data");
  };

  const goToAcceptedRequests = () => {
    navigate("/hospital-accepted-requests");
  };

  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      console.log("fetchDashboardData called, staffData:", staffData);
      if (!staffData) return;

      try {
        const hospital_id = staffData?.hospital_id;
        console.log("Hospital ID:", hospital_id);
        if (!hospital_id) {
          console.error("No hospital_id found in staff data");
          return;
        }

        console.log("Fetching dashboard data...");
        const [stats, logs] = await Promise.all([
          getDashboardStats(hospital_id),
          fetchAuditLogs(5, hospital_id),
        ]);

        console.log("Dashboard data fetched:", { stats, logs });
        setDashboardStats(stats);
        setAuditLogs(logs);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        console.log("Setting dashboardLoading to false");
        setDashboardLoading(false);
      }
    };

    if (staffData) {
      fetchDashboardData();
    } else {
      console.log("No staff data, setting loading to false anyway");
      setDashboardLoading(false);
    }
  }, [staffData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest(".user-dropdown")) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [dropdownOpen]);

  // Show loading state while checking staff access
  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <p>Loading...</p>
      </div>
    );
  }

  // If error, show the error message
  if (error) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2 style={{ color: "#dc3545" }}>Access Denied</h2>
        <p>{error}</p>
        <button onClick={() => navigate("/")}>Back to Login</button>
      </div>
    );
  }

  // If no staff data, show access denied
  if (!staffData) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2 style={{ color: "#dc3545" }}>Access Denied</h2>
        <p>Healthcare Staff User not found. Check your credentials.</p>
        <button onClick={() => navigate("/")}>Back to Login</button>
      </div>
    );
  }

  return (
    <>
      <nav className="hospital-nav">
        <div className="nav-brand">
          <h2>
            <span className="medi">Medi</span>
            <span className="vault">Vault</span>
          </h2>
        </div>

        <div className="nav-actions">
          <button type="button" className="nav-btn" onClick={goToRequestData}>
            Request Data
          </button>
          <button
            type="button"
            className="nav-btn"
            onClick={goToAcceptedRequests}
          >
            Accepted Requests
          </button>

          <div className="user-dropdown">
            <button
              className="nav-avatar"
              onClick={toggleDropdown}
              aria-label="User menu"
            >
              {staffData
                ? (
                    staffData.first_name?.[0] ||
                    staffData.email?.[0] ||
                    "S"
                  ).toUpperCase()
                : "S"}
            </button>

            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <div className="user-name">
                    {staffData
                      ? `${staffData.first_name || ""} ${
                          staffData.last_name || ""
                        }`.trim() || staffData.email
                      : "Staff"}
                  </div>
                  <div className="user-email">{staffData?.email}</div>
                  <div className="user-role">
                    Level {staffData?.role} - {staffData?.occupation}
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <button
                  className="dropdown-item logout-btn"
                  onClick={handleLogout}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="16,17 21,12 16,7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="21"
                      y1="12"
                      x2="9"
                      y2="12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="lr-page page-container dashboard-page">
        <div className="lr-inner dashboard-inner">
          <h1 className="dashboard-title">Hospital Dashboard</h1>
          <p className="welcome-text">
            Welcome, {staffData.first_name} {staffData.last_name}
          </p>

          {dashboardLoading ? (
            <div className="loading-state">
              <p>Loading dashboard data...</p>
            </div>
          ) : (
            <div className="dashboard-content">
              {/* Statistics Cards */}
              <div className="dashboard-stats">
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <h3>{dashboardStats?.todayRequests || 0}</h3>
                    <p>Requests Today</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-content">
                    <h3>{dashboardStats?.todayAccepted || 0}</h3>
                    <p>Accepted Today</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-content">
                    <h3>{dashboardStats?.todayActions || 0}</h3>
                    <p>Actions Today</p>
                  </div>
                </div>
              </div>

              {/* Main Dashboard Content */}
              <div className="dashboard-main">
                {/* Recent Audit Logs */}
                <div className="dashboard-section">
                  <h3>Recent Actions</h3>
                  <div className="audit-list">
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`audit-item ${
                            log.action?.includes("EMERGENCY_OVERRIDE")
                              ? "emergency-override"
                              : ""
                          }`}
                        >
                          <div className="audit-info">
                            <p className="audit-action">{log.action}</p>
                            <p className="audit-details">
                              {log.patient_tbl?.first_name}{" "}
                              {log.patient_tbl?.last_name} -{" "}
                              {log.healthcare_staff_tbl?.first_name}{" "}
                              {log.healthcare_staff_tbl?.last_name}
                            </p>
                          </div>
                          <div className="audit-time">
                            {new Date(log.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="no-data">No recent actions</p>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="dashboard-section">
                  <h3>Quick Actions</h3>
                  <div className="quick-actions">
                    <button className="action-card" onClick={goToRequestData}>
                      <div className="action-icon">🔍</div>
                      <h4>Request Patient Data</h4>
                      <p>Search and request patient information</p>
                    </button>
                    <button
                      className="action-card"
                      onClick={goToAcceptedRequests}
                    >
                      <div className="action-icon">📋</div>
                      <h4>View Accepted Requests</h4>
                      <p>Access approved patient records</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
