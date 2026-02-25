import { useOutletContext } from "react-router";
import { useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend, ScatterChart, Scatter, Cell,
  PieChart, Pie, ReferenceLine,
} from "recharts";
import { Download, CheckCircle2, Loader2, AlertCircle, RefreshCw, ChevronDown } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────────────────────────────────────
const CORR_DATA = [
  { label:"Light vs Richness",     pair:"Artificial Light at Night ↔ Bird Richness",    value:-0.72, direction:"Strong Negative" },
  { label:"NDVI vs Richness",      pair:"Vegetation Index (NDVI) ↔ Bird Richness",       value: 0.68, direction:"Strong Positive"  },
  { label:"Temp vs Richness",      pair:"Land Surface Temperature ↔ Bird Richness",      value:-0.31, direction:"Mild Negative"    },
  { label:"Elevation vs Richness", pair:"Elevation (m) ↔ Bird Richness",                 value: 0.25, direction:"Mild Positive"    },
  { label:"Light vs NDVI",         pair:"Artificial Light at Night ↔ Vegetation Index",  value:-0.45, direction:"Moderate Negative"},
  { label:"Temp vs Light",         pair:"Land Surface Temperature ↔ Artificial Light",   value: 0.32, direction:"Mild Positive"    },
];
function corrColor(v: number) {
  if (v > 0.5)  return "#22c55e";
  if (v > 0)    return "#86efac";
  if (v > -0.5) return "#eab308";
  return "#ef4444";
}

const KBA_DATA = [
  { rank:1, name:"La Mesa Watershed",                    type:"KBA", light:28.5, species:85,  sensitivePct:42, score:82, grade:"A" },
  { rank:2, name:"Marikina Watershed",                   type:"PA",  light:32.1, species:72,  sensitivePct:48, score:79, grade:"B" },
  { rank:3, name:"Las Piñas-Parañaque Critical Habitat", type:"KBA", light:38.7, species:92,  sensitivePct:58, score:75, grade:"B" },
  { rank:4, name:"Laguna de Bay Wetlands",               type:"KBA", light:35.4, species:125, sensitivePct:52, score:71, grade:"B" },
  { rank:5, name:"Ninoy Aquino Parks & Wildlife Center", type:"PA",  light:45.2, species:48,  sensitivePct:35, score:68, grade:"C" },
];

const SPECIES_DIST = [
  { name:"La Mesa Watershed",   shortName:"La Mesa",        total:85,  sensitive:36, tolerant:49 },
  { name:"NAPWC",               shortName:"NAPWC",          total:48,  sensitive:17, tolerant:31 },
  { name:"Las Piñas-Parañaque", shortName:"LPPCHEA",        total:92,  sensitive:53, tolerant:39 },
  { name:"Marikina Watershed",  shortName:"Marikina",       total:72,  sensitive:35, tolerant:37 },
  { name:"Laguna de Bay",       shortName:"Laguna de Bay",  total:125, sensitive:65, tolerant:60 },
];

const SCATTER_DATA = [
  { x:28.5, y:85,  site:"La Mesa Watershed",                    type:"KBA", grade:"A" },
  { x:32.1, y:72,  site:"Marikina Watershed",                   type:"PA",  grade:"B" },
  { x:35.4, y:125, site:"Laguna de Bay Wetlands",               type:"KBA", grade:"B" },
  { x:38.7, y:92,  site:"Las Piñas-Parañaque Critical Habitat", type:"KBA", grade:"B" },
  { x:45.2, y:48,  site:"Ninoy Aquino Parks & Wildlife Center", type:"PA",  grade:"C" },
];

const HIST_DATA = [
  { year:"2014", richness:77.2, lightIndex:68.0 },
  { year:"2015", richness:77.8, lightIndex:67.1 },
  { year:"2016", richness:79.0, lightIndex:66.2 },
  { year:"2017", richness:79.3, lightIndex:65.0 },
  { year:"2018", richness:80.1, lightIndex:64.5 },
  { year:"2019", richness:82.4, lightIndex:64.8 },
  { year:"2020", richness:83.2, lightIndex:62.1 },
  { year:"2021", richness:84.5, lightIndex:58.7 },
  { year:"2022", richness:86.1, lightIndex:55.3 },
  { year:"2023", richness:87.8, lightIndex:51.0 },
  { year:"2024", richness:89.0, lightIndex:47.2 },
];

const TOL_BY_YEAR: Record<number,{ tolerant:number; sensitive:number; resident:number; migratory:number }> = {
  2014:{ tolerant:318, sensitive:182, resident:290, migratory:210 },
  2015:{ tolerant:322, sensitive:185, resident:295, migratory:212 },
  2016:{ tolerant:330, sensitive:188, resident:302, migratory:216 },
  2017:{ tolerant:336, sensitive:190, resident:309, migratory:217 },
  2018:{ tolerant:341, sensitive:194, resident:315, migratory:220 },
  2019:{ tolerant:348, sensitive:199, resident:322, migratory:225 },
  2020:{ tolerant:356, sensitive:203, resident:330, migratory:229 },
  2021:{ tolerant:362, sensitive:207, resident:337, migratory:232 },
  2022:{ tolerant:370, sensitive:210, resident:344, migratory:236 },
  2023:{ tolerant:377, sensitive:214, resident:351, migratory:240 },
  2024:{ tolerant:385, sensitive:218, resident:358, migratory:245 },
};

