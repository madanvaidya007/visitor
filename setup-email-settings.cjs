const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://localhost:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function setupEmailSettings() {
  try {
    console.log('🔧 Setting up email settings...');
    
    // First, try to insert the email settings
    const { data, error } = await supabase
      .from('email_settings')
      .upsert({
        id: '1',
        api_key: 'dummy-key',
        from_email: 'coreproject007@gmail.com',
        from_name: 'Access Manager System',
        is_enabled: true
      })
      .select();

    if (error) {
      console.error('❌ Error setting up email settings:', error);
      return false;
    }

    console.log('✅ Email settings configured successfully:', data);
    
    // Verify the settings
    const { data: settings, error: fetchError } = await supabase
      .from('email_settings')
      .select('*')
      .single();

    if (fetchError) {
      console.error('❌ Error fetching email settings:', fetchError);
      return false;
    }

    console.log('📧 Current email settings:', settings);
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

setupEmailSettings().then(success => {
  process.exit(success ? 0 : 1);
});