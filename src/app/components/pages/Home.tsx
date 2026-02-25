import { useOutletContext, Link } from "react-router";
import { Info, ExternalLink, ChevronRight, AlertCircle, Circle } from "lucide-react";

const kbaData = [
  {
    name: "La Mesa Watershed",
    type: "KBA",
    species: 85,
    lightExposure: 28.5,
    status: "Protected",
    typeColor: "bg-teal-500",
  },
  {
    name: "Ninoy Aquino Parks & Wildlife Center",
    type: "PA",
    species: 48,
    lightExposure: 45.2,
    status: "Protected",
    typeColor: "bg-blue-500",
  },
  {
    name: "Las Piñas-Parañaque Critical Habitat",
    type: "KBA",
    species: 92,
    lightExposure: 38.7,
    status: "Protected",
    typeColor: "bg-teal-500",
  },
  {
    name: "Marikina Watershed",
    type: "PA",
    species: 72,
    lightExposure: 32.1,
    status: "Protected",
    typeColor: "bg-blue-500",
  },
  {
    name: "Laguna de Bay Wetlands",
    type: "KBA",
    species: 125,
    lightExposure: 35.4,
    status: "Partially Protected",
    typeColor: "bg-teal-500",
  },
];

function getLightColor(val: number) {
  if (val < 30) return "bg-green-500/20 text-green-400 border border-green-500/30";
  if (val < 40) return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
  return "bg-orange-500/20 text-orange-400 border border-orange-500/30";
}

function getStatusColor(status: string, lightMode: boolean) {
  if (status === "Protected") return lightMode ? "text-green-600" : "text-green-400";
  if (status === "Partially Protected") return lightMode ? "text-yellow-600" : "text-yellow-400";
  return lightMode ? "text-red-600" : "text-red-400";
}

