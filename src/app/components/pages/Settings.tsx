import { useOutletContext } from "react-router";
import { useState } from "react";
import { Database, UploadCloud, CloudSun, CloudRain, Activity } from "lucide-react";

export function Settings() {
  const { lightMode } = useOutletContext<{ lightMode: boolean }>();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [observationFileName, setObservationFileName] = useState<string | null>(null);
  const [modelFileName, setModelFileName] = useState<string | null>(null);
  const [spatialChecksReady, setSpatialChecksReady] = useState(false);

  const card = lightMode
    ? "bg-white border border-gray-200 rounded-lg"
    : "bg-[#1e2538] border border-[#2a2f42] rounded-lg";

  const subText = lightMode ? "text-gray-500" : "text-gray-400";
  const headingText = lightMode ? "text-gray-800" : "text-white";
  const inputClass = lightMode
    ? "bg-gray-50 border border-gray-300 text-gray-800 focus:border-blue-400 rounded-lg px-3 py-2 text-sm w-full outline-none"
    : "bg-[#141824] border border-[#2a2f42] text-gray-200 focus:border-cyan-500 rounded-lg px-3 py-2 text-sm w-full outline-none";
  function showToast(message: string) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2600);
  }

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className={`text-2xl ${headingText}`} style={{ fontWeight: 700 }}>
          Admin & Staff Controls
        </h1>
        <p className={`text-sm mt-1 ${subText}`}>
          Data management, model configuration, and system monitoring.
        </p>
      </div>

      <div className="space-y-4">
              {/* Admin & Staff Controls header */}
              <div className={`${card} p-5`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className={`text-sm ${headingText}`} style={{ fontWeight: 600 }}>
                      Admin & Staff Controls
                    </h2>
                    <p className={`text-xs mt-1 ${subText}`}>
                      Data ingestion for bird observations and system models.
                    </p>
                  </div>
                  <Database size={18} className={lightMode ? "text-blue-600" : "text-cyan-400"} />
                </div>

                {/* Data Ingestion */}
                <div className="mt-4">
                  <h3 className={`text-xs uppercase tracking-wide ${subText}`} style={{ fontWeight: 600 }}>
                    Data Ingestion
                  </h3>
                  <p className={`text-xs mt-1 ${subText}`}>
                    Upload bird observation CSV / Excel files from your local computer.
                  </p>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label className={`block text-xs mb-1 ${subText}`}>
                        Select CSV / Excel File
                      </label>
                      <div
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                          lightMode ? "bg-gray-50 border border-gray-300" : "bg-[#141824] border border-[#2a2f42]"
                        }`}
                      >
                        <label
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer text-xs ${
                            lightMode
                              ? "bg-white border border-gray-300 hover:bg-gray-50"
                              : "bg-[#1e2538] border border-[#2a2f42] hover:bg-white/5"
                          }`}
                        >
                          <UploadCloud size={14} />
                          <span>Choose File</span>
                          <input
                            type="file"
                            accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setObservationFileName(file ? file.name : null);
                            }}
                          />
                        </label>
                        <span className={`text-xs truncate ${subText}`}>
                          {observationFileName ?? "No file chosen"}
                        </span>
                      </div>
                      <p className={`text-[11px] mt-1 ${subText}`}>
                        Accepted formats: CSV, XLSX. Max size: 50MB.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        showToast(
                          observationFileName
                            ? `Uploaded & validated "${observationFileName}".`
                            : "Please choose a file to upload first."
                        );
                        if (observationFileName) {
                          setSpatialChecksReady(true);
                        }
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium ${
                        lightMode
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-blue-600 text-white hover:bg-blue-500"
                      }`}
                    >
                      <UploadCloud size={14} />
                      Upload &amp; Validate
                    </button>
                  </div>
                </div>
              </div>

              {/* Satellite & Weather data */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className={`${card} p-5`}>
                  <h3 className={`text-xs uppercase tracking-wide ${subText}`} style={{ fontWeight: 600 }}>
                    Satellite Data Fetch
                  </h3>
                  <p className={`text-xs mt-1 ${subText}`}>
                    Trigger fetches for the latest satellite-based environmental layers.
                  </p>

                  <div className="mt-4 space-y-4">
                    {/* VIIRS */}
                    <div
                      className={`rounded-lg p-3 ${
                        lightMode ? "bg-gray-50 border border-gray-200" : "bg-[#141824] border border-[#2a2f42]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CloudSun size={16} className={lightMode ? "text-blue-600" : "text-cyan-400"} />
                          <span className={`text-xs ${headingText}`} style={{ fontWeight: 600 }}>
                            NASA VIIRS (Light Pollution)
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          showToast("Fetching latest VIIRS light pollution data.")
                        }
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${
                          lightMode
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-blue-600 text-white hover:bg-blue-500"
                        }`}
                      >
                        Fetch Latest VIIRS Data
                      </button>
                      <p className={`text-[11px] mt-2 ${subText}`}>Status: Up to date.</p>
                    </div>

                    {/* MODIS */}
                    <div
                      className={`rounded-lg p-3 ${
                        lightMode ? "bg-gray-50 border border-gray-200" : "bg-[#141824] border border-[#2a2f42]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CloudSun size={16} className={lightMode ? "text-green-600" : "text-emerald-400"} />
                          <span className={`text-xs ${headingText}`} style={{ fontWeight: 600 }}>
                            MODIS NDVI (Vegetation)
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          showToast("Fetching latest MODIS NDVI vegetation data.")
                        }
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium ${
                          lightMode
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-blue-600 text-white hover:bg-blue-500"
                        }`}
                      >
                        Fetch Latest MODIS Data
                      </button>
                      <p className={`text-[11px] mt-2 ${subText}`}>Status: Update available.</p>
                    </div>
                  </div>
                </div>

                {/* Weather / NOAA */}
                <div className={`${card} p-5`}>
                  <h3 className={`text-xs uppercase tracking-wide ${subText}`} style={{ fontWeight: 600 }}>
                    Weather Data (NOAA)
                  </h3>
                  <p className={`text-xs mt-1 ${subText}`}>
                    Temperature and precipitation feeds for model inputs.
                  </p>

                  <div className="mt-4 space-y-3">
                    <button
                      onClick={() =>
                        showToast("Fetching latest NOAA climate data.")
                      }
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium ${
                        lightMode
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-blue-600 text-white hover:bg-blue-500"
                      }`}
                    >
                      <CloudRain size={14} />
                      Fetch NOAA Climate Data
                    </button>
                    <div
                      className={`mt-2 rounded-lg p-3 text-[11px] ${subText} ${
                        lightMode ? "bg-gray-50" : "bg-[#141824]"
                      }`}
                    >
                      <p>Auto-fetch schedule:</p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5">
                        <li>VIIRS: Weekly (Mondays)</li>
                        <li>MODIS: Bi-weekly (1st &amp; 15th)</li>
                        <li>NOAA: Daily at 06:00 UTC</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Model Versioning & Management */}
              <div className={`${card} p-5`}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Upload Model */}
                  <div>
                    <h3 className={`text-xs uppercase tracking-wide ${subText}`} style={{ fontWeight: 600 }}>
                      Upload New Model
                    </h3>
                    <p className={`text-xs mt-1 ${subText}`}>
                      Upload a new model file and track active versions.
                    </p>

                    <div className="mt-3 space-y-3">
                      <div>
                        <label className={`block text-xs mb-1 ${subText}`}>Model File</label>
                        <div
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                            lightMode
                              ? "bg-gray-50 border border-gray-300"
                              : "bg-[#141824] border border-[#2a2f42]"
                          }`}
                        >
                          <label
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer text-xs ${
                              lightMode
                                ? "bg-white border border-gray-300 hover:bg-gray-50"
                                : "bg-[#1e2538] border border-[#2a2f42] hover:bg-white/5"
                            }`}
                          >
                            <UploadCloud size={14} />
                            <span>Choose File</span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                setModelFileName(file ? file.name : null);
                              }}
                            />
                          </label>
                          <span className={`text-xs truncate ${subText}`}>
                            {modelFileName ?? "No file chosen"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className={`block text-xs mb-1 ${subText}`}>Version Name</label>
                        <input
                          className={inputClass}
                          defaultValue="v2.1.0"
                          placeholder="e.g. v2.1.0"
                        />
                      </div>
                      <div>
                        <label className={`block text-xs mb-1 ${subText}`}>Description</label>
                        <textarea
                          className={`${inputClass} resize-none`}
                          rows={3}
                          placeholder="Describe model changes..."
                        />
                      </div>

                      <button
                        onClick={() =>
                          showToast(
                            modelFileName
                              ? `Model "${modelFileName}" queued for upload.`
                              : "Please choose a model file to upload first."
                          )
                        }
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium ${
                          lightMode
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-blue-600 text-white hover:bg-blue-500"
                        }`}
                      >
                        <UploadCloud size={14} />
                        Upload Model
                      </button>
                    </div>
                  </div>

                  {/* Active Model Versions (static) */}
                  <div>
                    <h3 className={`text-xs uppercase tracking-wide ${subText}`} style={{ fontWeight: 600 }}>
                      Active Model Versions
                    </h3>
                    <div className="mt-3 overflow-hidden rounded-lg border border-dashed border-gray-600/40">
                      <div className="grid grid-cols-4 text-[11px] px-3 py-2 bg-black/10">
                        <span className={subText}>Version</span>
                        <span className={subText}>Date</span>
                        <span className={subText}>Status</span>
                        <span className={subText}>Action</span>
                      </div>
                      {[
                        { v: "v2.1.0", date: "2025-01-10", status: "Active" },
                        { v: "v2.0.3", date: "2025-12-15", status: "Backup" },
                        { v: "v2.0.2", date: "2025-11-05", status: "Archived" },
                      ].map((row) => (
                        <div
                          key={row.v}
                          className="grid grid-cols-4 items-center px-3 py-2 text-[11px] border-t border-[#2a2f42]"
                        >
                          <span className={headingText}>{row.v}</span>
                          <span className={subText}>{row.date}</span>
                          <span
                            className={
                              row.status === "Active"
                                ? "text-emerald-400"
                                : row.status === "Backup"
                                ? "text-blue-400"
                                : "text-gray-400"
                            }
                          >
                            {row.status}
                          </span>
                          <button
                            onClick={() =>
                              showToast(`Switching active model to ${row.v}.`)
                            }
                            className={`justify-self-start px-2 py-1 rounded-md border text-[10px] ${
                              lightMode
                                ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                                : "border-[#2a2f42] text-gray-300 hover:bg-white/5"
                            }`}
                          >
                            Switch
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Threshold configuration */}
              <div className={`${card} p-5`}>
                <h2 className={`text-sm mb-4 ${headingText}`} style={{ fontWeight: 600 }}>
                  Threshold Configuration
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Danger zone color scales */}
                  <div>
                    <h3 className={`text-xs uppercase tracking-wide ${subText}`} style={{ fontWeight: 600 }}>
                      Danger Zone Color Scales
                    </h3>
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className={`block text-xs mb-1 ${subText}`}>
                          High Risk Threshold (Light Intensity)
                        </label>
                        <input defaultValue="60" className={inputClass} />
                      </div>
                      <div>
                        <label className={`block text-xs mb-1 ${subText}`}>
                          Moderate Risk Threshold
                        </label>
                        <input defaultValue="40" className={inputClass} />
                      </div>
                      <div>
                        <label className={`block text-xs mb-1 ${subText}`}>
                          Low Risk Threshold
                        </label>
                        <input defaultValue="25" className={inputClass} />
                      </div>
                    </div>
                  </div>

                  {/* SHAP alert thresholds */}
                  <div>
                    <h3 className={`text-xs uppercase tracking-wide ${subText}`} style={{ fontWeight: 600 }}>
                      SHAP Alert Thresholds
                    </h3>
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className={`block text-xs mb-1 ${subText}`}>
                          Critical Negative Impact
                        </label>
                        <input defaultValue="-5" className={inputClass} />
                        <p className={`text-[11px] mt-1 ${subText}`}>
                          Cells turn red when SHAP value falls below this threshold.
                        </p>
                      </div>
                      <div>
                        <label className={`block text-xs mb-1 ${subText}`}>
                          Warning Threshold
                        </label>
                        <input defaultValue="-3" className={inputClass} />
                      </div>
                      <div>
                        <label className={`block text-xs mb-1 ${subText}`}>
                          Positive Impact Threshold
                        </label>
                        <input defaultValue="2" className={inputClass} />
                        <p className={`text-[11px] mt-1 ${subText}`}>
                          Cells turn green when SHAP values are above this threshold.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => showToast("Threshold configuration saved.")}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium ${
                      lightMode
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-600 text-white hover:bg-blue-500"
                    }`}
                  >
                    Save Configuration
                  </button>
                </div>
              </div>

              {/* Validation & Error Logs */}
              <div className={`${card} p-5`}>
                <h2 className={`text-sm mb-4 ${headingText}`} style={{ fontWeight: 600 }}>
                  Validation &amp; Error Logs
                </h2>
                <p className={`text-xs mb-3 ${subText}`}>Recent data quality issues.</p>

                <div className="overflow-x-auto text-xs">
                  <table className="min-w-full border-separate border-spacing-y-1">
                    <thead>
                      <tr className={lightMode ? "text-gray-500" : "text-gray-400"}>
                        <th className="text-left px-3 py-2 font-medium">Timestamp</th>
                        <th className="text-left px-3 py-2 font-medium">Type</th>
                        <th className="text-left px-3 py-2 font-medium">Issue</th>
                        <th className="text-left px-3 py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          ts: "2026-02-05 14:23",
                          type: "Spatial",
                          typeColor: "bg-amber-600/20 text-amber-300",
                          issue: "12 observations outside Philippines bounds (lat > 20°N)",
                          status: "Rejected",
                          statusColor: "bg-red-600/20 text-red-400",
                        },
                        {
                          ts: "2026-02-03 09:15",
                          type: "Format",
                          typeColor: "bg-indigo-500/20 text-indigo-300",
                          issue: "Date format inconsistent in batch upload #3847",
                          status: "Resolved",
                          statusColor: "bg-emerald-600/20 text-emerald-400",
                        },
                        {
                          ts: "2026-02-01 16:42",
                          type: "Duplicate",
                          typeColor: "bg-yellow-500/20 text-yellow-300",
                          issue: "45 duplicate records detected in eBird sync",
                          status: "Cleaned",
                          statusColor: "bg-emerald-600/20 text-emerald-400",
                        },
                      ].map((row) => (
                        <tr
                          key={row.ts}
                          className={lightMode ? "bg-gray-50" : "bg-[#141824]"}
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={subText}>{row.ts}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ${row.typeColor}`}
                            >
                              {row.type}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={headingText}>{row.issue}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[11px] ${row.statusColor}`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Spatial Integrity Checks */}
              <div className={`${card} p-5`}>
                <h2 className={`text-sm mb-4 ${headingText}`} style={{ fontWeight: 600 }}>
                  Spatial Integrity Checks
                </h2>
                {spatialChecksReady ? (
                  <div
                    className="rounded-lg px-4 py-4 text-xs"
                    style={{
                      backgroundColor: "#064e3b",
                      borderColor: "#059669",
                      borderWidth: 1,
                    }}
                  >
                    <p className="text-emerald-300 mb-2" style={{ fontWeight: 600 }}>
                      ✓ All Checks Passed
                    </p>
                    <ul className="space-y-1 text-emerald-100">
                      <li>Latitude range: 14.2° to 14.9° N ✓</li>
                      <li>Longitude range: 120.8° to 121.2° E ✓</li>
                      <li>No offshore observations ✓</li>
                      <li>All cells mapped to valid land cover ✓</li>
                    </ul>
                    {observationFileName && (
                      <p className="mt-3 text-emerald-200/80">
                        Last validated file:&nbsp;
                        <span style={{ fontWeight: 600 }}>{observationFileName}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div
                    className={`rounded-lg px-4 py-4 text-xs ${
                      lightMode ? "bg-gray-50 border border-gray-200" : "bg-[#141824] border border-[#2a2f42]"
                    }`}
                  >
                    <p className={headingText} style={{ fontWeight: 600 }}>
                      No spatial integrity checks run yet.
                    </p>
                    <p className={`mt-1 ${subText}`}>
                      Upload and validate a bird observation CSV/Excel file in the Data Ingestion section
                      to run spatial integrity checks.
                    </p>
                  </div>
                )}
              </div>

              {/* Security & System Health */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Security & Access Logs */}
                <div className={`${card} p-5`}>
                  <h2 className={`text-sm mb-2 ${headingText}`} style={{ fontWeight: 600 }}>
                    Security &amp; Access Logs
                  </h2>
                  <p className={`text-xs mb-3 ${subText}`}>Recent account and model activity.</p>

                  <div className="overflow-x-auto text-xs">
                    <table className="min-w-full border-separate border-spacing-y-1">
                      <thead>
                        <tr className={lightMode ? "text-gray-500" : "text-gray-400"}>
                          <th className="text-left px-3 py-2 font-medium">User</th>
                          <th className="text-left px-3 py-2 font-medium">Action</th>
                          <th className="text-left px-3 py-2 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            user: "giancarloregalado05@gmail.com",
                            action: "Logged in",
                            time: "Just now",
                          },
                          {
                            user: "admin@avilight.ph",
                            action: "Model upload v2.1.0",
                            time: "2 days ago",
                          },
                          {
                            user: "researcher@denr.gov",
                            action: "Downloaded report",
                            time: "3 days ago",
                          },
                        ].map((row) => (
                          <tr
                            key={row.user + row.time}
                            className={lightMode ? "bg-gray-50" : "bg-[#141824]"}
                          >
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={headingText}>{row.user}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={subText}>{row.action}</span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={subText}>{row.time}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* System Health */}
                <div className={`${card} p-5`}>
                  <h2 className={`text-sm mb-2 ${headingText}`} style={{ fontWeight: 600 }}>
                    System Health
                  </h2>
                  <p className={`text-xs mb-3 ${subText}`}>Monitoring status across core services.</p>

                  <div className="space-y-3 text-xs">
                    {[
                      {
                        label: "API Response Time",
                        value: "125ms",
                        tone: "info",
                      },
                      {
                        label: "Database Status",
                        value: "Healthy",
                        tone: "success",
                      },
                      {
                        label: "Model Serving",
                        value: "Online",
                        tone: "success",
                      },
                      {
                        label: "Satellite Data Sync",
                        value: "Active",
                        tone: "success",
                      },
                      {
                        label: "Disk Usage",
                        value: "68%",
                        tone: "warning",
                      },
                    ].map((item) => {
                      const basePill =
                        "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px]";

                      const pillClass =
                        item.tone === "success"
                          ? lightMode
                            ? `${basePill} bg-emerald-50 text-emerald-700`
                            : `${basePill} bg-emerald-600/20 text-emerald-300`
                          : item.tone === "warning"
                          ? lightMode
                            ? `${basePill} bg-amber-50 text-amber-700`
                            : `${basePill} bg-amber-500/20 text-amber-300`
                          : lightMode
                          ? `${basePill} bg-blue-50 text-blue-700`
                          : `${basePill} bg-blue-500/20 text-blue-300`;

                      return (
                        <div
                          key={item.label}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                            lightMode ? "bg-gray-50" : "bg-[#141824]"
                          }`}
                        >
                          <span className={subText}>{item.label}</span>
                          <span className={pillClass}>{item.value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
      </div>
      {toastMessage && (
        <div
          className={`fixed bottom-4 right-4 z-40 rounded-md shadow-lg px-4 py-3 text-xs flex items-center gap-2 ${
            lightMode ? "bg-gray-900 text-white" : "bg-black text-gray-100"
          }`}
        >
          <Activity size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
