import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AuthAPI } from "../../api";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [otp, setOtp] = useState("");
  const [panCardFile, setPanCardFile] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    setError("");
    setMessage("");
    setSendingOtp(true);
    try {
      if (!email) throw new Error("Please enter your email first");
      await AuthAPI.sendSignupOtp({ email });
      setOtpSent(true);
      setMessage("OTP has been sent to your email.");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (!otpSent) {
        throw new Error("Please verify your email by requesting OTP first");
      }
      if (!otp) {
        throw new Error("Please enter the OTP sent to your email");
      }
      if (role === "investor" && !panCardFile) {
        throw new Error("PAN Card is required for investor registration");
      }

      const payload = new FormData();
      payload.append("name", name);
      payload.append("email", email);
      payload.append("password", password);
      payload.append("otp", otp);
      if (role) payload.append("role", role);
      if (role === "investor" && panCardFile) {
        payload.append("pan_card_file", panCardFile);
      }
      await register(payload);
      navigate('/login');
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ayush-50 to-green-100 dark:from-gray-950 dark:to-gray-900 p-4">
      <div className="w-full max-w-5xl bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-2xl shadow-2xl overflow-hidden border border-ayush-100 dark:border-gray-800">
        <div className="grid md:grid-cols-2">
          <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-ayush-600 to-green-600 text-white">
            <div>
              <div className="text-2xl font-extrabold">AYUSH</div>
              <h2 className="mt-10 text-3xl font-bold leading-tight">Join the AYUSH ecosystem</h2>
              <p className="mt-3 text-white/90">Create your account to start your startup journey with guidance and tools.</p>
            </div>
            <ul className="space-y-3 mt-10 text-white/90">
              <li>• Streamlined registration</li>
              <li>• Secure document handling</li>
              <li>• Expert guidance</li>
            </ul>
            <div className="mt-8 text-xs text-white/80">© AYUSH Portal</div>
          </div>
          <div className="p-6 sm:p-10">
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Create account</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Register to start your AYUSH journey</p>
            {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
            {message && <div className="mb-4 text-green-600 text-sm">{message}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Name</label>
                <input className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayush-500" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Email</label>
                <input className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayush-500" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <button
                  type="button"
                  disabled={sendingOtp || !email}
                  onClick={handleSendOtp}
                  className="mt-2 text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded disabled:opacity-60"
                >
                  {sendingOtp ? "Sending OTP..." : otpSent ? "Resend OTP" : "Send OTP"}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Password</label>
                <input className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayush-500" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Role</label>
                <select className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayush-500" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="">Select a role</option>
                  <option value="startup_owner">Startup Owner</option>
                  <option value="gov_official">Government Official</option>
                  <option value="investor">Investor</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
              </div>
              {role === "investor" && (
                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">PAN Card (PDF/JPG/PNG)</label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2"
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    onChange={(e) => setPanCardFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Email OTP</label>
                <input
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ayush-500"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  required
                />
              </div>
              <button disabled={loading} className="w-full bg-ayush-600 hover:bg-ayush-700 text-white font-semibold py-3 rounded-lg disabled:opacity-60 shadow">
                {loading ? "Creating account..." : "Sign up"}
              </button>
            </form>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              Already have an account? <Link className="text-ayush-600" to="/login">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

