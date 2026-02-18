import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase project URL and anon key
export const SUPABASE_URL = 'https://nqeorzwfbtknnvzslsmy.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xZW9yendmYnRrbm52enNsc215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMjA3MzIsImV4cCI6MjA2MDg5NjczMn0.9ycCeOplbOB8rmVNLMfTPyvQmEOio5haN41kaGQZNtU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
