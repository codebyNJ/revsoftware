// UPDATED FIRESTORE SECURITY RULES
// Copy this to your Firestore Rules tab

rules_version = "2"
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
    return isAuthenticated() && request.auth.token.role == "super_admin"
  }

  function isSubAdmin() {
    return isAuthenticated() && request.auth.token.role == "sub_admin"
  }

  function isOwner(ownerId) {
    return isAuthenticated() && request.auth.uid == ownerId
  }

  // Users collection\
  match / users / { userId }
  \
      allow read:
  if isAuthenticated() && (request.auth.uid == userId || isSuperAdmin());
  \
      allow write:
  if isSuperAdmin();

  // Ads collection\
  match / ads / { adId }
  \
      allow read, write:
  if isSuperAdmin();
  \
      allow read:
  if isSubAdmin() && isOwner(request.resource.data.ownerId);
  \
      allow read:
  if request.resource.data.status == 'active\';\
    }
    
    // Analytics collection - FIXED: More permissive read rules\
    match /analytics/{analyticsId}
  // Super admin can do everything\
  allow
  read, write
  :
  if isSuperAdmin();

  // Sub admin can read their own analytics\
  allow
  if isSubAdmin() && isOwner(request.resource.data.ownerId);

  // Allow creating analytics (for tracking)\
  allow
  if isAuthenticated();

  // IMPORTANT: Allow reading analytics for displays and general access\
  allow
  if isAuthenticated();

  // Settings collection\
  match / settings / { settingId }
  \
      allow read:
  if isAuthenticated();
  \
      allow write:
  if isSuperAdmin();

  // Drivers collection - Allow reading for ad assignment\
  match / drivers / { driverId }
  \
      allow read, write:
  if isSuperAdmin();
  \
      allow read:
  if isSubAdmin(); // Allow sub admins to read for assignment

  // Display collection - Allow reading for ad assignment\
  match / displays / { displayId }
  \
      allow read, write:
  if isSuperAdmin();
  \
      allow read:
  if isSubAdmin(); // Allow sub admins to read for assignment
}
