import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  }
});

// Test database connection
const testConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // Test database query
    const { data, error: dbError } = await supabase
      .from('identity_verifications')
      .select('count');
    
    if (dbError) {
      console.error('Database connection test failed:', dbError);
      return false;
    }
    
    console.log('Database connection test successful:', data);

    // Test storage access with error handling
    try {
      const { data: buckets } = await supabase
        .storage
        .listBuckets();

      const idPhotosBucket = buckets?.find(b => b.name === 'id-photos');
      
      if (idPhotosBucket) {
        const { data: files } = await supabase
          .storage
          .from('id-photos')
          .list();
        
        console.log('Storage access successful, files found:', files?.length);
      } else {
        console.log('id-photos bucket not found, might need to be created');
      }
    } catch (storageError) {
      // Log but don't fail - storage might not be set up yet
      console.warn('Storage test warning:', storageError);
    }

    return true;
  } catch (err) {
    console.error('Connection test failed:', err);
    return false;
  }
};

// Run the test but don't block initialization
testConnection();