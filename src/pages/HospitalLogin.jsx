import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import "../css/HospitalLogin.css";

export default function LoginRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(""); // clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setError("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // check if user is in healthcare_staff_tbl
      const { data: staff, error: staffError } = await supabase
        .from("healthcare_staff_tbl")
        .select("*")
        .eq("id", userId)
        .single();

      if (staffError || !staff) {
        // user authenticated but not a healthcare staff member
        await supabase.auth.signOut();
        setError("Email or password is incorrect.");
        setLoading(false);
        return;
      }

      // user is valid staff member, navigate to dashboard
      navigate("/hospital-dashboard");
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="lr-page">
      <div className="lr-inner">
        <div className="lr-logo" aria-hidden>
          <h1>
            <span className="logo-medi">Medi</span>
            <span className="logo-vault">Vault</span>
          </h1>
          <h4>Healthcare Staff Portal</h4>
        </div>

        <main className={`lr-box`}>
          <form className={`lr-form lr-login`} onSubmit={handleSubmit}>
            <div className="center-inputs">
              <div className="field">
                <label className="field-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="lr-input lr-pulse"
                  required
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="lr-input lr-pulse"
                  required
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div style={{ color: '#dc3545', marginBottom: '15px', textAlign: 'center', fontSize: '14px' }}>
                {error}
              </div>
            )}

            <button type="submit" className="lr-submit" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
