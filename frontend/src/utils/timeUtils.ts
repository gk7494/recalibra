/**
 * Format date/time in Eastern Time (EST/EDT)
 * Handles UTC timestamps from backend and converts to EST
 */
export function formatEST(date: Date | string): string {
  let d: Date;
  
  if (typeof date === 'string') {
    // Backend sends UTC timestamps - ensure they're parsed as UTC
    // If no timezone indicator, assume UTC (backend uses datetime.utcnow())
    let dateStr = date.trim();
    
    // Check if it's a simple ISO format without timezone (e.g., "2024-11-10T23:19:42")
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/) && !dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
      // Add Z to indicate UTC
      dateStr = dateStr + 'Z';
    } else if (!dateStr.includes('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
      // No timezone indicator at all - assume UTC
      dateStr = dateStr + 'Z';
    }
    
    d = new Date(dateStr);
    
    // Validate the date was parsed correctly
    if (isNaN(d.getTime())) {
      console.warn('Invalid date string:', date);
      d = new Date(); // Fallback to current time
    }
  } else {
    d = date;
  }
  
  // Convert to EST
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Format time only in Eastern Time (EST/EDT)
 */
export function formatTimeEST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Get current time in Eastern Time (EST/EDT)
 */
export function getCurrentEST(): Date {
  const now = new Date();
  // Convert to EST string and back to Date for display purposes
  const estString = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  return new Date(estString);
}

/**
 * Format date only in Eastern Time (EST/EDT)
 */
export function formatDateEST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

