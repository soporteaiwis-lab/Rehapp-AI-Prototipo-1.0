import { createClient } from '@supabase/supabase-js';

// ADVERTENCIA:
// Debes ir a supabase.com, crear un proyecto nuevo y obtener estos dos valores:
// 1. Project URL
// 2. Anon Public Key
// Pégalos aquí abajo para que la base de datos funcione.
https://zrlhkfpzfuvqnsfowzam.supabase.co
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpybGhrZnB6ZnV2cW5zZm93emFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1ODk5OTUsImV4cCI6MjA4NTE2NTk5NX0.ykMejTMMKz3VQ6tdtndooDhXxh9ZEwOyZ-obZRdmd4Q

// Helper to safely get env vars without crashing in browser if process is undefined
const getEnv = (key: string, fallback: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

// Fallback must be a valid URL structure to prevent "Invalid URL" error on init
const SUPABASE_URL = getEnv('SUPABASE_URL', 'https://placeholder.supabase.co'); 
const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY', 'placeholder-key');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
