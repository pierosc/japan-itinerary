import { supabase } from "../lib/supabaseClient";

export async function saveTripOnline(tripMeta, tripData) {
  const { data: trip, error } = await supabase
    .from("trips")
    .upsert(tripMeta)
    .select()
    .single();

  if (error) throw error;

  const { error: dataError } = await supabase.from("trip_data").upsert({
    trip_id: trip.id,
    data: tripData,
  });

  if (dataError) throw dataError;

  return trip;
}
