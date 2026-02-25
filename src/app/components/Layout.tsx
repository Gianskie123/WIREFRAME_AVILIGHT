import { Outlet, NavLink, useNavigate } from "react-router";
import { useState } from "react";
import {
  Search,
  Bell,
  User,
  Sun,
  Moon,
  Menu,
  X,
  Bird,
} from "lucide-react";

type UserRole = "Admin" | "No role";

export function Layout() {
  const [lightMode, setLightMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [userAssignments, setUserAssignments] = useState<
    { email: string; role: UserRole }[]
  >([
    { email: "giancarloregalado05@gmail.com", role: "Admin" },
    { email: "admin@avilight.ph", role: "No role" },
    { email: "researcher@denr.gov", role: "No role" },
    { email: "observer@ncr.gov", role: "No role" },
  ]);
  const navigate = useNavigate();

  const navLinks = [
    { label: "Home", path: "/app" },
    { label: "Dashboard", path: "/app/dashboard" },
    { label: "Analytics", path: "/app/analytics" },
    { label: "Species", path: "/app/species" },
    { label: "Reports", path: "/app/reports" },
    { label: "Settings", path: "/app/settings" },
  ];

  return (
    <div
      className={`${lightMode ? "" : "dark"} min-h-screen flex flex-col ${
        lightMode ? "bg-gray-100 text-gray-900" : "bg-[#1a1f2e] text-gray-100"
      }`}
    >
      {/* Navbar */}
      <nav
        className={`sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b ${
          lightMode
            ? "bg-white border-gray-200"
            : "bg-[#141824] border-[#2a2f42]"
        }`}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/app")}
        >
          <Bird
            size={20}
            className={lightMode ? "text-blue-600" : "text-cyan-400"}
          />
          <span
            className={`tracking-widest text-sm ${
              lightMode ? "text-gray-800" : "text-white"
            }`}
            style={{ fontWeight: 700, letterSpacing: "0.2em" }}
          >
            AVILIGHT
          </span>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === "/"}
              className={({ isActive }) =>
                `px-4 py-1.5 rounded text-sm transition-colors ${
                  isActive
                    ? lightMode
                      ? "text-blue-600 bg-blue-50"
                      : "text-cyan-400 bg-cyan-400/10"
                    : lightMode
                    ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setLightMode(!lightMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border transition-colors ${
              lightMode
                ? "border-gray-300 text-gray-600 hover:bg-gray-100"
                : "border-[#2a2f42] text-gray-400 hover:bg-white/5"
            }`}
          >
            {lightMode ? <Sun size={14} /> : <Moon size={14} />}
            <span className="hidden sm:inline">
              {lightMode ? "Light" : "Dark"}
            </span>
          </button>
          <button
            onClick={() => setUserMenuOpen((open) => !open)}
            className={`p-2 rounded transition-colors border ${
              lightMode
                ? `text-gray-700 hover:bg-gray-100 ${
                    userMenuOpen ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`
                : `text-gray-200 hover:bg-white/5 ${
                    userMenuOpen ? "border-cyan-400 bg-white/5" : "border-[#2a2f42]"
                  }`
            }`}
          >
            <User size={16} />
          </button>
          {userMenuOpen && (
            <div
              className={`absolute right-0 top-full mt-2 w-64 rounded-lg shadow-lg text-xs border ${
                lightMode
                  ? "bg-white border-gray-200"
                  : "bg-[#141824] border-[#2a2f42]"
              }`}
            >
              <div className="px-4 py-3 border-b border-white/5">
                <p
                  className={`text-sm ${
                    lightMode ? "text-gray-800" : "text-white"
                  }`}
                  style={{ fontWeight: 600 }}
                >
                  Account
                </p>
                <p className={`mt-0.5 ${lightMode ? "text-gray-500" : "text-gray-400"}`}>
                  Signed in as
                </p>
                <p className={`mt-0.5 ${lightMode ? "text-gray-700" : "text-gray-200"}`}>
                  giancarloregalado05@gmail.com
                </p>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={lightMode ? "text-gray-500" : "text-gray-400"}>
                    Email
                  </span>
                  <span className={lightMode ? "text-gray-800" : "text-gray-100"}>
                    giancarloregalado05@gmail.com
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={lightMode ? "text-gray-500" : "text-gray-400"}>
                    Phone
                  </span>
                  <span className={lightMode ? "text-gray-800" : "text-gray-100"}>
                    +63 9XX XXX XXXX
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={lightMode ? "text-gray-500" : "text-gray-400"}>
                    Password
                  </span>
                  <span className={lightMode ? "text-gray-800" : "text-gray-100"}>
                    ••••••••
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={lightMode ? "text-gray-500" : "text-gray-400"}>
                    Role
                  </span>
                  <span className={lightMode ? "text-gray-800" : "text-gray-100"}>
                    Admin
                  </span>
                </div>
              </div>
              <div className="px-4 py-2 border-t border-white/5 flex flex-col gap-1">
                <button
                  className={`text-left rounded px-2 py-1 ${
                    lightMode
                      ? "text-blue-600 hover:bg-blue-50"
                      : "text-cyan-400 hover:bg-white/5"
                  }`}
                  onClick={() => {
                    setUserMenuOpen(false);
                    setProfileOpen(true);
                  }}
                >
                  Manage profile &amp; security
                </button>
                <button
                  className={`text-left rounded px-2 py-1 ${
                    lightMode
                      ? "text-red-600 hover:bg-red-50"
                      : "text-red-400 hover:bg-red-500/10"
                  }`}
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate("/");
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden border-b ${
            lightMode
              ? "bg-white border-gray-200"
              : "bg-[#141824] border-[#2a2f42]"
          }`}
        >
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              end={link.path === "/"}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-6 py-3 text-sm border-b transition-colors ${
                  isActive
                    ? lightMode
                      ? "text-blue-600 bg-blue-50 border-gray-100"
                      : "text-cyan-400 bg-cyan-400/10 border-[#2a2f42]"
                    : lightMode
                    ? "text-gray-600 border-gray-100 hover:bg-gray-50"
                    : "text-gray-400 border-[#2a2f42] hover:bg-white/5"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}

      {/* Page Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        <Outlet context={{ lightMode }} />
      </main>

      {/* Manage Profile & Security overlay */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ backdropFilter: "blur(6px)" }}
        >
          <div
            className={`flex items-center px-4 py-3 border-b ${
              lightMode
                ? "bg-white border-gray-200"
                : "bg-[#141824] border-[#2a2f42]"
            }`}
          >
            <button
              className={`mr-3 text-sm ${
                lightMode
                  ? "text-gray-700 hover:text-gray-900"
                  : "text-gray-300 hover:text-white"
              }`}
              onClick={() => setProfileOpen(false)}
            >
              ← Back
            </button>
            <h2
              className={`text-sm ${
                lightMode ? "text-gray-800" : "text-white"
              }`}
              style={{ fontWeight: 600 }}
            >
              Manage profile &amp; security
            </h2>
          </div>
          <div
            className={`flex-1 px-6 py-6 overflow-auto ${
              lightMode ? "bg-gray-50" : "bg-[#111827]"
            }`}
          >
            <div
              className={`max-w-2xl mx-auto rounded-xl border ${
                lightMode
                  ? "bg-white border-gray-200"
                  : "bg-[#141824] border-[#2a2f42]"
              } p-5`}
            >
              <p
                className={`text-sm ${
                  lightMode ? "text-gray-900" : "text-white"
                }`}
                style={{ fontWeight: 600 }}
              >
                Assign admin access
              </p>
              <p
                className={`text-xs mt-1 ${
                  lightMode ? "text-gray-500" : "text-gray-400"
                }`}
              >
                Choose which email addresses should have the Admin role. All other users
                will be treated as having no special role.
              </p>

              <div className="mt-4 border border-dashed rounded-lg overflow-hidden">
                <div
                  className={`grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] px-3 py-2 text-[11px] ${
                    lightMode
                      ? "bg-gray-50 text-gray-600 border-b border-gray-200"
                      : "bg-[#101623] text-gray-400 border-b border-[#2a2f42]"
                  }`}
                  style={{ fontWeight: 600 }}
                >
                  <span>Email</span>
                  <span className="text-right pr-1">Role</span>
                </div>
                <div className="divide-y divide-gray-200/60 dark:divide-[#2a2f42] text-sm">
                  {userAssignments.map((user, idx) => (
                    <div
                      key={user.email}
                      className={`grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] items-center px-3 py-2 ${
                        lightMode ? "bg-white" : "bg-[#141824]"
                      }`}
                    >
                      <div className="pr-3">
                        <p
                          className={
                            lightMode ? "text-gray-900 text-xs" : "text-gray-100 text-xs"
                          }
                          style={{ fontWeight: idx === 0 ? 600 : 500 }}
                        >
                          {user.email}
                        </p>
                        {idx === 0 && (
                          <p
                            className={`text-[10px] mt-0.5 ${
                              lightMode ? "text-green-600" : "text-emerald-300"
                            }`}
                          >
                            Currently signed-in user
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <select
                          value={user.role}
                          onChange={(e) => {
                            const next = [...userAssignments];
                            next[idx] = {
                              ...next[idx],
                              role: e.target.value as UserRole,
                            };
                            setUserAssignments(next);
                          }}
                          className={`w-32 rounded-md border px-2 py-1 text-xs ${
                            lightMode
                              ? "bg-white border-gray-300 text-gray-800"
                              : "bg-[#101623] border-[#2a2f42] text-gray-100"
                          }`}
                        >
                          <option value="Admin">Admin</option>
                          <option value="No role">No role</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
