import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

/**
 * Hook that ensures user is in healthcare_staff_tbl and fetches their staff record.
 * Redirects to login if:
 * - User is not authenticated
 * Returns staff data if found, or error message if not found (without redirect).
 * Returns: { staffData, loading, error }
 */
export function useHealthcareStaff() {
  const navigate = useNavigate()
  const [staffData, setStaffData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkStaffAccess = async () => {
      try {
        // 1) Get current authenticated user
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError || !authData.user) {
          console.warn('Not authenticated, redirecting to login')
          navigate('/') // Redirect only if not authenticated
          return
        }

        const userId = authData.user.id

        // 2) Check if user exists in healthcare_staff_tbl
        const { data: staff, error: staffError } = await supabase
          .from('healthcare_staff_tbl')
          .select('*')
          .eq('id', userId)
          .single() // expect exactly one row

        if (staffError) {
          console.error('Staff fetch error:', staffError)
          setError(`Healthcare Staff User not found: ${staffError.message}`)
          setStaffData(null)
          setLoading(false)
          return
        }

        if (!staff) {
          setError('Healthcare Staff User not found. Check your credentials.')
          setStaffData(null)
          setLoading(false)
          return
        }

        console.log('Staff data loaded:', staff)

        // 3) User is a staff member, store their data
        setStaffData(staff)
        setError(null)
        setLoading(false)
      } catch (err) {
        console.error('Error checking staff access:', err)
        setError(err.message || 'An error occurred while verifying staff status.')
        setStaffData(null)
        setLoading(false)
      }
    }

    checkStaffAccess()
  }, [navigate])

  return { staffData, loading, error }
}

export default useHealthcareStaff
