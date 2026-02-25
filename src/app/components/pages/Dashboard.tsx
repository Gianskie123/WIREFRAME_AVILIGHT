import { useOutletContext } from "react-router";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  Eye,
} from "lucide-react";

// ── Coordinate helpers ────────────────────────────────────────────────────────
function geo(lon: number, lat: number): [number, number] {
  return [(lon - 116.8) * 46, (21.8 - lat) * 42];
}
function pts(...coords: [number, number][]): string {
  return coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

// ── Island polygons ───────────────────────────────────────────────────────────
const ISLANDS: Record<string, string> = {
  luzon: pts(
    geo(120.8, 18.6), geo(121.1, 18.6), geo(122.2, 18.5), geo(122.5, 17.0),
    geo(121.8, 15.3), geo(121.9, 14.7), geo(121.9, 14.0), geo(122.3, 13.5),
    geo(122.0, 13.8), geo(122.9, 14.1), geo(123.3, 13.7), geo(123.8, 13.2),
    geo(124.0, 12.9), geo(124.1, 12.6), geo(123.7, 12.9), geo(123.1, 13.5),
    geo(122.5, 13.7), geo(122.1, 13.9), geo(120.6, 14.0), geo(120.8, 14.3),
    geo(120.9, 14.5), geo(121.0, 14.6), geo(120.9, 14.7), geo(120.6, 15.0),
    geo(120.3, 14.8), geo(119.9, 15.3), geo(120.3, 16.0), geo(120.3, 16.6),
    geo(120.4, 17.6), geo(120.6, 18.2),
  ),
  catanduanes: pts(geo(124.2, 13.9), geo(124.5, 13.8), geo(124.6, 13.4), geo(124.3, 13.3), geo(124.0, 13.5)),
  mindoro: pts(geo(121.1, 13.5), geo(121.5, 13.3), geo(121.4, 12.8), geo(121.2, 12.2), geo(120.7, 12.2), geo(120.4, 12.6), geo(120.6, 13.3)),
  burias: pts(geo(122.9, 12.9), geo(123.1, 12.8), geo(123.2, 12.5), geo(122.9, 12.4), geo(122.7, 12.6)),
  palawan: pts(geo(119.8, 11.5), geo(119.5, 11.1), geo(119.2, 10.6), geo(118.9, 10.0), geo(118.5, 9.3), geo(118.0, 8.8), geo(117.5, 8.5), geo(117.2, 8.4), geo(117.4, 8.3), geo(117.9, 8.5), geo(118.3, 8.9), geo(118.7, 9.5), geo(119.1, 10.1), geo(119.4, 10.8), geo(119.7, 11.3), geo(119.9, 11.6)),
  panay: pts(geo(121.8, 11.7), geo(122.2, 11.8), geo(122.7, 11.7), geo(123.1, 11.0), geo(122.6, 10.5), geo(122.0, 10.5), geo(121.9, 10.7), geo(121.8, 11.1)),
  negros: pts(geo(122.7, 11.0), geo(123.2, 11.0), geo(123.3, 10.5), geo(123.2, 9.3), geo(122.8, 9.0), geo(122.4, 9.5), geo(122.3, 10.0), geo(122.5, 10.5)),
  cebu: pts(geo(124.0, 11.3), geo(124.2, 11.0), geo(124.1, 10.5), geo(123.9, 10.1), geo(123.5, 9.9), geo(123.5, 10.4), geo(123.7, 10.9), geo(123.8, 11.1)),
  samar: pts(geo(124.1, 12.3), geo(124.6, 12.5), geo(125.2, 12.3), geo(125.5, 11.8), geo(125.4, 11.1), geo(125.0, 10.9), geo(124.7, 11.2), geo(124.3, 11.7)),
  leyte: pts(geo(124.5, 11.7), geo(124.8, 11.5), geo(125.0, 11.2), geo(124.8, 10.5), geo(124.7, 10.0), geo(124.3, 10.2), geo(124.4, 10.8), geo(124.3, 11.3)),
  bohol: pts(geo(124.0, 9.8), geo(124.4, 9.8), geo(124.4, 9.4), geo(124.0, 9.5), geo(123.8, 9.3), geo(123.7, 9.5)),
  mindanao: pts(geo(123.3, 8.7), geo(123.8, 8.2), geo(124.7, 8.5), geo(125.5, 9.8), geo(126.1, 8.5), geo(126.2, 8.0), geo(126.2, 7.0), geo(125.6, 6.5), geo(125.2, 6.1), geo(124.0, 6.0), geo(124.2, 6.5), geo(123.4, 7.2), geo(122.1, 6.9), geo(123.0, 8.0)),
  sulu: pts(geo(121.0, 5.9), geo(121.4, 5.9), geo(121.4, 5.7), geo(121.0, 5.6)),
};

// ── Types ─────────────────────────────────────────────────────────────────────
type RiskLevel = "Low" | "Medium" | "High";

interface RiskZone {
  name: string;
  lat: number;
  lon: number;
  risk: RiskLevel;
  detail: string;
}

interface SpeciesCounts {
  resident: number;
  migratory: number;
  lightTolerant: number;
  lightSensitive: number;
}

interface ObservationSite {
  name: string;
  lat: number;
  lon: number;
  // Counts indexed by year then month (0 = all months combined)
  speciesByYear: Record<number, Record<number, SpeciesCounts>>;
}

// ── Risk Zone Data ────────────────────────────────────────────────────────────
const RISK_ZONES: RiskZone[] = [
  { name: "La Mesa Watershed",   lat: 14.72, lon: 121.12, risk: "Low",    detail: "28.5 nW/cm²/sr" },
  { name: "UP Diliman",          lat: 14.65, lon: 121.07, risk: "Low",    detail: "27.3 nW/cm²/sr" },
  { name: "Marikina Watershed",  lat: 14.63, lon: 121.10, risk: "Medium", detail: "32.1 nW/cm²/sr" },
  { name: "Laguna de Bay",       lat: 14.35, lon: 121.20, risk: "Medium", detail: "35.4 nW/cm²/sr" },
  { name: "NAPWC",               lat: 14.52, lon: 121.00, risk: "High",   detail: "45.2 nW/cm²/sr" },
  { name: "Las Piñas-Parañaque", lat: 14.43, lon: 120.99, risk: "Medium", detail: "38.7 nW/cm²/sr" },
  { name: "Baguio Watershed",    lat: 16.40, lon: 120.60, risk: "Low",    detail: "19.8 nW/cm²/sr" },
  { name: "Tuguegarao",          lat: 17.60, lon: 121.70, risk: "Low",    detail: "21.3 nW/cm²/sr" },
  { name: "Legazpi KBA",         lat: 13.10, lon: 123.70, risk: "Medium", detail: "34.2 nW/cm²/sr" },
  { name: "Iloilo City",         lat: 10.70, lon: 122.60, risk: "Low",    detail: "24.1 nW/cm²/sr" },
  { name: "Cebu City",           lat: 10.30, lon: 123.90, risk: "Medium", detail: "41.7 nW/cm²/sr" },
  { name: "Tacloban KBA",        lat: 11.20, lon: 125.00, risk: "High",   detail: "48.3 nW/cm²/sr" },
  { name: "Puerto Princesa",     lat:  9.70, lon: 118.70, risk: "Low",    detail: "16.4 nW/cm²/sr" },
  { name: "Cagayan de Oro",      lat:  8.50, lon: 124.70, risk: "Medium", detail: "37.9 nW/cm²/sr" },
  { name: "Davao City",          lat:  7.10, lon: 125.60, risk: "High",   detail: "51.2 nW/cm²/sr" },
  { name: "Zamboanga KBA",       lat:  6.90, lon: 122.10, risk: "Medium", detail: "33.6 nW/cm²/sr" },
  { name: "General Santos",      lat:  6.10, lon: 125.20, risk: "Low",    detail: "22.8 nW/cm²/sr" },
  { name: "Mt. Apo",             lat:  6.90, lon: 125.30, risk: "Low",    detail: "18.2 nW/cm²/sr" },
];

// ── Historical Observation Sites ──────────────────────────────────────────────
// Species counts vary slightly by year/month for prototype realism
function makeCounts(r: number, m: number, lt: number, ls: number, yearOffset = 0, monthFactor = 1): SpeciesCounts {
  return {
    resident: Math.round(r + yearOffset * 0.5),
    migratory: Math.round(m * monthFactor + yearOffset * 0.3),
    lightTolerant: Math.round(lt + yearOffset * 0.2),
    lightSensitive: Math.round(ls + yearOffset * 0.4),
  };
}

// Build yearly data for a site with base counts
function buildSiteData(base: { r: number; m: number; lt: number; ls: number }): Record<number, Record<number, SpeciesCounts>> {
  const years = [2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024];
  // Seasonal migratory boost months: Oct=10, Nov=11, Dec=12, Jan=1, Feb=2, Mar=3
  const migratoryBoost: Record<number, number> = { 1: 1.8, 2: 1.9, 3: 1.6, 10: 1.4, 11: 1.7, 12: 1.9 };
  const data: Record<number, Record<number, SpeciesCounts>> = {};
  years.forEach((yr, yi) => {
    data[yr] = {};
    // Month 0 = "All" (annual average)
    data[yr][0] = makeCounts(base.r, base.m, base.lt, base.ls, yi);
    for (let mo = 1; mo <= 12; mo++) {
      const mf = migratoryBoost[mo] ?? 0.6;
      data[yr][mo] = makeCounts(base.r, base.m, base.lt, base.ls, yi, mf);
    }
  });
  return data;
}

const OBS_SITES: ObservationSite[] = [
  { name: "La Mesa Watershed",   lat: 14.72, lon: 121.12, speciesByYear: buildSiteData({ r: 42, m: 28, lt: 18, ls: 24 }) },
  { name: "UP Diliman Campus",   lat: 14.65, lon: 121.07, speciesByYear: buildSiteData({ r: 31, m: 14, lt: 20, ls: 11 }) },
  { name: "Marikina Watershed",  lat: 14.63, lon: 121.10, speciesByYear: buildSiteData({ r: 38, m: 22, lt: 15, ls: 18 }) },
  { name: "Laguna de Bay",       lat: 14.35, lon: 121.20, speciesByYear: buildSiteData({ r: 56, m: 44, lt: 22, ls: 35 }) },
  { name: "NAPWC",               lat: 14.52, lon: 121.00, speciesByYear: buildSiteData({ r: 24, m: 12, lt: 16, ls:  8 }) },
  { name: "Las Piñas-Parañaque", lat: 14.43, lon: 120.99, speciesByYear: buildSiteData({ r: 48, m: 36, lt: 14, ls: 28 }) },
  { name: "Baguio Watershed",    lat: 16.40, lon: 120.60, speciesByYear: buildSiteData({ r: 35, m: 19, lt: 12, ls: 22 }) },
  { name: "Tuguegarao",          lat: 17.60, lon: 121.70, speciesByYear: buildSiteData({ r: 29, m: 16, lt: 14, ls: 13 }) },
  { name: "Legazpi KBA",         lat: 13.10, lon: 123.70, speciesByYear: buildSiteData({ r: 44, m: 30, lt: 18, ls: 26 }) },
  { name: "Iloilo City",         lat: 10.70, lon: 122.60, speciesByYear: buildSiteData({ r: 33, m: 18, lt: 16, ls: 15 }) },
  { name: "Cebu City",           lat: 10.30, lon: 123.90, speciesByYear: buildSiteData({ r: 27, m: 14, lt: 19, ls:  9 }) },
  { name: "Tacloban KBA",        lat: 11.20, lon: 125.00, speciesByYear: buildSiteData({ r: 39, m: 26, lt: 13, ls: 24 }) },
  { name: "Puerto Princesa",     lat:  9.70, lon: 118.70, speciesByYear: buildSiteData({ r: 61, m: 48, lt: 20, ls: 40 }) },
  { name: "Cagayan de Oro",      lat:  8.50, lon: 124.70, speciesByYear: buildSiteData({ r: 37, m: 22, lt: 17, ls: 20 }) },
  { name: "Davao City",          lat:  7.10, lon: 125.60, speciesByYear: buildSiteData({ r: 44, m: 28, lt: 21, ls: 22 }) },
  { name: "Zamboanga KBA",       lat:  6.90, lon: 122.10, speciesByYear: buildSiteData({ r: 40, m: 25, lt: 16, ls: 23 }) },
  { name: "General Santos",      lat:  6.10, lon: 125.20, speciesByYear: buildSiteData({ r: 32, m: 18, lt: 14, ls: 17 }) },
  { name: "Mt. Apo",             lat:  6.90, lon: 125.30, speciesByYear: buildSiteData({ r: 55, m: 38, lt: 10, ls: 44 }) },
];

const RISK_COLOR: Record<RiskLevel, string> = { Low: "#22c55e", Medium: "#eab308", High: "#ef4444" };

// ── Bird richness data per year ───────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_ALL = ["All", ...MONTHS];

function buildYearData(base: number, peak: number, offset = 0) {
  const curve = [0, 3, 11, 24, 33, 38, 36, 30, 24, 18, 10, 3];
  return MONTHS.map((month, i) => ({
    month,
    count: Math.round(base + (curve[i] / 38) * (peak - base) + offset * Math.sin(i * 0.5)),
  }));
}

const BIRD_DATA_BY_YEAR: Record<number, { month: string; count: number }[]> = {
  2014: buildYearData(95,  130,  2),
  2015: buildYearData(98,  136,  3),
  2016: buildYearData(102, 143, -2),
  2017: buildYearData(110, 158,  4),
  2018: buildYearData(105, 150, -3),
  2019: buildYearData(100, 143,  2),
  2020: buildYearData(118, 188,  6),
  2021: buildYearData(120, 168,  3),
  2022: buildYearData(118, 172, -2),
  2023: buildYearData(124, 178,  4),
  2024: buildYearData(128, 185,  3),
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e2538] border border-[#2a2f42] rounded px-3 py-2 text-xs text-white shadow-lg">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="text-blue-400" style={{ fontWeight: 600 }}>{payload[0].value} species</p>
    </div>
  );
}

