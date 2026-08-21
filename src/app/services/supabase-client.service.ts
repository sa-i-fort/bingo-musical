import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../supabase-config';

/** Thin wrapper around the Supabase client, isolated so it's the only file that knows the schema. */
@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  readonly client: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