const LP_BY_YEAR: Record<number,{ x:number; y:number; site:string }[]> = {
  2014:[{x:0.285,y:0.77,site:"La Mesa Watershed"},{x:0.321,y:0.72,site:"Marikina Watershed"},{x:0.354,y:0.85,site:"Laguna de Bay"},{x:0.387,y:0.68,site:"Las Piñas-Parañaque"},{x:0.452,y:0.55,site:"NAPWC"}],
  2015:[{x:0.292,y:0.78,site:"La Mesa Watershed"},{x:0.330,y:0.73,site:"Marikina Watershed"},{x:0.360,y:0.86,site:"Laguna de Bay"},{x:0.395,y:0.69,site:"Las Piñas-Parañaque"},{x:0.460,y:0.54,site:"NAPWC"}],
  2016:[{x:0.280,y:0.79,site:"La Mesa Watershed"},{x:0.325,y:0.74,site:"Marikina Watershed"},{x:0.348,y:0.87,site:"Laguna de Bay"},{x:0.390,y:0.70,site:"Las Piñas-Parañaque"},{x:0.455,y:0.56,site:"NAPWC"}],
  2017:[{x:0.275,y:0.80,site:"La Mesa Watershed"},{x:0.318,y:0.75,site:"Marikina Watershed"},{x:0.342,y:0.88,site:"Laguna de Bay"},{x:0.385,y:0.71,site:"Las Piñas-Parañaque"},{x:0.448,y:0.57,site:"NAPWC"}],
  2018:[{x:0.271,y:0.81,site:"La Mesa Watershed"},{x:0.310,y:0.76,site:"Marikina Watershed"},{x:0.338,y:0.89,site:"Laguna de Bay"},{x:0.380,y:0.72,site:"Las Piñas-Parañaque"},{x:0.442,y:0.58,site:"NAPWC"}],
  2019:[{x:0.268,y:0.82,site:"La Mesa Watershed"},{x:0.305,y:0.77,site:"Marikina Watershed"},{x:0.332,y:0.90,site:"Laguna de Bay"},{x:0.375,y:0.73,site:"Las Piñas-Parañaque"},{x:0.438,y:0.59,site:"NAPWC"}],
  2020:[{x:0.265,y:0.83,site:"La Mesa Watershed"},{x:0.300,y:0.78,site:"Marikina Watershed"},{x:0.325,y:0.91,site:"Laguna de Bay"},{x:0.370,y:0.74,site:"Las Piñas-Parañaque"},{x:0.430,y:0.60,site:"NAPWC"}],
  2021:[{x:0.260,y:0.84,site:"La Mesa Watershed"},{x:0.295,y:0.79,site:"Marikina Watershed"},{x:0.318,y:0.92,site:"Laguna de Bay"},{x:0.365,y:0.75,site:"Las Piñas-Parañaque"},{x:0.425,y:0.61,site:"NAPWC"}],
  2022:[{x:0.255,y:0.86,site:"La Mesa Watershed"},{x:0.290,y:0.81,site:"Marikina Watershed"},{x:0.312,y:0.93,site:"Laguna de Bay"},{x:0.358,y:0.76,site:"Las Piñas-Parañaque"},{x:0.418,y:0.63,site:"NAPWC"}],
  2023:[{x:0.250,y:0.88,site:"La Mesa Watershed"},{x:0.284,y:0.82,site:"Marikina Watershed"},{x:0.305,y:0.94,site:"Laguna de Bay"},{x:0.350,y:0.77,site:"Las Piñas-Parañaque"},{x:0.410,y:0.65,site:"NAPWC"}],
  2024:[{x:0.245,y:0.89,site:"La Mesa Watershed"},{x:0.278,y:0.83,site:"Marikina Watershed"},{x:0.298,y:0.95,site:"Laguna de Bay"},{x:0.342,y:0.78,site:"Las Piñas-Parañaque"},{x:0.402,y:0.67,site:"NAPWC"}],
};

