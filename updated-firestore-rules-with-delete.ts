// UPDATED FIRESTORE SECURITY RULES WITH DELETE PERMISSIONS
// Copy this to your Firestore Rules tab

rules_version = "2"
\
service cloud.firestore
{
  match / databases / { database } / documents
  {
    function isAuthenticated() {
      return request.auth != null
    }

    function isSuperAdmin() {
      return (
        isAuthenticated() &&
        get(/databases/$(database) / documents / users / $(request.auth.uid)).data.role == "super_admin"
      )
    }

    function isSubAdmin() {
      return (
        isAuthenticated() &&
        get(/databases/$(database) / documents / users / $(request.auth.uid)).data.role == "sub_admin"
      )
    }

    function isOwner(ownerId) {
      return isAuthenticated() && request.auth.uid == ownerId
    }

    // Users collection
    match / users / { userId }
    allow
    read, write
    :
    if isAuthenticated() && (request.auth.uid == userId || isSuperAdmin());
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete users

    // Ads collection - Allow unauthenticated read for displays
    match / ads / { adId }
    allow
    read, write
    :
    if isSuperAdmin();
    allow
    if isSubAdmin() && isOwner(resource.data.ownerId);
    allow
    if true; // Allow anyone to read ads, even unauthenticated
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete ads

    // Analytics collection - Allow unauthenticated creation and reading
    match / analytics / { analyticsId }
    allow
    read, write
    :
    if isSuperAdmin();
    allow
    if isSubAdmin() && isOwner(resource.data.ownerId);
    allow
    if true; // Allow displays to create analytics without auth
    allow
    if true; // Allow anyone to read analytics
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete analytics

    // Settings collection - Allow unauthenticated read
    match / settings / { settingId }
    allow
    if true; // Allow displays to read settings without auth
    allow
    if isSuperAdmin();
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete settings

    // Drivers collection - Allow unauthenticated read
    match / drivers / { driverId }
    allow
    read, write
    :
    if isSuperAdmin();
    allow
    if true; // Allow anyone to read drivers
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete drivers

    // Display collection - Allow unauthenticated read and update
    match / displays / { displayId }
    allow
    read, write
    :
    if isSuperAdmin();
    allow
    if true; // Allow anyone to read displays
    allow
    if true; // Allow displays to update lastSeen without auth
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete displays

    // Driver sessions collection
    match / driver_sessions / { sessionId }
    allow
    read, write
    :
    if isSuperAdmin();
    allow
    if true; // Allow reading sessions
    allow
    if true; // Allow creating sessions
    allow
    if true; // Allow updating sessions (for lastSeen)
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete sessions

    // News collection - For storing news data
    match / news / { newsId }
    allow
    if true; // Anyone can read news
    allow
    if isSuperAdmin(); // Only super admins can write
    allow
    if isSuperAdmin(); // Only super admins can create news
    allow
    if isSuperAdmin() || isSubAdmin(); // Allow sub admins to update (for toggling active status)
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete news

    // Jobs collection - For storing job listings
    match / jobs / { jobId }
    allow
    if true; // Anyone can read jobs
    allow
    if isSuperAdmin(); // Only super admins can write
    allow
    if isSuperAdmin(); // Only super admins can create jobs
    allow
    if isSuperAdmin() || isSubAdmin(); // Allow sub admins to update (for toggling active status)
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete jobs

    // Weather collection - For storing weather data
    match / weather / { weatherId }
    allow
    if true; // Anyone can read weather data
    allow
    if isSuperAdmin(); // Only super admins can write
    allow
    if isSuperAdmin(); // Only super admins can create weather data
    allow
    if isSuperAdmin(); // Only super admins can update weather data
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete weather data

    // Playlist collection - For managing content playlist
    match / playlist / { playlistId }
    allow
    if true; // Anyone can read playlist (for displays)
    allow
    if isSuperAdmin(); // Only super admins can write
    allow
    if isSuperAdmin(); // Only super admins can create playlist items
    allow
    if isSuperAdmin(); // Only super admins can update playlist items
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete playlist items

    // Content collection - For storing various content types
    match / content / { contentId }
    allow
    if true; // Anyone can read content (for displays)
    allow
    if isSuperAdmin(); // Only super admins can write
    allow
    if isSuperAdmin(); // Only super admins can create content
    allow
    if isSuperAdmin() || isSubAdmin(); // Allow sub admins to update content
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete content

    // Media collection - For storing media files metadata
    match / media / { mediaId }
    allow
    if true; // Anyone can read media metadata
    allow
    if isSuperAdmin(); // Only super admins can write
    allow
    if isSuperAdmin(); // Only super admins can create media
    allow
    if isSuperAdmin(); // Only super admins can update media
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete media

    // Logs collection - For system logging
    match / logs / { logId }
    allow
    if isSuperAdmin(); // Only super admins can read logs
    allow
    if isSuperAdmin(); // Only super admins can write logs
    allow
    if true; // Allow system to create logs
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete logs

    // Notifications collection - For system notifications
    match / notifications / { notificationId }
    allow
    if isAuthenticated(); // Authenticated users can read notifications
    allow
    if isSuperAdmin(); // Only super admins can write notifications
    allow
    if isSuperAdmin(); // Only super admins can create notifications
    allow
    if isAuthenticated(); // Users can mark notifications as read
    allow
    delete
    :
    if isSuperAdmin(); // Only super admins can delete notifications
  }
}
