import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabaseUser = await createClient();
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Get the template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('account_templates')
      .select('id, starting_balance')
      .eq('name', 'Evaluation $10K')
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // 2. Check if user already has an active test account
    const { data: existing } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ account_id: existing[0].id });
    }

    // 3. Create the account
    const account_number = 'TEST-' + Math.floor(100000 + Math.random() * 900000);
    
    const { data: account, error: insertError } = await supabaseAdmin
      .from('accounts')
      .insert({
        user_id: user.id,
        template_id: template.id,
        account_number,
        status: 'active',
        balance: template.starting_balance,
        equity: template.starting_balance,
        starting_balance: template.starting_balance,
        daily_start_equity: template.starting_balance,
        trading_days_count: 0
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(insertError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    return NextResponse.json({ account_id: account.id });

  } catch (err) {
    console.error('Test account API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
