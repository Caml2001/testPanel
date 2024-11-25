import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

console.log('Initializing Supabase with:', { supabaseUrl });

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Test database connection
const testDatabaseConnection = async () => {
  console.log('Testing Supabase connection...');
  try {
    const { data, error } = await supabase
      .from('identity_verifications')
      .select('count');
    
    console.log('Database connection test successful:', data);
    
    // Test storage access
    const { data: files, error: storageError } = await supabase
      .storage
      .from('id-photos')
      .list();
    
    if (storageError) {
      console.error('Storage connection test failed:', storageError);
    } else {
      console.log('Storage access successful, files found:', files?.length);
    }
    
    return !error && !storageError;
  } catch (err) {
    console.error('Connection test failed:', err);
    return false;
  }
};

testDatabaseConnection();