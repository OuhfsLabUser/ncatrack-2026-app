-- Set PostgreSQL database timezone to Dallas (America/Chicago)
-- This script should be run as a database administrator

-- Set timezone for the current session
SET timezone = 'America/Chicago';

-- Set timezone for the database (persistent)
ALTER DATABASE care SET timezone = 'America/Chicago';

-- Verify timezone setting
SHOW timezone;

-- Note: You may need to restart PostgreSQL for the database-level setting to take full effect
-- For session-level settings, they apply immediately

