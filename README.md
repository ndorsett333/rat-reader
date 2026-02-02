# 🐀 Rat Reader

A progressive web app for reading RSS feeds with user accounts.

## Setup Instructions

### 1. Database Configuration

1. Copy the example configuration file:
   ```bash
   cp config/database.local.example.php config/database.local.php
   ```

2. Edit `config/database.local.php` with your database credentials:
   ```php
   return [
       'host' => 'your_database_host',
       'db_name' => 'your_database_name', 
       'username' => 'your_database_username',
       'password' => 'your_database_password',
       'port' => 3306
   ];
   ```

### 2. Database Setup

Run the SQL commands in `database/schema.sql` to create the required tables:
- `users` - User accounts
- `feeds` - RSS feed subscriptions  
- `articles` - Parsed RSS articles
- `user_sessions` - Authentication sessions

### 3. Local Development

Start a PHP development server:
```bash
php -S localhost:8000
```

Test your database connection by visiting `http://localhost:8000/test_db.php`

## API Endpoints

- `POST /api.php/register` - User registration
- `POST /api.php/login` - User login  
- `POST /api.php/logout` - User logout
- `GET /api.php/feeds` - Get user's RSS feeds
- `POST /api.php/feeds` - Add new RSS feed
- `GET /api.php/articles` - Get articles
- `POST /api.php/refresh` - Refresh all feeds

## Security Notes

- Never commit `database.local.php` to version control
- The `.gitignore` file prevents sensitive files from being tracked
- Use environment variables in production deployments