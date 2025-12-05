import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

// Replace with your actual Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create a Supabase admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function addHealthcareStaff({
  email,
  password,
  first_name,
  middle_name = null,
  last_name,
  hospital_id,
  birthday = null,
  occupation = null,
  role = null
}) {
  // Step 1: Create the user in Supabase Auth
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (userError) {
    console.error(`Error creating auth user:`, userError.message)
    return
  }

  const userId = userData.user.id
  console.log(`Auth user created with ID: ${userId}`)

  // Step 2: Insert into healthcare_staff_tbl
  const { error: dbError } = await supabase
    .from('healthcare_staff_tbl')
    .insert([
      {
        id: userId,
        first_name,
        middle_name,
        last_name,
        hospital_id,
		birthday,
		occupation,
		role
      },
    ])

  if (dbError) {
    console.error(`Error inserting into healthcare_staff_tbl:`, dbError.message)
    return
  }

  console.log(`Added ${first_name} ${last_name} to healthcare_staff_tbl`)
}

// replace with new staff data
addHealthcareStaff({
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  hospital_id: '',
  birthday: '',
  occupation: '',
  role: '',
})

// node ./src/lib/scripts/addHealthcareStaff.js