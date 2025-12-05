import { supabase } from "./supabaseClient";

/**
 * Log an action to the audit_logs table
 * @param {string} patient_id - Patient ID
 * @param {string} hospital_id - Hospital ID
 * @param {string} healthcare_staff_id - Healthcare staff ID
 * @param {string} action - Action description
 */
export async function logAuditAction(patient_id, hospital_id, healthcare_staff_id, action) {
	try {
		const { data, error } = await supabase
			.from('audit_logs')
			.insert([{
				patient_id,
				hospital_id,
				healthcare_staff_id,
				action,
				created_at: new Date().toISOString()
			}]);

		if (error) {
			console.error('Error logging audit action:', error);
		}
		return { data, error };
	} catch (err) {
		console.error('Error in logAuditAction:', err);
		return { data: null, error: err };
	}
}

/**
 * Generate a numeric OTP string with the given length (default 6).
 * Uses crypto RNG where available.
 */
function generateOtp(length = 6) {
	const max = 10 ** length;
	// Use crypto if available
	try {
		if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
			const array = new Uint32Array(1);
			crypto.getRandomValues(array);
			const num = array[0] % max;
			return String(num).padStart(length, "0");
		}
	} catch (e) {
		// fallthrough to Math.random
	}

	const num = Math.floor(Math.random() * max);
	return String(num).padStart(length, "0");
}

/**
 * Insert an OTP record into the `otp` table.
 * @param {object|string} hospital - hospital object or hospital id
 * @param {string} patient_id - patient id (uuid)
 * @returns {Promise<{ data: any|null, error: any|null }>} inserted row or error
 */
/*
 * Insert an OTP record into the `otp` table.
*/
export async function requestPatientData({ hospital_id, patient_id, healthcare_staff_id } = {}) {
	if (!patient_id) {
		return { data: null, error: new Error("patient_id is required") };
	}

	if (!hospital_id) {
		return { data: null, error: new Error("hospital_id is required") };
	}

	if (!healthcare_staff_id) {
		return { data: null, error: new Error("healthcare_staff_id is required") };
	}

	// Expect hospital_id and healthcare_staff_id to be provided explicitly by caller.
	const otp = generateOtp(6);
	const created_at = new Date().toISOString();

	const payload = {
		created_at,
		patient_id,
		hospital_id,
		healthcare_staff_id,
		otp,
	};

	console.log('Attempting to insert OTP with payload:', payload);

	try {
		// Verify the user is authenticated before attempting insert
		const { data: { user }, error: authError } = await supabase.auth.getUser();
		if (authError || !user) {
			console.error('Authentication error:', authError);
			return { data: null, error: new Error('User not authenticated') };
		}

		console.log('Authenticated user ID:', user.id);
		console.log('healthcare_staff_id in payload:', healthcare_staff_id);

		// Check if a request already exists for this patient from this hospital
		const { data: existingRequest, error: checkError } = await supabase
			.from('otp')
			.select('id')
			.eq('patient_id', patient_id)
			.eq('hospital_id', hospital_id)
			.limit(1);

		if (checkError) {
			console.error('Error checking for existing request:', checkError);
			return { data: null, error: new Error(`Failed to check existing requests: ${checkError.message}`) };
		}

		if (existingRequest && existingRequest.length > 0) {
			console.log('Request already exists for this patient from this hospital');
			return { data: null, error: new Error('A request for this patient already exists from your hospital') };
		}

		// Get the current session to check JWT
		const { data: { session }, error: sessionError } = await supabase.auth.getSession();
		console.log('Current session:', session ? 'exists' : 'null', sessionError);
		
		if (session) {
			console.log('Access token exists:', !!session.access_token);
			console.log('Session user ID:', session.user?.id);
		}

		// Try to refresh the session to ensure auth context is current
		const { error: refreshError } = await supabase.auth.refreshSession();
		if (refreshError) {
			console.log('Session refresh failed:', refreshError);
		}

		// Use a database function to insert OTP (bypasses RLS issues)
		const { data, error } = await supabase.rpc('insert_otp_record', {
			p_patient_id: patient_id,
			p_hospital_id: hospital_id,
			p_healthcare_staff_id: healthcare_staff_id,
			p_otp: otp
		});

		if (error) {
			console.error('Supabase OTP insert error:', error);
			return { data: null, error: new Error(`Failed to create OTP request: ${error.message}`) };
		}

		// Log the request data action
		await logAuditAction(patient_id, hospital_id, healthcare_staff_id, 'REQUESTED DATA');

		return { data, error: null };
	} catch (err) {
		console.error('requestPatientData error:', err);
		return { data: null, error: new Error(`Request failed: ${err.message}`) };
	}
}

