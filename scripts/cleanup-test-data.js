require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Connecting to Supabase...');
  
  // 1. Delete the specific account
  console.log('Deleting account 826ccf07-f9b8-4dd8-b2f9-6e620097e1e5...');
  const { error: accErr } = await supabase
    .from('accounts')
    .delete()
    .eq('id', '826ccf07-f9b8-4dd8-b2f9-6e620097e1e5');
    
  if (accErr) {
    console.error('Failed to delete account:', accErr);
  } else {
    console.log('Account deleted successfully.');
  }
  
  // 2. Delete the test template
  console.log('Deleting account template "Test Template"...');
  const { error: tplErr } = await supabase
    .from('account_templates')
    .delete()
    .eq('name', 'Test Template');
    
  if (tplErr) {
    console.error('Failed to delete template:', tplErr);
  } else {
    console.log('Template deleted successfully.');
  }
}

run();
