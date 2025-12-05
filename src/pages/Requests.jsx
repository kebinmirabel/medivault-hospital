import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Requests.css";
import { supabase } from "../lib/supabaseClient";

export default function Requests() {
  const navigate = useNavigate();
  const [openId, setOpenId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchUserAndRequests();
  }, []);

  const fetchUserAndRequests = async () => {
    // Check if user is logged in
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      navigate("/");
      return;
    }

    // Fetch user details from patient_tbl to validate user type
    const { data: userData, error: userError } = await supabase
      .from("patient_tbl")
      .select("first_name, last_name, email")
      .eq("id", authData.user.id)
      .single();

    if (userError || !userData) {
      // User is not a patient (might be hospital staff) - sign out and redirect
      console.error("User is not a valid patient:", userError);
      await supabase.auth.signOut();
      navigate("/");
      return;
    }

    setUser(userData);

    // Fetch OTP requests
    fetchOtpRequests();
  };

  const fetchOtpRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("otp")
        .select(
          `
          *,
          patient:patient_id (first_name, last_name),
          healthcare_staff:healthcare_staff_id (first_name, last_name),
          hospital:hospital_id (name)
        `
        )
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Debug: log raw data to check hospital reference
      console.log("Raw OTP data:", data);

      // Remove duplicates - keep only one request per hospital
      const uniqueByHospital = [];
      const seenHospitals = new Set();

      (data || []).forEach((item) => {
        const hospitalId = item.hospital_id;
        if (!seenHospitals.has(hospitalId)) {
          seenHospitals.add(hospitalId);
          uniqueByHospital.push(item);
        }
      });

      // Transform the data to match the card display format
      const transformed = uniqueByHospital.map((item) => ({
        id: item.id,
        name: item.patient
          ? `${item.patient.first_name} ${item.patient.last_name}`
          : "Unknown Patient",
        staffName: item.healthcare_staff
          ? `${item.healthcare_staff.first_name} ${item.healthcare_staff.last_name}`
          : "Unknown Staff",
        hospitalName: item.hospital?.name || "Unknown Hospital",
        time: new Date(item.created_at).toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        otp: item.otp || "N/A",
        note: `Request from ${item.hospital?.name || "hospital"}`,
      }));

      setRequests(transformed);
    } catch (err) {
      console.error("Error fetching OTP requests:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));

  const copyOtp = async (otp) => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(otp);
    } catch (e) {
      console.warn("copy failed", e);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  const goToMedicalHistory = () => {
    navigate("/medical-history");
  };

  const goToAcceptedRequests = () => {
    navigate("/patient-accepted-requests");
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand">MediVault</div>
        </div>
        <div className="topbar-right">
          <button
            type="button"
            className="nav-btn"
            onClick={goToMedicalHistory}
          >
            Medical History
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
              className="user-avatar"
              onClick={toggleDropdown}
              aria-label="User menu"
            >
              {user
                ? (user.first_name?.[0] || user.email?.[0] || "U").toUpperCase()
                : "U"}
            </button>

            {dropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-header">
                  <div className="user-name">
                    {user
                      ? `${user.first_name || ""} ${
                          user.last_name || ""
                        }`.trim() || user.email
                      : "User"}
                  </div>
                  <div className="user-email">{user?.email}</div>
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
      </header>

      <div className="shell-body">
        <main className="content">
          <header className="requests-header">
            <h2>Requests</h2>
          </header>

          <section className="requests-panel full-width">
            {loading && (
              <div className="requests-status">Loading requests...</div>
            )}

            {error && (
              <div className="requests-status error">
                Error loading requests: {error}
              </div>
            )}

            {!loading && !error && requests.length === 0 && (
              <div className="requests-status">No OTP requests found.</div>
            )}

            {!loading && !error && requests.length > 0 && (
              <div className="requests-list">
                {requests.map((r) => {
                  const expanded = openId === r.id;
                  return (
                    <article
                      key={r.id}
                      className={"req-card" + (expanded ? " expanded" : "")}
                      onClick={() => toggle(r.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && toggle(r.id)}
                    >
                      <div className="req-head">
                        <div className="req-who">{r.name}</div>
                        <div className="req-time">{r.time}</div>
                      </div>

                      <div className="req-body">
                        <div className="req-body-left">
                          <div className="req-note">{r.note}</div>
                          {r.staffName && r.staffName !== "Unknown Staff" && (
                            <div className="req-staff">
                              Staff: {r.staffName}
                            </div>
                          )}
                        </div>
                        <div className="req-expand">
                          {expanded ? "Click to collapse" : "Click to expand"}
                        </div>
                      </div>

                      <div
                        className={"req-details" + (expanded ? " show" : "")}
                        aria-hidden={!expanded}
                      >
                        <div className="req-otp-label">One-time passcode</div>
                        <div className="req-otp">
                          <span className="otp-val">{r.otp}</span>
                          <button
                            className="otp-copy"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyOtp(r.otp);
                            }}
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
