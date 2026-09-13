const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: 'worker/.env' });

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("--- Account Check ---");
  // The user says "for my user". Let's just group accounts by user_id to see if anyone has multiple.
  const { data: accounts } = await supabase.from('accounts').select('id, user_id, status');
  const userAccounts = {};
  accounts.forEach(acc => {
    if (!userAccounts[acc.user_id]) userAccounts[acc.user_id] = [];
    userAccounts[acc.user_id].push(acc);
  });
  
  for (const [uid, accs] of Object.entries(userAccounts)) {
    if (accs.length >= 1) {
      console.log(`User ${uid} has ${accs.length} accounts:`);
      accs.forEach(a => console.log(`  - ${a.id} (${a.status})`));
    }
  }

  console.log("\n--- Running Spread Test via UI ---");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const email = `spreadtest${Date.now()}@gmail.com`;
  const password = 'password123';
  await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  
  await page.goto('http://127.0.0.1:3000/login');
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await delay(2000);
  
  await page.goto('http://127.0.0.1:3000/order-test');
  await delay(1000);
  
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const createBtn = btns.find(b => b.innerText.includes('Create Test Account'));
    if (createBtn) createBtn.click();
  });
  await delay(2000);

  // Helper to submit order and return JSON response string
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
    
    await delay(1000);
    const jsonResponse = await page.evaluate(() => {
      const pre = document.querySelector('pre');
      return pre ? pre.innerText : null;
    });
    return JSON.parse(jsonResponse);
  }

  console.log("Fetching live price before orders...");
  const { data: price1 } = await supabase.from('latest_prices').select('bid, ask').eq('symbol', 'BTCUSD').single();
  console.log(`Current DB Price -> Bid: ${price1.bid}, Ask: ${price1.ask} (Spread: ${price1.ask - price1.bid})`);

  console.log("Submitting BUY...");
  const buyRes = await submitOrder('BTCUSD', 'buy', '0.01');
  
  console.log("Submitting SELL...");
  const sellRes = await submitOrder('BTCUSD', 'sell', '0.01');

  const { data: price2 } = await supabase.from('latest_prices').select('bid, ask').eq('symbol', 'BTCUSD').single();

  const buyPrice = buyRes?.position?.entry_price;
  const sellPrice = sellRes?.position?.entry_price;

  console.log(`\nBUY entry_price:  ${buyPrice}`);
  console.log(`SELL entry_price: ${sellPrice}`);
  
  if (buyPrice && sellPrice) {
    console.log(`Difference (Buy - Sell): ${buyPrice - sellPrice}`);
  }
  
  console.log(`Live DB Price after orders -> Bid: ${price2.bid}, Ask: ${price2.ask} (Spread: ${price2.ask - price2.bid})`);
  
  await browser.close();
}

run().catch(console.error);
