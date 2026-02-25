import { FormEvent } from "react";
import { useNavigate } from "react-router";
import { Bird } from "lucide-react";

export function Landing() {
  const navigate = useNavigate();

  function handleLogin(e: FormEvent) {
    e.preventDefault();
    navigate("/app");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Bird size={26} className="text-blue-600" />
            <span
              className="tracking-[0.25em] text-sm text-gray-900"
              style={{ fontWeight: 700 }}
            >
              AVILIGHT
            </span>
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
            Sign in to your account
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/80 p-6">
          <div className="mb-5">
            <h1 className="text-lg text-gray-900" style={{ fontWeight: 600 }}>
              Welcome back
            </h1>
            <p className="text-[13px] text-gray-500 mt-1">
              Enter your details to access the AVILIGHT console.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-1">
              <label className="text-xs text-gray-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                defaultValue="giancarloregalado05@gmail.com"
                className="w-full rounded-md bg-white border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                defaultValue="••••••••"
                className="w-full rounded-md bg-white border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500"
                placeholder="Enter password"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-gray-600">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Remember this device</span>
              </label>
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="w-full mt-2 inline-flex items-center justify-center px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-sm text-white font-medium shadow-sm transition-colors"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

