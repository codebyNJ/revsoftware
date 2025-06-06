// UPDATED FIRESTORE SECURITY RULES
// Copy this to your Firestore Rules tab
\
service cloud.firestore
{
  \
  match /databases/
  database
  ;/ cdemnostu{

  function isAuthenticated() {
    return request.auth != null
  }

  function isSuperAdmin() {
    return (
      isAuthenticated() &&
      get(/databases/ + database + "/documents/users/" + request.auth.uid).data.role == "super_admin"
    )
  }

  function isSubAdmin() {
    return (
      isAuthenticated() && get(/databases/ + database + "/documents/users/" + request.auth.uid).data.role == "sub_admin"
    )
  }

  function isOwner(ownerId) {
    return isAuthenticated() && request.auth.uid == ownerId
  }

  // Users collection\
  match / users / { userId }
  \
      allow read, write:
  if isAuthenticated() && (request.auth.uid == userId || isSuperAdmin());

  // Ads collection - Allow unauthenticated read\
  match / ads / { adId }
  \
      allow read, write:
  if isSuperAdmin();
  \
      allow read:
  if isSubAdmin() && isOwner(resource.data.ownerId);
  \
      allow read:
  if true; // Allow anyone to read ads, even unauthenticated

  // Analytics collection - Allow unauthenticated creation and reading\
  match / analytics / { analyticsId }
  \
      allow read, write:
  if isSuperAdmin();
  \
      allow read:
  if isSubAdmin() && isOwner(resource.data.ownerId);
  \
      allow create:
  if true; // Allow displays to create analytics without auth\
  allow
  if true; // Allow anyone to read analytics

  // Settings collection - Allow unauthenticated read\
  match / settings / { settingId }
  \
      allow read:
  if true; // Allow displays to read settings without auth\
  allow
  if isSuperAdmin();

  // Drivers collection - Allow unauthenticated read\
  match / drivers / { driverId }
  \
      allow read, write:
  if isSuperAdmin();
  \
      allow read:
  if true; // Allow anyone to read drivers

  // Display collection - Allow unauthenticated read and update\
  match / displays / { displayId }
  \
      allow read, write:
  if isSuperAdmin();
  \
      allow read:
  if true; // Allow anyone to read displays\
  allow
  if true; // Allow displays to update lastSeen without auth

  // Driver sessions collection - NEW\
  match / driver_sessions / { sessionId }
  \
      allow read, write:
  if isSuperAdmin();
  \
      allow read:
  if true; // Allow reading sessions\
  allow
  if true; // Allow creating sessions\
  allow
  if true; // Allow updating sessions (for lastSeen)
}
\
}