/**
 * Verify OTP by checking if it exists in the otp table.
 * If found, inserts the record into accepted_requests table and deletes from otp table.
 *
 * @param {string} otp - OTP code to verify
 * @returns {Promise<{ data: any|null, error: any|null }>} success or error
 */
export async function verifyOtp(otp) {
	if (!otp || otp.trim().length === 0) {
		return { data: null, error: new Error("OTP is required") };
	}

	try {
		// 1. Check if OTP exists in otp table
		const { data: otpRecord, error: fetchError } = await supabase
			.from('otp')
			.select('id, patient_id, hospital_id, healthcare_staff_id')
			.eq('otp', otp.trim())
			.single();

		if (fetchError || !otpRecord) {
			return { data: null, error: new Error("OTP not found or invalid") };
		}

		const { id: otpId, patient_id, hospital_id, healthcare_staff_id } = otpRecord;

		// 2. Insert into accepted_requests table
		const { data: insertData, error: insertError } = await supabase
			.from('accepted_requests')
			.insert([{
				patient_id,
				hospital_id,
				healthcare_staff_id,
				created_at: new Date().toISOString(),
			}])
			.select()
			.single();

		if (insertError) {
			return { data: null, error: insertError };
		}

		// 3. Delete from otp table using RLS bypass (service role)
		// If RLS policy prevents deletion, we may need to use a stored procedure
		// For now, attempt direct deletion
		const { data: deleteData, error: deleteError } = await supabase
			.from('otp')
			.delete()
			.match({ id: otpId });

		if (deleteError) {
			console.error("Error deleting OTP:", deleteError);
			// If deletion fails due to RLS, log but still return success since insert worked
			console.warn("OTP record not deleted (RLS may be blocking), but accepted_requests was created");
		}

		// Log the accept request action
		await logAuditAction(patient_id, hospital_id, healthcare_staff_id, 'ACCEPTED_REQUEST');

		return { data: insertData, error: null };
	} catch (err) {
		console.error("verifyOtp error:", err);
		return { data: null, error: err };
	}
}

export default requestPatientData;

// Fetch patient data and history
export async function fetchPatientData(patient_id) {
	try {
		// Fetch patient basic info
		const { data: patientData, error: patientError } = await supabase
			.from("patient_tbl")
			.select("*")
			.eq('id', patient_id)
			.single();

		if (patientError) throw patientError;

		// Fetch patient medical history
		const { data: historyData, error: historyError } = await supabase
			.from("patient_records_tbl")
			.select("*")
			.eq('patient_id', patient_id)
			.order('created_at', { ascending: false });

		if (historyError) throw historyError;

		// Get unique hospital IDs from history
		const hospitalIds = [...new Set(historyData.map(record => record.hospital_id).filter(Boolean))];

		// Fetch hospital names
		let hospitalData = {};
		if (hospitalIds.length > 0) {
			const { data: hospitals, error: hospitalError } = await supabase
				.from("hospital_tbl")
				.select("id, name")
				.in('id', hospitalIds);

			if (!hospitalError) {
				hospitalData = hospitals.reduce((acc, hospital) => {
					acc[hospital.id] = hospital.name;
					return acc;
				}, {});
			}
		}

		return {
			patient: patientData,
			history: historyData || [],
			hospitals: hospitalData
		};
	} catch (err) {
		console.error("Error fetching patient data:", err);
		throw new Error(err.message || "Failed to load patient data");
	}
}

// Fetch doctors from doctor_tbl
export async function fetchDoctors() {
	try {
		const { data: doctorData, error: doctorError } = await supabase
			.from('doctor_tbl')
			.select('id, first_name, last_name')
			.order('first_name');

		if (doctorError) {
			console.error('Error fetching doctors:', doctorError);
			throw doctorError;
		}

		return doctorData || [];
	} catch (error) {
		console.error('Error in fetchDoctors:', error);
		throw error;
	}
}

