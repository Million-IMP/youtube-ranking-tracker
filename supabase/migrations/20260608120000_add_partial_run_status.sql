-- Add 'partial' status to run_logs (some channels succeeded, some failed)
ALTER TABLE run_logs DROP CONSTRAINT IF EXISTS run_logs_status_check;
ALTER TABLE run_logs ADD CONSTRAINT run_logs_status_check
  CHECK (status IN ('running', 'success', 'partial', 'failed'));
