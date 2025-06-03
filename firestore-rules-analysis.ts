// ISSUES IDENTIFIED IN YOUR FIRESTORE RULES:

// 1. Users collection has redundant write rule
// Current:\
match / users / { userId }
{
  \
  allow read:
  if request.auth != null && (request.auth.uid == userId || isSuperAdmin());
  \
  allow write:
  if isSuperAdmin(); // This is redundant
}

// Should be:\
match / users / { userId }
{
  \
  allow read:
  if request.auth != null && (request.auth.uid == userId || isSuperAdmin());
  \
  allow write:
  if isSuperAdmin();
}

// 2. Analytics collection needs better read permissions for displays
// Current analytics rules are good, but you might want to allow displays to read analytics:\
match / analytics / { analyticsId }
{
  \
  allow read:
  if isSuperAdmin() || (request.auth != null && isSubAdmin() && isOwner(resource.data.ownerId));
  \
  allow write:
  if isSuperAdmin();
  \
  allow create:
  if request.auth != null;
  // Add this for display access:\
  allow
  if request.auth != null; // Allows displays to read for showing data
}

// 3. Display authentication issue - displays need to read ads and settings
// Your current rules are correct for this.\
match / ads / { adId }
{
  \
  allow read:
  if request.auth != null;
}
\
match /settings/
{
  settingId
}
{
  \
  allow read:
  if request.auth != null;
}

function isAuthenticated() {
  return request.auth != null
}

function isSuperAdmin() {
  return request.auth != null && request.auth.token.superAdmin == true
}

function isSubAdmin() {
  return request.auth != null && request.auth.token.subAdmin == true
}

function isOwner(ownerId) {
  return request.auth != null && request.auth.uid == ownerId
}
