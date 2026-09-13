const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'worker/.env' });

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  
  const testUsers = users.filter(u => u.email.startsWith('testuser') || u.email.startsWith('spreadtest'));
  const realUsers = users.filter(u => !u.email.startsWith('testuser') && !u.email.startsWith('spreadtest'));
  
  const testUserIds = testUsers.map(u => u.id);
  const realUserIds = realUsers.map(u => u.id);
  
  let deletedTestPositions = 0;
  let deletedTestOrders = 0;
  let deletedTestAccounts = 0;
  let deletedTestProfiles = 0;
  let deletedTestAuthUsers = 0;
  
  let deletedRealPositions = 0;
  let deletedRealOrders = 0;

  console.log(`Found ${testUsers.length} test users to completely remove.`);
  console.log(`Found ${realUsers.length} real users to clean orders/positions for.`);

  if (testUserIds.length > 0) {
    // 1. Find test account IDs
    const { data: testAccounts } = await supabase.from('accounts').select('id').in('user_id', testUserIds);
    const testAccountIds = testAccounts ? testAccounts.map(a => a.id) : [];
    
    if (testAccountIds.length > 0) {
      // 2. Delete test positions
      const { data: posData } = await supabase.from('positions').delete().in('account_id', testAccountIds).select('id');
      deletedTestPositions = posData ? posData.length : 0;
      
      // 3. Delete test orders
      const { data: orderData } = await supabase.from('orders').delete().in('account_id', testAccountIds).select('id');
      deletedTestOrders = orderData ? orderData.length : 0;
    }
    
    // 4. Delete test accounts
    const { data: accData } = await supabase.from('accounts').delete().in('user_id', testUserIds).select('id');
    deletedTestAccounts = accData ? accData.length : 0;
    
    // 5. Delete test profiles
    const { data: profData } = await supabase.from('profiles').delete().in('id', testUserIds).select('id');
    deletedTestProfiles = profData ? profData.length : 0;
    
    // 6. Delete test auth.users
    for (const uid of testUserIds) {
      const { data, error } = await supabase.auth.admin.deleteUser(uid);
      if (!error) deletedTestAuthUsers++;
    }
  }

  if (realUserIds.length > 0) {
    // 1. Find real account IDs
    const { data: realAccounts } = await supabase.from('accounts').select('id').in('user_id', realUserIds);
    const realAccountIds = realAccounts ? realAccounts.map(a => a.id) : [];
    
    if (realAccountIds.length > 0) {
      // 2. Delete real positions
      const { data: posData } = await supabase.from('positions').delete().in('account_id', realAccountIds).select('id');
      deletedRealPositions = posData ? posData.length : 0;
      
      // 3. Delete real orders
      const { data: orderData } = await supabase.from('orders').delete().in('account_id', realAccountIds).select('id');
      deletedRealOrders = orderData ? orderData.length : 0;
    }
  }

  console.log("\n=== DELETION REPORT ===");
  console.log("Test Users Data Deleted:");
  console.log(`  positions:  ${deletedTestPositions}`);
  console.log(`  orders:     ${deletedTestOrders}`);
  console.log(`  accounts:   ${deletedTestAccounts}`);
  console.log(`  profiles:   ${deletedTestProfiles}`);
  console.log(`  auth.users: ${deletedTestAuthUsers}`);
  
  console.log("\nReal User Data Deleted:");
  console.log(`  positions:  ${deletedRealPositions}`);
  console.log(`  orders:     ${deletedRealOrders}`);
  
  console.log("\n=== FINAL ROW COUNTS ===");
  const { count: finalAccounts } = await supabase.from('accounts').select('*', { count: 'exact', head: true });
  const { count: finalOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const { count: finalPositions } = await supabase.from('positions').select('*', { count: 'exact', head: true });
  
  console.log(`accounts table:  ${finalAccounts}`);
  console.log(`orders table:    ${finalOrders}`);
  console.log(`positions table: ${finalPositions}`);

}

run().catch(console.error);