// ── Per-site richness base data (20 sites) ────────────────────────────────────
type LightLevel = "Low" | "Moderate" | "High";
interface SiteBase { site: string; lightLevel: LightLevel; lightVal: number; base: number }
const SITE_BASE: SiteBase[] = [
  { site:"La Mesa Eco Park",          lightLevel:"Low",      lightVal:8.2,  base:0.89 },
  { site:"Laguna de Bay Wetlands",    lightLevel:"Moderate", lightVal:22.4, base:0.85 },
  { site:"Las Piñas-Parañaque CHEA",  lightLevel:"Moderate", lightVal:28.7, base:0.82 },
  { site:"Marikina Watershed",        lightLevel:"Low",      lightVal:12.1, base:0.78 },
  { site:"La Mesa Watershed",         lightLevel:"Low",      lightVal:9.8,  base:0.77 },
  { site:"UP Diliman Campus",         lightLevel:"Moderate", lightVal:25.3, base:0.71 },
  { site:"Marikina River Bank",       lightLevel:"Moderate", lightVal:31.2, base:0.68 },
  { site:"Taguig Lagoon",             lightLevel:"Moderate", lightVal:29.4, base:0.65 },
  { site:"Caloocan Urban Forest",     lightLevel:"Moderate", lightVal:33.1, base:0.60 },
  { site:"NAPWC",                     lightLevel:"High",     lightVal:38.5, base:0.55 },
  { site:"Manila Bay Coastline",      lightLevel:"High",     lightVal:42.1, base:0.52 },
  { site:"Pateros Waterway",          lightLevel:"High",     lightVal:36.8, base:0.50 },
  { site:"Pasig River Watershed",     lightLevel:"High",     lightVal:39.6, base:0.48 },
  { site:"QC Memorial Circle",        lightLevel:"High",     lightVal:37.9, base:0.45 },
  { site:"Navotas Fishpond",          lightLevel:"High",     lightVal:41.2, base:0.42 },
  { site:"Parañaque Bay Shore",       lightLevel:"High",     lightVal:43.8, base:0.40 },
  { site:"Malabon Creek Corridor",    lightLevel:"High",     lightVal:44.5, base:0.38 },
  { site:"Pasay Bay Reclamation",     lightLevel:"High",     lightVal:48.3, base:0.35 },
  { site:"Manila Estero Network",     lightLevel:"High",     lightVal:46.7, base:0.32 },
  { site:"Makati Ayala Triangle",     lightLevel:"High",     lightVal:45.2, base:0.30 },
];

function levelColor(l: LightLevel) {
  if (l === "Low")      return "#22c55e";
  if (l === "Moderate") return "#84cc16";
  return "#eab308";
}

function getPerSiteData(year: number) {
  const t = year - 2014;
  return SITE_BASE
    .map(s => ({
      ...s,
      richness: parseFloat(Math.min(1, s.base + t * (s.lightLevel === "Low" ? 0.012 : s.lightLevel === "Moderate" ? 0.007 : 0.003)).toFixed(3)),
    }))
    .sort((a, b) => b.richness - a.richness);
}

const YEARS = Array.from({ length: 11 }, (_, i) => 2014 + i);
const SITE_COLORS = ["#22c55e","#3b82f6","#f59e0b","#a855f7","#ef4444"];
const RADIAN = Math.PI / 180;

// ─────────────────────────────────────────────────────────────────────────────
// TOOLTIP HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function ttLabel(lm: boolean) { return lm ? "#1f2937" : "#e2e8f0"; }
function ttMuted(lm: boolean) { return lm ? "#6b7280" : "#94a3b8"; }

// ─────────────────────────────────────────────────────────────────────────────
// PIE LABEL — % inside arc wedge
// ─────────────────────────────────────────────────────────────────────────────
function PieArcLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.04) return null;
  const r  = innerRadius + (outerRadius - innerRadius) / 2;
  const x  = cx + r * Math.cos(-midAngle * RADIAN);
  const y  = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} style={{ pointerEvents:"none" }}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// YEAR SELECT
