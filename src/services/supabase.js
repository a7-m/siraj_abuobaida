/**
 * Supabase SDK Initialization using ES Modules from CDN
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Real Supabase Keys
const SUPABASE_URL = 'https://pqpbvhaaarpctxifsddh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcGJ2aGFhYXJwY3R4aWZzZGRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzNzQ2MzUsImV4cCI6MjEwNjk1MDYzNX0.59MDrlgpsoPu5VhJr5wye7fvej4KV89CO2kqGTT_384';

// Only create a client if keys are provided, else create a dummy object to prevent instant crashes 
// when keys are just Placeholders.
let supabaseClient = null;

try {
  if (SUPABASE_URL.startsWith('http')) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.warn('⚠️ Supabase Keys are placeholders. Supabase connection is disabled. Replace them in User settings.');
  }
} catch (e) {
  console.error('Supabase Initialization Error:', e);
}

export const supabase = supabaseClient;
