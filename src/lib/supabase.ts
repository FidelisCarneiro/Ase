import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmkpoigcqlchiqzruvml.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhta3BvaWdjcWxjaGlxenJ1dm1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTkxNjgsImV4cCI6MjA4NjQ5NTE2OH0.qVEnzGVzRR-LMgAG9A8Im94TudBpnvb_eQy0cKRUZJs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
