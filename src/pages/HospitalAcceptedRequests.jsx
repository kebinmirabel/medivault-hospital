import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useHealthcareStaff } from "../lib/hooks/useHealthcareStaff";
import "../css/HospitalUI.css";

export default function HospitalAcceptedRequests() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // useHealthcareStaff handles authentication & staff lookup and redirects on unauthenticated users
  const { staffData, loading: staffLoading, error: staffError } = useHealthcareStaff();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/hospital-login');
  };

  const goToRequestData = () => {
    navigate('/hospital-request-data');
  };

  const goToAcceptedRequests = () => {
    navigate('/hospital-accepted-requests');
  };

  const goToDashboard = () => {
    navigate('/hospital-dashboard');
  };

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

    // Get hospital_id from staffData for filtering
    const hospital_id = staffData?.hospital_id || null;
    
    if (!hospital_id) {
      setError('Missing hospital information for the logged-in user');
      setLoading(false);
      return;
    }

    try {
      // First get all accepted requests for this hospital
      const { data: acceptedRequests, error: requestsError } = await supabase
        .from("accepted_requests")
        .select("patient_id")
        .eq('hospital_id', hospital_id);

      if (requestsError) {
        throw requestsError;
      }

      if (!acceptedRequests || acceptedRequests.length === 0) {
        setResults([]);
        setLoading(false);
        return;
      }

      // Extract patient IDs
      const patientIds = acceptedRequests.map(req => req.patient_id);

      // Now search in patient_tbl with the patient IDs and search term
      const searchTerm = `%${query}%`;
      const { data, error: sbError } = await supabase
        .from("patient_tbl")
        .select("id, first_name, middle_name, last_name, birthday, age, email, contact_num, blood_type, address")
        .in('id', patientIds)
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},contact_num.ilike.${searchTerm}`)
        .limit(100);

      if (sbError) {
        throw sbError;
      }

      setResults(data || []);
    } catch (error) {
      console.error(error);
      setError(error.message || "Search failed");
      setResults([]);
    }
    
    setLoading(false);
  }

  // simple helper to render full name
  const fullName = (p) => `${p.first_name || ""} ${p.middle_name || ""} ${p.last_name || ""}`.replace(/\s+/g, " ").trim();

  // Navigate to patient history page
  function viewPatientHistory(patientId) {
    navigate(`/hospital-accepted-request/${patientId}`);
  }

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
          <button type="button" className="nav-btn" onClick={goToRequestData}>Request Data</button>
          <button type="button" className="nav-btn" onClick={goToAcceptedRequests}>Accepted Requests</button>
          <button type="button" className="nav-btn" onClick={goToDashboard}>Dashboard</button>
          
          <div className="user-dropdown">
            <button className="nav-avatar" onClick={() => {}} aria-label="User menu">
              {staffData ? (staffData.first_name?.[0] || staffData.email?.[0] || "S").toUpperCase() : "S"}
            </button>
            
            <div className="dropdown-menu" style={{display: 'none'}}>
              <div className="dropdown-header">
                <div className="user-name">
                  {staffData ? `${staffData.first_name || ""} ${staffData.last_name || ""}`.trim() || staffData.email : "Staff"}
                </div>
                <div className="user-email">{staffData?.email}</div>
                <div className="user-role">{staffData?.role} - {staffData?.occupation}</div>
              </div>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout-btn" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="page-container">
        <div className="lr-inner">
          <h3>Search Patients</h3>

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
                      <h3 style={{ margin: 0, marginBottom: 6 }}>{fullName(p)}</h3>
                      <p style={{ margin: 0, color: "#666" }}>Age: {p.age ?? "—"}</p>
                      <p style={{ marginTop: 8, color: "#234" }}>{p.email}</p>
                    </button>
                  ))}
                </div>

                {results.length === 0 && !loading && (
                  <div style={{ padding: 12, textAlign: "center", color: "#666" }}>No results</div>
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
              <button className="hr-modal-close" aria-label="Close" onClick={() => setSelectedPatient(null)}>×</button>
              <h2 style={{ marginTop: 0 }}>{fullName(selectedPatient)}</h2>
              <p><strong>Age:</strong> {selectedPatient.age ?? '—'}</p>
              <p><strong>Date of Birth:</strong> {selectedPatient.birthday ?? '—'}</p>
              <p><strong>Email:</strong> {selectedPatient.email ?? '—'}</p>
              <p><strong>Contact:</strong> {selectedPatient.contact_num ?? '—'}</p>
              <p><strong>Blood Type:</strong> {selectedPatient.blood_type ?? '—'}</p>
              <p style={{ marginBottom: 12 }}><strong>Address:</strong> {selectedPatient.address ?? '—'}</p>
              
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="lr-submit"
                  onClick={() => viewPatientHistory(selectedPatient.id)}
                  style={{ background: '#2563eb' }}
                >
                  View Patient History
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
