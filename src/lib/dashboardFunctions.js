import { supabase } from "./supabaseClient";

// Fetch audit logs for dashboard
export async function fetchAuditLogs(limit = 10, hospital_id = null) {
  try {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        patient_tbl:patient_id (first_name, last_name),
        healthcare_staff_tbl:healthcare_staff_id (first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (hospital_id) {
      query = query.eq('hospital_id', hospital_id);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchAuditLogs:', error);
    throw error;
  }
}

// Get dashboard statistics from audit logs
export async function getDashboardStats(hospital_id, healthcare_staff_id = null) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get all audit logs for the hospital
    const { data: allLogs, error } = await supabase
      .from('audit_logs')
      .select('action, created_at')
      .eq('hospital_id', hospital_id);

    if (error) {
      console.error('Error fetching audit logs for stats:', error);
      throw error;
    }

    // Count different types of actions
    const todayRequests = allLogs.filter(log => 
      log.created_at.split('T')[0] === today && 
      log.action === 'request data'
    ).length;

    const todayAccepted = allLogs.filter(log => 
      log.created_at.split('T')[0] === today && 
      (log.action === 'accepted request' || log.action.includes('emergency override'))
    ).length;

    const weekRecords = allLogs.filter(log => 
      log.created_at >= weekAgo && 
      (log.action === 'create new record' || log.action === 'update record')
    ).length;

    const todayActions = allLogs.filter(log => 
      log.created_at.split('T')[0] === today
    ).length;

    const stats = {
      todayRequests,
      todayAccepted,
      weekRecords,
      todayActions
    };

    return stats;
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    throw error;
  }
}

// Get recent patient activities from audit logs
export async function getRecentPatientActivity(hospital_id, limit = 5) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        patient_tbl:patient_id (first_name, last_name),
        healthcare_staff_tbl:healthcare_staff_id (first_name, last_name)
      `)
      .eq('hospital_id', hospital_id)
      .in('action', ['accepted request', 'request data'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRecentPatientActivity:', error);
    throw error;
  }
}

// Get time-series data from audit logs for requests and accepted patients chart (hourly)
export async function getTimeSeriesData(hospital_id, hours = 24) {
  try {
    const timeSlots = [];
    
    // Generate array of hourly time slots for the past 'hours' including current hour
    for (let i = hours - 1; i >= 0; i--) {
      const time = new Date(Date.now() - i * 60 * 60 * 1000);
      // Round down to the hour
      time.setMinutes(0, 0, 0);
      timeSlots.push({
        datetime: time.toISOString(),
        hour: time.getHours(),
        date: time.toISOString().split('T')[0],
        label: time.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          hour12: true 
        })
      });
    }

    const startTime = new Date(timeSlots[0].datetime);

    // Get audit logs data for the time range
    const { data: auditData, error } = await supabase
      .from('audit_logs')
      .select('created_at, action')
      .eq('hospital_id', hospital_id)
      .gte('created_at', startTime.toISOString());

    if (error) {
      console.error('Error fetching time series data:', error);
      throw error;
    }

    // Count requests and accepted per hour from audit logs
    const chartData = timeSlots.map(slot => {
      const slotStart = new Date(slot.datetime);
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // +1 hour
      
      const requestsCount = auditData?.filter(item => {
        const itemTime = new Date(item.created_at);
        return itemTime >= slotStart && 
               itemTime < slotEnd && 
               item.action === 'request data';
      }).length || 0;
      
      const acceptedCount = auditData?.filter(item => {
        const itemTime = new Date(item.created_at);
        return itemTime >= slotStart && 
               itemTime < slotEnd && 
               (item.action === 'accepted request' || item.action.includes('emergency override'));
      }).length || 0;

      return {
        datetime: slot.datetime,
        hour: slot.hour,
        requests: requestsCount,
        accepted: acceptedCount,
        label: slot.label
      };
    });

    return chartData;
  } catch (error) {
    console.error('Error in getTimeSeriesData:', error);
    throw error;
  }
}