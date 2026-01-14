import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { Mail, Lock, Truck, ShieldCheck, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return alert("Enter credentials");
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50"></div>

      <div className="w-full max-w-md z-10 px-4">
        {/* Branding Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-4">
            <Truck className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Duty<span className="text-blue-600">Sync</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Fleet & Driver Management Console
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100">
          <div className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                Corporate Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-700 placeholder:text-slate-400"
                  placeholder="name@company.com"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                Access Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-700 placeholder:text-slate-400"
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Verifying Identity...
                </>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  Authorize Login
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-slate-400 text-sm mt-8">
          &copy; {new Date().getFullYear()} DutySync Systems. Secure Admin Access.
        </p>
      </div>
    </div>
  );
}