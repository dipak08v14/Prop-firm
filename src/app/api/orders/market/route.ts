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
    const { account_id, symbol, side, quantity } = body;

    if (!account_id || !symbol || !side || !quantity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (side !== 'buy' && side !== 'sell') {
      return NextResponse.json({ error: 'Invalid side' }, { status: 400 });
    }

    const q = Number(quantity);
    if (isNaN(q) || q <= 0) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
    }

    // We use the service role to read/write safely
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Helper to log rejection
    const rejectOrder = async (reason: string) => {
      await supabaseAdmin.from('orders').insert({
        account_id,
        symbol,
        side,
        order_type: 'market',
        quantity: q,
        status: 'rejected',
        rejection_reason: reason
      });
      return NextResponse.json({ error: reason }, { status: 400 });
    };

    // 2. The account belongs to this user
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('user_id, status')
      .eq('id', account_id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized account access' }, { status: 403 });
    }

    // From here on, we can safely write to orders since the account_id is valid and owned by the user.

    // 3. The account status is 'active'
    if (account.status !== 'active') {
      return await rejectOrder('Account is not active');
    }

    // 4. The symbol exists in instruments and is_active is true
    const { data: instrument, error: instError } = await supabaseAdmin
      .from('instruments')
      .select('is_active, min_quantity, max_quantity, volume_step')
      .eq('symbol', symbol)
      .single();

    if (instError || !instrument) {
      return await rejectOrder('Instrument not found');
    }

    if (!instrument.is_active) {
      return await rejectOrder('Instrument is not active');
    }

    // 5. latest_prices.market_state for that symbol is 'open'
    const { data: priceRow, error: priceError } = await supabaseAdmin
      .from('latest_prices')
      .select('bid, ask, market_state')
      .eq('symbol', symbol)
      .single();

    if (priceError || !priceRow) {
      return await rejectOrder('Price data not available');
    }

    if (priceRow.market_state !== 'open') {
      return await rejectOrder(`Market is ${priceRow.market_state}`);
    }

    // 6. quantity is between min_quantity and max_quantity
    if (q < Number(instrument.min_quantity) || q > Number(instrument.max_quantity)) {
      return await rejectOrder(`Quantity must be between ${instrument.min_quantity} and ${instrument.max_quantity}`);
    }

    // 7. quantity is an exact multiple of volume_step
    const step = Number(instrument.volume_step);
    // Multiply by a factor to avoid floating point modulo issues
    const factor = 1e8;
    const qInt = Math.round(q * factor);
    const stepInt = Math.round(step * factor);
    
    if (qInt % stepInt !== 0) {
      return await rejectOrder(`Quantity must be a multiple of ${step}`);
    }

    // All validation passed. Fill the order.
    const fillPrice = side === 'buy' ? Number(priceRow.ask) : Number(priceRow.bid);

    // Create the order row
    const { data: order, error: insertOrderError } = await supabaseAdmin
      .from('orders')
      .insert({
        account_id,
        symbol,
        side,
        order_type: 'market',
        quantity: q,
        requested_price: null,
        status: 'filled',
        filled_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertOrderError) {
      console.error('Insert order error:', insertOrderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Create the position row
    const { data: position, error: insertPosError } = await supabaseAdmin
      .from('positions')
      .insert({
        account_id,
        order_id: order.id,
        symbol,
        side,
        quantity: q,
        entry_price: fillPrice
      })
      .select()
      .single();

    if (insertPosError) {
      console.error('Insert position error:', insertPosError);
      // Depending on strictness, we might need to rollback the order. For now, just return 500.
      return NextResponse.json({ error: 'Failed to create position' }, { status: 500 });
    }

    return NextResponse.json({ position });

  } catch (err) {
    console.error('Market order API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
