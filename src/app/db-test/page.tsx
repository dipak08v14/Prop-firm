import { createClient } from '@/utils/supabase/server';

export default async function DbTestPage() {
  const supabase = await createClient();
  
  // Note: supabase-js does not support raw SQL strings directly, 
  // so we attempt to call 'now' as an RPC function to query Postgres.
  const { data, error } = await supabase.rpc('now');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="bg-white text-black p-8 rounded shadow-lg max-w-lg w-full text-center">
        <h1 className="text-2xl font-bold mb-6">Supabase DB Test</h1>
        
        {error ? (
          <div className="text-red-600 p-4 border border-red-200 bg-red-50 rounded">
            <h2 className="font-semibold mb-2">Error connecting or querying:</h2>
            <p className="text-sm font-mono text-left break-words">{error.message}</p>
          </div>
        ) : (
          <div className="text-green-700 p-4 border border-green-200 bg-green-50 rounded">
            <h2 className="font-semibold mb-2">Timestamp:</h2>
            <p className="text-sm font-mono">{JSON.stringify(data)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
