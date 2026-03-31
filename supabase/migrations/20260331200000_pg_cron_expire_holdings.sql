-- Enable pg_cron extension (available on Supabase Pro and Free plans)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create the holding expiry function
CREATE OR REPLACE FUNCTION public.expire_holding_reservations()
RETURNS void AS $$
DECLARE
  expired_record RECORD;
  cancelled_count INT := 0;
BEGIN
  FOR expired_record IN
    SELECT id, equipment_set_id
    FROM reservations
    WHERE status = 'HOLDING'
      AND hold_expires_at < NOW()
  LOOP
    -- Delete the reservation block
    DELETE FROM reservation_blocks
    WHERE reservation_id = expired_record.id;

    -- Cancel the reservation
    UPDATE reservations
    SET status = 'CANCELLED',
        cancelled_at = NOW(),
        cancel_reason = '결제 시간 초과',
        updated_at = NOW()
    WHERE id = expired_record.id;

    -- Reset equipment set status if assigned
    IF expired_record.equipment_set_id IS NOT NULL THEN
      UPDATE equipment_sets
      SET status = 'AVAILABLE',
          updated_at = NOW()
      WHERE id = expired_record.equipment_set_id;
    END IF;

    cancelled_count := cancelled_count + 1;
  END LOOP;

  IF cancelled_count > 0 THEN
    RAISE LOG 'expire_holding_reservations: cancelled % reservations', cancelled_count;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run every minute
SELECT cron.schedule(
  'expire-holding-reservations',  -- job name
  '* * * * *',                     -- every minute
  'SELECT public.expire_holding_reservations()'
);
