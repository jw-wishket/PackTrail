import { createClient } from '@/lib/supabase/client';

export function subscribeReservationChanges(
  callback: (payload: any) => void
) {
  const supabase = createClient();

  return supabase
    .channel('reservation-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reservations',
      },
      callback
    )
    .subscribe();
}

export function subscribeSetChanges(
  callback: (payload: any) => void
) {
  const supabase = createClient();

  return supabase
    .channel('set-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'equipment_sets',
      },
      callback
    )
    .subscribe();
}
