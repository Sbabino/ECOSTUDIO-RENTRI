import { createClient } from "@supabase/supabase-js";

export function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Supabase restituisce al massimo 1000 righe per richiesta: leggo a pagine finché finiscono.
// `costruisci(da, a)` deve restituire la query con .order() e .range(da, a) già applicati.
export async function leggiTutti(costruisci, dimensionePagina = 1000) {
  const tutte = [];
  for (let da = 0; ; da += dimensionePagina) {
    const { data, error } = await costruisci(da, da + dimensionePagina - 1);
    if (error) throw new Error(error.message);
    tutte.push(...data);
    if (data.length < dimensionePagina) break;
  }
  return tutte;
}
