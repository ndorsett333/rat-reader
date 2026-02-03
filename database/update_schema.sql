-- Step-by-step ALTER statements to safely update the users table
-- Run these one at a time in phpMyAdmin

-- Step 1: Check current table structure
-- DESCRIBE users;

-- Step 2: Add username column if it doesn't exist
ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE AFTER id;

-- Step 3: Drop the name column if it exists
ALTER TABLE users DROP COLUMN name;

-- Step 4: Drop the email column if it exists  
ALTER TABLE users DROP COLUMN email;