import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/MedicalHistory.css";
import { supabase } from "../lib/supabaseClient";

export default function MedicalHistory() {
  const navigate = useNavigate();
  const [openId, setOpenId] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    validateUserAndFetchRecords();
  }, []);

  const validateUserAndFetchRecords = async () => {
    // Check if user is logged in
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      navigate("/");
      return;
    }

    // Validate user is a patient
    const { data: userData, error: userError } = await supabase
      .from("patient_tbl")
      .select("first_name, last_name, email")
      .eq("id", authData.user.id)
      .single();

    if (userError || !userData) {
      // User is not a patient - sign out and redirect
      await supabase.auth.signOut();
      navigate("/");
      return;
    }

    setUser(userData);

    // User is validated, fetch medical records
    fetchMedicalRecords();
  };

  const fetchMedicalRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("patient_records_tbl")
        .select(
          `
          *,
          patient:patient_id (first_name, last_name),
          hospital_tbl:hospital_id (name)
        `
        )
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      console.log("Raw medical records data:", data);

      // Transform the data to match the card display format
      const transformed = (data || []).map((item) => ({
        id: item.id,
        patientName: item.patient
          ? `${item.patient.first_name} ${item.patient.last_name}`
          : "Unknown Patient",
        hospitalName: item.hospital_tbl?.name || "Unknown Hospital",
        time: new Date(item.created_at).toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        // Medical details
        bloodPressure: item.blood_pressure || "N/A",
        height: item.height ? `${item.height} cm` : "N/A",
        weight: item.weight ? `${item.weight} kg` : "N/A",
        assessment: item.assessment || "N/A",
        medication: item.medication || "N/A",
        notes: item.notes || "N/A",
        smoking: item.smoking !== null ? (item.smoking ? "Yes" : "No") : "N/A",
        drinking:
          item.drinking !== null ? (item.drinking ? "Yes" : "No") : "N/A",
        transaction: item.transaction || "N/A",
      }));

      setRecords(transformed);
    } catch (err) {
      console.error("Error fetching medical records:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  const goToRequests = () => {
    navigate("/requests");
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
          <button type="button" className="nav-btn" onClick={goToRequests}>
            Requests
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
          <header className="medical-history-header">
            <h2>Medical History</h2>
          </header>

          <section className="medical-history-panel full-width">
            {loading && (
              <div className="medical-history-status">
                Loading medical records...
              </div>
            )}

            {error && (
              <div className="medical-history-status error">
                Error loading medical records: {error}
              </div>
            )}

            {!loading && !error && records.length === 0 && (
              <div className="medical-history-status">
                No medical records found.
              </div>
            )}

            {!loading && !error && records.length > 0 && (
              <div className="medical-history-list">
                {records.map((r) => {
                  const expanded = openId === r.id;
                  return (
                    <article
                      key={r.id}
                      className={"record-card" + (expanded ? " expanded" : "")}
                      onClick={() => toggle(r.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && toggle(r.id)}
                    >
                      <div className="record-head">
                        <div className="record-patient">{r.transaction}</div>
                        <div className="record-time">{r.time}</div>
                      </div>

                      <div className="record-body">
                        <div className="record-body-left">
                          <div className="record-hospital">
                            Hospital: {r.hospitalName}
                          </div>
                          <div className="record-vitals">
                            BP: {r.bloodPressure} | Height: {r.height} | Weight:{" "}
                            {r.weight}
                          </div>
                        </div>
                        <div className="record-expand">
                          {expanded ? "Click to collapse" : "Click to expand"}
                        </div>
                      </div>

                      <div
                        className={"record-details" + (expanded ? " show" : "")}
                        aria-hidden={!expanded}
                      >
                        <div className="record-info-grid">
                          <div className="record-info-item">
                            <div className="record-info-label">Assessment</div>
                            <div className="record-info-value">
                              {r.assessment}
                            </div>
                          </div>
                          <div className="record-info-item">
                            <div className="record-info-label">Medication</div>
                            <div className="record-info-value">
                              {r.medication}
                            </div>
                          </div>
                          <div className="record-info-item">
                            <div className="record-info-label">Smoking</div>
                            <div className="record-info-value">{r.smoking}</div>
                          </div>
                          <div className="record-info-item">
                            <div className="record-info-label">Drinking</div>
                            <div className="record-info-value">
                              {r.drinking}
                            </div>
                          </div>
                          {r.notes !== "N/A" && (
                            <div className="record-info-item full-width">
                              <div className="record-info-label">Notes</div>
                              <div className="record-info-value">{r.notes}</div>
                            </div>
                          )}
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
