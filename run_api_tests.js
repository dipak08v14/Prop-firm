const { createClient } = require('@supabase/supabase-js');

const dotenv = require('dotenv');
dotenv.config({ path: 'worker/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log("Setting up dummy user...");
  
  // 1. Create a dummy user and auto-confirm
  const email = `testuser${Date.now()}@gmail.com`;
  const password = 'password123';
  
  await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) throw authError;
  const session = authData.session;
  
  // Create cookie format for @supabase/ssr
  // sb-[ref]-auth-token is the default name. ref is pebwgfgxtxncmrxioowo
  const cookieName = 'sb-pebwgfgxtxncmrxioowo-auth-token';
  
  // Supabase SSR uses JSON array: [access_token, refresh_token] inside string, chunked if large, but here we can just pass the string.
  // Actually, setting just the access_token in Authorization header might not work for @supabase/ssr because we explicitly use cookies().
  // Let's create the base64 encoded chunks like supabase-js does.
  // The value is simply JSON.stringify({ access_token, refresh_token, ...}) or just a plain string?
  // Wait, @supabase/ssr stores it as a JSON stringify of an array:
  const cookieVal = encodeURIComponent(JSON.stringify([session.access_token, session.refresh_token, null, null, null]));
  const cookieHeader = `${cookieName}=${cookieVal};`;

  console.log("Fetching test account...");
  // 2. Get/create test account
  const resAccount = await fetch('http://localhost:3000/api/test-account', {
    method: 'POST',
    headers: { 'Cookie': cookieHeader }
  });
  
  const accountData = await resAccount.json();
  const accountId = accountData.account_id;
  console.log("Account ID:", accountId);

  async function testOrder(symbol, side, quantity) {
    const r = await fetch('http://localhost:3000/api/orders/market', {
      method: 'POST',
      headers: { 
        'Cookie': cookieHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ account_id: accountId, symbol, side, quantity })
    });
    return await r.json();
  }

  console.log("\n=== TEST A: XRP Step Validation ===");
  
  console.log("\n1. XRPUSD Buy 25");
  const resA1 = await testOrder('XRPUSD', 'buy', 25);
  console.log(JSON.stringify(resA1, null, 2));

  console.log("\n2. XRPUSD Buy 20");
  const resA2 = await testOrder('XRPUSD', 'buy', 20);
  console.log(JSON.stringify(resA2, null, 2));

  console.log("\n3. XRPUSD Buy 15");
  const resA3 = await testOrder('XRPUSD', 'buy', 15);
  console.log(JSON.stringify(resA3, null, 2));


  console.log("\n=== TEST B: Fill Price Freshness ===");
  
  const getLatestPrice = async (symbol) => {
    const { data } = await supabase.from('latest_prices').select('ask').eq('symbol', symbol).single();
    return data.ask;
  }

  console.log("\n1. Placing first BTCUSD order...");
  let ask1 = await getLatestPrice('BTCUSD');
  const resB1 = await testOrder('BTCUSD', 'buy', 0.01);
  console.log(`Fill entry_price: ${resB1.position?.entry_price}`);
  console.log(`Actual ask in DB at time of fill: ${ask1}`);

  console.log("\nWaiting 30 seconds for price to move...");
  await new Promise(r => setTimeout(r, 30000));

  console.log("\n2. Placing second BTCUSD order...");
  let ask2 = await getLatestPrice('BTCUSD');
  const resB2 = await testOrder('BTCUSD', 'buy', 0.01);
  console.log(`Fill entry_price: ${resB2.position?.entry_price}`);
  console.log(`Actual ask in DB at time of fill: ${ask2}`);
  
  if (resB1.position?.entry_price !== resB2.position?.entry_price) {
    console.log("\nResult: The prices differ, successfully proving real-time updates!");
  } else {
    console.log("\nResult: The prices are identical. The market might be slow, or updates failed.");
  }

}

runTests().catch(console.error);
