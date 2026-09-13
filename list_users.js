const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'worker/.env' });

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  
  console.log("All users:");
  users.forEach(u => console.log(u.id, u.email));
}

run().catch(console.error);
