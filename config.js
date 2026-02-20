// config.js
var _supabaseUrl = 'https://dvtvkqxupbverxqwbucl.supabase.co';
var _supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2dHZrcXh1cGJ2ZXJ4cXdidWNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDMyNDgsImV4cCI6MjA4NzA3OTI0OH0.m6wXTNxdmIvju18gteA5SDpmNMmkzzvD7YejQXDlyyg';

// Initialize and attach to window
window.supabase = window.supabase.createClient(_supabaseUrl, _supabaseKey, {
  auth: { persistSession: false }
});