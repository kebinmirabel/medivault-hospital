import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        navigate("/"); // redirect to login if not logged in
        return;
      }

      // Validate user is a patient
      const { data: patientData, error: patientError } = await supabase
        .from("patient_tbl")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (patientError || !patientData) {
        // User is not a patient - sign out and redirect
        await supabase.auth.signOut();
        navigate("/");
        return;
      }

      setUser(authData.user);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Welcome to the Dashboard</h1>
      {user && <p>Logged in as: {user.email}</p>}
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
