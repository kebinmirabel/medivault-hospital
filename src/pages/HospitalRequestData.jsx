import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useHealthcareStaff } from "../lib/hooks/useHealthcareStaff";
import "../css/HospitalUI.css";
import requestPatientData, {
  verifyOtp,
  logAuditAction,
  searchPatients,
  handleEmergencyOverride as emergencyOverride,
} from "../lib/HospitalFunctions";

export default function HospitalRequestData() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [otpError, setOtpError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [isEmergencyLoading, setIsEmergencyLoading] = useState(false);
  // useHealthcareStaff handles authentication & staff lookup and redirects on unauthenticated users
  const {
    staffData,
    loading: staffLoading,
    error: staffError,
  } = useHealthcareStaff();

  // debounce search by 400ms
  useEffect(() => {
    // do not search until staff access is confirmed
    if (!staffData) {
      setResults([]);
      setError(null);
      return;
    }

    if (!term || term.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const timeout = setTimeout(() => {
      runSearch(term.trim());
    }, 400);
    return () => clearTimeout(timeout);
  }, [term, staffData]);

  async function runSearch(query) {
    setLoading(true);
    setError(null);

    try {
      const data = await searchPatients(query);
      setResults(data);
    } catch (error) {
      console.error(error);
      setError(error.message || "Search failed");
      setResults([]);
    }
    setLoading(false);
  }

  // simple helper to render full name
  const fullName = (p) =>
    `${p.first_name || ""} ${p.middle_name || ""} ${p.last_name || ""}`
      .replace(/\s+/g, " ")
      .trim();

  // Request OTP/data for a patient using the currently-logged-in staff's hospital id
  async function handleRequestData(patient) {
    setError(null);
    if (!patient || !patient.id) {
      setError("No patient selected");
      return;
    }

    // derive hospital_id and healthcare_staff_id from staffData (hook provides the staff row)
    const hospital_id = staffData?.hospital_id || null;
    const healthcare_staff_id = staffData?.id || null;

    console.log("Request data with:", {
      hospital_id,
      healthcare_staff_id,
      patient_id: patient.id,
      staffData,
    });

    if (!hospital_id || !healthcare_staff_id) {
      setError(
        `Missing hospital or staff information. Hospital ID: ${hospital_id}, Staff ID: ${healthcare_staff_id}`
      );
      return;
    }

    setLoading(true);
    const { data, error: hfError } = await requestPatientData({
      hospital_id,
      patient_id: patient.id,
      healthcare_staff_id,
    });
    setLoading(false);

    if (hfError) {
      console.error("requestPatientData error", hfError);
      setError(hfError.message || String(hfError));
    } else {
      // success — show a small toast message
      setError(null);
      setSuccessMessage("OTP request sent successfully");
      // auto-dismiss
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  }

  async function handleVerifyOtp() {
    if (!otpInput || otpInput.trim().length === 0) {
      setOtpError("Please enter an OTP");
      return;
    }

    setOtpLoading(true);
    setOtpError(null);
    const { data, error: verifyError } = await verifyOtp(otpInput.trim());
    setOtpLoading(false);

    if (verifyError) {
      setOtpError(verifyError.message || "OTP verification failed");
    } else {
      setSuccessMessage("OTP verified successfully");
      setOtpInput("");
      setOtpError(null);
      setTimeout(() => setSuccessMessage(null), 3500);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/hospital-login");
  };

  const goToRequestData = () => {
    navigate("/hospital-request-data");
  };

  const goToAcceptedRequests = () => {
    navigate("/hospital-accepted-requests");
  };

  const goToDashboard = () => {
    navigate("/hospital-dashboard");
  };

  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  // Check if current staff has Level 3 role (emergency override access)
  const isLevel3Staff = staffData?.role === 3;

  // Emergency Override Function
  const handleEmergencyOverride = async () => {
    setIsEmergencyLoading(true);

    try {
      const result = await emergencyOverride(
        selectedPatient,
        emergencyReason,
        staffData
      );

      // Show success message
      setSuccessMessage(result.message);

      // Close modals and reset state
      setShowEmergencyModal(false);
      setSelectedPatient(null);
      setEmergencyReason("");

      // Auto-dismiss success message
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error("Emergency override error:", error);
      alert(
        error.message ||
          "Failed to process emergency override. Please try again."
      );
    } finally {
      setIsEmergencyLoading(false);
    }
  };

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

  // Show loading/authorization states from the hook
  if (staffLoading) {
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

  if (staffError) {
    return (
      <div className="lr-page">
        <div className="lr-inner">
          <main className="lr-box">
            <p style={{ color: "#b00" }}>{staffError}</p>
          </main>
        </div>
      </div>
    );
  }

  if (!staffData) {
    return (
      <div className="lr-page">
        <div className="lr-inner">
          <main className="lr-box">
            <p>You are not authorized to search patient records.</p>
          </main>
        </div>
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
          <button type="button" className="nav-btn" onClick={goToDashboard}>
            Dashboard
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
                    {staffData?.role} - {staffData?.occupation}
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

      {/* OTP Box - Fixed on left edge */}
      <div className="otp-sidebar">
        <h4>Enter OTP</h4>
        <input
          type="text"
          placeholder="6-digit OTP"
          className="otp-sidebar-input"
          value={otpInput}
          onChange={(e) => setOtpInput(e.target.value)}
        />
        <button
          className="otp-sidebar-btn"
          onClick={handleVerifyOtp}
          disabled={otpLoading}
        >
          {otpLoading ? "Verifying..." : "Verify"}
        </button>
        {otpError && <div className="otp-sidebar-error">{otpError}</div>}
      </div>

      <div className="lr-page page-container">
        {/* small success toast */}
        {successMessage && (
          <div className="toast-success">{successMessage}</div>
        )}
        <div className="lr-inner">
          <h3>Request Patient Data</h3>

          <main className="lr-box">
            <div style={{ width: "100%" }}>
              <div className="search-row">
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search by name, email or contact (min 2 chars)"
                  className="lr-input search-input"
                />
                <button
                  className="lr-submit"
                  type="button"
                  onClick={() => {
                    if (term && term.trim().length >= 2) runSearch(term.trim());
                  }}
                >
                  Search
                </button>
              </div>

              {loading && <p>Searching…</p>}
              {error && <p style={{ color: "#b00" }}>{error}</p>}

              <div style={{ marginTop: 8 }}>
                <div className="patient-grid">
                  {results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="patient-card"
                      onClick={() => setSelectedPatient(p)}
                      title={`Open ${fullName(p)}`}
                    >
                      <h3 style={{ margin: 0, marginBottom: 6 }}>
                        {fullName(p)}
                      </h3>
                      <p style={{ margin: 0, color: "#666" }}>
                        Age: {p.age ?? "—"}
                      </p>
                      <p style={{ marginTop: 8, color: "#234" }}>{p.email}</p>
                    </button>
                  ))}
                </div>

                {results.length === 0 && !loading && (
                  <div
                    style={{ padding: 12, textAlign: "center", color: "#666" }}
                  >
                    No results
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
        {/* Patient detail modal */}
        {selectedPatient && (
          <div
            className="hr-modal-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => setSelectedPatient(null)}
          >
            <div className="hr-modal" onClick={(e) => e.stopPropagation()}>
              <button
                className="hr-modal-close"
                aria-label="Close"
                onClick={() => setSelectedPatient(null)}
              >
                ×
              </button>
              <h2 style={{ marginTop: 0 }}>{fullName(selectedPatient)}</h2>
              <p>
                <strong>Age:</strong> {selectedPatient.age ?? "—"}
              </p>
              <p>
                <strong>Date of Birth:</strong>{" "}
                {selectedPatient.birthday ?? "—"}
              </p>
              <p>
                <strong>Email:</strong> {selectedPatient.email ?? "—"}
              </p>
              <p>
                <strong>Contact:</strong> {selectedPatient.contact_num ?? "—"}
              </p>
              <p>
                <strong>Blood Type:</strong> {selectedPatient.blood_type ?? "—"}
              </p>
              <p style={{ marginBottom: 12 }}>
                <strong>Address:</strong> {selectedPatient.address ?? "—"}
              </p>

              <div
                style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}
              >
                <button
                  type="button"
                  className="lr-submit"
                  onClick={async () => {
                    // use the logged-in staff data to derive hospital & staff ids
                    await handleRequestData(selectedPatient);
                    // close modal regardless (or change this to after success if preferred)
                    setSelectedPatient(null);
                  }}
                >
                  Request Data
                </button>
                {isLevel3Staff && (
                  <button
                    type="button"
                    className="emergency-override-btn"
                    onClick={() => {
                      setShowEmergencyModal(true);
                    }}
                    title="Emergency Override - Level 3 Staff Only"
                  >
                    🚨 Emergency Access
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Emergency Override Modal */}
        {showEmergencyModal && selectedPatient && (
          <div className="modal-overlay">
            <div className="emergency-modal">
              <div className="modal-header">
                <h3>⚠️ EMERGENCY OVERRIDE - LEVEL 3</h3>
                <button
                  className="close-btn"
                  onClick={() => {
                    setShowEmergencyModal(false);
                    setEmergencyReason("");
                  }}
                >
                  ×
                </button>
              </div>

              <div className="modal-body">
                <div className="warning-message">
                  <p>
                    <strong>⚠️ CRITICAL WARNING:</strong> This emergency
                    override will be permanently logged in the audit system.
                  </p>
                  <p>
                    <strong>Use only in genuine medical emergencies</strong>{" "}
                    when patient cannot provide OTP and immediate access to
                    medical records is required to save life or prevent serious
                    harm.
                  </p>
                </div>

                <div className="patient-info">
                  <h4>Emergency Access Details:</h4>
                  <p>
                    <strong>Patient:</strong> {selectedPatient?.first_name}{" "}
                    {selectedPatient?.last_name}
                  </p>
                  <p>
                    <strong>DOB:</strong>{" "}
                    {selectedPatient?.birthday || "Not available"}
                  </p>
                  <p>
                    <strong>Staff:</strong> {staffData?.first_name}{" "}
                    {staffData?.last_name} (Level 3 Authority)
                  </p>
                  <p>
                    <strong>Hospital:</strong>{" "}
                    {staffData?.hospital?.name || "Unknown"}
                  </p>
                  <p>
                    <strong>Time:</strong> {new Date().toLocaleString()}
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="emergencyReason">
                    <strong>Medical Emergency Justification (Required):</strong>
                  </label>
                  <textarea
                    id="emergencyReason"
                    value={emergencyReason}
                    onChange={(e) => setEmergencyReason(e.target.value)}
                    placeholder="Describe the specific medical emergency that requires immediate access to this patient's records (e.g., 'Patient unconscious in ER, suspected drug allergy, requires immediate medical history for treatment')"
                    rows={5}
                    required
                  />
                  <small>
                    This reason will be permanently recorded in the audit log
                    and may be subject to medical board review.
                  </small>
                </div>

                <div className="confirmation-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={emergencyReason.length >= 20}
                      readOnly
                    />
                    I confirm this is a genuine medical emergency requiring
                    immediate patient record access
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setShowEmergencyModal(false);
                    setEmergencyReason("");
                  }}
                >
                  Cancel
                </button>
                <button
                  className="confirm-emergency-btn"
                  onClick={handleEmergencyOverride}
                  disabled={isEmergencyLoading || emergencyReason.length < 20}
                >
                  {isEmergencyLoading
                    ? "LOGGING OVERRIDE..."
                    : "CONFIRM EMERGENCY ACCESS"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