// Create new medical record
export async function createMedicalRecord(recordData) {
	try {
		const { data, error: insertError } = await supabase
			.from('patient_records_tbl')
			.insert([recordData])
			.select();

		if (insertError) {
			throw insertError;
		}

		// Log the create record action
		if (data && data.length > 0) {
			await logAuditAction(
				recordData.patient_id,
				recordData.hospital_id,
				recordData.healthcare_staff_id,
				'CREATED_NEW_RECORD'
			);
		}

		return data;
	} catch (error) {
		console.error('Error creating record:', error);
		throw error;
	}
}

// Update existing medical record
export async function updateMedicalRecord(recordId, updateData, staffId = null) {
	try {
		// First get the record to extract patient_id and hospital_id for audit logging
		const { data: recordInfo, error: fetchError } = await supabase
			.from('patient_records_tbl')
			.select('patient_id, hospital_id')
			.eq('id', recordId)
			.single();

		const { error } = await supabase
			.from('patient_records_tbl')
			.update(updateData)
			.eq('id', recordId);

		if (error) {
			throw error;
		}

		// Log the update record action
		if (recordInfo && staffId) {
			await logAuditAction(
				recordInfo.patient_id,
				recordInfo.hospital_id,
				staffId,
				'UPDATED_RECORD'
			);
		}

		return true;
	} catch (error) {
		console.error('Error updating record:', error);
		throw error;
	}
}

// Delete medical record
export async function deleteMedicalRecord(recordId, staffId = null) {
	try {
		// First get the record info for audit logging before deletion
		const { data: recordInfo, error: fetchError } = await supabase
			.from('patient_records_tbl')
			.select('patient_id, hospital_id')
			.eq('id', recordId)
			.single();

		const { error } = await supabase
			.from('patient_records_tbl')
			.delete()
			.eq('id', recordId);

		if (error) {
			throw error;
		}

		// Log the delete record action
		if (recordInfo && staffId) {
			await logAuditAction(
				recordInfo.patient_id,
				recordInfo.hospital_id,
				staffId,
				'DELETED_RECORD'
			);
		}

		return true;
	} catch (error) {
		console.error('Error deleting record:', error);
		throw error;
	}
}

// Search patients across multiple fields
export async function searchPatients(query) {
	try {
		// search across several columns using `or` + ilike
		const filter = `first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,contact_num.ilike.%${query}%`;
		const { data, error } = await supabase
			.from("patient_tbl")
			.select(
				"id, first_name, middle_name, last_name, birthday, age, email, contact_num, blood_type, address"
			)
			.or(filter)
			.limit(100);

		if (error) {
			console.error('Error searching patients:', error);
			throw error;
		}

		return data || [];
	} catch (error) {
		console.error('Error in searchPatients:', error);
		throw error;
	}
}

// Handle emergency override access for Level 3 staff
export async function handleEmergencyOverride(selectedPatient, emergencyReason, staffData) {
	try {
		if (!selectedPatient || !emergencyReason.trim()) {
			throw new Error("Please provide a detailed reason for the emergency override.");
		}

		if (emergencyReason.length < 20) {
			throw new Error("Emergency reason must be at least 20 characters long.");
		}

		const hospital_id = staffData?.hospital_id;
		const healthcare_staff_id = staffData?.id;

		if (!hospital_id || !healthcare_staff_id) {
			throw new Error("Missing hospital or staff information");
		}

		// Log the emergency override using centralized function
		await logAuditAction(
			selectedPatient.id,
			hospital_id,
			healthcare_staff_id,
			`EMERGENCY_OVERRIDE: ${emergencyReason}`
		);

		// Insert into accepted_requests table to record the emergency access
		const { error: acceptedError } = await supabase
			.from("accepted_requests")
			.insert({
				patient_id: selectedPatient.id,
				hospital_id,
				healthcare_staff_id,
			});

		if (acceptedError) throw acceptedError;

		return {
			success: true,
			message: `Emergency override logged successfully for ${selectedPatient.first_name} ${selectedPatient.last_name}. Access granted for medical emergency.`
		};
	} catch (error) {
		console.error("Emergency override error:", error);
		throw error;
	}
}

