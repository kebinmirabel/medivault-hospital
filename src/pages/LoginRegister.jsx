import React, { useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import "../css/LoginRegister.css";

export default function LoginRegister() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    birthday: "",
    contact_num: "",
    blood_type: "",
    contact_person: "",
    contact_person_rs: "",
    contact_person_num: "",
    address: "",
  });

  const calcAge = (birthday) => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const birthdayRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isRegister) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });
      if (authError) return alert(authError.message);

      const { error: dbError } = await supabase.from("patient_tbl").insert([
        {
          id: authData.user.id,
          first_name: formData.first_name,
          middle_name: formData.middle_name || null,
          last_name: formData.last_name,
          birthday: formData.birthday || null,
          age: calcAge(formData.birthday),
          contact_num: formData.contact_num || null,
          email: formData.email,
          blood_type: formData.blood_type || null,
          contact_person: formData.contact_person || null,
          contact_person_rs: formData.contact_person_rs || null,
          contact_person_num: formData.contact_person_num || null,
          address: formData.address || null,
        },
      ]);

      if (dbError) return alert(dbError.message);

      alert("Registration successful!");
      navigate("/dashboard"); // ✅ redirect to dashboard after registration
    } else {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

      if (authError) return alert(authError.message);

      const userId = authData.user?.id;
      if (!userId) {
        return alert("Login failed. Please try again.");
      }

      // Check if user exists in patient_tbl (not healthcare staff)
      const { data: patient, error: patientError } = await supabase
        .from("patient_tbl")
        .select("*")
        .eq("id", userId)
        .single();

      if (patientError || !patient) {
        // User authenticated but not a patient
        await supabase.auth.signOut();
        return alert("Email or password is incorrect.");
      }

      // User is valid patient, navigate to dashboard
      alert("Logged in!");
      navigate("/dashboard");
    }
  };

  return (
    <div className="lr-page">
      <div className="lr-inner">
        <header className="lr-logo" aria-hidden>
          <h1>
            <span className="logo-medi">Medi</span>
            <span className="logo-vault">Vault</span>
          </h1>
        </header>

        <main className={`lr-box ${isRegister ? "register-box" : ""}`}>
          <form
            className={`lr-form ${isRegister ? "lr-register" : "lr-login"}`}
            onSubmit={handleSubmit}
          >
            {isRegister && (
              <div className="register-grid">
                {/* Row 1: first, middle, last */}
                <div className="field">
                  <label className="field-label" htmlFor="first_name">
                    First Name
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    className="lr-input"
                    placeholder="Juan"
                    required
                    onChange={handleChange}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="middle_name">
                    Middle Name
                  </label>
                  <input
                    id="middle_name"
                    name="middle_name"
                    className="lr-input"
                    placeholder="Batumbakal"
                    onChange={handleChange}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="last_name">
                    Last Name
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    className="lr-input"
                    placeholder="Dela Cruz"
                    required
                    onChange={handleChange}
                  />
                </div>

                {/* Row 2: birthday, contact num, blood type */}
                <div className="field">
                  <label className="field-label" htmlFor="birthday">
                    Date of Birth
                  </label>
                  <div className="date-wrapper">
                    <input
                      id="birthday"
                      name="birthday"
                      className="lr-input"
                      type="date"
                      onChange={handleChange}
                      ref={birthdayRef}
                    />
                    <button
                      type="button"
                      className="date-icon"
                      aria-label="Open date picker"
                      onClick={() => {
                        if (!birthdayRef.current) return;
                        if (
                          typeof birthdayRef.current.showPicker === "function"
                        ) {
                          birthdayRef.current.showPicker();
                        } else {
                          birthdayRef.current.focus();
                        }
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path
                          fill="currentColor"
                          d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"
                        />
                        <path fill="currentColor" d="M7 11h5v5H7z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="contact_num">
                    Contact Number
                  </label>
                  <input
                    id="contact_num"
                    name="contact_num"
                    className="lr-input"
                    placeholder="09123456789"
                    onChange={handleChange}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="blood_type">
                    Blood Type
                  </label>
                  <input
                    id="blood_type"
                    name="blood_type"
                    className="lr-input"
                    placeholder="AB+"
                    onChange={handleChange}
                  />
                </div>

                <div className="field fullwidth">
                  <label className="field-label" htmlFor="address">
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    className="lr-input fullwidth lr-textarea"
                    placeholder="Brgy. Uno, Lipa, Batangas"
                    rows={3}
                    onChange={handleChange}
                  />
                </div>

                {/* Row 4: contact person trio */}
                <div className="field">
                  <label className="field-label" htmlFor="contact_person">
                    Contact Person
                  </label>
                  <input
                    id="contact_person"
                    name="contact_person"
                    className="lr-input"
                    placeholder="Pedro Dela Cruz"
                    onChange={handleChange}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="contact_person_rs">
                    Relationship
                  </label>
                  <input
                    id="contact_person_rs"
                    name="contact_person_rs"
                    className="lr-input"
                    placeholder="Father"
                    onChange={handleChange}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="contact_person_num">
                    Contact Person Number
                  </label>
                  <input
                    id="contact_person_num"
                    name="contact_person_num"
                    className="lr-input"
                    placeholder="09987654321"
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <div className="center-inputs">
              <div className="field">
                <label className="field-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="lr-input lr-pulse"
                  placeholder="juandelacruz@gmail.com"
                  required
                  onChange={handleChange}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="lr-input lr-pulse"
                  placeholder=""
                  required
                  onChange={handleChange}
                />
              </div>
            </div>

            <button type="submit" className="lr-submit">
              {isRegister ? "Register" : "Login"}
            </button>
          </form>

          <div className="lr-switch">
            <span className="lr-text">
              {isRegister ? "Already have an account?" : "No account?"}
            </span>
            <button
              className="lr-link"
              type="button"
              onClick={() => setIsRegister(!isRegister)}
            >
              {isRegister ? "Login" : "Register"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