export function Home() {
  const { lightMode } = useOutletContext<{ lightMode: boolean }>();

  const card = lightMode
    ? "bg-white border border-gray-200 rounded-lg"
    : "bg-[#1e2538] border border-[#2a2f42] rounded-lg";

  const subText = lightMode ? "text-gray-500" : "text-gray-400";
  const headingText = lightMode ? "text-gray-800" : "text-white";
  const tableRow = lightMode
    ? "border-b border-gray-100 hover:bg-gray-50"
    : "border-b border-[#2a2f42] hover:bg-white/5";
  const tableHeader = lightMode
    ? "text-gray-500 border-b border-gray-200"
    : "text-gray-500 border-b border-[#2a2f42]";

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      {/* Page Title */}
      <div className="mb-4">
        <h1 className={`text-2xl ${headingText}`} style={{ fontWeight: 700 }}>
          Home — Executive Summary
        </h1>
        <p className={`text-sm mt-1 ${subText}`}>
          Overview of AVILIGHT monitoring status for Metro Manila. Latest data came from datasets last updated in 2024.
        </p>
      </div>

      {/* Dataset Info Banner */}
      <div className="mb-6 flex items-start gap-3 bg-[#1a3a4a] border border-cyan-700/40 rounded-lg px-4 py-3">
        <div className="mt-0.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-cyan-400 mr-1"></span>
        </div>
        <p className="text-sm text-cyan-300">
          <span style={{ fontWeight: 600 }}>Dataset Period: 2014 – 2024 | Monitoring Status: 2014 – 2024</span>
          <span className="text-cyan-400/70"> — All metrics, readings, and site analyses displayed are derived from historical datasets that was last updated in 2024.</span>
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {/* Total Species */}
        <div className={`${card} p-4`}>
          <p className={`text-xs uppercase tracking-wider mb-2 ${subText}`}>
            Total Species Tracked
          </p>
          <p className={`text-4xl mb-1 ${headingText}`} style={{ fontWeight: 700 }}>
            757
          </p>
          <p className={`text-xs ${subText}`}>Unique bird species in the current database</p>
        </div>

        {/* Light Risk Level */}
        <div className={`${card} p-4`}>
          <p className={`text-xs uppercase tracking-wider mb-2 ${subText}`}>
            Current Light Risk Level
          </p>
          <div className="flex items-center gap-2 mb-1">
            <Circle size={18} className="fill-yellow-400 text-yellow-400" />
            <span className={`text-3xl ${headingText}`} style={{ fontWeight: 700 }}>
              Medium
            </span>
          </div>
          <p className={`text-xs ${subText}`}>
            Metro Manila avg. VIIRS radiance:{" "}
            <span className={lightMode ? "text-gray-700" : "text-gray-300"} style={{ fontWeight: 600 }}>
              36 nW/cm²/sr
            </span>
          </p>
        </div>

        {/* KBAs Monitored */}
        <div className={`${card} p-4`}>
          <p className={`text-xs uppercase tracking-wider mb-2 ${subText}`}>
            KBAs Monitored
          </p>
          <p className={`text-4xl mb-1 ${headingText}`} style={{ fontWeight: 700 }}>
            3
          </p>
          <p className={`text-xs ${subText}`}>Key Biodiversity Areas currently covered</p>
        </div>

        {/* Protected Areas */}
        <div className={`${card} p-4`}>
          <p className={`text-xs uppercase tracking-wider mb-2 ${subText}`}>
            Protected Areas Monitored
          </p>
          <p className={`text-4xl mb-1 ${headingText}`} style={{ fontWeight: 700 }}>
            2
          </p>
          <p className={`text-xs ${subText}`}>Protected Areas currently covered</p>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* KBA/PA Monitoring Table */}
        <div className={`${card} p-0 overflow-hidden lg:col-span-2`}>
          <div className="px-4 py-3 border-b border-[#2a2f42]">
            <h2 className={`text-sm ${headingText}`} style={{ fontWeight: 600 }}>
              KBA / PA Monitoring Status{" "}
              <span className={`text-xs ${subText}`} style={{ fontWeight: 400 }}>
                (2014 – 2024)
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={tableHeader}>
                  <th className="text-left px-4 py-2.5 text-xs" style={{ fontWeight: 500 }}>
                    Site Name
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs" style={{ fontWeight: 500 }}>
                    Type
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs" style={{ fontWeight: 500 }}>
                    Species
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs" style={{ fontWeight: 500 }}>
                    Light Exposure
                  </th>
                  <th className="text-left px-3 py-2.5 text-xs" style={{ fontWeight: 500 }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {kbaData.map((row, i) => (
                  <tr key={i} className={tableRow}>
                    <td className={`px-4 py-3 text-sm ${headingText}`}>{row.name}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs text-white ${row.typeColor}`}
                        style={{ fontWeight: 600 }}
                      >
                        {row.type}
                      </span>
                    </td>
                    <td className={`px-3 py-3 text-sm ${lightMode ? "text-gray-700" : "text-gray-300"}`}>
                      {row.species}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${getLightColor(row.lightExposure)}`}
                        style={{ fontWeight: 500 }}
                      >
                        {row.lightExposure} nW
                      </span>
                    </td>
                    <td className={`px-3 py-3 text-sm ${getStatusColor(row.status, lightMode)}`}>
                      {row.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DENR-BMB Announcements */}
        <div className={`${card} p-0 overflow-hidden`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2f42]">
            <h2 className={`text-sm ${headingText}`} style={{ fontWeight: 600 }}>
              DENR-BMB Announcements
            </h2>
            <button
              className={`text-xs flex items-center gap-1 ${
                lightMode ? "text-blue-600 hover:text-blue-800" : "text-cyan-400 hover:text-cyan-300"
              }`}
            >
              View All <ChevronRight size={12} />
            </button>
          </div>
          <div className="p-4">
            {/* Info Banner */}
            <div
              className={`rounded-lg p-4 border ${
                lightMode
                  ? "bg-blue-50 border-blue-200"
                  : "bg-[#1a2a3a] border-blue-700/30"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-xs ${
                    lightMode
                      ? "bg-blue-100 text-blue-700"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                  style={{ fontWeight: 600 }}
                >
                  Info
                </span>
              </div>
              <p
                className={`text-sm mb-1 ${headingText}`}
                style={{ fontWeight: 600 }}
              >
                DENR-BMB FAPS – Recent Announcements
              </p>
              <p className={`text-xs ${subText}`}>
                Live announcements could not be loaded at this time. Visit the DENR-BMB FAPS portal for the latest updates.
              </p>
              <a
                href="#"
                className={`inline-flex items-center gap-1 mt-3 text-xs ${
                  lightMode ? "text-blue-600 hover:text-blue-800" : "text-cyan-400 hover:text-cyan-300"
                }`}
              >
                Visit Portal <ExternalLink size={11} />
              </a>
            </div>

            {/* Placeholder announcements */}
            <div className="mt-4 space-y-3">
              {[
                {
                  title: "Wildlife Week 2024 Celebration",
                  date: "Dec 10, 2024",
                  tag: "Event",
                },
                {
                  title: "Updated Protected Area Guidelines",
                  date: "Nov 28, 2024",
                  tag: "Policy",
                },
                {
                  title: "Bird Survey Results: Metro Manila",
                  date: "Nov 15, 2024",
                  tag: "Report",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    lightMode
                      ? "hover:bg-gray-50 border border-gray-100"
                      : "hover:bg-white/5 border border-[#2a2f42]"
                  }`}
                >
                  <AlertCircle
                    size={14}
                    className={`mt-0.5 shrink-0 ${subText}`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`text-xs ${headingText} truncate`}
                      style={{ fontWeight: 500 }}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-xs px-1.5 py-0 rounded ${
                          lightMode
                            ? "bg-gray-100 text-gray-500"
                            : "bg-white/10 text-gray-500"
                        }`}
                      >
                        {item.tag}
                      </span>
                      <span className={`text-xs ${subText}`}>{item.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
