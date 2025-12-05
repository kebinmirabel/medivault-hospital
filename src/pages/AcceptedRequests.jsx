import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../css/AcceptedRequests.css";
import { supabase } from "../lib/supabaseClient";

export default function AcceptedRequests() {
  const navigate = useNavigate();
  const [openId, setOpenId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    validateUserAndFetchRequests();
  }, []);

  const validateUserAndFetchRequests = async () => {
    // Check if user is logged in
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      navigate("/");
      return;
    }

    // Validate user is a patient
    const { data: userData, error: userError } = await supabase
      .from("patient_tbl")
      .select("id")
      .eq("id", authData.user.id)
      .single();

    if (userError || !userData) {
      // User is not a patient - sign out and redirect
      await supabase.auth.signOut();
      navigate("/");
      return;
    }

    // User is validated, fetch accepted requests
    fetchAcceptedRequests();
  };

  const fetchAcceptedRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("accepted_requests")
        .select(
          `
          *,
          patient:patient_id (first_name, last_name),
          healthcare_staff:healthcare_staff_id (first_name, last_name),
          hospital_tbl:hospital_id (name)
        `
        )
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      console.log("Raw accepted requests data:", data);

      // Remove duplicates - keep only one request per hospital
      const uniqueByHospital = [];
      const seenHospitals = new Set();

      (data || []).forEach((item) => {
        const hospitalId = item.hospital_id;
        console.log(
          "Processing item:",
          item.id,
          "hospital_id:",
          hospitalId,
          "hospital_name:",
          item.hospital_tbl?.name
        );
        if (!seenHospitals.has(hospitalId)) {
          seenHospitals.add(hospitalId);
          uniqueByHospital.push(item);
          console.log("Added to unique list");
        } else {
          console.log("Duplicate hospital - skipped");
        }
      });

      console.log(
        "Unique requests:",
        uniqueByHospital.length,
        "out of",
        data?.length || 0
      );

      // Transform the data to match the card display format
      const transformed = uniqueByHospital.map((item) => ({
        id: item.id,
        patientName: item.patient
          ? `${item.patient.first_name} ${item.patient.last_name}`
          : "Unknown Patient",
        staffName: item.healthcare_staff
          ? `${item.healthcare_staff.first_name} ${item.healthcare_staff.last_name}`
          : "Unknown Staff",
        hospitalName: item.hospital_tbl?.name || "Unknown Hospital",
        time: new Date(item.created_at).toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

      setRequests(transformed);
    } catch (err) {
      console.error("Error fetching accepted requests:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand">MediVault</div>
        </div>
        <div className="topbar-right">M</div>
      </header>

      <div className="shell-body">
        <main className="content">
          <header className="accepted-requests-header">
            <h2>Accepted Requests</h2>
          </header>

          <section className="accepted-requests-panel full-width">
            {loading && (
              <div className="accepted-requests-status">
                Loading accepted requests...
              </div>
            )}

            {error && (
              <div className="accepted-requests-status error">
                Error loading accepted requests: {error}
              </div>
            )}

            {!loading && !error && requests.length === 0 && (
              <div className="accepted-requests-status">
                No accepted requests found.
              </div>
            )}

            {!loading && !error && requests.length > 0 && (
              <div className="accepted-requests-list">
                {requests.map((r) => {
                  const expanded = openId === r.id;
                  return (
                    <article
                      key={r.id}
                      className={
                        "accepted-card" + (expanded ? " expanded" : "")
                      }
                      onClick={() => toggle(r.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && toggle(r.id)}
                    >
                      <div className="accepted-head">
                        <div className="accepted-patient">{r.patientName}</div>
                        <div className="accepted-time">{r.time}</div>
                      </div>

                      <div className="accepted-body">
                        <div className="accepted-body-left">
                          <div className="accepted-hospital">
                            Hospital: {r.hospitalName}
                          </div>
                          <div className="accepted-staff">
                            Staff: {r.staffName}
                          </div>
                        </div>
                        <div className="accepted-expand">
                          {expanded ? "Click to collapse" : "Click to expand"}
                        </div>
                      </div>

                      <div
                        className={
                          "accepted-details" + (expanded ? " show" : "")
                        }
                        aria-hidden={!expanded}
                      >
                        <div className="accepted-info">
                          <p className="accepted-status-text">
                            This request has been accepted and processed.
                          </p>
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
