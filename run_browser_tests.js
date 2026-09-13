const puppeteer = require('puppeteer');

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const { createClient } = require('@supabase/supabase-js');
  const dotenv = require('dotenv');
  dotenv.config({ path: 'worker/.env' });
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const email = `testuser${Date.now()}@gmail.com`;
  const password = 'password123';
  await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  
  console.log("1. Logging in...");
  await page.goto('http://127.0.0.1:3000/login');
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  await delay(2000);
  
  console.log("2. Navigating to /order-test...");
  await page.goto('http://127.0.0.1:3000/order-test');
  await delay(1000);
  
  console.log("3. Creating Test Account...");
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const createBtn = btns.find(b => b.innerText.includes('Create Test Account'));
    if (createBtn) createBtn.click();
  });
  
  await delay(2000); // wait for account creation
  
  // Helper to submit order and read response
  async function submitOrder(symbol, side, quantity) {
    await page.evaluate(({sym, sid, qty}) => {
      const selects = document.querySelectorAll('select');
      
      const nativeSelectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
      nativeSelectSetter.call(selects[0], sym);
      selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      
      nativeSelectSetter.call(selects[1], sid);
      selects[1].dispatchEvent(new Event('change', { bubbles: true }));
      
      const input = document.querySelector('input[type="number"]');
      const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      nativeInputSetter.call(input, qty);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      
      const btns = Array.from(document.querySelectorAll('button'));
      const submitBtn = btns.find(b => b.innerText.includes('Submit Order'));
      submitBtn.click();
    }, {sym: symbol, sid: side, qty: quantity});
    
    await delay(1500); // Wait for fetch
    
    const jsonResponse = await page.evaluate(() => {
      const pre = document.querySelector('pre');
      return pre ? pre.innerText : null;
    });
    
    return jsonResponse;
  }
  
  console.log("\n=== TEST A: XRP Step Validation ===");
  
  console.log("\n1. XRPUSD Buy 25");
  const resA1 = await submitOrder('XRPUSD', 'buy', '25');
  console.log(resA1);
  
  console.log("\n2. XRPUSD Buy 20");
  const resA2 = await submitOrder('XRPUSD', 'buy', '20');
  console.log(resA2);
  
  console.log("\n3. XRPUSD Buy 15");
  const resA3 = await submitOrder('XRPUSD', 'buy', '15');
  console.log(resA3);
  
  console.log("\n=== TEST B: Fill Price Freshness ===");
  
  console.log("\n1. Placing first BTCUSD order...");
  const resB1Str = await submitOrder('BTCUSD', 'buy', '0.01');
  const resB1 = JSON.parse(resB1Str);
  console.log(`Fill entry_price: ${resB1.position?.entry_price}`);
  
  const { data } = await supabase.from('latest_prices').select('ask').eq('symbol', 'BTCUSD').single();
  console.log(`Actual ask in DB at time of fill: ${data.ask}`);

  console.log("\nWaiting 30 seconds for price to move...");
  await delay(30000);
  
  console.log("\n2. Placing second BTCUSD order...");
  const resB2Str = await submitOrder('BTCUSD', 'buy', '0.01');
  const resB2 = JSON.parse(resB2Str);
  console.log(`Fill entry_price: ${resB2.position?.entry_price}`);
  
  const { data: data2 } = await supabase.from('latest_prices').select('ask').eq('symbol', 'BTCUSD').single();
  console.log(`Actual ask in DB at time of fill: ${data2.ask}`);

  if (resB1.position?.entry_price !== resB2.position?.entry_price) {
    console.log("\nResult: The prices differ, successfully proving real-time updates!");
  } else {
    console.log("\nResult: The prices are identical. The market might be slow, or updates failed.");
  }
  
  await browser.close();
}

run().catch(console.error);
