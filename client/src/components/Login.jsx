import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login({ email, password });
      const role = res?.user?.role || 'user';
      if (role === 'startup_owner') {
        navigate('/StartupOwner/dashboard');
      } else {
        navigate('/user/dashboard');
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ayush-50 to-green-100 p-4">
      <div className="w-full max-w-5xl bg-white/90 backdrop-blur rounded-2xl shadow-2xl overflow-hidden border border-ayush-100">
        <div className="grid md:grid-cols-2">
          <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-ayush-600 to-green-600 text-white">
            <div>
              <div className="text-2xl font-extrabold">AYUSH</div>
              <h2 className="mt-10 text-3xl font-bold leading-tight">Welcome back</h2>
              <p className="mt-3 text-white/90">Sign in to continue your journey on the AYUSH portal.</p>
            </div>
            <ul className="space-y-3 mt-10 text-white/90">
              <li>• Secure authentication</li>
              <li>• Role-based access</li>
              <li>• Fast processing</li>
            </ul>
            <div className="mt-8 text-xs text-white/80">© AYUSH Portal</div>
          </div>
          <div className="p-6 sm:p-10">
            <h1 className="text-3xl font-bold mb-2 text-gray-900">Login</h1>
            <p className="text-sm text-gray-600 mb-6">Access your AYUSH account</p>
            {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayush-500" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayush-500" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button disabled={loading} className="w-full bg-ayush-600 hover:bg-ayush-700 text-white font-semibold py-3 rounded-lg disabled:opacity-60 shadow">
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>
            <p className="mt-4 text-sm text-gray-600">
              Don't have an account? <Link className="text-ayush-600" to="/signup">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


