"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [is18, setIs18] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    if (!is18) {
      setError("You must be 18 or older to sign up");
      return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data.user) {
      // The trigger creates the profile, now we update it for age confirmation
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          age_confirmed: true, 
          age_confirmed_at: new Date().toISOString() 
        })
        .eq('id', data.user.id);
        
      if (profileError) {
        setError("Account created, but age confirmation failed: " + profileError.message);
        return;
      }
      
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded shadow max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">Registration Successful</h2>
          <p className="text-black">Please check your email to verify your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded shadow max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full border p-2 rounded" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full border p-2 rounded" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input 
              type="password" 
              required
              className="w-full border p-2 rounded" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          
          <div className="flex items-start">
            <input 
              type="checkbox" 
              id="is18" 
              checked={is18}
              onChange={(e) => setIs18(e.target.checked)}
              className="mt-1 mr-2"
            />
            <label htmlFor="is18" className="text-sm">
              I confirm I am 18 years of age or older
            </label>
          </div>

          <button 
            type="submit" 
            disabled={!is18}
            className="w-full bg-blue-600 text-white p-2 rounded disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
}
