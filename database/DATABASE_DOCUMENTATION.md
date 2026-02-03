# Rat Reader Database Documentation

## Database Overview

The Rat Reader application uses a MySQL database to store user accounts, RSS feed subscriptions, articles, and authentication sessions. The database is designed to support multiple users, each with their own collection of RSS feeds and articles.

## Database Tables

### 1. `users` Table
Stores user account information for registration and authentication.

**Columns:**
- `id` (INT, Primary Key, Auto Increment) - Unique user identifier
- `username` (VARCHAR 50, Unique) - User's chosen username (used for login)
- `password_hash` (VARCHAR 255) - Encrypted password using PHP password_hash()
- `created_at` (TIMESTAMP) - When the account was created
- `updated_at` (TIMESTAMP) - When the account was last modified

### 2. `feeds` Table
Stores RSS feed subscriptions for each user.

**Columns:**
- `id` (INT, Primary Key, Auto Increment) - Unique feed identifier
- `user_id` (INT, Foreign Key → users.id) - Which user owns this feed
- `name` (VARCHAR 255) - Display name for the feed (e.g., "TechCrunch")
- `url` (VARCHAR 500) - The RSS feed URL
- `last_fetched` (TIMESTAMP, Nullable) - When articles were last downloaded
- `is_active` (BOOLEAN, Default: TRUE) - Whether the feed is enabled
- `created_at` (TIMESTAMP) - When the feed was added
- `updated_at` (TIMESTAMP) - When the feed was last modified

**Relationships:**
- Each feed belongs to one user (many feeds per user)
- When a user is deleted, all their feeds are deleted (CASCADE)

**Indexes:**
- `idx_user_feeds` on `user_id` for fast feed lookups per user
- `idx_feed_url` on `url` for duplicate feed detection

### 3. `articles` Table
Stores individual RSS articles parsed from feeds.

**Columns:**
- `id` (INT, Primary Key, Auto Increment) - Unique article identifier
- `feed_id` (INT, Foreign Key → feeds.id) - Which feed this article came from
- `title` (VARCHAR 500) - Article headline
- `description` (TEXT) - Article summary/excerpt
- `content` (LONGTEXT) - Full article content (if available)
- `link` (VARCHAR 500) - Original article URL
- `pub_date` (TIMESTAMP) - When the article was originally published
- `is_read` (BOOLEAN, Default: FALSE) - Whether the user has read this article
- `created_at` (TIMESTAMP) - When the article was saved to our database

**Relationships:**
- Each article belongs to one feed
- When a feed is deleted, all its articles are deleted (CASCADE)

**Indexes:**
- `idx_feed_articles` on `feed_id` for fast article lookups per feed
- `idx_article_date` on `pub_date` for chronological sorting
- `idx_article_read` on `is_read` for filtering read/unread articles

**Constraints:**
- `unique_article` ensures no duplicate articles (same feed + link combination)

### 4. `user_sessions` Table
Manages user authentication tokens for login sessions.

**Columns:**
- `id` (INT, Primary Key, Auto Increment) - Unique session identifier
- `user_id` (INT, Foreign Key → users.id) - Which user this session belongs to
- `session_token` (VARCHAR 255, Unique) - Random authentication token
- `expires_at` (TIMESTAMP) - When the session expires
- `created_at` (TIMESTAMP) - When the session was created

**Relationships:**
- Each session belongs to one user
- When a user is deleted, all their sessions are deleted (CASCADE)

**Indexes:**
- `idx_session_token` on `session_token` for fast token validation
- `idx_session_expires` on `expires_at` for cleanup of expired sessions

## Data Flow

1. **User Registration/Login:**
   - User data stored in `users` table
   - Authentication token stored in `user_sessions` table

2. **Adding RSS Feeds:**
   - Feed URL and name stored in `feeds` table
   - System immediately fetches articles from the feed

3. **Article Management:**
   - RSS feeds are parsed and articles stored in `articles` table
   - Duplicate articles are prevented by the unique constraint
   - Users can mark articles as read/unread

4. **Security:**
   - Passwords are hashed using PHP's `password_hash()`
   - Session tokens are random 64-character strings
   - Sessions expire after 30 days
   - All user data is isolated by `user_id` foreign keys

## Storage Estimates

- **Users:** ~200 bytes per user
- **Feeds:** ~500 bytes per feed
- **Articles:** ~2-5 KB per article (varies by content length)
- **Sessions:** ~100 bytes per active session

For 1,000 users with 10 feeds each and 100 articles per feed:
- Users: ~200 KB
- Feeds: ~5 MB  
- Articles: ~2-5 GB
- Sessions: ~100 KB (for active users)