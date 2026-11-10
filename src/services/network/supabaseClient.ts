import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://qlawandhzmuffwxlrcuz.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsYXdhbmRoem11ZmZ3eGxyY3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMjc1NzIsImV4cCI6MjA5MjcwMzU3Mn0.CJdZGDfxcORso1feI1ujlYnUKgsmkXRNo3Qjrkhv4r0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 20,
    },
  },
});
