import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded shadow">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        <div className="mb-6 space-y-2">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Tier:</strong> {profile?.tier || 'Unknown'}</p>
        </div>
        
        <LogoutButton />
      </div>
    </div>
  );
}