// ─────────────────────────────────────────────────────────────────────────────
function YearSelect({ value, onChange, lm }: { value:number; onChange:(y:number)=>void; lm:boolean }) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-sm outline-none cursor-pointer transition-colors ${
          lm ? "bg-white border border-gray-300 text-gray-700 hover:border-gray-400 focus:border-blue-500"
             : "bg-[#1e2538] border border-[#2a2f42] text-gray-300 hover:border-gray-500 focus:border-blue-500"
        }`}
        style={{ fontWeight:600 }}
      >
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <ChevronDown size={13} className={`absolute right-2 pointer-events-none ${lm ? "text-gray-500" : "text-gray-400"}`} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD BUTTON
// ─────────────────────────────────────────────────────────────────────────────
type DLStatus = "idle" | "loading" | "done" | "error";
function DownloadBtn({ label, colorClass, hoverClass, dlKey, statuses, onDownload }: {
  label:string; colorClass:string; hoverClass:string; dlKey:string;
  statuses:Record<string,DLStatus>; onDownload:(k:string)=>void;
}) {
  const s = statuses[dlKey] ?? "idle";
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={() => onDownload(dlKey)}
        disabled={s === "loading"}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${colorClass} ${s !== "loading" ? hoverClass : ""}`}
        style={{ fontWeight:600, minWidth:188 }}
      >
        {s === "loading" ? <><Loader2 size={13} className="animate-spin" />Downloading…</>
         : s === "done"  ? <><CheckCircle2 size={13} />Downloaded</>
         : s === "error" ? <><RefreshCw size={13} />Retry</>
         : <><Download size={13} />{label}</>}
      </button>
      {s === "loading" && <p className="text-gray-400 text-xs pl-1">Download in progress, please wait…</p>}
      {s === "done"    && <p className="text-green-500 text-xs pl-1 flex items-center gap-1"><CheckCircle2 size={11}/>File saved successfully.</p>}
      {s === "error"   && <p className="text-red-500 text-xs pl-1 flex items-center gap-1"><AlertCircle size={11}/>Download failed. Click to retry.</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function Reports() {
  const { lightMode: lm } = useOutletContext<{ lightMode: boolean }>();

  const [tolYear,  setTolYear]  = useState(2014);
  const [lpYear,   setLpYear]   = useState(2014);
  const [psYear,   setPsYear]   = useState(2014);
  const [dlStates, setDlStates] = useState<Record<string,DLStatus>>({});

  const handleDownload = useCallback((key:string) => {
    setDlStates(s => ({ ...s, [key]:"loading" }));
    setTimeout(() => {
      const ok = Math.random() > 0.1;
      setDlStates(s => ({ ...s, [key]: ok ? "done" : "error" }));
      if (ok) setTimeout(() => setDlStates(s => ({ ...s, [key]:"idle" })), 4000);
    }, 2200);
  }, []);

  // ── Theme tokens ─────────────────────────────────────────────────────────
  const pageBg   = lm ? "bg-gray-50"           : "bg-[#0d1117]";
  const panel    = lm ? "bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
                      : "bg-[#161b27] border border-[#252d3d] rounded-xl p-5";
  const headTxt  = lm ? "text-gray-800"         : "text-white";
  const subTxt   = lm ? "text-gray-500"         : "text-gray-400";
  const gridClr  = lm ? "#e5e7eb"               : "#1e2535";
  const axisClr  = lm ? "#6b7280"               : "#9ca3af";
  const divider  = lm ? "border-gray-200"       : "border-[#1e2535]";
  const rowAlt   = lm ? "bg-gray-50"            : "bg-white/[0.02]";
  const progBg   = lm ? "bg-gray-200"           : "bg-[#1e2538]";
  const badgeCSV = lm
    ? "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 border border-green-300"
    : "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-green-600/20 text-green-400 border border-green-600/30";
  const badgeJSON = lm
    ? "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-teal-50 text-teal-700 border border-teal-300"
    : "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-teal-500/20 text-teal-400 border border-teal-500/30";

  // Grade colors adaptive
  function gc(g:string) {
    const map: Record<string,[string,string]> = {
      A:["bg-green-100 text-green-700 border border-green-300",  "bg-green-500/20 text-green-400 border border-green-500/40"],
      B:["bg-blue-100 text-blue-700 border border-blue-300",     "bg-blue-500/20 text-blue-400 border border-blue-500/40"],
      C:["bg-yellow-100 text-yellow-700 border border-yellow-300","bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"],
    };
    return (map[g] ?? ["bg-red-100 text-red-700 border border-red-300","bg-red-500/20 text-red-400 border border-red-500/40"])[lm ? 0 : 1];
  }

  // KBA type badge
  function typeBadge(t:string) {
    return t === "KBA"
      ? (lm ? "bg-teal-100 text-teal-700 border border-teal-300" : "bg-teal-600/20 text-teal-400 border border-teal-600/30")
      : (lm ? "bg-purple-100 text-purple-700 border border-purple-300" : "bg-purple-600/20 text-purple-400 border border-purple-600/30");
  }

  // ── Tooltip box ──────────────────────────────────────────────────────────
  const TT = ({ children }: { children: React.ReactNode }) => (
    <div className={`rounded-lg px-3 py-2.5 shadow-xl text-xs ${
      lm ? "bg-white border border-gray-200 text-gray-800"
         : "bg-[#1a2236] border border-[#2a3655] text-gray-100"
    }`} style={{ minWidth:190, lineHeight:1.7 }}>
      {children}
    </div>
  );
  const THead = ({ text }: { text:string }) => (
    <p style={{ fontWeight:700, marginBottom:4, fontSize:12, color: ttLabel(lm) }}>{text}</p>
  );
  const TRow = ({ label, value, color }: { label:string; value:React.ReactNode; color?:string }) => (
    <div className="flex items-center justify-between gap-4">
      <span style={{ color:ttMuted(lm) }}>{label}</span>
      <span style={{ color: color ?? ttLabel(lm), fontWeight:600 }}>{value}</span>
    </div>
  );

  // ── Custom tooltips ──────────────────────────────────────────────────────
  const CorrTT = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const abs = Math.abs(d.value as number);
    return (
      <TT>
        <THead text={d.pair} />
        <TRow label="Coefficient" value={(d.value as number).toFixed(3)} color={corrColor(d.value)} />
        <TRow label="Direction"   value={d.direction} />
        <TRow label="Strength"    value={abs > 0.7 ? "Very strong" : abs > 0.5 ? "Strong" : abs > 0.3 ? "Moderate" : "Weak"} />
      </TT>
    );
  };

  const SpeciesTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <TT>
        <THead text={d.name} />
        <TRow label="Total species"     value={d.total}  color="#22c55e" />
        <TRow label="Sensitive"         value={`${d.sensitive} (${Math.round(d.sensitive/d.total*100)}%)`} color="#ef4444" />
        <TRow label="Tolerant"          value={`${d.tolerant} (${Math.round(d.tolerant/d.total*100)}%)`}  color="#22c55e" />
      </TT>
    );
  };

  const ExposureTT = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <TT>
        <THead text={d.site} />
        <TRow label="Type"           value={d.type}  color={d.type === "KBA" ? "#14b8a6" : "#a855f7"} />
        <TRow label="Light exposure" value={`${d.x} nW/cm²/sr`} color="#f59e0b" />
        <TRow label="Species count"  value={d.y}    color="#22c55e" />
        <TRow label="Audit grade"    value={d.grade} color={d.grade === "A" ? "#22c55e" : d.grade === "B" ? "#3b82f6" : "#eab308"} />
      </TT>
    );
  };

  const HistTT = ({ active, payload, label: yr }: any) => {
    if (!active || !payload?.length) return null;
    const rich  = payload.find((p:any) => p.dataKey === "richness");
    const light = payload.find((p:any) => p.dataKey === "lightIndex");
    const idx   = HIST_DATA.findIndex(d => d.year === yr);
    const prev  = idx > 0 ? HIST_DATA[idx-1] : null;
    const rd    = prev ? (HIST_DATA[idx].richness   - prev.richness).toFixed(1)   : null;
    const ld    = prev ? (HIST_DATA[idx].lightIndex - prev.lightIndex).toFixed(1) : null;
    return (
      <TT>
        <THead text={`Year ${yr}`} />
        {rich  && <TRow label="Avg species richness"  value={<>{rich.value}  {rd  && <span style={{ color:Number(rd)  >= 0 ? "#22c55e":"#ef4444", fontSize:10 }}>{Number(rd)  >= 0 ? `+${rd}`  : rd }</span>}</>} color="#22c55e" />}
        {light && <TRow label="Light pollution index" value={<>{light.value} {ld  && <span style={{ color:Number(ld)  <= 0 ? "#22c55e":"#ef4444", fontSize:10 }}>{Number(ld)  > 0  ? `+${ld}`  : ld }</span>}</>} color="#ef4444" />}
      </TT>
    );
  };

  const PieTT = ({ active, payload, pool }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
      <TT>
        <THead text={d.payload.name} />
        <TRow label="Count"  value={d.value.toLocaleString()} color={d.payload.fill} />
        <TRow label="Share"  value={`${((d.value/pool)*100).toFixed(1)}%`} />
        <TRow label="Pool"   value={pool.toLocaleString()} />
        <TRow label="Year"   value={tolYear} />
      </TT>
    );
  };

  const LpTT = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload as { x:number; y:number; site:string };
    if (!d) return null;
    const rank = [...LP_BY_YEAR[lpYear]].sort((a,b)=>a.x-b.x).findIndex(p=>p.site===d.site)+1;
    return (
      <TT>
        <THead text={d.site} />
        <TRow label="Year"             value={lpYear} />
        <TRow label="Light pollution"  value={`${d.x.toFixed(3)} (norm.)`} color="#f59e0b" />
        <TRow label="Species richness" value={`${d.y.toFixed(3)} (norm.)`} color="#22c55e" />
        <TRow label="Pollution rank"   value={`#${rank} (1 = lowest)`} />
      </TT>
    );
  };

  const PsSiteTT = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as SiteBase & { richness:number };
    const rank = getPerSiteData(psYear).findIndex(s => s.site === d.site) + 1;
    return (
      <TT>
        <THead text={d.site} />
        <TRow label="Year"             value={psYear} />
        <TRow label="Richness (norm.)" value={d.richness.toFixed(3)} color={levelColor(d.lightLevel)} />
        <TRow label="Light exposure"   value={`${d.lightVal} nW/cm²/sr`} color={levelColor(d.lightLevel)} />
        <TRow label="Light level"      value={d.lightLevel} color={levelColor(d.lightLevel)} />
        <TRow label="Richness rank"    value={`#${rank} of 20`} />
      </TT>
    );
  };

  // ── Data derivations ─────────────────────────────────────────────────────
  const tolData = TOL_BY_YEAR[tolYear];
  const total   = tolData.tolerant + tolData.sensitive;
  const totMig  = tolData.resident + tolData.migratory;
  const pieTol  = [{ name:"Tolerant",  value:tolData.tolerant,  fill:"#22c55e" }, { name:"Sensitive", value:tolData.sensitive, fill:"#ef4444" }];
  const pieMig  = [{ name:"Resident",  value:tolData.resident,  fill:"#3b82f6" }, { name:"Migratory", value:tolData.migratory, fill:"#f59e0b" }];
  const psData  = getPerSiteData(psYear);

  return (
    <div className={`min-h-full px-6 py-6 space-y-5 ${pageBg}`}>

      {/* ── Header ── */}
      <div>
        <h1 className={headTxt} style={{ fontWeight:700, fontSize:20 }}>Statistical Reports &amp; Data Visualization</h1>
        <p className={`text-sm mt-1 ${subTxt}`}>Comprehensive analysis and export capabilities</p>
      </div>

      {/* ── Export ── */}
      <div className={panel}>
        <p className={`text-sm mb-4 ${headTxt}`} style={{ fontWeight:700 }}>Export Data</p>
        <div className="flex flex-wrap gap-5">
          <DownloadBtn label="Download GeoJSON"    colorClass="bg-blue-600"   hoverClass="hover:bg-blue-700"   dlKey="geojson" statuses={dlStates} onDownload={handleDownload} />
          <DownloadBtn label="Download PDF Report" colorClass="bg-red-600"    hoverClass="hover:bg-red-700"    dlKey="pdf"     statuses={dlStates} onDownload={handleDownload} />
          <DownloadBtn label="Export CSV Data"     colorClass="bg-violet-600" hoverClass="hover:bg-violet-700" dlKey="csv"     statuses={dlStates} onDownload={handleDownload} />
        </div>
      </div>

      {/* ── Correlation Matrix ── */}
      <div className={panel}>
        <p className={`text-sm mb-4 ${headTxt}`} style={{ fontWeight:700 }}>Environmental Feature Correlation Matrix</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={CORR_DATA} margin={{ top:10, right:20, left:10, bottom:10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
            <XAxis dataKey="label" tick={{ fill:axisClr, fontSize:11 }} interval={0} />
            <YAxis domain={[-1,1]} tickCount={9} tick={{ fill:axisClr, fontSize:11 }}
              label={{ value:"Correlation Coefficient", angle:-90, position:"insideLeft", fill:axisClr, fontSize:10, dx:-2 }} />
            <Tooltip content={<CorrTT />} />
            <ReferenceLine y={0} stroke={lm ? "#9ca3af" : "#4b5563"} strokeWidth={1.5} />
            <Bar dataKey="value" radius={[3,3,0,0]} maxBarSize={56}>
              {CORR_DATA.map((e,i) => <Cell key={i} fill={corrColor(e.value)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap items-center gap-4 mt-3">
          {[["#22c55e","Strong positive (> 0.5)"],["#86efac","Positive (0 – 0.5)"],["#eab308","Negative (−0.5 – 0)"],["#ef4444","Strong negative (< −0.5)"]].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background:c }} />
              <span className={`text-xs ${subTxt}`}>{l}</span>
            </div>
          ))}
        </div>
        <p className={`mt-3 text-xs ${subTxt}`}>
          <span className={headTxt} style={{ fontWeight:600 }}>Interpretation: </span>
          Light intensity shows strong negative correlation (−0.72) with species count; NDVI shows strong positive correlation (0.68).
        </p>
      </div>

      {/* ── KBA/PA Audit ── */}
      <div className={panel}>
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-sm ${headTxt}`} style={{ fontWeight:700 }}>KBA/PA Performance Audit</span>
          <span className={badgeJSON}>▪ Sample JSON</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse:"separate", borderSpacing:0 }}>
            <thead>
              <tr>
                {["Rank","Area Name","Type","Light Exposure","Species Count","Sensitive Species %","Effectiveness Score","Grade"].map(h => (
                  <th key={h} className={`text-left pb-3 pr-4 whitespace-nowrap text-xs ${subTxt}`} style={{ fontWeight:600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KBA_DATA.map((row,i) => (
                <tr key={row.rank} className={i%2===0 ? rowAlt : ""}>
                  <td className={`py-3 pr-4 text-sm ${headTxt}`} style={{ fontWeight:700 }}>{row.rank}</td>
                  <td className="py-3 pr-6">
                    <span className={`text-sm ${lm ? "text-cyan-700" : "text-cyan-400"}`} style={{ fontWeight:600 }}>{row.name}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${typeBadge(row.type)}`} style={{ fontWeight:700 }}>{row.type}</span>
                  </td>
                  <td className={`py-3 pr-4 text-sm ${subTxt}`}>{row.light}</td>
                  <td className={`py-3 pr-4 text-sm ${subTxt}`}>{row.species}</td>
                  <td className={`py-3 pr-4 text-sm ${subTxt}`}>{row.sensitivePct}%</td>
                  <td className="py-3 pr-4" style={{ minWidth:140 }}>
                    <div className={`w-full rounded-full overflow-hidden ${progBg}`} style={{ height:8 }}>
                      <div className="h-full rounded-full bg-blue-500" style={{ width:`${row.score}%` }} />
                    </div>
                    <span className={`mt-1 block text-xs ${subTxt}`}>{row.score}%</span>
                  </td>
                  <td className="py-3">
                    <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs ${gc(row.grade)}`} style={{ fontWeight:700 }}>{row.grade}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={`mt-4 pt-4 border-t ${divider}`}>
          <p className={`text-xs mb-2 ${headTxt}`} style={{ fontWeight:700 }}>Audit Criteria:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { g:"Grade A (80–100)", cls: lm ? "bg-green-100 text-green-700 border border-green-300"  : "bg-green-500/20 text-green-400 border border-green-500/30",  txt:"Excellent — low light exposure, high diversity" },
              { g:"Grade B (70–79)",  cls: lm ? "bg-blue-100 text-blue-700 border border-blue-300"    : "bg-blue-500/20 text-blue-400 border border-blue-500/30",    txt:"Good — moderate effectiveness" },
              { g:"Grade C (60–69)",  cls: lm ? "bg-yellow-100 text-yellow-700 border border-yellow-300" : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30", txt:"Fair — needs improvement" },
              { g:"Grade D (<60)",    cls: lm ? "bg-red-100 text-red-700 border border-red-300"       : "bg-red-500/20 text-red-400 border border-red-500/30",       txt:"Poor — urgent intervention required" },
            ].map(c => (
              <div key={c.g} className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${c.cls}`} style={{ fontWeight:600 }}>{c.g}</span>
                <span className={`text-xs ${subTxt}`}>{c.txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Species Dist + Scatter ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={panel}>
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-sm ${headTxt}`} style={{ fontWeight:700 }}>Species Distribution by Area</span>
            <span className={badgeJSON}>▪ Sample JSON</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={SPECIES_DIST} layout="vertical" margin={{ top:0, right:20, left:0, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridClr} horizontal={false} />
              <XAxis type="number" tick={{ fill:axisClr, fontSize:11 }} domain={[0,140]} />
              <YAxis type="category" dataKey="shortName" tick={{ fill:axisClr, fontSize:11 }} width={100} />
              <Tooltip content={<SpeciesTooltip />} />
              <Bar dataKey="total" fill="#22c55e" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={panel}>
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-sm ${headTxt}`} style={{ fontWeight:700 }}>Light Exposure vs Species Count</span>
            <span className={badgeJSON}>▪ Sample JSON</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart margin={{ top:10, right:20, left:0, bottom:24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
              <XAxis dataKey="x" type="number" tick={{ fill:axisClr, fontSize:11 }} domain={[25,50]}
                label={{ value:"Light Exposure (nW/cm²/sr)", position:"insideBottom", offset:-14, fill:axisClr, fontSize:10 }} />
              <YAxis dataKey="y" type="number" tick={{ fill:axisClr, fontSize:11 }} domain={[30,140]}
                label={{ value:"Species Count", angle:-90, position:"insideLeft", fill:axisClr, fontSize:10 }} />
              <Tooltip content={<ExposureTT />} />
              <Scatter data={SCATTER_DATA} shape={(props:any) => {
                const { cx, cy } = props;
                if (typeof cx !== "number" || typeof cy !== "number") return null;
                return <circle cx={cx} cy={cy} r={7} fill="#22c55e" fillOpacity={0.85} stroke="#15803d" strokeWidth={1.5} />;
              }} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Historical Trends ── */}
      <div className={panel}>
        <p className={`text-sm mb-4 ${headTxt}`} style={{ fontWeight:700 }}>Historical Trends (2014–2024)</p>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={HIST_DATA} margin={{ top:10, right:20, left:0, bottom:0 }}>
            <defs>
              <linearGradient id="richGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={lm ? 0.3  : 0.15} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="lightGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={lm ? 0.35 : 0.25} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
            <XAxis dataKey="year" tick={{ fill:axisClr, fontSize:11 }} />
            <YAxis tick={{ fill:axisClr, fontSize:11 }} domain={[40,95]} />
            <Tooltip content={<HistTT />} />
            <Legend wrapperStyle={{ paddingTop:8 }} formatter={v => <span style={{ color:axisClr, fontSize:11 }}>{v}</span>} />
            <Area type="monotone" dataKey="richness"   name="Average Species Richness" stroke="#22c55e" strokeWidth={2} fill="url(#richGrad)"  dot={{ fill:"#22c55e", r:3 }} />
            <Area type="monotone" dataKey="lightIndex" name="Light Pollution Index"    stroke="#ef4444" strokeWidth={2} fill="url(#lightGrad)" dot={{ fill:"#ef4444", r:3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Tolerance & Migration Pie Charts ── */}
      <div className={panel}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-sm ${headTxt}`} style={{ fontWeight:700 }}>Distribution of Light Tolerance &amp; Migration Status</span>
            <span className={badgeCSV}>▪ CSV Dataset</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${subTxt}`}>Year:</span>
            <YearSelect value={tolYear} onChange={setTolYear} lm={lm} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Light Tolerance */}
          <div className="flex flex-col">
            <p className={`text-sm mb-1 text-center ${headTxt}`} style={{ fontWeight:600 }}>Light Tolerance — {tolYear}</p>
            <div style={{ height:280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top:10, right:10, bottom:10, left:10 }}>
                  <Pie data={pieTol} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" labelLine={false} label={<PieArcLabel />}>
                    {pieTol.map((e,i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip content={(p) => <PieTT {...p} pool={total} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {[{c:"bg-green-500",l:"Tolerant",v:tolData.tolerant},{c:"bg-red-500",l:"Sensitive",v:tolData.sensitive}].map(x => (
                <div key={x.l} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-sm shrink-0 ${x.c}`} />
                  <span className={`text-xs ${subTxt}`}>{x.l}: <span className={headTxt} style={{ fontWeight:600 }}>{x.v.toLocaleString()}</span></span>
                </div>
              ))}
            </div>
            <p className={`text-xs text-center mt-1 ${subTxt}`}>Total: {total.toLocaleString()} · {((tolData.tolerant/total)*100).toFixed(1)}% tolerant</p>
          </div>

          {/* Migration Status */}
          <div className="flex flex-col">
            <p className={`text-sm mb-1 text-center ${headTxt}`} style={{ fontWeight:600 }}>Migration Status — {tolYear}</p>
            <div style={{ height:280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top:10, right:10, bottom:10, left:10 }}>
                  <Pie data={pieMig} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" labelLine={false} label={<PieArcLabel />}>
                    {pieMig.map((e,i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip content={(p) => <PieTT {...p} pool={totMig} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {[{c:"bg-blue-500",l:"Resident",v:tolData.resident},{c:"bg-amber-500",l:"Migratory",v:tolData.migratory}].map(x => (
                <div key={x.l} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded-sm shrink-0 ${x.c}`} />
                  <span className={`text-xs ${subTxt}`}>{x.l}: <span className={headTxt} style={{ fontWeight:600 }}>{x.v.toLocaleString()}</span></span>
                </div>
              ))}
            </div>
            <p className={`text-xs text-center mt-1 ${subTxt}`}>Total: {totMig.toLocaleString()} · {((tolData.resident/totMig)*100).toFixed(1)}% resident</p>
          </div>
        </div>
      </div>

      {/* ── LP vs Richness Scatter ── */}
      <div className={panel}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-sm ${headTxt}`} style={{ fontWeight:700 }}>Light Pollution vs Bird Richness</span>
            <span className={badgeCSV}>▪ CSV Dataset</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${subTxt}`}>Year:</span>
            <YearSelect value={lpYear} onChange={setLpYear} lm={lm} />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mb-3">
          {LP_BY_YEAR[lpYear].map((d,i) => (
            <div key={d.site} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background:SITE_COLORS[i] }} />
              <span className={`text-xs ${subTxt}`}>{d.site}</span>
            </div>
          ))}
        </div>
        <div style={{ height:320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top:10, right:30, left:10, bottom:52 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridClr} />
              <XAxis dataKey="x" type="number" tick={{ fill:axisClr, fontSize:11 }} domain={[0,1]} tickCount={11}
                label={{ value:"Avg Light Pollution (VIIRS radiance, nW/cm²/sr)", position:"insideBottom", offset:-34, fill:axisClr, fontSize:11 }} />
              <YAxis dataKey="y" type="number" tick={{ fill:axisClr, fontSize:11 }} domain={[0,1]} tickCount={11}
                label={{ value:"Avg Unique Species Count (normalized)", angle:-90, position:"insideLeft", fill:axisClr, fontSize:11, dx:10 }} />
              <Tooltip content={<LpTT />} />
              {LP_BY_YEAR[lpYear].map((d,i) => {
                const col = SITE_COLORS[i];
                const Dot = (props:any) => {
                  const { cx, cy } = props;
                  if (typeof cx !== "number" || typeof cy !== "number") return null;
                  return <circle cx={cx} cy={cy} r={8} fill={col} fillOpacity={0.85} stroke={col} strokeWidth={1} />;
                };
                return <Scatter key={d.site} data={[d]} shape={<Dot />} />;
              })}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className={`mt-4 text-xs ${subTxt}`}>
          <span className={headTxt} style={{ fontWeight:600 }}>Interpretation: </span>
          Sites with lower normalized light pollution sustain higher bird species richness. Select a year to track annual shifts.
        </p>
      </div>

      {/* ── Per Site Bird Richness — Top 20 Sites ── */}
      <div className={panel}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-sm ${headTxt}`} style={{ fontWeight:700 }}>
              Per Site Bird Richness — Top 20 Sites ({psYear})
            </span>
            <span className={badgeCSV}>▪ CSV Dataset</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${subTxt}`}>Year:</span>
            <YearSelect value={psYear} onChange={setPsYear} lm={lm} />
          </div>
        </div>

        <div style={{ height: 520 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={psData}
              layout="vertical"
              margin={{ top:4, right:40, left:8, bottom:30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridClr} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill:axisClr, fontSize:11 }}
                domain={[0,1]}
                tickCount={11}
                label={{ value:"Avg Unique Species Count", position:"insideBottom", offset:-18, fill:axisClr, fontSize:11 }}
              />
              <YAxis
                type="category"
                dataKey="site"
                tick={{ fill:axisClr, fontSize:10 }}
                width={158}
              />
              <Tooltip content={<PsSiteTT />} />
              <Bar dataKey="richness" radius={[0,3,3,0]} maxBarSize={18}>
                {psData.map((entry,i) => (
                  <Cell key={i} fill={levelColor(entry.lightLevel)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-5 mt-2">
          {([["Low","<15 nW/cm²/sr","#22c55e"],["Moderate","15–35 nW/cm²/sr","#84cc16"],["High",">35 nW/cm²/sr","#eab308"]] as [LightLevel,string,string][]).map(([l,desc,c]) => (
            <div key={l} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background:c }} />
              <span className={`text-xs ${subTxt}`}><span style={{ color:c, fontWeight:600 }}>{l} light</span> ({desc})</span>
            </div>
          ))}
        </div>

        <p className={`mt-3 text-xs ${subTxt}`}>
          <span className={headTxt} style={{ fontWeight:600 }}>Note: </span>
          Average unique species count per observation site based on {psYear} field data. Green areas such as La Mesa Eco Park and wetland parks show the highest bird species richness.
        </p>
      </div>

    </div>
  );
}
