import { useOutletContext } from "react-router";
import { useState, useRef, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Info, ZoomIn, ZoomOut, Eye,
} from "lucide-react";

// ── Coordinate helpers ────────────────────────────────────────────────────────
function geo(lon: number, lat: number): [number, number] {
  return [(lon - 116.8) * 46, (21.8 - lat) * 42];
}
function pts(...coords: [number, number][]): string {
  return coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

const MM_W = 520, MM_H = 620;
const MM_LON_MIN = 120.88, MM_LON_RANGE = 0.38;
const MM_LAT_MAX = 14.87, MM_LAT_RANGE = 0.55;

function mmll(lat: number, lon: number): [number, number] {
  return [
    +((lon - MM_LON_MIN) / MM_LON_RANGE * MM_W).toFixed(1),
    +((MM_LAT_MAX - lat) / MM_LAT_RANGE * MM_H).toFixed(1),
  ];
}
function mmPts(coords: [number, number][]): string {
  return coords.map(([lat, lon]) => mmll(lat, lon).join(",")).join(" ");
}

const ISLANDS: Record<string, string> = {
  luzon: pts(
    geo(120.8,18.6),geo(121.1,18.6),geo(122.2,18.5),geo(122.5,17.0),
    geo(121.8,15.3),geo(121.9,14.7),geo(121.9,14.0),geo(122.3,13.5),
    geo(122.0,13.8),geo(122.9,14.1),geo(123.3,13.7),geo(123.8,13.2),
    geo(124.0,12.9),geo(124.1,12.6),geo(123.7,12.9),geo(123.1,13.5),
    geo(122.5,13.7),geo(122.1,13.9),geo(120.6,14.0),geo(120.8,14.3),
    geo(120.9,14.5),geo(121.0,14.6),geo(120.9,14.7),geo(120.6,15.0),
    geo(120.3,14.8),geo(119.9,15.3),geo(120.3,16.0),geo(120.3,16.6),
    geo(120.4,17.6),geo(120.6,18.2),
  ),
  mindoro:  pts(geo(121.1,13.5),geo(121.5,13.3),geo(121.4,12.8),geo(121.2,12.2),geo(120.7,12.2),geo(120.4,12.6),geo(120.6,13.3)),
  palawan:  pts(geo(119.8,11.5),geo(119.5,11.1),geo(119.2,10.6),geo(118.9,10.0),geo(118.5,9.3),geo(118.0,8.8),geo(117.5,8.5),geo(117.2,8.4),geo(117.4,8.3),geo(117.9,8.5),geo(118.3,8.9),geo(118.7,9.5),geo(119.1,10.1),geo(119.4,10.8),geo(119.7,11.3),geo(119.9,11.6)),
  panay:    pts(geo(121.8,11.7),geo(122.2,11.8),geo(122.7,11.7),geo(123.1,11.0),geo(122.6,10.5),geo(122.0,10.5),geo(121.9,10.7),geo(121.8,11.1)),
  negros:   pts(geo(122.7,11.0),geo(123.2,11.0),geo(123.3,10.5),geo(123.2,9.3),geo(122.8,9.0),geo(122.4,9.5),geo(122.3,10.0),geo(122.5,10.5)),
  cebu:     pts(geo(124.0,11.3),geo(124.2,11.0),geo(124.1,10.5),geo(123.9,10.1),geo(123.5,9.9),geo(123.5,10.4),geo(123.7,10.9),geo(123.8,11.1)),
  mindanao: pts(geo(123.3,8.7),geo(123.8,8.2),geo(124.7,8.5),geo(125.5,9.8),geo(126.1,8.5),geo(126.2,8.0),geo(126.2,7.0),geo(125.6,6.5),geo(125.2,6.1),geo(124.0,6.0),geo(124.2,6.5),geo(123.4,7.2),geo(122.1,6.9),geo(123.0,8.0)),
};

type RiskLevel    = "Low" | "Medium" | "High";
type MapView      = "risk" | "historical";
type LandType     = "Urban & Built-up"|"Water Bodies"|"Forest"|"Croplands"|"Grasslands"|"Wetlands"|"Woody Savannas"|"Cropland Mosaics"|"Barren";
type LandTempMode = "Day" | "Night";
type EnvFilter    = "landcover"|"ndvi"|"viirs"|"landtemp"|"precip";

interface RiskZone     { name: string; lat: number; lon: number; risk: RiskLevel; detail: string }
interface SpeciesCounts { resident: number; migratory: number; lightTolerant: number; lightSensitive: number }
interface ObsSite      { name: string; lat: number; lon: number; speciesByYear: Record<number,Record<number,SpeciesCounts>>; species: string[] }
interface MMCity       {
  id: string; name: string; polygon: [number,number][]; labelAt: [number,number];
  dominantLandCover: LandType; landCoverBreakdown: Partial<Record<LandType,number>>;
  ndvi: number; viirs: number; landTempDay: number; landTempNight: number; precip: number;
}

// Refined land cover palette — earthy, distinct, legible on dark and light backgrounds
const LAND_COLORS: Record<LandType,string> = {
  "Urban & Built-up": "#c0392b",   // deep brick red
  "Water Bodies":     "#2980b9",   // clear blue
  "Forest":           "#27ae60",   // rich green
  "Croplands":        "#d4ac0d",   // warm golden
  "Grasslands":       "#82c341",   // lime green
  "Wetlands":         "#1a9e8a",   // teal
  "Woody Savannas":   "#8e6b3e",   // warm brown
  "Cropland Mosaics": "#d68b59",   // terracotta
  "Barren":           "#9ba8a3",   // cool grey
};

const LAND_LEGEND: LandType[] = ["Urban & Built-up","Water Bodies","Forest","Croplands","Grasslands","Wetlands","Woody Savannas","Cropland Mosaics","Barren"];
const RISK_COLOR: Record<RiskLevel,string> = { Low:"#22c55e", Medium:"#eab308", High:"#ef4444" };
const MONTHS_S   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_ALL = ["All",...MONTHS_S];

const RISK_ZONES: RiskZone[] = [
  {name:"La Mesa Watershed",   lat:14.72, lon:121.12, risk:"Low",    detail:"28.5 nW/cm²/sr"},
  {name:"UP Diliman",          lat:14.65, lon:121.07, risk:"Low",    detail:"27.3 nW/cm²/sr"},
  {name:"Marikina Watershed",  lat:14.63, lon:121.10, risk:"Medium", detail:"32.1 nW/cm²/sr"},
  {name:"Laguna de Bay",       lat:14.35, lon:121.20, risk:"Medium", detail:"35.4 nW/cm²/sr"},
  {name:"NAPWC",               lat:14.52, lon:121.00, risk:"High",   detail:"45.2 nW/cm²/sr"},
  {name:"Las Piñas-Parañaque", lat:14.43, lon:120.99, risk:"Medium", detail:"38.7 nW/cm²/sr"},
  {name:"Baguio Watershed",    lat:16.40, lon:120.60, risk:"Low",    detail:"19.8 nW/cm²/sr"},
  {name:"Tuguegarao",          lat:17.60, lon:121.70, risk:"Low",    detail:"21.3 nW/cm²/sr"},
  {name:"Legazpi KBA",         lat:13.10, lon:123.70, risk:"Medium", detail:"34.2 nW/cm²/sr"},
  {name:"Cebu City",           lat:10.30, lon:123.90, risk:"Medium", detail:"41.7 nW/cm²/sr"},
  {name:"Tacloban KBA",        lat:11.20, lon:125.00, risk:"High",   detail:"48.3 nW/cm²/sr"},
  {name:"Davao City",          lat:7.10,  lon:125.60, risk:"High",   detail:"51.2 nW/cm²/sr"},
];

const MM_CITIES: MMCity[] = [
  {id:"valenzuela",name:"Valenzuela",
   polygon:[[14.82,120.90],[14.82,121.02],[14.72,121.02],[14.72,120.90]],labelAt:[14.77,120.96],
   dominantLandCover:"Urban & Built-up",landCoverBreakdown:{"Urban & Built-up":82,"Croplands":8,"Grasslands":5,"Water Bodies":3,"Barren":2},
   ndvi:0.21,viirs:44.7,landTempDay:37.5,landTempNight:27.1,precip:175},
  {id:"caloocan",name:"Caloocan",
   polygon:[[14.72,120.93],[14.72,121.02],[14.67,121.02],[14.66,121.00],[14.65,120.97],[14.67,120.93]],labelAt:[14.695,120.975],
   dominantLandCover:"Urban & Built-up",landCoverBreakdown:{"Urban & Built-up":88,"Water Bodies":5,"Grasslands":4,"Barren":3},
   ndvi:0.18,viirs:42.1,landTempDay:38.2,landTempNight:27.4,precip:182},
  {id:"malabon",name:"Malabon",
   polygon:[[14.70,120.90],[14.70,120.97],[14.67,120.97],[14.67,120.90]],labelAt:[14.685,120.935],
   dominantLandCover:"Water Bodies",landCoverBreakdown:{"Urban & Built-up":65,"Water Bodies":28,"Wetlands":5,"Barren":2},
   ndvi:0.22,viirs:38.5,landTempDay:36.8,landTempNight:26.1,precip:195},
  {id:"navotas",name:"Navotas",
   polygon:[[14.68,120.90],[14.68,120.93],[14.66,120.93],[14.655,120.90]],labelAt:[14.668,120.916],
   dominantLandCover:"Water Bodies",landCoverBreakdown:{"Urban & Built-up":58,"Water Bodies":38,"Wetlands":4},
   ndvi:0.14,viirs:35.2,landTempDay:35.9,landTempNight:26.8,precip:188},
  {id:"quezon-city",name:"Quezon City",
   polygon:[[14.76,120.97],[14.76,121.09],[14.72,121.14],[14.67,121.17],[14.63,121.16],[14.62,121.12],[14.62,121.08],[14.61,121.05],[14.61,121.01],[14.65,120.97]],labelAt:[14.685,121.06],
   dominantLandCover:"Forest",landCoverBreakdown:{"Urban & Built-up":53,"Forest":22,"Grasslands":12,"Water Bodies":7,"Croplands":6},
   ndvi:0.34,viirs:38.9,landTempDay:36.1,landTempNight:26.0,precip:210},
  {id:"san-juan",name:"San Juan",
   polygon:[[14.62,121.01],[14.62,121.05],[14.60,121.05],[14.60,121.01]],labelAt:[14.61,121.03],
   dominantLandCover:"Urban & Built-up",landCoverBreakdown:{"Urban & Built-up":93,"Grasslands":4,"Water Bodies":3},
   ndvi:0.12,viirs:46.8,landTempDay:38.5,landTempNight:28.0,precip:172},
  {id:"mandaluyong",name:"Mandaluyong",
   polygon:[[14.60,121.01],[14.60,121.06],[14.57,121.06],[14.57,121.01]],labelAt:[14.585,121.035],
   dominantLandCover:"Urban & Built-up",landCoverBreakdown:{"Urban & Built-up":96,"Water Bodies":2,"Barren":2},
   ndvi:0.10,viirs:49.1,landTempDay:39.2,landTempNight:28.6,precip:168},
  {id:"marikina",name:"Marikina",
   polygon:[[14.71,121.07],[14.71,121.17],[14.62,121.17],[14.62,121.12],[14.62,121.08],[14.65,121.07]],labelAt:[14.67,121.12],
   dominantLandCover:"Grasslands",landCoverBreakdown:{"Urban & Built-up":55,"Grasslands":20,"Forest":14,"Water Bodies":11},
   ndvi:0.38,viirs:32.6,landTempDay:35.4,landTempNight:25.2,precip:228},
  {id:"pasig",name:"Pasig",
   polygon:[[14.61,121.05],[14.62,121.08],[14.62,121.13],[14.57,121.13],[14.55,121.09],[14.56,121.05]],labelAt:[14.585,121.09],
   dominantLandCover:"Urban & Built-up",landCoverBreakdown:{"Urban & Built-up":74,"Water Bodies":16,"Grasslands":7,"Barren":3},
   ndvi:0.19,viirs:43.5,landTempDay:37.8,landTempNight:27.5,precip:190},
  {id:"manila",name:"Manila",
   polygon:[[14.62,120.96],[14.62,121.01],[14.57,121.01],[14.55,121.00],[14.55,120.96]],labelAt:[14.585,120.985],
   dominantLandCover:"Urban & Built-up",landCoverBreakdown:{"Urban & Built-up":91,"Water Bodies":6,"Barren":3},
   ndvi:0.08,viirs:52.3,landTempDay:39.8,landTempNight:29.2,precip:165},
  {id:"pasay",name:"Pasay",
   polygon:[[14.55,120.97],[14.55,121.02],[14.52,121.02],[14.52,120.97]],labelAt:[14.535,120.995],
   dominantLandCover:"Urban & Built-up",landCoverBreakdown:{"Urban & Built-up":78,"Water Bodies":14,"Grasslands":5,"Barren":3},
   ndvi:0.11,viirs:50.8,landTempDay:39.5,landTempNight:28.9,precip:161},
  {id:"makati",name:"Makati",
   polygon:[[14.57,121.01],[14.57,121.06],[14.55,121.06],[14.55,121.01]],labelAt:[14.56,121.035],
   dominantLandCover:"Urban & Built-up",landCoverBreakdown:{"Urban & Built-up":95,"Water Bodies":3,"Barren":2},
   ndvi:0.09,viirs:55.6,landTempDay:40.1,landTempNight:29.8,precip:162},
  {id:"pateros",name:"Pateros",
   polygon:[[14.56,121.07],[14.56,121.09],[14.54,121.09],[14.54,121.07]],labelAt:[14.55,121.08],
   dominantLandCover:"Water Bodies",landCoverBreakdown:{"Urban & Built-up":60,"Water Bodies":32,"Wetlands":8},
   ndvi:0.25,viirs:31.2,landTempDay:35.8,landTempNight:25.9,precip:208},
  {id:"taguig",name:"Taguig",
   polygon:[[14.55,121.04],[14.56,121.07],[14.57,121.13],[14.50,121.13],[14.49,121.04]],labelAt:[14.525,121.085],
   dominantLandCover:"Croplands",landCoverBreakdown:{"Urban & Built-up":62,"Water Bodies":18,"Croplands":12,"Grasslands":8},
   ndvi:0.23,viirs:40.2,landTempDay:37.1,landTempNight:27.0,precip:185},
  {id:"paranaque",name:"Parañaque",
   polygon:[[14.52,120.98],[14.52,121.07],[14.47,121.07],[14.45,121.03],[14.45,120.99],[14.48,120.98]],labelAt:[14.485,121.02],
   dominantLandCover:"Cropland Mosaics",landCoverBreakdown:{"Urban & Built-up":70,"Water Bodies":14,"Cropland Mosaics":10,"Wetlands":6},
   ndvi:0.20,viirs:39.4,landTempDay:37.3,landTempNight:27.2,precip:198},
  {id:"las-pinas",name:"Las Piñas",
   polygon:[[14.49,120.96],[14.49,121.03],[14.44,121.03],[14.43,121.00],[14.43,120.96]],labelAt:[14.46,120.995],
   dominantLandCover:"Woody Savannas",landCoverBreakdown:{"Urban & Built-up":60,"Woody Savannas":18,"Wetlands":14,"Water Bodies":8},
   ndvi:0.28,viirs:36.9,landTempDay:36.5,landTempNight:26.4,precip:202},
  {id:"muntinlupa",name:"Muntinlupa",
   polygon:[[14.49,121.02],[14.50,121.13],[14.40,121.13],[14.38,121.05],[14.38,121.02]],labelAt:[14.43,121.07],
   dominantLandCover:"Wetlands",landCoverBreakdown:{"Urban & Built-up":50,"Water Bodies":28,"Wetlands":14,"Forest":8},
   ndvi:0.41,viirs:28.4,landTempDay:34.6,landTempNight:24.8,precip:245},
];

const SITE_CITY: Record<string,string> = {
  "La Mesa Watershed":           "Quezon City",
  "UP Diliman Campus":           "Quezon City",
  "Marikina Watershed":          "Marikina",
  "Laguna de Bay":               "Muntinlupa",
  "NAPWC":                       "Parañaque",
  "Las Piñas-Parañaque Wetlands":"Las Piñas",
};

function makeCounts(r:number,m:number,lt:number,ls:number,yi=0,mf=1): SpeciesCounts {
  return { resident:Math.round(r+yi*0.5), migratory:Math.round(m*mf+yi*0.3), lightTolerant:Math.round(lt+yi*0.2), lightSensitive:Math.round(ls+yi*0.4) };
}
function buildSiteData(base:{r:number;m:number;lt:number;ls:number}): Record<number,Record<number,SpeciesCounts>> {
  const years=[2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024];
  const boost: Record<number,number>={1:1.8,2:1.9,3:1.6,10:1.4,11:1.7,12:1.9};
  const d: Record<number,Record<number,SpeciesCounts>>={};
  years.forEach((yr,yi)=>{
    d[yr]={};
    d[yr][0]=makeCounts(base.r,base.m,base.lt,base.ls,yi);
    for(let mo=1;mo<=12;mo++) d[yr][mo]=makeCounts(base.r,base.m,base.lt,base.ls,yi,boost[mo]??0.6);
  });
  return d;
}

const OBS_SITES: ObsSite[] = [
  {name:"La Mesa Watershed",lat:14.72,lon:121.12,
   speciesByYear:buildSiteData({r:42,m:28,lt:18,ls:24}),
   species:["Philippine Eagle-Owl","Black-and-cinnamon Fantail","White-bellied Woodpecker","Philippine Hawk-Eagle","Colasisi","Blue-naped Parrot","Philippine Coucal","Rufous Hornbill","Philippine Bulbul","Luzon Hornbill"]},
  {name:"UP Diliman Campus",lat:14.652,lon:121.065,
   speciesByYear:buildSiteData({r:31,m:14,lt:20,ls:11}),
   species:["Yellow-vented Bulbul","Pied Fantail","Olive-backed Sunbird","Brown Shrike","Eurasian Tree Sparrow","Collared Kingfisher","Blue-tailed Bee-eater","Pacific Swallow","Philippine Myna","Common Sandpiper"]},
  {name:"Marikina Watershed",lat:14.635,lon:121.13,
   speciesByYear:buildSiteData({r:38,m:22,lt:15,ls:18}),
   species:["Philippine Kingfisher","Rufous Paradise-flycatcher","Philippine Flowerpecker","Ashy Ground-thrush","Long-tailed Shrike","Blue Rock-thrush","Philippine Trogon","White-throated Kingfisher","Black-naped Oriole","Philippine Fairy-bluebird"]},
  {name:"Laguna de Bay",lat:14.38,lon:121.18,
   speciesByYear:buildSiteData({r:56,m:44,lt:22,ls:35}),
   species:["Whiskered Tern","Black-crowned Night Heron","Purple Heron","Great Egret","Little Egret","Intermediate Egret","Gray Heron","Philippine Duck","Cotton Pygmy-goose","Little Grebe","Philippine Moorhen","Common Sandpiper"]},
  {name:"NAPWC",lat:14.52,lon:121.00,
   speciesByYear:buildSiteData({r:24,m:12,lt:16,ls:8}),
   species:["Rock Pigeon","Common Myna","Zebra Dove","Spotted Dove","Eurasian Tree Sparrow","Glossy Swiftlet","Pacific Swallow","Philippine Myna","Common Kingfisher","White-collared Kingfisher"]},
  {name:"Las Piñas-Parañaque Wetlands",lat:14.445,lon:120.99,
   speciesByYear:buildSiteData({r:48,m:36,lt:14,ls:28}),
   species:["Kentish Plover","Little Ringed Plover","Common Sandpiper","Wood Sandpiper","Marsh Sandpiper","Red-necked Stint","Dunlin","Curlew Sandpiper","Whimbrel","Pacific Golden-Plover","Little Tern","Black-winged Stilt"]},
];

function buildYearData(base:number,peak:number,offset=0) {
  const curve=[0,3,11,24,33,38,36,30,24,18,10,3];
  return MONTHS_S.map((month,i)=>({month,count:Math.round(base+(curve[i]/38)*(peak-base)+offset*Math.sin(i*0.5))}));
}
const BIRD_DATA_BY_YEAR: Record<number,{month:string;count:number}[]> = {
  2014:buildYearData(95,130,2),  2015:buildYearData(98,136,3),  2016:buildYearData(102,143,-2),
  2017:buildYearData(110,158,4), 2018:buildYearData(105,150,-3),2019:buildYearData(100,143,2),
  2020:buildYearData(118,188,6), 2021:buildYearData(120,168,3), 2022:buildYearData(118,172,-2),
  2023:buildYearData(124,178,4), 2024:buildYearData(128,185,3),
};

function CustomTooltip({active,payload,label}:any) {
  if(!active||!payload?.length) return null;
  return (
    <div className="bg-[#1e2538] border border-[#2a2f42] rounded px-3 py-2 text-xs text-white shadow-lg">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="text-blue-400 font-bold">{payload[0].value} species</p>
    </div>
  );
}

function ndviColor(v:number):string {
  const t=Math.max(0,Math.min(1,v/0.6));
  return `rgba(${Math.round(180-t*160)},${Math.round(80+t*140)},20,0.75)`;
}
function viirsColor(v:number):string {
  const t=Math.max(0,Math.min(1,(v-20)/40));
  return `rgba(${Math.round(10+t*245)},${Math.round(10+t*220)},${Math.round(10+t*80)},0.75)`;
}
function ltColor(v:number,mode:LandTempMode):string {
  const min=mode==="Day"?33:24, max=mode==="Day"?41:30;
  const t=Math.max(0,Math.min(1,(v-min)/(max-min)));
  return `rgba(${Math.round(20+t*230)},${Math.round(80-t*60)},${Math.round(220-t*210)},0.75)`;
}
function precipColor(v:number):string {
  const t=Math.max(0,Math.min(1,(v-150)/110));
  return `rgba(${Math.round(180-t*160)},${Math.round(210-t*50)},240,0.75)`;
}

// ── Site Detail Panel ─────────────────────────────────────────────────────────
function SiteDetailPanel({site,selectedYear,selectedMonth,activeEnvFilter,landTempMode,lightMode,card,subText,headingText,onClose}:{
  site:ObsSite; selectedYear:number; selectedMonth:number;
  activeEnvFilter:EnvFilter|null; landTempMode:LandTempMode;
  lightMode:boolean; card:string; subText:string; headingText:string; onClose:()=>void;
}) {
  const counts   = site.speciesByYear[selectedYear]?.[selectedMonth] ?? site.speciesByYear[2024][0];
  const total    = counts.resident+counts.migratory+counts.lightTolerant+counts.lightSensitive;
  const cityName = SITE_CITY[site.name] ?? "Metro Manila";
  const city     = MM_CITIES.find(c=>c.name===cityName);
  const yearIdx  = selectedYear-2014;
  const mf       = selectedMonth===0?1.0:[1.02,1.04,1.03,0.98,0.97,0.96,0.95,0.96,0.98,1.00,1.01,1.03][selectedMonth-1];

  function getEnvValue():string {
    if(!activeEnvFilter||!city) return "—";
    if(activeEnvFilter==="landcover"){const d=city.dominantLandCover;return `${d} (${city.landCoverBreakdown[d]??0}%)`;}
    if(activeEnvFilter==="ndvi") return (city.ndvi*mf*(1-yearIdx*0.003)).toFixed(3);
    if(activeEnvFilter==="viirs") return `${(city.viirs*(1+yearIdx*0.008)*(selectedYear===2020?0.92:1)).toFixed(1)} nW`;
    if(activeEnvFilter==="landtemp"){
      const base=landTempMode==="Day"?city.landTempDay:city.landTempNight;
      return `${(base+yearIdx*0.05+(selectedMonth===0?0:[0.2,0.4,0.6,0.7,0.5,0.3,0.1,-0.1,-0.2,0.0,0.1,0.2][selectedMonth-1])).toFixed(1)}°C`;
    }
    return `${Math.round(city.precip*(selectedMonth===0?1:[0.4,0.3,0.3,0.5,0.8,1.4,1.7,1.6,1.5,1.1,0.8,0.5][selectedMonth-1]))} mm`;
  }

  const ENV_LABELS:Record<EnvFilter,string>={landcover:"Land Cover",ndvi:"NDVI",viirs:"VIIRS (Light Intensity)",landtemp:`Land Temp (${landTempMode})`,precip:"Precipitation"};
  const envAccent = !activeEnvFilter||!city?"#6b7280"
    :activeEnvFilter==="landcover"?LAND_COLORS[city.dominantLandCover]
    :activeEnvFilter==="ndvi"?"#82c341":activeEnvFilter==="viirs"?"#f5a623"
    :activeEnvFilter==="landtemp"?"#f97316":"#38bdf8";

  return (
    <div className={`${card} p-4 space-y-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-widest mb-0.5" style={{color:lightMode?"#6b7280":"#9ca3af",fontWeight:600}}>Observation Site</p>
          <p className={`font-bold text-sm ${headingText} leading-tight`}>{site.name}</p>
          <p className={`text-xs ${subText} mt-0.5`}>📍 {cityName}, Metro Manila</p>
        </div>
        <button onClick={onClose}
          className={`shrink-0 w-6 h-6 flex items-center justify-center rounded text-xs font-bold transition-colors ${lightMode?"text-gray-500 hover:text-gray-800 hover:bg-gray-100":"text-gray-500 hover:text-white hover:bg-white/10"}`}>
          ✕
        </button>
      </div>

      {activeEnvFilter && (
        <div className={`rounded-lg p-3 ${lightMode?"bg-gray-50 border border-gray-200":"bg-[#0f172a] border border-[#2a2f42]"}`}>
          <p className={`text-xs ${subText} mb-1`}>{ENV_LABELS[activeEnvFilter]} · {selectedYear} · {MONTHS_ALL[selectedMonth]}</p>
          <p className="text-base font-bold" style={{color:envAccent}}>{getEnvValue()}</p>
        </div>
      )}

      <div>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${subText}`}>Observed Species by Category</p>
        <div className="space-y-2">
          {[
            {label:"Resident",       val:counts.resident,       bar:"bg-emerald-500",text:"text-emerald-400"},
            {label:"Migratory",      val:counts.migratory,      bar:"bg-amber-500",  text:"text-amber-400"},
            {label:"Light Tolerant", val:counts.lightTolerant,  bar:"bg-blue-500",   text:"text-blue-400"},
            {label:"Light Sensitive",val:counts.lightSensitive, bar:"bg-red-500",    text:"text-red-400"},
          ].map((row,i)=>(
            <div key={i}>
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-xs ${subText}`}>{row.label}</span>
                <span className={`text-xs font-bold ${row.text}`}>{row.val} spp.</span>
              </div>
              <div className={`h-1.5 rounded-full ${lightMode?"bg-gray-200":"bg-[#2a2f42]"}`}>
                <div className={`h-1.5 rounded-full ${row.bar}`} style={{width:`${total>0?Math.round((row.val/total)*100):0}%`,transition:"width 0.4s ease"}}/>
              </div>
            </div>
          ))}
        </div>
        <p className={`text-xs ${subText} pt-2 border-t mt-2 ${lightMode?"border-gray-200":"border-[#2a2f42]"}`}>
          Total: <span className={`ml-1 font-bold ${headingText}`}>{total} spp.</span>
        </p>
      </div>

      <div>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${subText}`}>Species Recorded</p>
        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {site.species.map((sp,i)=>(
            <div key={i} className={`flex items-center gap-2 text-xs ${lightMode?"text-gray-700":"text-gray-300"}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"/>
              <span className="italic">{sp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Metro Manila Map ──────────────────────────────────────────────────────────
function MetroManilaMap({lightMode,selectedYear,selectedMonth,showBirds,activeEnvFilter,landTempMode,selectedLandTypes,onSiteSelect,selectedSiteIdx}:{
  lightMode:boolean; selectedYear:number; selectedMonth:number;
  showBirds:boolean; activeEnvFilter:EnvFilter|null; landTempMode:LandTempMode;
  selectedLandTypes:Set<LandType>; onSiteSelect:(idx:number|null)=>void; selectedSiteIdx:number|null;
}) {
  const [hovCity,setHovCity]=useState<string|null>(null);
  const [hovObs, setHovObs] =useState<number|null>(null);
  const [zoom,   setZoom]   =useState(1);
  const bgColor=lightMode?"#c8d8ec":"#0d1624";

  function totalSp(c:SpeciesCounts){return c.resident+c.migratory+c.lightTolerant+c.lightSensitive;}

  function cityFill(city:MMCity):string {
    if(activeEnvFilter==="landcover"){
      const ok=selectedLandTypes.has(city.dominantLandCover);
      return ok?LAND_COLORS[city.dominantLandCover]+"dd":LAND_COLORS[city.dominantLandCover]+"28";
    }
    if(activeEnvFilter==="ndvi")     return ndviColor(city.ndvi);
    if(activeEnvFilter==="viirs")    return viirsColor(city.viirs);
    if(activeEnvFilter==="landtemp") return ltColor(landTempMode==="Day"?city.landTempDay:city.landTempNight,landTempMode);
    if(activeEnvFilter==="precip")   return precipColor(city.precip);
    return lightMode?"#7a9cbf99":"#28344899";
  }

  const hovCityObj=hovCity?MM_CITIES.find(c=>c.id===hovCity):null;

  return (
    <div className="relative w-full h-full flex flex-col rounded-lg overflow-hidden" style={{background:bgColor}}>
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        {[{Icon:ZoomIn,fn:()=>setZoom(z=>Math.min(z+0.25,3))},{Icon:ZoomOut,fn:()=>setZoom(z=>Math.max(z-0.25,0.5))}].map(({Icon,fn},i)=>(
          <button key={i} onClick={fn} className="w-7 h-7 flex items-center justify-center rounded bg-[#1e2538]/90 border border-[#2a2f42] text-gray-300 hover:text-white transition-colors"><Icon size={13}/></button>
        ))}
        <div className="text-center mt-0.5"><span className="text-gray-500" style={{fontSize:"10px"}}>{Math.round(zoom*100)}%</span></div>
      </div>

      {activeEnvFilter && (
        <div className="absolute top-3 right-3 z-10 bg-[#1a2030]/95 border border-[#2a2f42] rounded-lg px-3 py-2.5 max-w-[160px]">
          {activeEnvFilter==="landcover" && (<>
            <p className="text-gray-400 uppercase mb-2" style={{fontSize:"9px",fontWeight:700,letterSpacing:"0.08em"}}>Land Cover</p>
            <div className="space-y-1">
              {LAND_LEGEND.filter(lt=>MM_CITIES.some(c=>c.dominantLandCover===lt)).map(lt=>(
                <div key={lt} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{background:LAND_COLORS[lt]}}/>
                  <span className="text-gray-300" style={{fontSize:"9px"}}>{lt}</span>
                </div>
              ))}
            </div>
          </>)}
          {activeEnvFilter==="ndvi" && (<>
            <p className="text-gray-400 uppercase mb-2" style={{fontSize:"9px",fontWeight:700,letterSpacing:"0.08em"}}>NDVI Index</p>
            {[[0.05,"Low"],[0.25,"Mid"],[0.42,"High"]].map(([v,l])=>(
              <div key={String(l)} className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded" style={{background:ndviColor(Number(v))}}/>
                <span className="text-gray-400" style={{fontSize:"9px"}}>{l} ({v})</span>
              </div>
            ))}
          </>)}
          {activeEnvFilter==="viirs" && (<>
            <p className="text-gray-400 uppercase mb-2" style={{fontSize:"9px",fontWeight:700,letterSpacing:"0.08em"}}>VIIRS (nW)</p>
            {[[28,"Low"],[42,"Mid"],[56,"High"]].map(([v,l])=>(
              <div key={String(l)} className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded" style={{background:viirsColor(Number(v))}}/>
                <span className="text-gray-400" style={{fontSize:"9px"}}>{l} ({v})</span>
              </div>
            ))}
          </>)}
          {activeEnvFilter==="landtemp" && (<>
            <p className="text-gray-400 uppercase mb-2" style={{fontSize:"9px",fontWeight:700,letterSpacing:"0.08em"}}>Land Temp ({landTempMode})</p>
            {(landTempMode==="Day"?[[34,"Cool"],[37,"Mid"],[40,"Hot"]]:[[25,"Cool"],[27,"Mid"],[30,"Hot"]]).map(([v,l])=>(
              <div key={String(l)} className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded" style={{background:ltColor(Number(v),landTempMode)}}/>
                <span className="text-gray-400" style={{fontSize:"9px"}}>{l} ({v}°C)</span>
              </div>
            ))}
          </>)}
          {activeEnvFilter==="precip" && (<>
            <p className="text-gray-400 uppercase mb-2" style={{fontSize:"9px",fontWeight:700,letterSpacing:"0.08em"}}>Precipitation</p>
            {[[160,"Low"],[200,"Mid"],[245,"High"]].map(([v,l])=>(
              <div key={String(l)} className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded" style={{background:precipColor(Number(v))}}/>
                <span className="text-gray-400" style={{fontSize:"9px"}}>{l} ({v}mm)</span>
              </div>
            ))}
          </>)}
        </div>
      )}
      {!activeEnvFilter&&!showBirds&&(
        <div className="absolute top-3 right-3 z-10 bg-[#1a2030]/90 border border-[#2a2f42] rounded-lg px-3 py-2 text-gray-500 text-center" style={{fontSize:"10px",maxWidth:"130px"}}>
          Enable a filter or bird data to overlay
        </div>
      )}

      <div className="flex-1 overflow-hidden flex items-center justify-center">
        <svg viewBox={`0 0 ${MM_W} ${MM_H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full"
          style={{transform:`scale(${zoom})`,transformOrigin:"center center",transition:"transform 0.2s cubic-bezier(0.4,0,0.2,1)"}}>
          <defs>
            <radialGradient id="hov-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5"/><stop offset="100%" stopColor="#60a5fa" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="sel-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6"/><stop offset="100%" stopColor="#a78bfa" stopOpacity="0"/>
            </radialGradient>
            <pattern id="mmGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke={lightMode?"rgba(0,0,0,0.05)":"rgba(255,255,255,0.03)"} strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect x="0" y="0" width={MM_W} height={MM_H} fill="url(#mmGrid)"/>

          {MM_CITIES.map(city=>{
            const isHov=hovCity===city.id;
            return (
              <polygon key={city.id} points={mmPts(city.polygon)}
                fill={cityFill(city)}
                stroke={isHov?"#93c5fd":(lightMode?"rgba(0,0,0,0.55)":"rgba(255,255,255,0.38)")}
                strokeWidth={isHov?2.5:1.2} strokeLinejoin="round"
                style={{cursor:"pointer",transition:"all 0.15s ease"}}
                onMouseEnter={()=>setHovCity(city.id)} onMouseLeave={()=>setHovCity(null)}/>
            );
          })}
          {hovCityObj&&<polygon points={mmPts(hovCityObj.polygon)} fill="none" stroke="#93c5fd" strokeWidth="2.5" strokeLinejoin="round" style={{pointerEvents:"none"}}/>}

          {MM_CITIES.map(city=>{
            const [lx,ly]=mmll(city.labelAt[0],city.labelAt[1]);
            const isHov=hovCity===city.id;
            return (
              <text key={`lbl-${city.id}`} x={lx} y={ly} textAnchor="middle"
                fill={isHov?"#bfdbfe":"rgba(255,255,255,0.82)"}
                fontSize={isHov?"8.5":"7.5"} fontWeight={isHov?"700":"600"}
                paintOrder="stroke" stroke="rgba(0,0,0,0.65)" strokeWidth="2.5"
                style={{pointerEvents:"none"}}>{city.name}</text>
            );
          })}

          {showBirds&&(()=>{
            function renderSite(site:ObsSite,i:number,isHov:boolean){
              const [sx,sy]=mmll(site.lat,site.lon);
              const counts=site.speciesByYear[selectedYear]?.[selectedMonth]??site.speciesByYear[2024][0];
              const total=totalSp(counts);
              const r=Math.max(7,Math.min(15,5+total/13));
              const isSelected=selectedSiteIdx===i;
              const ttW=148,ttH=74;
              const ttX=sx>MM_W*0.62?sx-ttW-8:sx+8;
              const ttY=sy-ttH-14;
              return (
                <g key={i} style={{isolation:"isolate"}}>
                  {isSelected&&<circle cx={sx} cy={sy} r={r+22} fill="url(#sel-glow)"/>}
                  {isHov&&!isSelected&&<circle cx={sx} cy={sy} r={r+18} fill="url(#hov-glow)"/>}
                  <circle cx={sx} cy={sy} r={isHov||isSelected?r+4:r+2.5}
                    fill={isSelected?"rgba(167,139,250,0.22)":"rgba(59,130,246,0.22)"}
                    stroke={isSelected?"#a78bfa":isHov?"#93c5fd":"#60a5fa"}
                    strokeWidth={isHov||isSelected?2:1.3} style={{transition:"all 0.15s ease"}}/>
                  <circle cx={sx} cy={sy} r={isHov||isSelected?r+1:r}
                    fill={isSelected?"rgba(167,139,250,0.65)":`rgba(59,130,246,${0.52+(total/320)*0.3})`}
                    style={{cursor:"pointer",transition:"all 0.15s ease"}}
                    onMouseEnter={()=>setHovObs(i)} onMouseLeave={()=>setHovObs(null)}
                    onClick={()=>onSiteSelect(isSelected?null:i)}/>
                  <circle cx={sx} cy={sy} r={2.5} fill="white" style={{pointerEvents:"none"}}/>
                  {isHov&&!isSelected&&(
                    <g style={{pointerEvents:"none"}}>
                      <line x1={sx} y1={sy-r-4} x2={sx} y2={ttY+ttH} stroke="#334155" strokeWidth="0.8" strokeDasharray="2,2"/>
                      <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="5" fill="#0f172a" stroke="#334155" strokeWidth="0.8" filter="drop-shadow(0 4px 12px rgba(0,0,0,0.85))"/>
                      <rect x={ttX} y={ttY} width="3.5" height={ttH} rx="2" fill="#3b82f6"/>
                      <text x={ttX+10} y={ttY+14} fill="white" fontSize="7.5" fontWeight="700">
                        {site.name.length>22?site.name.slice(0,22)+"…":site.name}
                      </text>
                      <line x1={ttX+6} y1={ttY+18} x2={ttX+ttW-6} y2={ttY+18} stroke="#1e293b" strokeWidth="0.8"/>
                      {[
                        {label:"Resident",       val:counts.resident,      color:"#34d399"},
                        {label:"Migratory",      val:counts.migratory,     color:"#fbbf24"},
                        {label:"Light Tolerant", val:counts.lightTolerant, color:"#60a5fa"},
                        {label:"Light Sensitive",val:counts.lightSensitive,color:"#f87171"},
                      ].map((row,ri)=>(
                        <g key={ri}>
                          <circle cx={ttX+13} cy={ttY+26+ri*11} r="2.5" fill={row.color}/>
                          <text x={ttX+19} y={ttY+29.5+ri*11} fill="#cbd5e1" fontSize="6">{row.label}</text>
                          <text x={ttX+ttW-8} y={ttY+29.5+ri*11} textAnchor="end" fill={row.color} fontSize="6.5" fontWeight="700">{row.val}</text>
                        </g>
                      ))}
                      <text x={ttX+10} y={ttY+68} fill="#94a3b8" fontSize="5.5">Click to view details</text>
                    </g>
                  )}
                </g>
              );
            }
            // Render order: unselected/unhovered base → selected → hovered on top
            return (
              <>
                {OBS_SITES.map((site,i)=>(i!==hovObs&&i!==selectedSiteIdx)?renderSite(site,i,false):null)}
                {selectedSiteIdx!==null&&selectedSiteIdx!==hovObs&&renderSite(OBS_SITES[selectedSiteIdx],selectedSiteIdx,false)}
                {hovObs!==null&&renderSite(OBS_SITES[hovObs],hovObs,true)}
              </>
            );
          })()}

          {hovCityObj&&activeEnvFilter&&(()=>{
            const [cx,cy]=mmll(hovCityObj.labelAt[0],hovCityObj.labelAt[1]);
            const ttW=172;
            const envRows:{label:string;val:string;color:string}[]=[];
            if(activeEnvFilter==="landcover")
              Object.entries(hovCityObj.landCoverBreakdown).sort(([,a],[,b])=>(b??0)-(a??0)).slice(0,4).forEach(([lt,pct])=>envRows.push({label:lt,val:`${pct}%`,color:LAND_COLORS[lt as LandType]??"#aaa"}));
            else if(activeEnvFilter==="ndvi") envRows.push({label:"NDVI",val:hovCityObj.ndvi.toFixed(3),color:ndviColor(hovCityObj.ndvi)});
            else if(activeEnvFilter==="viirs") envRows.push({label:"VIIRS",val:`${hovCityObj.viirs.toFixed(1)} nW`,color:viirsColor(hovCityObj.viirs)});
            else if(activeEnvFilter==="landtemp"){const v=landTempMode==="Day"?hovCityObj.landTempDay:hovCityObj.landTempNight;envRows.push({label:`Temp (${landTempMode})`,val:`${v.toFixed(1)}°C`,color:ltColor(v,landTempMode)});}
            else if(activeEnvFilter==="precip") envRows.push({label:"Precipitation",val:`${hovCityObj.precip} mm`,color:precipColor(hovCityObj.precip)});
            const rh=15,ttH=26+envRows.length*rh;
            const ttX=cx>MM_W*0.62?cx-ttW-8:cx+10;
            const ttY=cy>MM_H*0.7?cy-ttH-6:cy-10;
            return (
              <g style={{pointerEvents:"none"}}>
                <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="4" fill="#0f172a" stroke="#334155" strokeWidth="0.8" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.6))"/>
                <text x={ttX+8} y={ttY+14} fill="white" fontSize="8" fontWeight="700">{hovCityObj.name}</text>
                <line x1={ttX+4} y1={ttY+18} x2={ttX+ttW-4} y2={ttY+18} stroke="#1e293b" strokeWidth="0.7"/>
                {envRows.map((row,ri)=>(
                  <g key={ri}>
                    <rect x={ttX+6} y={ttY+22+ri*rh} width={5} height={rh-4} rx="1" fill={row.color} opacity="0.88"/>
                    <text x={ttX+16} y={ttY+30+ri*rh} fill="#cbd5e1" fontSize="6">{row.label}</text>
                    <text x={ttX+ttW-7} y={ttY+30+ri*rh} textAnchor="end" fill="white" fontSize="7" fontWeight="700">{row.val}</text>
                  </g>
                ))}
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

// ── Philippine risk map ───────────────────────────────────────────────────────
function PhilippineMap({lightMode}:{lightMode:boolean}) {
  const [hovRisk,setHovRisk]=useState<number|null>(null);
  const [zoom,setZoom]=useState(1);
  return (
    <div className="relative w-full h-full flex flex-col rounded-lg overflow-hidden" style={{background:lightMode?"#dde3ef":"#111827"}}>
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
        {[{Icon:ZoomIn,fn:()=>setZoom(z=>Math.min(z+0.2,2.4))},{Icon:ZoomOut,fn:()=>setZoom(z=>Math.max(z-0.2,0.6))}].map(({Icon,fn},i)=>(
          <button key={i} onClick={fn} className="w-7 h-7 flex items-center justify-center rounded bg-[#1e2538]/90 border border-[#2a2f42] text-gray-300 hover:text-white transition-colors"><Icon size={13}/></button>
        ))}
        <div className="text-center mt-0.5"><span className="text-gray-500" style={{fontSize:"10px"}}>{Math.round(zoom*100)}%</span></div>
      </div>
      <div className="absolute top-3 right-3 z-10 bg-[#1a2030]/95 border border-[#2a2f42] rounded-lg px-3 py-2.5">
        <p className="text-gray-500 uppercase mb-2" style={{fontSize:"9px",fontWeight:700,letterSpacing:"0.08em"}}>Light Risk Zones</p>
        {(["Low","Medium","High"] as RiskLevel[]).map(r=>(
          <div key={r} className="flex items-center gap-2 mb-1.5 last:mb-0">
            <span className="w-2.5 h-2.5 rounded-full" style={{background:RISK_COLOR[r]}}/>
            <span className="text-gray-300" style={{fontSize:"11px"}}>{r} Risk</span>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-hidden flex items-center justify-center p-2">
        <svg viewBox="-10 115 460 575" preserveAspectRatio="xMidYMid meet" className="w-full h-full"
          style={{transform:`scale(${zoom})`,transformOrigin:"center center",transition:"transform 0.25s cubic-bezier(0.4,0,0.2,1)"}}>
          <defs>
            {(["Low","Medium","High"] as RiskLevel[]).map(r=>(
              <radialGradient key={r} id={`mg-${r}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={RISK_COLOR[r]} stopOpacity="0.7"/>
                <stop offset="100%" stopColor={RISK_COLOR[r]} stopOpacity="0"/>
              </radialGradient>
            ))}
            <pattern id="seaGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={lightMode?"rgba(0,0,0,0.04)":"rgba(255,255,255,0.02)"} strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect x="-20" y="100" width="500" height="610" fill="url(#seaGrid)"/>
          {Object.entries(ISLANDS).map(([name,p])=>(
            <polygon key={name} points={p} fill={lightMode?"#b8c2d4":"#28334a"} stroke={lightMode?"#96a3b8":"#1c2438"} strokeWidth="0.8" strokeLinejoin="round"/>
          ))}
          {(()=>{const [mx,my]=geo(121.02,14.58);return(
            <g><rect x={mx-30} y={my-22} width={62} height={13} rx="2" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5"/>
            <text x={mx+1} y={my-12} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="6" fontWeight="600">Metro Manila</text></g>
          );})()}
          {RISK_ZONES.map((zone,i)=>{
            const [x,y]=geo(zone.lon,zone.lat);
            const hov=hovRisk===i,color=RISK_COLOR[zone.risk];
            const ttW=118,ttH=40,ttX=x>320?x-ttW-6:x+11,ttY=y>630?y-ttH-4:y-6;
            return (
              <g key={i}>
                {hov&&<circle cx={x} cy={y} r={20} fill={`url(#mg-${zone.risk})`}/>}
                <circle cx={x} cy={y} r={hov?8.5:6.5} fill="rgba(0,0,0,0.45)" stroke={color} strokeWidth={hov?2:1.5} style={{transition:"all 0.15s ease"}}/>
                <circle cx={x} cy={y} r={hov?5:3.8} fill={color} style={{transition:"all 0.15s ease",cursor:"pointer"}} onMouseEnter={()=>setHovRisk(i)} onMouseLeave={()=>setHovRisk(null)}/>
                {hov&&(
                  <g style={{pointerEvents:"none"}}>
                    <rect x={ttX} y={ttY} width={ttW} height={ttH} rx="4" fill="#141c2e" stroke="#2a3550" strokeWidth="0.8" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"/>
                    <rect x={ttX} y={ttY} width="3" height={ttH} rx="2" fill={color}/>
                    <text x={ttX+9} y={ttY+14} fill="white" fontSize="7.5" fontWeight="600">{zone.name.length>17?zone.name.slice(0,17)+"…":zone.name}</text>
                    <rect x={ttX+9} y={ttY+22} width={38} height={11} rx="2" fill={`${color}25`}/>
                    <text x={ttX+28} y={ttY+30} textAnchor="middle" fill={color} fontSize="6.5" fontWeight="600">{zone.risk} Risk</text>
                    <text x={ttX+54} y={ttY+30} fill="#9ca3af" fontSize="6.5">{zone.detail}</text>
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

// ── Historical right panel ────────────────────────────────────────────────────
function HistoricalPanel({lightMode,selectedYear,selectedMonth,activeEnvFilter,landTempMode,selectedLandTypes,card,subText,headingText}:{
  lightMode:boolean;selectedYear:number;selectedMonth:number;
  activeEnvFilter:EnvFilter|null;landTempMode:LandTempMode;selectedLandTypes:Set<LandType>;
  card:string;subText:string;headingText:string;
}){
  const [showAllCities,setShowAllCities]=useState(false);
  const mmSites=OBS_SITES.slice(0,6);
  const totals=mmSites.reduce((acc,site)=>{
    const c=site.speciesByYear[selectedYear]?.[selectedMonth]??site.speciesByYear[2024][0];
    acc.resident+=c.resident;acc.migratory+=c.migratory;acc.lightTolerant+=c.lightTolerant;acc.lightSensitive+=c.lightSensitive;
    return acc;
  },{resident:0,migratory:0,lightTolerant:0,lightSensitive:0});
  const grand=totals.resident+totals.migratory+totals.lightTolerant+totals.lightSensitive;

  const yi=selectedYear-2014;
  const mf=selectedMonth===0?1.0:[1.02,1.04,1.03,0.98,0.97,0.96,0.95,0.96,0.98,1.00,1.01,1.03][selectedMonth-1];
  const yf=1+yi*0.008;
  const mAdj=selectedMonth===0?0:[0.2,0.4,0.6,0.7,0.5,0.3,0.1,-0.1,-0.2,0.0,0.1,0.2][selectedMonth-1];
  const mMult=selectedMonth===0?1:[0.4,0.3,0.3,0.5,0.8,1.4,1.7,1.6,1.5,1.1,0.8,0.5][selectedMonth-1];

  const avgNdvi  =(MM_CITIES.reduce((s,c)=>s+c.ndvi,0)/MM_CITIES.length)*mf*(1-yi*0.003);
  const avgViirs =(MM_CITIES.reduce((s,c)=>s+c.viirs,0)/MM_CITIES.length)*yf*(selectedYear===2020?0.92:1);
  const avgTemp  =(MM_CITIES.reduce((s,c)=>s+(landTempMode==="Day"?c.landTempDay:c.landTempNight),0)/MM_CITIES.length)+yi*0.05+mAdj;
  const avgPrecip=(MM_CITIES.reduce((s,c)=>s+c.precip,0)/MM_CITIES.length)*mMult;

  const sortedCities=[...MM_CITIES].sort((a,b)=>{
    if(activeEnvFilter==="landcover") return a.name.localeCompare(b.name);
    const va=activeEnvFilter==="ndvi"?a.ndvi:activeEnvFilter==="viirs"?a.viirs:activeEnvFilter==="landtemp"?(landTempMode==="Day"?a.landTempDay:a.landTempNight):a.precip;
    const vb=activeEnvFilter==="ndvi"?b.ndvi:activeEnvFilter==="viirs"?b.viirs:activeEnvFilter==="landtemp"?(landTempMode==="Day"?b.landTempDay:b.landTempNight):b.precip;
    return vb-va;
  });
  const visibleCities=showAllCities?sortedCities:sortedCities.slice(0,5);

  function cityVal(city:MMCity):string {
    if(activeEnvFilter==="landcover"){const d=city.dominantLandCover;return `${d} · ${city.landCoverBreakdown[d]??0}%`;}
    if(activeEnvFilter==="ndvi") return (city.ndvi*(mf*(1-yi*0.003))).toFixed(3);
    if(activeEnvFilter==="viirs") return `${(city.viirs*yf*(selectedYear===2020?0.92:1)).toFixed(1)} nW`;
    if(activeEnvFilter==="landtemp"){const base=landTempMode==="Day"?city.landTempDay:city.landTempNight;return `${(base+yi*0.05+mAdj).toFixed(1)}°C`;}
    return `${Math.round(city.precip*mMult)} mm`;
  }
  function cityAccent(city:MMCity):string {
    if(activeEnvFilter==="landcover") return LAND_COLORS[city.dominantLandCover]??"#6b7280";
    return activeEnvFilter==="ndvi"?"#82c341":activeEnvFilter==="viirs"?"#f5a623":activeEnvFilter==="landtemp"?"#f97316":"#38bdf8";
  }

  return (
    <div className="space-y-3">
      {/* Observation Count Per Category */}
      <div className={`${card} p-4`}>
        <p className="text-xs uppercase tracking-widest mb-1" style={{color:lightMode?"#6b7280":"#9ca3af",fontWeight:600}}>Observation Count Per Category</p>
        <p className={`text-xs ${subText} mb-3`}>{selectedYear} · {MONTHS_ALL[selectedMonth]} · Metro Manila (6 sites)</p>
        <div className="space-y-2.5">
          {[
            {label:"Resident",       val:totals.resident,      bar:"bg-emerald-500",text:"text-emerald-400"},
            {label:"Migratory",      val:totals.migratory,     bar:"bg-amber-500",  text:"text-amber-400"},
            {label:"Light Tolerant", val:totals.lightTolerant, bar:"bg-blue-500",   text:"text-blue-400"},
            {label:"Light Sensitive",val:totals.lightSensitive,bar:"bg-red-500",    text:"text-red-400"},
          ].map((row,i)=>(
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs ${subText}`}>{row.label}</span>
                <span className={`text-xs ${row.text} font-bold`}>{row.val} spp.</span>
              </div>
              <div className={`h-1.5 rounded-full ${lightMode?"bg-gray-200":"bg-[#2a2f42]"}`}>
                <div className={`h-1.5 rounded-full ${row.bar}`} style={{width:`${grand>0?Math.round((row.val/grand)*100):0}%`,transition:"width 0.4s ease"}}/>
              </div>
            </div>
          ))}
          <p className={`text-xs ${subText} pt-1.5 border-t ${lightMode?"border-gray-200":"border-[#2a2f42]"}`}>
            Total: <span className={`ml-1 ${headingText} font-bold`}>{grand} spp.</span>
          </p>
        </div>
      </div>

      {/* Environmental data */}
      {activeEnvFilter&&(
        <div className={`${card} p-4`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest" style={{color:lightMode?"#6b7280":"#9ca3af",fontWeight:600}}>Environmental Data</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${lightMode?"bg-gray-100 text-gray-600":"bg-[#2a2f42] text-gray-400"}`}>
              {selectedYear} · {MONTHS_ALL[selectedMonth]}
            </span>
          </div>

          {/* Metro Manila average — compact row, no bar */}
          {activeEnvFilter!=="landcover"&&(
            <div className={`flex items-center justify-between rounded-lg px-3 py-2 mb-3 ${lightMode?"bg-gray-50 border border-gray-200":"bg-[#0f172a] border border-[#2a2f42]"}`}>
              <span className={`text-xs ${subText}`}>Metro Manila avg</span>
              <span className="text-sm font-bold" style={{color:activeEnvFilter==="ndvi"?"#82c341":activeEnvFilter==="viirs"?"#f5a623":activeEnvFilter==="landtemp"?"#f97316":"#38bdf8"}}>
                {activeEnvFilter==="ndvi"?avgNdvi.toFixed(3):activeEnvFilter==="viirs"?`${avgViirs.toFixed(1)} nW`:activeEnvFilter==="landtemp"?`${avgTemp.toFixed(1)}°C`:`${Math.round(avgPrecip)} mm`}
              </span>
            </div>
          )}

          {/* Per-city list — value only, no bars */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className={`text-xs font-semibold ${subText}`}>Value per City</p>
              <p className={`text-xs ${subText}`}>{showAllCities?MM_CITIES.length:Math.min(5,MM_CITIES.length)} of {MM_CITIES.length}</p>
            </div>
            <div className="space-y-0.5">
              {visibleCities.map(city=>{
                const accent=cityAccent(city);
                return (
                  <div key={city.id} className={`flex items-center justify-between px-2 py-1.5 rounded-md ${lightMode?"hover:bg-gray-50":"hover:bg-white/5"} transition-colors`}>
                    <span className={`text-xs ${subText} truncate flex-1 mr-2`}>{city.name}</span>
                    {activeEnvFilter==="landcover"?(
                      <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                        <span className="w-2 h-2 rounded-sm shrink-0" style={{background:accent}}/>
                        <span className="text-xs font-semibold truncate" style={{color:accent,maxWidth:"110px"}}>{city.dominantLandCover}</span>
                        <span className={`text-xs font-bold shrink-0 ${lightMode?"text-gray-500":"text-gray-400"}`}>{city.landCoverBreakdown[city.dominantLandCover]??0}%</span>
                      </div>
                    ):(
                      <span className="text-xs font-bold shrink-0" style={{color:accent}}>{cityVal(city)}</span>
                    )}
                  </div>
                );
              })}
            </div>
            {MM_CITIES.length>5&&(
              <button onClick={()=>setShowAllCities(v=>!v)}
                className={`mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${lightMode?"bg-gray-100 text-gray-600 hover:bg-gray-200":"bg-[#2a2f42]/50 text-gray-400 hover:bg-[#2a2f42]"}`}>
                {showAllCities
                  ?<><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 7l3-3 3 3"/></svg>Show less</>
                  :<><svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2 3l3 3 3-3"/></svg>See all {MM_CITIES.length} cities</>}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function Dashboard() {
  const {lightMode}=useOutletContext<{lightMode:boolean}>();
  const [mapView,         setMapView]         =useState<MapView>("risk");
  const [selectedYear,    setSelectedYear]    =useState(2024);
  const [selectedMonth,   setSelectedMonth]   =useState(0);
  const [showBirds,       setShowBirds]       =useState(true);
  const [activeEnvFilter, setActiveEnvFilter] =useState<EnvFilter|null>(null);
  const [landTempMode,    setLandTempMode]    =useState<LandTempMode>("Day");
  const [selectedSiteIdx, setSelectedSiteIdx] =useState<number|null>(null);

  const card       =lightMode?"bg-white border border-gray-200 rounded-lg":"bg-[#1e2538] border border-[#2a2f42] rounded-lg";
  const subText    =lightMode?"text-gray-500":"text-gray-400";
  const headingText=lightMode?"text-gray-800":"text-white";
  const gridColor  =lightMode?"#e5e7eb":"#2a2f42";

  const currentData=BIRD_DATA_BY_YEAR[selectedYear];
  const prevData   =BIRD_DATA_BY_YEAR[Math.max(selectedYear-1,2014)];
  const maxCount   =Math.max(...currentData.map(d=>d.count));
  const prevMax    =Math.max(...prevData.map(d=>d.count));
  const pctChange  =(((maxCount-prevMax)/prevMax)*100).toFixed(1);
  const pctUp      =maxCount>=prevMax;
  const atRiskTotal=RISK_ZONES.filter(z=>z.risk!=="Low").length;
  const lightIntensity=Math.round(72+(selectedYear-2014)*0.8+(selectedYear===2020?-4:0));

  function toggleEnv(f:EnvFilter){setActiveEnvFilter(prev=>prev===f?null:f);}

  const [showLCDropdown,setShowLCDropdown]=useState(false);
  const [showLTDropdown,setShowLTDropdown]=useState(false);
  const [selectedLandTypes,setSelectedLandTypes]=useState<Set<LandType>>(new Set(LAND_LEGEND));
  const lcDropRef=useRef<HTMLDivElement>(null);
  const ltDropRef=useRef<HTMLDivElement>(null);

  function toggleLandType(lt:LandType){setSelectedLandTypes(prev=>{const n=new Set(prev);n.has(lt)?n.delete(lt):n.add(lt);return n;});}
  const allLCChecked=selectedLandTypes.size===LAND_LEGEND.length;
  const someLCChecked=selectedLandTypes.size>0&&!allLCChecked;
  function toggleAllLC(){setSelectedLandTypes(allLCChecked?new Set():new Set(LAND_LEGEND));}

  useEffect(()=>{
    function handle(e:MouseEvent){
      if(lcDropRef.current&&!lcDropRef.current.contains(e.target as Node)) setShowLCDropdown(false);
      if(ltDropRef.current&&!ltDropRef.current.contains(e.target as Node)) setShowLTDropdown(false);
    }
    document.addEventListener("mousedown",handle);
    return ()=>document.removeEventListener("mousedown",handle);
  },[]);

  // Recent Updates
  const recentUpdates=(()=>{
    if(selectedMonth===0){
      const pY=Math.max(selectedYear-1,2014);
      const c=OBS_SITES.reduce((a,s)=>{const x=s.speciesByYear[selectedYear]?.[0]??s.speciesByYear[2024][0];return{r:a.r+x.resident,m:a.m+x.migratory,lt:a.lt+x.lightTolerant,ls:a.ls+x.lightSensitive};},{r:0,m:0,lt:0,ls:0});
      const p=OBS_SITES.reduce((a,s)=>{const x=s.speciesByYear[pY]?.[0]??s.speciesByYear[2014][0];return{r:a.r+x.resident,m:a.m+x.migratory,lt:a.lt+x.lightTolerant,ls:a.ls+x.lightSensitive};},{r:0,m:0,lt:0,ls:0});
      const cT=c.r+c.m+c.lt+c.ls,pT=p.r+p.m+p.lt+p.ls,diff=cT-pT,pct=pT>0?Math.abs((diff/pT)*100).toFixed(1):"0";
      const vBase=MM_CITIES.reduce((s,x)=>s+x.viirs,0)/MM_CITIES.length;
      const vDiff=vBase*(1+(selectedYear-2014)*0.008*(selectedYear===2020?0.92:1))-vBase*(1+(pY-2014)*0.008*(pY===2020?0.92:1));
      return [
        {icon:diff>=0?<TrendingUp size={12} className="text-green-400"/>:<TrendingDown size={12} className="text-red-400"/>,bg:diff>=0?"bg-green-500/10":"bg-red-500/10",title:`Bird richness ${diff>=0?"increased":"decreased"} by ${pct}% vs ${pY}`,time:`${selectedYear} vs ${pY} (annual)`},
        {icon:vDiff<=0?<CheckCircle size={12} className="text-green-400"/>:<AlertTriangle size={12} className="text-yellow-400"/>,bg:vDiff<=0?"bg-green-500/10":"bg-yellow-500/10",title:`Avg VIIRS ${vDiff<=0?"decreased":"increased"} by ${Math.abs(vDiff).toFixed(1)} nW vs ${pY}`,time:`${selectedYear} vs ${pY} (annual)`},
        {icon:<Info size={12} className="text-blue-400"/>,bg:"bg-blue-500/10",title:`Monitoring period: ${pY}–${selectedYear} comparison active`,time:"Annual summary"},
      ];
    }
    const pm=selectedMonth===1?12:selectedMonth-1,pmY=selectedMonth===1?Math.max(selectedYear-1,2014):selectedYear;
    const c=OBS_SITES.reduce((a,s)=>{const x=s.speciesByYear[selectedYear]?.[selectedMonth]??s.speciesByYear[2024][0];return{r:a.r+x.resident,m:a.m+x.migratory,lt:a.lt+x.lightTolerant,ls:a.ls+x.lightSensitive};},{r:0,m:0,lt:0,ls:0});
    const p=OBS_SITES.reduce((a,s)=>{const x=s.speciesByYear[pmY]?.[pm]??s.speciesByYear[2024][0];return{r:a.r+x.resident,m:a.m+x.migratory,lt:a.lt+x.lightTolerant,ls:a.ls+x.lightSensitive};},{r:0,m:0,lt:0,ls:0});
    const cT=c.r+c.m+c.lt+c.ls,pT=p.r+p.m+p.lt+p.ls,diff=cT-pT,pct=pT>0?Math.abs((diff/pT)*100).toFixed(1):"0";
    const curMo=MONTHS_S[selectedMonth-1],prevMo=MONTHS_S[pm-1];
    return [
      {icon:diff>=0?<TrendingUp size={12} className="text-green-400"/>:<TrendingDown size={12} className="text-red-400"/>,bg:diff>=0?"bg-green-500/10":"bg-red-500/10",title:`Species count ${diff>=0?"up":"down"} ${pct}% vs ${prevMo}`,time:`${curMo} vs ${prevMo} ${selectedYear}`},
      {icon:selectedMonth>=6&&selectedMonth<=9?<AlertTriangle size={12} className="text-yellow-400"/>:<CheckCircle size={12} className="text-green-400"/>,bg:selectedMonth>=6&&selectedMonth<=9?"bg-yellow-500/10":"bg-green-500/10",title:selectedMonth>=6&&selectedMonth<=9?`Peak wet season — migratory activity elevated`:`Lower light intensity expected for ${curMo}`,time:`${curMo} ${selectedYear} seasonal note`},
      {icon:<Info size={12} className="text-blue-400"/>,bg:"bg-blue-500/10",title:`Monitoring update: ${curMo} ${selectedYear} data synced`,time:"Monthly update"},
    ];
  })();

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 bg-[#1a3a4a] border-b border-cyan-700/40 px-6 py-2.5 shrink-0">
        <span className="inline-block w-2 h-2 rounded-sm bg-cyan-400 shrink-0"/>
        <p className="text-sm text-cyan-300">
          <span className="font-semibold">Dataset Period: 2014 – 2024 | Monitoring Status: 2014 – 2024</span>
          <span className="text-cyan-400/70"> — Displaying year: </span>
          <span className="text-cyan-200 font-bold">{selectedYear}</span>
        </p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-0 min-h-0 overflow-hidden">
        {/* LEFT: Map */}
        <div className="lg:col-span-3 p-4 flex flex-col min-h-[500px] lg:min-h-0 gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 rounded-lg p-1 bg-[#0f172a] border border-[#2a2f42]">
              <button onClick={()=>setMapView("risk")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${mapView==="risk"?"bg-orange-500/20 text-orange-300 border border-orange-500/40":"text-gray-400 hover:text-gray-200"}`}
                style={{fontWeight:600}}><AlertTriangle size={11}/> Risk Zones</button>
              <button onClick={()=>setMapView("historical")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${mapView==="historical"?"bg-blue-500/20 text-blue-300 border border-blue-500/40":"text-gray-400 hover:text-gray-200"}`}
                style={{fontWeight:600}}><Eye size={11}/> Historical Data</button>
            </div>
            {mapView==="historical"&&(
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs ${subText} font-semibold`}>Year:</span>
                  <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))}
                    className="text-xs bg-[#1e2538] border border-[#2a2f42] text-white rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold">
                    {[2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024].map(y=><option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs ${subText} font-semibold`}>Month:</span>
                  <select value={selectedMonth} onChange={e=>setSelectedMonth(Number(e.target.value))}
                    className="text-xs bg-[#1e2538] border border-[#2a2f42] text-white rounded-md px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold">
                    {MONTHS_ALL.map((m,i)=><option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {mapView==="historical"&&(
            <div className={`flex items-center gap-1.5 flex-wrap px-3 py-2 rounded-lg border ${lightMode?"bg-gray-50 border-gray-200":"bg-[#141c2e] border-[#2a2f42]"}`}>
              <button onClick={()=>setShowBirds(v=>!v)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${showBirds?"bg-blue-600/25 text-blue-300 border border-blue-500/40":"text-gray-500 border border-[#2a2f42] hover:text-gray-300"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${showBirds?"bg-blue-400":"bg-gray-600"}`}/>
                🐦 Observation Data
              </button>
              <span className="w-px h-4 bg-[#2a2f42]"/>
              <span className={`text-xs ${subText} font-semibold`}>Env:</span>

              <div ref={lcDropRef} className="relative flex items-center">
                <button onClick={()=>{setActiveEnvFilter("landcover");setShowLCDropdown(v=>!v);}}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${activeEnvFilter==="landcover"?"text-white":"text-gray-500 border border-[#2a2f42] hover:text-gray-300"}`}
                  style={activeEnvFilter==="landcover"?{background:"#c0392b30",borderColor:"#c0392b60",border:"1px solid"}:{}}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{background:activeEnvFilter==="landcover"?"#c0392b":"#6b7280"}}/>
                  Land Cover
                  {activeEnvFilter==="landcover"&&selectedLandTypes.size<LAND_LEGEND.length&&(
                    <span className="ml-0.5 px-1 rounded-full text-white font-bold" style={{fontSize:"9px",background:"#c0392b",lineHeight:"14px"}}>{selectedLandTypes.size}</span>
                  )}
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className={`transition-transform ${showLCDropdown?"rotate-180":""}`}><path d="M1 2.5l3 3 3-3"/></svg>
                </button>
                {showLCDropdown&&(
                  <div className="absolute top-8 left-0 z-50 bg-[#0f172a] border border-[#2a2f42] rounded-lg shadow-2xl overflow-hidden" style={{minWidth:"200px"}}>
                    <div className="px-3 py-2 border-b border-[#1e2535] flex items-center gap-2 cursor-pointer select-none hover:bg-white/5 transition-colors" onClick={toggleAllLC}>
                      <span className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0"
                        style={{borderColor:allLCChecked||someLCChecked?"#c0392b":"#4b5563",background:allLCChecked?"#c0392b":someLCChecked?"rgba(192,57,43,0.25)":"transparent"}}>
                        {allLCChecked&&<svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5"><path d="M1 4l2 2 4-4"/></svg>}
                        {someLCChecked&&<span style={{width:"6px",height:"2px",background:"#c0392b",display:"block",borderRadius:"1px"}}/>}
                      </span>
                      <span className="text-gray-200 text-xs font-semibold flex-1">{allLCChecked?"Deselect All":"Select All"}</span>
                      <span className="text-gray-500 text-xs">{selectedLandTypes.size}/{LAND_LEGEND.length}</span>
                    </div>
                    <div className="py-1 max-h-52 overflow-y-auto">
                      {LAND_LEGEND.map(lt=>{
                        const checked=selectedLandTypes.has(lt);
                        return (
                          <div key={lt} onClick={()=>toggleLandType(lt)} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none hover:bg-white/5 transition-colors">
                            <span className="w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all"
                              style={{borderColor:checked?"#c0392b":"#4b5563",background:checked?"#c0392b":"transparent"}}>
                              {checked&&<svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="white" strokeWidth="1.5"><path d="M1 4l2 2 4-4"/></svg>}
                            </span>
                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{background:LAND_COLORS[lt],opacity:checked?1:0.4}}/>
                            <span className={`text-xs transition-colors ${checked?"text-gray-200":"text-gray-500"}`}>{lt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {(["ndvi","viirs","precip"] as const).map(key=>{
                const info={ndvi:{label:"NDVI",color:"#82c341"},viirs:{label:"VIIRS",color:"#f5a623"},precip:{label:"Precip",color:"#38bdf8"}}[key];
                const isActive=activeEnvFilter===key;
                return (
                  <button key={key} onClick={()=>toggleEnv(key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${isActive?"text-white":"text-gray-500 border border-[#2a2f42] hover:text-gray-300"}`}
                    style={isActive?{background:`${info.color}30`,borderColor:`${info.color}60`,border:"1px solid"}:{}}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{background:isActive?info.color:"#6b7280"}}/>{info.label}
                  </button>
                );
              })}

              <div ref={ltDropRef} className="relative flex items-center">
                <button onClick={()=>{toggleEnv("landtemp");setShowLTDropdown(v=>!v);}}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${activeEnvFilter==="landtemp"?"text-white":"text-gray-500 border border-[#2a2f42] hover:text-gray-300"}`}
                  style={activeEnvFilter==="landtemp"?{background:"#f9731630",borderColor:"#f9731660",border:"1px solid"}:{}}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{background:activeEnvFilter==="landtemp"?"#f97316":"#6b7280"}}/>
                  Land Temp {activeEnvFilter==="landtemp"&&<span className="opacity-75">({landTempMode})</span>}
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" className={`transition-transform ${showLTDropdown?"rotate-180":""}`}><path d="M1 2.5l3 3 3-3"/></svg>
                </button>
                {showLTDropdown&&(
                  <div className="absolute top-8 left-0 z-50 bg-[#0f172a] border border-[#2a2f42] rounded-lg shadow-2xl overflow-hidden" style={{minWidth:"120px"}}>
                    <div className="px-3 py-1.5 border-b border-[#1e2535]">
                      <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">Temperature Mode</span>
                    </div>
                    <div className="py-1">
                      {(["Day","Night"] as LandTempMode[]).map(m=>(
                        <button key={m} onClick={()=>{setLandTempMode(m);setActiveEnvFilter("landtemp");setShowLTDropdown(false);}}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors hover:bg-white/5 ${landTempMode===m&&activeEnvFilter==="landtemp"?"text-orange-300":"text-gray-300"}`}>
                          <span className="text-base">{m==="Day"?"☀️":"🌙"}</span>{m}
                          {landTempMode===m&&activeEnvFilter==="landtemp"&&<span className="ml-auto text-orange-400">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 min-h-0">
            {mapView==="risk"
              ?<PhilippineMap lightMode={lightMode}/>
              :<MetroManilaMap
                  lightMode={lightMode} selectedYear={selectedYear} selectedMonth={selectedMonth}
                  showBirds={showBirds} activeEnvFilter={activeEnvFilter} landTempMode={landTempMode}
                  selectedLandTypes={selectedLandTypes} onSiteSelect={setSelectedSiteIdx} selectedSiteIdx={selectedSiteIdx}/>
            }
          </div>
        </div>

        {/* RIGHT: Stats */}
        <div className="lg:col-span-2 flex flex-col gap-3 p-4 overflow-y-auto">

          {mapView==="risk"&&(<>
            <div className="grid grid-cols-2 gap-3">
              <div className={`${card} p-4`}>
                <p className="text-xs uppercase tracking-widest mb-2" style={{color:lightMode?"#6b7280":"#9ca3af",fontWeight:600}}>At Risk Zones</p>
                <div className="flex items-end gap-2 mb-1">
                  <span className={`text-4xl ${headingText} font-bold`} style={{lineHeight:1}}>{atRiskTotal}</span>
                  <span className="text-red-400 text-xs flex items-center gap-0.5 mb-0.5 font-semibold"><TrendingDown size={11}/> -5%</span>
                </div>
                <p className={`text-xs ${subText} leading-relaxed`}>Sites with <span className="text-yellow-400 font-semibold">Medium</span> or <span className="text-red-400 font-semibold">High</span> ALAN (&gt;30 nW).</p>
              </div>
              <div className={`${card} p-4`}>
                <p className="text-xs uppercase tracking-widest mb-2" style={{color:lightMode?"#6b7280":"#9ca3af",fontWeight:600}}>Light Intensity</p>
                <div className="flex items-end gap-2 mb-1">
                  <span className={`text-4xl ${headingText} font-bold`} style={{lineHeight:1}}>{lightIntensity}%</span>
                  <span className={`text-xs flex items-center gap-0.5 mb-0.5 font-semibold ${selectedYear===2020?"text-green-400":"text-orange-400"}`}>
                    {selectedYear===2020?<><TrendingDown size={11}/> -4%</>:<><TrendingUp size={11}/> +8%</>}
                  </span>
                </div>
                <p className={`text-xs ${subText} leading-relaxed`}>ALAN index for <span className={`${headingText} font-semibold`}>{selectedYear}</span>.{selectedYear===2020&&" ↓ COVID effect."}</p>
              </div>
            </div>

            <div className={`${card} p-4 flex-shrink-0`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs uppercase tracking-widest" style={{color:lightMode?"#6b7280":"#9ca3af",fontWeight:600}}>Bird Richness Trend</p>
                <span className={`text-xs ${subText}`}>2014 – 2024</span>
              </div>
              <div className="flex items-center gap-2 mb-3 mt-2">
                <span className={`text-xs ${subText} shrink-0`}>Year:</span>
                <input type="range" min={2014} max={2024} value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))}
                  className="flex-1 accent-blue-500 cursor-pointer" style={{height:"4px"}}/>
                <span className={`text-xs shrink-0 px-2 py-0.5 rounded font-bold ${lightMode?"bg-blue-100 text-blue-700":"bg-blue-500/20 text-blue-300"}`}>{selectedYear}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs ${subText}`}>Peak: <span className={`${headingText} font-semibold`}>{maxCount} species</span></span>
                <span className={`text-xs flex items-center gap-0.5 font-semibold ${pctUp?"text-green-400":"text-red-400"}`}>
                  {pctUp?<TrendingUp size={11}/>:<TrendingDown size={11}/>}{pctUp?"+":""}{pctChange}% vs prev year
                </span>
              </div>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={currentData} margin={{top:4,right:4,left:-22,bottom:0}}>
                  <defs>
                    <linearGradient id="birdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false}/>
                  <XAxis dataKey="month" tick={{fontSize:10,fill:"#6b7280"}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:"#6b7280"}} axisLine={false} tickLine={false} domain={["dataMin - 10","dataMax + 10"]}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#birdGrad)"
                    dot={{r:2.5,fill:"#3b82f6",strokeWidth:0}} activeDot={{r:5,fill:"#3b82f6",strokeWidth:2,stroke:"#fff"}} animationDuration={400}/>
                </AreaChart>
              </ResponsiveContainer>
              {selectedYear===2020&&<p className="text-xs text-cyan-400/80 mt-1.5 italic">↑ 2020 spike attributed to COVID-19 lockdowns reducing light emission.</p>}
            </div>
          </>)}

          {mapView==="historical"&&(
            selectedSiteIdx!==null
              ?<SiteDetailPanel
                  site={OBS_SITES[selectedSiteIdx]} selectedYear={selectedYear} selectedMonth={selectedMonth}
                  activeEnvFilter={activeEnvFilter} landTempMode={landTempMode}
                  lightMode={lightMode} card={card} subText={subText} headingText={headingText}
                  onClose={()=>setSelectedSiteIdx(null)}/>
              :<HistoricalPanel
                  lightMode={lightMode} selectedYear={selectedYear} selectedMonth={selectedMonth}
                  activeEnvFilter={activeEnvFilter} landTempMode={landTempMode}
                  selectedLandTypes={selectedLandTypes} card={card} subText={subText} headingText={headingText}/>
          )}

          <div className={`${card} p-4`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest" style={{color:lightMode?"#6b7280":"#9ca3af",fontWeight:600}}>Recent Updates</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${lightMode?"bg-gray-100 text-gray-500":"bg-[#2a2f42] text-gray-400"}`}>
                {selectedMonth===0?`${selectedYear} vs ${Math.max(selectedYear-1,2014)}`:`${MONTHS_S[selectedMonth-1]} vs ${selectedMonth===1?MONTHS_S[11]:MONTHS_S[selectedMonth-2]}`}
              </span>
            </div>
            <div className="space-y-2">
              {recentUpdates.map((item,i)=>(
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${lightMode?"border-gray-100 hover:bg-gray-50":"border-[#2a2f42] hover:bg-white/5"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${item.bg}`}>{item.icon}</div>
                  <div className="min-w-0">
                    <p className={`text-xs ${headingText} truncate font-semibold`}>{item.title}</p>
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
