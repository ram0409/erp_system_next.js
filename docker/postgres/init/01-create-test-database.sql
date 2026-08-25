-- Integration tests run against a dedicated database so a failing test run can
-- never truncate development data. Created once, on first container start.
SELECT 'CREATE DATABASE erp_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'erp_test')\gexec
