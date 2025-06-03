// ANALYTICS RETRIEVAL ISSUES:

// Issue 1: Date format mismatch
// Your sample data has: date: "June 1, 2025 at 12:00:00 AM UTC+5:30" (Timestamp)
// But the code expects: date: "2025-06-01" (String in YYYY-MM-DD format)

// Issue 2: Owner ID mismatch
// Sample data ownerId: "anwGxPnyGdlPRaMLMPZpe2ZjZLZ"
// This needs to match the actual user ID of the sub admin trying to access it

// Issue 3: Query structure
// The code queries by ownerId, but if the ownerId doesn't match the current user,
// the security rules will block access
