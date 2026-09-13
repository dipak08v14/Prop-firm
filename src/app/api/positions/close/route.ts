import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const supabaseUser = await createClient();
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { position_id } = body;

    if (!position_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch position, account, and instrument details
    const { data: position, error: posError } = await supabaseAdmin
      .from('positions')
      .select('*, account:accounts(id, user_id, status, balance), instrument:instruments(contract_size)')
      .eq('id', position_id)
      .single();

    if (posError || !position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 });
    }

    const account = Array.isArray(position.account) ? position.account[0] : position.account;
    const instrument = Array.isArray(position.instrument) ? position.instrument[0] : position.instrument;

    // 2. Validate ownership and active status
    if (account.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (account.status !== 'active') {
      return NextResponse.json({ error: 'Account is not active' }, { status: 400 });
    }

    // 3. Fetch latest price
    const { data: latestPrice, error: priceError } = await supabaseAdmin
      .from('latest_prices')
      .select('bid, ask, market_state')
      .eq('symbol', position.symbol)
      .single();

    if (priceError || !latestPrice) {
      return NextResponse.json({ error: 'Price not available' }, { status: 400 });
    }

    // 4. Validate market is open
    if (latestPrice.market_state !== 'open') {
      return NextResponse.json({ error: 'Market is closed or price is stale' }, { status: 400 });
    }

    // 5. Close logic
    // Exit price: BUY closes at BID, SELL closes at ASK
    const exit_price = position.side === 'buy' ? latestPrice.bid : latestPrice.ask;
    
    const entry_price = Number(position.entry_price);
    const quantity = Number(position.quantity);
    const contract_size = Number(instrument.contract_size);
    
    let pnl = 0;
    if (position.side === 'buy') {
      pnl = (exit_price - entry_price) * quantity * contract_size;
    } else {
      pnl = (entry_price - exit_price) * quantity * contract_size;
    }

    const notional_value = entry_price * quantity * contract_size;
    const pnl_pct = notional_value > 0 ? (pnl / notional_value) * 100 : 0;

    const closed_at = new Date();
    const hour = closed_at.getUTCHours();
    let session = 'newyork';
    if (hour >= 0 && hour < 8) session = 'asia';
    else if (hour >= 8 && hour < 16) session = 'london';

    const tradeRecord = {
      account_id: position.account_id,
      symbol: position.symbol,
      side: position.side,
      quantity: quantity,
      entry_price: entry_price,
      exit_price: exit_price,
      pnl: pnl,
      pnl_pct: pnl_pct,
      r_multiple: null,
      close_reason: 'manual',
      session: session,
      opened_at: position.opened_at,
      closed_at: closed_at.toISOString()
    };

    // 6. Execute writes
    // Insert trade
    const { data: trade, error: tradeError } = await supabaseAdmin
      .from('trades')
      .insert(tradeRecord)
      .select()
      .single();

    if (tradeError) {
      console.error('Trade insert error:', tradeError);
      return NextResponse.json({ error: 'Failed to record trade' }, { status: 500 });
    }

    // Update account balance
    const newBalance = Number(account.balance) + pnl;
    const { error: accUpdateError } = await supabaseAdmin
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', position.account_id);

    if (accUpdateError) {
      console.error('Account update error:', accUpdateError);
      return NextResponse.json({ error: 'Failed to update account balance' }, { status: 500 });
    }

    // Delete position
    const { error: posDeleteError } = await supabaseAdmin
      .from('positions')
      .delete()
      .eq('id', position.id);

    if (posDeleteError) {
      console.error('Position delete error:', posDeleteError);
      return NextResponse.json({ error: 'Failed to delete position' }, { status: 500 });
    }

    return NextResponse.json({ trade });

  } catch (err) {
    console.error('Close position API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