// ── Map View Types ────────────────────────────────────────────────────────────
type MapView = "risk" | "historical";

// ── Philippine SVG Map ─────────────────────────────────────────────────────────
function PhilippineMap({
  lightMode,
  mapView,
  selectedYear,
  selectedMonth,
}: {
  lightMode: boolean;
  mapView: MapView;
  selectedYear: number;
  selectedMonth: number; // 0 = All, 1-12 = Jan-Dec
}) {
  const [hoveredRiskIdx, setHoveredRiskIdx] = useState<number | null>(null);
  const [hoveredObsIdx, setHoveredObsIdx]   = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const islandFill   = lightMode ? "#b8c2d4" : "#28334a";
  const islandStroke = lightMode ? "#96a3b8" : "#1c2438";
  const bgColor      = lightMode ? "#dde3ef" : "#111827";

  // Compute total species for observation circle sizing
  function totalSpecies(counts: SpeciesCounts) {
    return counts.resident + counts.migratory + counts.lightTolerant + counts.lightSensitive;
  }

  return (
    <div
      className="relative w-full h-full flex flex-col rounded-lg overflow-hidden"
      style={{ background: bgColor }}
    >
      {/* Zoom controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        {[{ Icon: ZoomIn, fn: () => setZoom(z => Math.min(z + 0.2, 2.4)) },
          { Icon: ZoomOut, fn: () => setZoom(z => Math.max(z - 0.2, 0.6)) }].map(({ Icon, fn }, i) => (
          <button
            key={i}
            onClick={fn}
            className="w-7 h-7 flex items-center justify-center rounded bg-[#1e2538]/90 border border-[#2a2f42] text-gray-300 hover:text-white transition-colors"
          >
            <Icon size={13} />
          </button>
        ))}
        <div className="text-center mt-0.5">
          <span className="text-gray-500" style={{ fontSize: "10px" }}>{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-3 right-3 z-10 bg-[#1a2030]/95 border border-[#2a2f42] rounded-lg px-3 py-2.5 backdrop-blur-sm">
        {mapView === "risk" ? (
          <>
            <p className="text-gray-500 uppercase mb-2" style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em" }}>
              Light Risk Zones
            </p>
            {(["Low", "Medium", "High"] as RiskLevel[]).map(r => (
              <div key={r} className="flex items-center gap-2 mb-1.5 last:mb-0">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: RISK_COLOR[r] }} />
                <span className="text-gray-300" style={{ fontSize: "11px" }}>{r} Risk</span>
              </div>
            ))}
          </>
        ) : (
          <>
            <p className="text-gray-500 uppercase mb-2" style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em" }}>
              Species Richness
            </p>
            <div className="flex items-center gap-1 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-900/60 border border-blue-400" style={{ display: "inline-block" }} />
              <span className="text-gray-300" style={{ fontSize: "11px" }}>Low</span>
              <span className="w-3.5 h-3.5 rounded-full bg-blue-500/60 border border-blue-300 ml-1" style={{ display: "inline-block" }} />
              <span className="text-gray-300" style={{ fontSize: "11px" }}>High</span>
            </div>
            <p className="text-gray-500 mt-1" style={{ fontSize: "9px" }}>Hover circle for details</p>
          </>
        )}
      </div>

      {/* SVG Map */}
      <div className="flex-1 overflow-hidden flex items-center justify-center p-2">
        <svg
          viewBox="-10 115 460 575"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <defs>
            {(["Low", "Medium", "High"] as RiskLevel[]).map(r => (
              <radialGradient key={r} id={`mg-${r}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={RISK_COLOR[r]} stopOpacity="0.7" />
                <stop offset="100%" stopColor={RISK_COLOR[r]} stopOpacity="0" />
              </radialGradient>
            ))}
            <radialGradient id="mg-obs" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
            </radialGradient>
            <pattern id="seaGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={lightMode ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.02)"} strokeWidth="0.5" />
            </pattern>
          </defs>

          <rect x="-20" y="100" width="500" height="610" fill="url(#seaGrid)" />

          {Object.entries(ISLANDS).map(([name, ptsStr]) => (
            <polygon
              key={name}
              points={ptsStr}
              fill={islandFill}
              stroke={islandStroke}
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
          ))}

          {/* Metro Manila label */}
          {(() => {
            const mmDots = RISK_ZONES.slice(0, 6).map(z => geo(z.lon, z.lat));
            const xs = mmDots.map(([x]) => x);
            const ys = mmDots.map(([, y]) => y);
            const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
            const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
            return (
              <g>
                <rect x={cx - 30} y={cy - 22} width={62} height={13} rx="2" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
                <text x={cx + 1} y={cy - 12} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="6" fontWeight="600">Metro Manila</text>
              </g>
            );
          })()}

          {/* ── Risk Zone Markers ── */}
          {mapView === "risk" && RISK_ZONES.map((zone, i) => {
            const [x, y] = geo(zone.lon, zone.lat);
            const hov = hoveredRiskIdx === i;
            const color = RISK_COLOR[zone.risk];
            const ttW = 118, ttH = 40;
            const ttX = x > 320 ? x - ttW - 6 : x + 11;
            const ttY = y > 630 ? y - ttH - 4 : y - 6;

            return (
              <g key={i}>
                {hov && <circle cx={x} cy={y} r={20} fill={`url(#mg-${zone.risk})`} />}
                <circle cx={x} cy={y} r={hov ? 8.5 : 6.5} fill="rgba(0,0,0,0.45)" stroke={color} strokeWidth={hov ? 2 : 1.5} style={{ transition: "all 0.15s ease" }} />
                <circle
                  cx={x} cy={y} r={hov ? 5 : 3.8}
                  fill={color}
                  style={{ transition: "all 0.15s ease", cursor: "pointer" }}
                  onMouseEnter={() => setHoveredRiskIdx(i)}
                  onMouseLeave={() => setHoveredRiskIdx(null)}
                />
                {hov && (
                  <g style={{ pointerEvents: "none" }}>
                    <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="4" fill="#141c2e" stroke="#2a3550" strokeWidth="0.8" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))" />
                    <rect x={ttX} y={ttY} width="3" height={ttH} rx="2" fill={color} />
                    <text x={ttX + 9} y={ttY + 14} fill="white" fontSize="7.5" fontWeight="600">
                      {zone.name.length > 17 ? zone.name.slice(0, 17) + "…" : zone.name}
                    </text>
                    <rect x={ttX + 9} y={ttY + 22} width={38} height={11} rx="2" fill={`${color}25`} />
                    <text x={ttX + 28} y={ttY + 30} textAnchor="middle" fill={color} fontSize="6.5" fontWeight="600">{zone.risk} Risk</text>
                    <text x={ttX + 54} y={ttY + 30} fill="#9ca3af" fontSize="6.5">{zone.detail}</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ── Historical Observation Markers ── */}
          {mapView === "historical" && OBS_SITES.map((site, i) => {
            const [x, y] = geo(site.lon, site.lat);
            const hov = hoveredObsIdx === i;
            const counts = site.speciesByYear[selectedYear]?.[selectedMonth] ?? site.speciesByYear[2024][0];
            const total = totalSpecies(counts);

            // Circle radius scales with total species richness (range ~80–230)
            const minTotal = 80, maxTotal = 230;
            const minR = 4, maxR = 11;
            const r = Math.round(minR + ((total - minTotal) / (maxTotal - minTotal)) * (maxR - minR));

            // Color: blue tones, more opaque = more species
            const opacity = 0.4 + ((total - minTotal) / (maxTotal - minTotal)) * 0.5;

            // Tooltip positioning
            const ttW = 148, ttH = 80;
            const ttX = x > 300 ? x - ttW - 8 : x + 12;
            const ttY = y > 620 ? y - ttH - 4 : y - 8;

            return (
              <g key={i}>
                {hov && <circle cx={x} cy={y} r={r + 14} fill="url(#mg-obs)" />}
                {/* Outer ring */}
                <circle
                  cx={x} cy={y}
                  r={hov ? r + 4 : r + 2}
                  fill={`rgba(96,165,250,${opacity * 0.35})`}
                  stroke={hov ? "#93c5fd" : "#60a5fa"}
                  strokeWidth={hov ? 1.8 : 1}
                  style={{ transition: "all 0.15s ease" }}
                />
                {/* Inner dot */}
                <circle
                  cx={x} cy={y}
                  r={hov ? r + 1 : r}
                  fill={`rgba(59,130,246,${opacity})`}
                  style={{ transition: "all 0.15s ease", cursor: "pointer" }}
                  onMouseEnter={() => setHoveredObsIdx(i)}
                  onMouseLeave={() => setHoveredObsIdx(null)}
                />

                {/* Tooltip */}
                {hov && (
                  <g style={{ pointerEvents: "none" }}>
                    <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="4" fill="#0f172a" stroke="#334155" strokeWidth="0.8" filter="drop-shadow(0 3px 6px rgba(0,0,0,0.7))" />
                    {/* Blue left accent */}
                    <rect x={ttX} y={ttY} width="3" height={ttH} rx="2" fill="#3b82f6" />
                    {/* Site name */}
                    <text x={ttX + 9} y={ttY + 13} fill="white" fontSize="7" fontWeight="700">
                      {site.name.length > 20 ? site.name.slice(0, 20) + "…" : site.name}
                    </text>
                    {/* Period badge */}
                    <rect x={ttX + 9} y={ttY + 17} width={60} height={9} rx="2" fill="rgba(59,130,246,0.2)" />
                    <text x={ttX + 39} y={ttY + 24} textAnchor="middle" fill="#93c5fd" fontSize="5.5" fontWeight="600">
                      {selectedYear} · {MONTHS_ALL[selectedMonth]}
                    </text>
                    {/* Divider */}
                    <line x1={ttX + 5} y1={ttY + 30} x2={ttX + ttW - 5} y2={ttY + 30} stroke="#1e293b" strokeWidth="0.8" />
                    {/* Category rows */}
                    {[
                      { label: "Resident",       val: counts.resident,      color: "#34d399" },
                      { label: "Migratory",      val: counts.migratory,     color: "#f59e0b" },
                      { label: "Light Tolerant", val: counts.lightTolerant, color: "#60a5fa" },
                      { label: "Light Sensitive",val: counts.lightSensitive,color: "#f87171" },
                    ].map((row, ri) => (
                      <g key={ri}>
                        <circle cx={ttX + 11} cy={ttY + 38 + ri * 11} r="2.5" fill={row.color} />
                        <text x={ttX + 16} y={ttY + 41 + ri * 11} fill="#cbd5e1" fontSize="6">{row.label}</text>
                        <text x={ttX + ttW - 8} y={ttY + 41 + ri * 11} textAnchor="end" fill={row.color} fontSize="6.5" fontWeight="700">{row.val}</text>
                      </g>
                    ))}
                    {/* Total */}
                    <line x1={ttX + 5} y1={ttY + 72} x2={ttX + ttW - 5} y2={ttY + 72} stroke="#1e293b" strokeWidth="0.8" />
                    <text x={ttX + 9} y={ttY + 78} fill="#94a3b8" fontSize="5.5">Total unique species:</text>
                    <text x={ttX + ttW - 8} y={ttY + 78} textAnchor="end" fill="white" fontSize="6.5" fontWeight="700">{total}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export function Dashboard() {
  const { lightMode } = useOutletContext<{ lightMode: boolean }>();
  const [mapView, setMapView]         = useState<MapView>("risk");
  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = All

  const card        = lightMode ? "bg-white border border-gray-200 rounded-lg" : "bg-[#1e2538] border border-[#2a2f42] rounded-lg";
  const subText     = lightMode ? "text-gray-500" : "text-gray-400";
  const headingText = lightMode ? "text-gray-800" : "text-white";
  const gridColor   = lightMode ? "#e5e7eb" : "#2a2f42";

  const currentData = BIRD_DATA_BY_YEAR[selectedYear];
  const prevData    = BIRD_DATA_BY_YEAR[Math.max(selectedYear - 1, 2014)];
  const maxCount    = Math.max(...currentData.map(d => d.count));
  const prevMax     = Math.max(...prevData.map(d => d.count));
  const pctChange   = (((maxCount - prevMax) / prevMax) * 100).toFixed(1);
  const pctUp       = maxCount >= prevMax;

  const atRiskTotal    = RISK_ZONES.filter(z => z.risk !== "Low").length;
  const lightIntensity = Math.round(72 + (selectedYear - 2014) * 0.8 + (selectedYear === 2020 ? -4 : 0));

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Dataset banner */}
      <div className="flex items-center gap-3 bg-[#1a3a4a] border-b border-cyan-700/40 px-6 py-2.5 shrink-0">
        <span className="inline-block w-2 h-2 rounded-sm bg-cyan-400 shrink-0" />
        <p className="text-sm text-cyan-300">
          <span style={{ fontWeight: 600 }}>Dataset Period: 2014 – 2024 | Monitoring Status: 2014 – 2024</span>
          <span className="text-cyan-400/70"> — Displaying year: </span>
          <span className="text-cyan-200" style={{ fontWeight: 700 }}>{selectedYear}</span>
        </p>
      </div>

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-0 min-h-0 overflow-hidden">

        {/* ── LEFT: Map Panel ── */}
        <div className="lg:col-span-3 p-4 flex flex-col min-h-[500px] lg:min-h-0 gap-3">

          {/* ── View Toggle Controls ── */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View mode buttons */}
            <div className="flex items-center gap-1 rounded-lg p-1 bg-[#0f172a] border border-[#2a2f42]">
              <button
                onClick={() => setMapView("risk")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${
                  mapView === "risk"
                    ? "bg-orange-500/20 text-orange-300 border border-orange-500/40"
                    : "text-gray-400 hover:text-gray-200"
                }`}
                style={{ fontWeight: 600 }}
              >
                <AlertTriangle size={11} />
                Risk Zones
              </button>
              <button
                onClick={() => setMapView("historical")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${
                  mapView === "historical"
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                    : "text-gray-400 hover:text-gray-200"
                }`}
                style={{ fontWeight: 600 }}
              >
                <Eye size={11} />
                Historical Observation
              </button>
            </div>

            {/* Year + Month filter — only for historical view */}
            {mapView === "historical" && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Year dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs ${subText}`} style={{ fontWeight: 600 }}>Year:</span>
                  <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(Number(e.target.value))}
                    className="text-xs bg-[#1e2538] border border-[#2a2f42] text-white rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ fontWeight: 700 }}
                  >
                    {[2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Month dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs ${subText}`} style={{ fontWeight: 600 }}>Month:</span>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(Number(e.target.value))}
                    className="text-xs bg-[#1e2538] border border-[#2a2f42] text-white rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ fontWeight: 700 }}
                  >
                    {MONTHS_ALL.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="flex-1 min-h-0">
            <PhilippineMap
              lightMode={lightMode}
              mapView={mapView}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
            />
          </div>
        </div>

        {/* ── RIGHT: Stats Panel ── */}
        <div className="lg:col-span-2 flex flex-col gap-3 p-4 overflow-y-auto">

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`${card} p-4`}>
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: lightMode ? "#6b7280" : "#9ca3af", fontWeight: 600 }}>
                At Risk Zones
              </p>
              <div className="flex items-end gap-2 mb-1">
                <span className={`text-4xl ${headingText}`} style={{ fontWeight: 700, lineHeight: 1 }}>{atRiskTotal}</span>
                <span className="text-red-400 text-xs flex items-center gap-0.5 mb-0.5" style={{ fontWeight: 600 }}>
                  <TrendingDown size={11} /> -5%
                </span>
              </div>
              <p className={`text-xs ${subText} leading-relaxed`}>
                Sites with <span className="text-yellow-400" style={{ fontWeight: 600 }}>Medium</span> or{" "}
                <span className="text-red-400" style={{ fontWeight: 600 }}>High</span> ALAN (&gt;30 nW).
              </p>
            </div>

            <div className={`${card} p-4`}>
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: lightMode ? "#6b7280" : "#9ca3af", fontWeight: 600 }}>
                Light Intensity
              </p>
              <div className="flex items-end gap-2 mb-1">
                <span className={`text-4xl ${headingText}`} style={{ fontWeight: 700, lineHeight: 1 }}>{lightIntensity}%</span>
                <span className={`text-xs flex items-center gap-0.5 mb-0.5 ${selectedYear === 2020 ? "text-green-400" : "text-orange-400"}`} style={{ fontWeight: 600 }}>
                  {selectedYear === 2020 ? <><TrendingDown size={11} /> -4%</> : <><TrendingUp size={11} /> +8%</>}
                </span>
              </div>
              <p className={`text-xs ${subText} leading-relaxed`}>
                ALAN index for <span className={headingText} style={{ fontWeight: 600 }}>{selectedYear}</span>.
                {selectedYear === 2020 && " ↓ COVID effect."}
              </p>
            </div>
          </div>

          {/* Historical species breakdown summary — only in historical mode */}
          {mapView === "historical" && (
            <div className={`${card} p-4`}>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: lightMode ? "#6b7280" : "#9ca3af", fontWeight: 600 }}>
                {selectedYear} · {MONTHS_ALL[selectedMonth]} — Metro Manila Summary
              </p>
              {(() => {
                // Sum up Metro Manila sites (first 6)
                const mmSites = OBS_SITES.slice(0, 6);
                const totals = mmSites.reduce(
                  (acc, site) => {
                    const c = site.speciesByYear[selectedYear]?.[selectedMonth] ?? site.speciesByYear[2024][0];
                    acc.resident      += c.resident;
                    acc.migratory     += c.migratory;
                    acc.lightTolerant += c.lightTolerant;
                    acc.lightSensitive+= c.lightSensitive;
                    return acc;
                  },
                  { resident: 0, migratory: 0, lightTolerant: 0, lightSensitive: 0 }
                );
                const grand = totals.resident + totals.migratory + totals.lightTolerant + totals.lightSensitive;
                const rows = [
                  { label: "Resident",        val: totals.resident,       color: "bg-emerald-500", text: "text-emerald-400" },
                  { label: "Migratory",       val: totals.migratory,      color: "bg-amber-500",   text: "text-amber-400" },
                  { label: "Light Tolerant",  val: totals.lightTolerant,  color: "bg-blue-500",    text: "text-blue-400" },
                  { label: "Light Sensitive", val: totals.lightSensitive, color: "bg-red-500",     text: "text-red-400" },
                ];
                return (
                  <div className="space-y-2.5">
                    {rows.map((row, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs ${subText}`}>{row.label}</span>
                          <span className={`text-xs ${row.text}`} style={{ fontWeight: 700 }}>{row.val} spp.</span>
                        </div>
                        <div className={`h-1.5 rounded-full ${lightMode ? "bg-gray-200" : "bg-[#2a2f42]"}`}>
                          <div
                            className={`h-1.5 rounded-full ${row.color}`}
                            style={{ width: `${Math.round((row.val / grand) * 100)}%`, transition: "width 0.4s ease" }}
                          />
                        </div>
                      </div>
                    ))}
                    <p className={`text-xs ${subText} pt-1 border-t border-[#2a2f42]`}>
                      Total unique sightings (Metro Manila, 6 sites):
                      <span className={`ml-1 ${headingText}`} style={{ fontWeight: 700 }}>{grand}</span>
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Bird Richness Trend */}
          <div className={`${card} p-4 flex-shrink-0`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs uppercase tracking-widest" style={{ color: lightMode ? "#6b7280" : "#9ca3af", fontWeight: 600 }}>
                Bird Richness Trend
              </p>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs ${subText}`}>2014 – 2024</span>
              </div>
            </div>

            {/* Year selector (right panel) */}
            <div className="flex items-center gap-2 mb-3 mt-2">
              <span className={`text-xs ${subText} shrink-0`}>Year:</span>
              <input
                type="range" min={2014} max={2024}
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="flex-1 accent-blue-500 cursor-pointer"
                style={{ height: "4px" }}
              />
              <span className={`text-xs shrink-0 px-2 py-0.5 rounded ${lightMode ? "bg-blue-100 text-blue-700" : "bg-blue-500/20 text-blue-300"}`} style={{ fontWeight: 700 }}>
                {selectedYear}
              </span>
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs ${subText}`}>
                Peak: <span className={headingText} style={{ fontWeight: 600 }}>{maxCount} species</span>
              </span>
              <span className={`text-xs flex items-center gap-0.5 ${pctUp ? "text-green-400" : "text-red-400"}`} style={{ fontWeight: 600 }}>
                {pctUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {pctUp ? "+" : ""}{pctChange}% vs prev year
              </span>
            </div>

            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={currentData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="birdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} domain={["dataMin - 10", "dataMax + 10"]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#birdGrad)"
                  dot={{ r: 2.5, fill: "#3b82f6", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                  animationDuration={400} />
              </AreaChart>
            </ResponsiveContainer>

            {selectedYear === 2020 && (
              <p className="text-xs text-cyan-400/80 mt-1.5 italic">↑ 2020 spike attributed to COVID-19 lockdowns reducing light emission.</p>
            )}
            {selectedYear === 2017 && (
              <p className="text-xs text-green-400/80 mt-1.5 italic">↑ 2017 was the highest richness year prior to 2020.</p>
            )}
          </div>

          {/* Recent Updates */}
          <div className={`${card} p-4`}>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: lightMode ? "#6b7280" : "#9ca3af", fontWeight: 600 }}>
              Recent Updates
            </p>
            <div className="space-y-2">
              {[
                { icon: <AlertTriangle size={12} className="text-red-400" />,  bg: "bg-red-500/10",   title: "High light intensity detected in Zone A3", time: "2 hours ago" },
                { icon: <CheckCircle  size={12} className="text-green-400" />, bg: "bg-green-500/10", title: "Bird richness increased by 12%",           time: "5 hours ago" },
                { icon: <Info         size={12} className="text-blue-400" />,  bg: "bg-blue-500/10",  title: "Monitoring update scheduled",              time: "1 day ago" },
              ].map((item, i) => (
                <div key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    lightMode ? "border-gray-100 hover:bg-gray-50" : "border-[#2a2f42] hover:bg-white/5"
                  }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${item.bg}`}>{item.icon}</div>
                  <div className="min-w-0">
                    <p className={`text-xs ${headingText} truncate`} style={{ fontWeight: 600 }}>{item.title}</p>
                    <p className={`text-xs ${subText}`}>{item.time}</p>
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
