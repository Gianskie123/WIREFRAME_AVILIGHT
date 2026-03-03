import { useOutletContext } from "react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend as RLegend,
} from "recharts";
import { Search, ChevronDown, Plus, Minus, Play, MapPin } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type LandType =
  | "Urban & Built-up" | "Water Bodies" | "Forest" | "Croplands"
  | "Grasslands" | "Wetlands" | "Savannas" | "Woody Savannas"
  | "Cropland Mosaics" | "Barren";
type Tolerance = "All" | "Sensitive" | "Tolerant";
type Migration = "All" | "Resident" | "Migratory";

interface ShapItem { feature: string; value: number }
interface CityInfo {
  id: string; name: string;
  polygon:  [number,number][];
  labelAt:  [number,number];
  dominantLandCover: LandType; landCoverPct: number;
  richness: Partial<Record<string,number>>;
  totalSpecies: number; observationSites: number;
  species: string[];
  shap: ShapItem[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const LAND_COLORS: Record<LandType, string> = {
  "Urban & Built-up": "#e53935", "Water Bodies":    "#1565c0",
  "Forest":           "#1b5e20", "Croplands":       "#f9a825",
  "Grasslands":       "#7cb342", "Wetlands":        "#00695c",
  "Savannas":         "#e65100", "Woody Savannas":  "#4a148c",
  "Cropland Mosaics": "#f06292", "Barren":          "#78909c",
};
const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

// ── Species counts shared with Dashboard (same formula for uniformity) ────────
interface SpeciesCounts { resident: number; migratory: number; lightTolerant: number; lightSensitive: number }

function makeCounts(r: number, m: number, lt: number, ls: number, yearOffset = 0, monthFactor = 1): SpeciesCounts {
  return {
    resident:      Math.round(r  + yearOffset * 0.5),
    migratory:     Math.round(m  * monthFactor + yearOffset * 0.3),
    lightTolerant: Math.round(lt + yearOffset * 0.2),
    lightSensitive:Math.round(ls + yearOffset * 0.4),
  };
}

function buildSiteData(base: { r:number; m:number; lt:number; ls:number }): Record<number, Record<number, SpeciesCounts>> {
  const years = [2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024];
  const migratoryBoost: Record<number,number> = {1:1.8,2:1.9,3:1.6,10:1.4,11:1.7,12:1.9};
  const data: Record<number, Record<number, SpeciesCounts>> = {};
  years.forEach((yr, yi) => {
    data[yr] = {};
    data[yr][0] = makeCounts(base.r, base.m, base.lt, base.ls, yi);
    for (let mo = 1; mo <= 12; mo++) {
      const mf = migratoryBoost[mo] ?? 0.6;
      data[yr][mo] = makeCounts(base.r, base.m, base.lt, base.ls, yi, mf);
    }
  });
  return data;
}

// City-level species data mirroring Dashboard OBS_SITES for NCR cities
const CITY_SPECIES_DATA: Record<string, Record<number, Record<number, SpeciesCounts>>> = {
  "quezon-city": buildSiteData({ r:42, m:28, lt:18, ls:24 }), // La Mesa Watershed
  "marikina":    buildSiteData({ r:38, m:22, lt:15, ls:18 }), // Marikina Watershed
  "muntinlupa":  buildSiteData({ r:56, m:44, lt:22, ls:35 }), // Laguna de Bay
  "manila":      buildSiteData({ r:24, m:12, lt:16, ls: 8 }), // NAPWC
  "las-pinas":   buildSiteData({ r:48, m:36, lt:14, ls:28 }), // Las Piñas-Parañaque
  "paranaque":   buildSiteData({ r:31, m:14, lt:20, ls:11 }), // UP Diliman (adjacent site)
};

function getCitySpeciesFromData(cityId: string, year: number, month: number): SpeciesCounts | null {
  const siteData = CITY_SPECIES_DATA[cityId];
  if (!siteData) return null;
  return siteData[year]?.[month] ?? siteData[2024][0];
}

function totalFromCounts(c: SpeciesCounts): number {
  return c.resident + c.migratory + c.lightTolerant + c.lightSensitive;
}

// ── Map coordinate system ─────────────────────────────────────────────────────
const MAP_W = 560, MAP_H = 700;
const LON_MIN = 120.82, LON_RANGE = 0.40;
const LAT_MAX = 14.86, LAT_RANGE = 0.56;

function ll(lat: number, lon: number): [number, number] {
  return [
    +((lon - LON_MIN) / LON_RANGE * MAP_W).toFixed(1),
    +((LAT_MAX - lat) / LAT_RANGE * MAP_H).toFixed(1),
  ];
}
function pts(coords: [number,number][]): string {
  return coords.map(([a,b]) => ll(a,b).join(",")).join(" ");
}

function richnessColor(v: number): string {
  const t = Math.min(v / 50, 1);
  if (t < 0.28) { const s=t/0.28; return `rgb(${Math.round(20+s*18)},${Math.round(30+s*66)},${Math.round(120+s*100)})`; }
  if (t < 0.54) { const s=(t-0.28)/0.26; return `rgb(${Math.round(38+s*112)},${Math.round(96+s*116)},${Math.round(220-s*110)})`; }
  if (t < 0.78) { const s=(t-0.54)/0.24; return `rgb(${Math.round(150+s*105)},${Math.round(212+s*30)},${Math.round(110-s*110)})`; }
  const s=(t-0.78)/0.22; return `rgb(255,${Math.round(242-s*138)},0)`;
}
function getCityRichness(c: CityInfo, tol: Tolerance, mig: Migration, month: number): number {
  const k = `${tol}-${mig}`;
  const base = c.richness[k] ?? c.richness[`${tol}-All`] ?? c.richness[`All-${mig}`] ?? c.richness["All-All"] ?? c.totalSpecies;
  return Math.round(base + ([0,0,1,2,3,4,4,3,2,1,1,0][month] ?? 0));
}

// ── Global SHAP ───────────────────────────────────────────────────────────────
const GLOBAL_SHAP: ShapItem[] = [
  { feature: "Light Intensity", value: 0.45 },
  { feature: "NDVI",            value: 0.26 },
  { feature: "Temperature",     value: 0.16 },
  { feature: "Elevation",       value: 0.07 },
  { feature: "Distance to Water", value: 0.06 },
];

// ── City Data ─────────────────────────────────────────────────────────────────
const CITIES: CityInfo[] = [
  {
    id:"valenzuela", name:"Valenzuela",
    polygon: [[14.82,120.90],[14.82,121.02],[14.72,121.02],[14.72,120.90]],
    labelAt: [14.77,120.96],
    dominantLandCover:"Urban & Built-up", landCoverPct:82,
    richness:{"All-All":21,"Sensitive-All":14,"Tolerant-All":18,"All-Resident":19,"All-Migratory":12},
    totalSpecies:21, observationSites:7,
    species:["Eurasian Tree Sparrow","Rock Pigeon","Philippine Myna","Zebra Dove","Yellow-vented Bulbul","Collared Kingfisher","White-collared Kingfisher","Pacific Swallow","Pied Fantail","Blue-tailed Bee-eater","Common Sandpiper","Little Egret","Purple Heron","Black-crowned Night Heron","Whiskered Tern","Common Myna","Olive-backed Sunbird","Brown Shrike","Lowland White-eye","Glossy Swiftlet","Spotted Dove"],
    shap:[{feature:"Light Intensity",value:0.48},{feature:"NDVI",value:0.21},{feature:"Temperature",value:0.17},{feature:"Elevation",value:0.08},{feature:"Distance to Water",value:0.06}],
  },
  {
    id:"caloocan", name:"Caloocan",
    polygon: [[14.72,120.93],[14.72,121.02],[14.67,121.02],[14.66,121.00],[14.65,120.97],[14.67,120.93]],
    labelAt: [14.69,120.975],
    dominantLandCover:"Urban & Built-up", landCoverPct:88,
    richness:{"All-All":18,"Sensitive-All":11,"Tolerant-All":16,"All-Resident":16,"All-Migratory":9},
    totalSpecies:18, observationSites:5,
    species:["Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Olive-backed Sunbird","White-collared Kingfisher","Philippine Myna","Brown Shrike","Blue-tailed Bee-eater","Lowland White-eye","Glossy Swiftlet","Common Kingfisher","Little Egret","Philippine Bulbul"],
    shap:[{feature:"Light Intensity",value:0.50},{feature:"NDVI",value:0.19},{feature:"Temperature",value:0.16},{feature:"Elevation",value:0.09},{feature:"Distance to Water",value:0.06}],
  },
  {
    id:"malabon", name:"Malabon",
    polygon: [[14.70,120.93],[14.70,120.97],[14.67,120.97],[14.67,120.93]],
    labelAt: [14.685,120.95],
    dominantLandCover:"Water Bodies", landCoverPct:22,
    richness:{"All-All":26,"Sensitive-All":18,"Tolerant-All":22,"All-Resident":22,"All-Migratory":20},
    totalSpecies:26, observationSites:4,
    species:["Little Egret","Striated Heron","Purple Heron","Black-crowned Night Heron","Little Tern","Common Sandpiper","Pacific Reef Heron","Whiskered Tern","Eurasian Tree Sparrow","Rock Pigeon","Collared Kingfisher","Pied Fantail","Yellow-vented Bulbul","Common Myna","Zebra Dove","Pacific Swallow","Blue-tailed Bee-eater","Glossy Swiftlet","White-collared Kingfisher","Common Kingfisher","Little Ringed Plover","Far Eastern Curlew","Whimbrel","Common Greenshank","Greater Sandplover","Kentish Plover"],
    shap:[{feature:"Light Intensity",value:0.38},{feature:"NDVI",value:0.25},{feature:"Temperature",value:0.18},{feature:"Elevation",value:0.05},{feature:"Distance to Water",value:0.14}],
  },
  {
    id:"navotas", name:"Navotas",
    polygon: [[14.70,120.90],[14.70,120.93],[14.66,120.93],[14.66,120.90]],
    labelAt: [14.68,120.915],
    dominantLandCover:"Water Bodies", landCoverPct:28,
    richness:{"All-All":28,"Sensitive-All":19,"Tolerant-All":24,"All-Resident":23,"All-Migratory":22},
    totalSpecies:28, observationSites:3,
    species:["Little Egret","Striated Heron","Purple Heron","Black-crowned Night Heron","Whiskered Tern","Common Sandpiper","Little Tern","Far Eastern Curlew","Whimbrel","Common Greenshank","Greater Sandplover","Pacific Reef Heron","Eurasian Tree Sparrow","Rock Pigeon","Collared Kingfisher","Pied Fantail","Yellow-vented Bulbul","Common Myna","Zebra Dove","Pacific Swallow","Blue-tailed Bee-eater","Glossy Swiftlet","White-collared Kingfisher","Common Kingfisher","Ruddy Turnstone","Dunlin","Curlew Sandpiper","Black-winged Stilt"],
    shap:[{feature:"Light Intensity",value:0.34},{feature:"NDVI",value:0.22},{feature:"Temperature",value:0.19},{feature:"Elevation",value:0.04},{feature:"Distance to Water",value:0.21}],
  },
  {
    id:"quezon-city", name:"Quezon City",
    polygon: [[14.76,120.97],[14.76,121.09],[14.72,121.14],[14.67,121.17],[14.63,121.16],[14.62,121.12],[14.62,121.08],[14.61,121.05],[14.61,121.01],[14.65,120.97]],
    labelAt: [14.685,121.06],
    dominantLandCover:"Forest", landCoverPct:35,
    richness:{"All-All":47,"Sensitive-All":38,"Tolerant-All":41,"All-Resident":44,"All-Migratory":25},
    totalSpecies:47, observationSites:15,
    species:["Philippine Bulbul","Colasisi","White-browed Shama","Scale-feathered Malkoha","Stripe-headed Rhabdornis","Philippine Falconet","Black-and-cinnamon Fantail","Guaiabero","Luzon Hornbill","Philippine Nightjar","Eurasian Tree Sparrow","Yellow-vented Bulbul","Pied Fantail","Olive-backed Sunbird","Brown Shrike","Philippine Myna","Lowland White-eye","Pacific Swallow","White-collared Kingfisher","Collared Kingfisher","Zebra Dove","Rock Pigeon","Common Myna","Blue-tailed Bee-eater","Coppersmith Barbet","Long-tailed Shrike","Blue-backed Parrot","Philippine Drongo","Slender-billed Crow","Pied Triller","Ashy Minivet","White-throated Kingfisher","Grey-backed Tailorbird","White-eared Brown Dove","Golden-bellied Flyeater","Black-naped Oriole","Grass Owl","Philippine Hawk-Owl","Philippine Hawk-Eagle","Golden-bellied Gerygone","Philippine Tailorbird","Sulphur-billed Nuthatch","Bar-bellied Cuckoo","Silvery Kingfisher","Large-billed Crow","Luzon Bleeding-heart","Philippine Brown Dove"],
    shap:[{feature:"Light Intensity",value:0.39},{feature:"NDVI",value:0.38},{feature:"Temperature",value:0.14},{feature:"Elevation",value:0.12},{feature:"Distance to Water",value:0.07}],
  },
  {
    id:"san-juan", name:"San Juan",
    polygon: [[14.62,121.01],[14.62,121.05],[14.60,121.05],[14.60,121.01]],
    labelAt: [14.61,121.03],
    dominantLandCover:"Urban & Built-up", landCoverPct:93,
    richness:{"All-All":16,"Sensitive-All":9,"Tolerant-All":14,"All-Resident":15,"All-Migratory":7},
    totalSpecies:16, observationSites:3,
    species:["Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Olive-backed Sunbird","Lowland White-eye","Glossy Swiftlet","Philippine Myna","Brown Shrike","Blue-tailed Bee-eater","Coppersmith Barbet","White-collared Kingfisher"],
    shap:[{feature:"Light Intensity",value:0.54},{feature:"NDVI",value:0.16},{feature:"Temperature",value:0.15},{feature:"Elevation",value:0.09},{feature:"Distance to Water",value:0.06}],
  },
  {
    id:"mandaluyong", name:"Mandaluyong",
    polygon: [[14.60,121.01],[14.60,121.06],[14.57,121.06],[14.57,121.01]],
    labelAt: [14.585,121.035],
    dominantLandCover:"Urban & Built-up", landCoverPct:96,
    richness:{"All-All":15,"Sensitive-All":8,"Tolerant-All":13,"All-Resident":14,"All-Migratory":7},
    totalSpecies:15, observationSites:4,
    species:["Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Olive-backed Sunbird","Lowland White-eye","Glossy Swiftlet","Philippine Myna","Brown Shrike","Blue-tailed Bee-eater","White-collared Kingfisher"],
    shap:[{feature:"Light Intensity",value:0.56},{feature:"NDVI",value:0.14},{feature:"Temperature",value:0.16},{feature:"Elevation",value:0.08},{feature:"Distance to Water",value:0.06}],
  },
  {
    id:"marikina", name:"Marikina",
    polygon: [[14.71,121.07],[14.71,121.17],[14.62,121.17],[14.62,121.12],[14.62,121.08],[14.65,121.07]],
    labelAt: [14.67,121.12],
    dominantLandCover:"Grasslands", landCoverPct:30,
    richness:{"All-All":38,"Sensitive-All":30,"Tolerant-All":33,"All-Resident":36,"All-Migratory":18},
    totalSpecies:38, observationSites:10,
    species:["Philippine Bulbul","Stripe-headed Rhabdornis","Black-naped Oriole","Philippine Drongo","Pied Triller","White-browed Shama","Coppersmith Barbet","Philippine Myna","Lowland White-eye","Yellow-vented Bulbul","Pied Fantail","Eurasian Tree Sparrow","Rock Pigeon","Blue-tailed Bee-eater","Collared Kingfisher","Pacific Swallow","Olive-backed Sunbird","Brown Shrike","White-throated Kingfisher","Long-tailed Shrike","Common Myna","Zebra Dove","Glossy Swiftlet","Black-crowned Night Heron","Striated Heron","Little Egret","Blue-backed Parrot","Philippine Falconet","Scale-feathered Malkoha","Silvery Kingfisher","Philippine Nightjar","Ashy Minivet","Grey-backed Tailorbird","Philippine Tailorbird","Golden-bellied Gerygone","Grass Owl","Philippine Hawk-Owl","Philippine Pond Heron"],
    shap:[{feature:"Light Intensity",value:0.41},{feature:"NDVI",value:0.34},{feature:"Temperature",value:0.14},{feature:"Elevation",value:0.11},{feature:"Distance to Water",value:0.10}],
  },
  {
    id:"pasig", name:"Pasig",
    polygon: [[14.61,121.05],[14.62,121.08],[14.62,121.13],[14.57,121.13],[14.55,121.09],[14.56,121.05]],
    labelAt: [14.585,121.09],
    dominantLandCover:"Urban & Built-up", landCoverPct:74,
    richness:{"All-All":29,"Sensitive-All":21,"Tolerant-All":26,"All-Resident":27,"All-Migratory":16},
    totalSpecies:29, observationSites:8,
    species:["Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Olive-backed Sunbird","Lowland White-eye","Glossy Swiftlet","Philippine Myna","Brown Shrike","Blue-tailed Bee-eater","Coppersmith Barbet","White-collared Kingfisher","Black-crowned Night Heron","Striated Heron","Little Egret","Common Sandpiper","Purple Heron","White-browed Crake","Little Grebe","Ruddy-breasted Crake","Common Moorhen","Philippine Duck","Little Cormorant","Spotted Dove","Long-tailed Shrike"],
    shap:[{feature:"Light Intensity",value:0.44},{feature:"NDVI",value:0.28},{feature:"Temperature",value:0.16},{feature:"Elevation",value:0.06},{feature:"Distance to Water",value:0.06}],
  },
  {
    id:"manila", name:"Manila",
    polygon: [[14.62,120.96],[14.62,121.01],[14.57,121.01],[14.55,121.00],[14.55,120.96]],
    labelAt: [14.585,120.985],
    dominantLandCover:"Urban & Built-up", landCoverPct:91,
    richness:{"All-All":24,"Sensitive-All":14,"Tolerant-All":21,"All-Resident":22,"All-Migratory":14},
    totalSpecies:24, observationSites:8,
    species:["Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Olive-backed Sunbird","Lowland White-eye","Glossy Swiftlet","Philippine Myna","Brown Shrike","Blue-tailed Bee-eater","White-collared Kingfisher","Common Tern","Little Tern","Whiskered Tern","Pacific Reef Heron","Little Egret","Black-crowned Night Heron","Spotted Dove","White-throated Kingfisher","Long-tailed Shrike"],
    shap:[{feature:"Light Intensity",value:0.53},{feature:"NDVI",value:0.18},{feature:"Temperature",value:0.16},{feature:"Elevation",value:0.06},{feature:"Distance to Water",value:0.07}],
  },
  {
    id:"pasay", name:"Pasay",
    polygon: [[14.55,120.97],[14.55,121.02],[14.52,121.02],[14.52,120.97]],
    labelAt: [14.535,120.995],
    dominantLandCover:"Urban & Built-up", landCoverPct:78,
    richness:{"All-All":22,"Sensitive-All":14,"Tolerant-All":19,"All-Resident":19,"All-Migratory":15},
    totalSpecies:22, observationSites:5,
    species:["Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Olive-backed Sunbird","Lowland White-eye","Glossy Swiftlet","Philippine Myna","Brown Shrike","Common Tern","Little Tern","Whiskered Tern","Pacific Reef Heron","Little Egret","Black-crowned Night Heron","White-collared Kingfisher","Black-winged Stilt","Common Sandpiper"],
    shap:[{feature:"Light Intensity",value:0.50},{feature:"NDVI",value:0.17},{feature:"Temperature",value:0.17},{feature:"Elevation",value:0.05},{feature:"Distance to Water",value:0.11}],
  },
  {
    id:"makati", name:"Makati",
    polygon: [[14.57,121.01],[14.57,121.06],[14.55,121.06],[14.55,121.01]],
    labelAt: [14.56,121.035],
    dominantLandCover:"Urban & Built-up", landCoverPct:95,
    richness:{"All-All":17,"Sensitive-All":9,"Tolerant-All":15,"All-Resident":16,"All-Migratory":7},
    totalSpecies:17, observationSites:4,
    species:["Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Olive-backed Sunbird","Lowland White-eye","Glossy Swiftlet","Philippine Myna","Brown Shrike","Blue-tailed Bee-eater","White-collared Kingfisher","Spotted Dove","Coppersmith Barbet"],
    shap:[{feature:"Light Intensity",value:0.55},{feature:"NDVI",value:0.15},{feature:"Temperature",value:0.16},{feature:"Elevation",value:0.08},{feature:"Distance to Water",value:0.06}],
  },
  {
    id:"pateros", name:"Pateros",
    polygon: [[14.56,121.07],[14.56,121.09],[14.54,121.09],[14.54,121.07]],
    labelAt: [14.55,121.08],
    dominantLandCover:"Water Bodies", landCoverPct:26,
    richness:{"All-All":27,"Sensitive-All":19,"Tolerant-All":23,"All-Resident":24,"All-Migratory":18},
    totalSpecies:27, observationSites:2,
    species:["Eurasian Tree Sparrow","Little Egret","Striated Heron","Purple Heron","Black-crowned Night Heron","Common Sandpiper","Little Ringed Plover","Common Moorhen","White-browed Crake","Ruddy-breasted Crake","Little Grebe","Philippine Duck","Little Cormorant","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Common Kingfisher","Silvery Kingfisher","Rock Pigeon","Common Myna","Zebra Dove","Olive-backed Sunbird","Brown Shrike","Blue-tailed Bee-eater","White-breasted Waterhen","Purple Swamphen"],
    shap:[{feature:"Light Intensity",value:0.32},{feature:"NDVI",value:0.26},{feature:"Temperature",value:0.18},{feature:"Elevation",value:0.04},{feature:"Distance to Water",value:0.20}],
  },
  {
    id:"taguig", name:"Taguig",
    polygon: [[14.55,121.04],[14.56,121.07],[14.57,121.13],[14.50,121.13],[14.49,121.04]],
    labelAt: [14.525,121.085],
    dominantLandCover:"Croplands", landCoverPct:30,
    richness:{"All-All":33,"Sensitive-All":24,"Tolerant-All":29,"All-Resident":30,"All-Migratory":22},
    totalSpecies:33, observationSites:9,
    species:["Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Olive-backed Sunbird","Lowland White-eye","Glossy Swiftlet","Philippine Myna","Brown Shrike","Blue-tailed Bee-eater","Coppersmith Barbet","White-collared Kingfisher","Little Egret","Black-crowned Night Heron","Striated Heron","Purple Heron","Common Sandpiper","Black-winged Stilt","White-browed Crake","Common Moorhen","Little Ringed Plover","Little Tern","Whiskered Tern","Philippine Duck","Little Grebe","White-breasted Waterhen","Purple Swamphen","Common Kingfisher","Spotted Dove"],
    shap:[{feature:"Light Intensity",value:0.42},{feature:"NDVI",value:0.27},{feature:"Temperature",value:0.16},{feature:"Elevation",value:0.06},{feature:"Distance to Water",value:0.09}],
  },
  {
    id:"paranaque", name:"Parañaque",
    polygon: [[14.52,120.98],[14.52,121.07],[14.47,121.07],[14.45,121.03],[14.45,120.99],[14.48,120.98]],
    labelAt: [14.485,121.02],
    dominantLandCover:"Cropland Mosaics", landCoverPct:28,
    richness:{"All-All":31,"Sensitive-All":22,"Tolerant-All":27,"All-Resident":28,"All-Migratory":21},
    totalSpecies:31, observationSites:8,
    species:["Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Olive-backed Sunbird","Lowland White-eye","Glossy Swiftlet","Philippine Myna","Brown Shrike","Blue-tailed Bee-eater","Common Tern","Little Tern","Whiskered Tern","Pacific Reef Heron","Little Egret","Black-crowned Night Heron","Common Sandpiper","Black-winged Stilt","White-browed Crake","Common Moorhen","Little Ringed Plover","Philippine Duck","White-breasted Waterhen","Little Cormorant","Spotted Dove","Coppersmith Barbet","Long-tailed Shrike"],
    shap:[{feature:"Light Intensity",value:0.45},{feature:"NDVI",value:0.24},{feature:"Temperature",value:0.17},{feature:"Elevation",value:0.05},{feature:"Distance to Water",value:0.09}],
  },
  {
    id:"las-pinas", name:"Las Piñas",
    polygon: [[14.49,120.96],[14.49,121.03],[14.44,121.03],[14.43,121.00],[14.43,120.96]],
    labelAt: [14.46,120.995],
    dominantLandCover:"Woody Savannas", landCoverPct:32,
    richness:{"All-All":34,"Sensitive-All":25,"Tolerant-All":30,"All-Resident":31,"All-Migratory":22},
    totalSpecies:34, observationSites:7,
    species:["Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Olive-backed Sunbird","Lowland White-eye","Glossy Swiftlet","Philippine Myna","Brown Shrike","Blue-tailed Bee-eater","Common Tern","Little Tern","Little Egret","Black-crowned Night Heron","Common Sandpiper","Black-winged Stilt","White-browed Crake","Common Moorhen","Philippine Duck","White-breasted Waterhen","Little Cormorant","Spotted Dove","Coppersmith Barbet","Blue-backed Parrot","Pied Triller","Philippine Drongo","White-throated Kingfisher","Pacific Reef Egret","Long-tailed Shrike","Common Greenshank"],
    shap:[{feature:"Light Intensity",value:0.40},{feature:"NDVI",value:0.29},{feature:"Temperature",value:0.17},{feature:"Elevation",value:0.05},{feature:"Distance to Water",value:0.09}],
  },
  {
    id:"muntinlupa", name:"Muntinlupa",
    polygon: [[14.49,121.02],[14.50,121.13],[14.40,121.13],[14.38,121.05],[14.38,121.02]],
    labelAt: [14.43,121.07],
    dominantLandCover:"Wetlands", landCoverPct:42,
    richness:{"All-All":42,"Sensitive-All":34,"Tolerant-All":38,"All-Resident":40,"All-Migratory":28},
    totalSpecies:42, observationSites:11,
    species:["Philippine Bulbul","Lowland White-eye","Black-naped Oriole","Philippine Drongo","White-breasted Waterhen","Purple Swamphen","Common Moorhen","Striated Heron","Little Egret","Black-crowned Night Heron","White-browed Crake","Ruddy-breasted Crake","Philippine Duck","Little Grebe","Little Cormorant","Whiskered Tern","Common Sandpiper","Black-winged Stilt","Little Tern","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Common Kingfisher","Olive-backed Sunbird","Glossy Swiftlet","Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Philippine Myna","Brown Shrike","Blue-tailed Bee-eater","Coppersmith Barbet","Pied Triller","White-throated Kingfisher","Philippine Nightjar","Philippine Hawk-Owl","Spotted Dove","Long-tailed Shrike","Pacific Reef Heron","Philippine Pond Heron"],
    shap:[{feature:"Light Intensity",value:0.36},{feature:"NDVI",value:0.35},{feature:"Temperature",value:0.15},{feature:"Elevation",value:0.07},{feature:"Distance to Water",value:0.07}],
  },
];

// ── Prediction helper (deterministic formula for prototype) ───────────────────
interface PredictionResult {
  total: number;
  lightSensitive: number;
  lightTolerant: number;
  resident: number;
  migratory: number;
}

function runPrediction(params: {
  landType: LandType;
  landTemp: number;
  alan: number;
  precipitation: number;
  ndvi: number;
  nTrees: number;
  maxDepth: number;
  learningRate: number;
  month: number;
}): PredictionResult {
  const ndviFactor     = params.ndvi / 100;
  const alanPenalty    = 1 - Math.min(params.alan / 120, 0.65);
  const tempFactor     = 1 - Math.abs(params.landTemp - 28) / 40;
  const rainFactor     = Math.min(params.precipitation / 300, 1);
  const forestBonus    = params.landType === "Forest" ? 1.30 : params.landType === "Wetlands" ? 1.18 : params.landType === "Urban & Built-up" ? 0.65 : 1.0;
  const migBoost       = [0,0.2,0.3,0.15,0,0,0,0,0,0.1,0.25,0.35,0.25][params.month] ?? 0;
  const modelFactor    = 1 + (params.nTrees / 500) * 0.05 + (params.maxDepth / 10) * 0.03 - params.learningRate * 0.5;

  const base    = Math.round(12 + ndviFactor * 28 * forestBonus * alanPenalty * tempFactor * rainFactor * modelFactor);
  const total   = Math.max(5, Math.min(base, 80));
  const ls      = Math.round(total * (0.38 * alanPenalty));
  const lt      = Math.round(total * (0.28 + (1 - alanPenalty) * 0.18));
  const mig     = Math.round((total * 0.30) * (1 + migBoost));
  const res     = Math.max(1, total - ls - lt - mig);

  return { total, lightSensitive: ls, lightTolerant: lt, resident: res, migratory: mig };
}

// ── Baseline label helpers ────────────────────────────────────────────────────
// Returns: { lastYearValue, avgAnnualIncrease } for a given covariate of a city.
// "Last year" = 2023 (year before 2024 final), using annual offset formula.
function getCovariateBaseline(cityId: string, covariate: "alan" | "ndvi" | "temp" | "precip"): { lastYear: number; avgIncrease: number } {
  const city = CITIES.find(c => c.id === cityId) ?? CITIES[0];
  const alanBase = city.shap.find(s => s.feature === "Light Intensity")?.value ?? 0.4;
  const ndviBase = city.shap.find(s => s.feature === "NDVI")?.value ?? 0.25;

  // Historical values keyed by year index (0 = 2014 … 10 = 2024)
  const getVal = (yi: number) => {
    if (covariate === "alan")  return Math.round(10 + alanBase * 80 + yi * 1.2);
    if (covariate === "ndvi")  return Math.round(10 + ndviBase * 220 - yi * 0.5);
    if (covariate === "temp")  return parseFloat(((city.dominantLandCover === "Forest" ? 26 : city.dominantLandCover === "Water Bodies" ? 28 : 31) + yi * 0.08).toFixed(1));
    /* precip */ return Math.round((city.dominantLandCover === "Wetlands" ? 280 : 150) - yi * 0.8);
  };

  const lastYear  = getVal(9);  // 2023 = index 9
  const firstYear = getVal(0);  // 2014 = index 0
  const avgIncrease = parseFloat(((getVal(10) - firstYear) / 10).toFixed(1)); // avg change per year over 2014–2024
  return { lastYear, avgIncrease };
}

// ── City Search Panel ─────────────────────────────────────────────────────────
function CitySearchPanel({
  lightMode, textPrimary, textSecondary, inputBg, sectionBorder,
  searchText, setSearchText, foundCity, searched,
  expandSpecies, setExpandSpecies, handleSearch, selectedYear, month,
}: {
  lightMode: boolean; textPrimary: string; textSecondary: string;
  inputBg: string; sectionBorder: string;
  searchText: string; setSearchText: (v: string) => void;
  foundCity: CityInfo | null; searched: boolean;
  expandSpecies: boolean; setExpandSpecies: (v: boolean | ((p: boolean) => boolean)) => void;
  handleSearch: () => void;
  selectedYear: number; month: number;
}) {
  const richnessByCity = useMemo(() => {
    const m = new Map<string, number>();
    CITIES.forEach(c => {
      const dashCounts = getCitySpeciesFromData(c.id, selectedYear, month);
      m.set(c.id, dashCounts ? totalFromCounts(dashCounts) : c.totalSpecies);
    });
    return m;
  }, [selectedYear, month]);

  return (
    <div id="local-explainer" className="p-6 overflow-y-auto" style={{ maxHeight: "70vh" }}>
      <h2 className={`${textPrimary} mb-4`} style={{ fontWeight: 700, fontSize: "15px" }}>
        Local Explainer – Search City
      </h2>

      <label className={`block text-sm mb-2 ${textSecondary}`}>Enter City / Municipality Name:</label>
      <input
        type="text"
        value={searchText}
        onChange={e => setSearchText(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleSearch()}
        placeholder="e.g. Manila, Quezon City, Taguig..."
        className={`w-full rounded px-3 py-2 text-sm outline-none ${inputBg} focus:border-blue-500 mb-3`}
      />
      <button
        onClick={handleSearch}
        className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors mb-4"
      >
        <Search size={14} /> Search
      </button>

      {searched && !foundCity && (
        <div className="rounded px-3 py-2 bg-red-900/20 border border-red-800/40 text-red-400 text-sm mb-4">
          City not found. Try: Manila, Makati, Taguig, Quezon City…
        </div>
      )}

      {foundCity && (
        <div className="space-y-3">
          <div className={`rounded px-3 py-2 border text-sm mb-2 ${lightMode ? "bg-teal-50 border-teal-300" : "bg-teal-900/30 border-teal-700/50"}`}>
            <span className={textSecondary}>Found: </span>
            <span className={lightMode ? "text-teal-700 font-bold" : "text-teal-300 font-bold"}>{foundCity.name}</span>
          </div>

          <div className={`flex justify-between items-center py-1 border-b ${sectionBorder}`}>
            <span className={`${textSecondary} text-xs`} style={{ fontWeight: 600 }}>City / Area</span>
            <span className={`${textPrimary} text-sm`} style={{ fontWeight: 700 }}>{foundCity.name}</span>
          </div>

          <div className={`flex justify-between items-center py-1 border-b ${sectionBorder}`}>
            <span className={`${textSecondary} text-xs`} style={{ fontWeight: 600 }}>Dominant Land Cover</span>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: LAND_COLORS[foundCity.dominantLandCover] }} />
              <span className={`${textSecondary} text-xs`}>{foundCity.dominantLandCover} ({foundCity.landCoverPct}%)</span>
            </div>
          </div>

          {(() => {
            const dashCounts = getCitySpeciesFromData(foundCity.id, selectedYear, month);
            const displayTotal = richnessByCity.get(foundCity.id) ?? foundCity.totalSpecies;
            if (dashCounts) {
              const grand = totalFromCounts(dashCounts);
              const rows = [
                { label: "Resident",         val: dashCounts.resident,       color: "#34d399" },
                { label: "Migratory",        val: dashCounts.migratory,      color: "#fbbf24" },
                { label: "Light Tolerant",   val: dashCounts.lightTolerant,  color: "#60a5fa" },
                { label: "Light Sensitive",  val: dashCounts.lightSensitive, color: "#f87171" },
              ];
              return (
                <div className={`py-2 border-b ${sectionBorder}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`${textSecondary} text-xs`} style={{ fontWeight: 600 }}>Observed Species</span>
                    <span className={lightMode ? "text-cyan-600 text-sm font-bold" : "text-cyan-400 text-sm font-bold"}>{grand} spp.</span>
                  </div>
                  <div className="space-y-1.5">
                    {rows.map((row, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className={`text-xs ${textSecondary}`}>{row.label}</span>
                          <span className="text-xs font-bold" style={{ color: row.color }}>{row.val}</span>
                        </div>
                        <div className={`h-1.5 rounded-full ${lightMode ? "bg-gray-200" : "bg-[#2a2f42]"}`}>
                          <div className="h-1.5 rounded-full" style={{ width: `${Math.round((row.val / grand) * 100)}%`, background: row.color, transition: "width 0.4s ease" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div className={`flex justify-between items-center py-1 border-b ${sectionBorder}`}>
                <span className={`${textSecondary} text-xs`} style={{ fontWeight: 600 }}>Total Unique Species</span>
                <span className={lightMode ? "text-cyan-600 text-sm font-bold" : "text-cyan-400 text-sm font-bold"}>
                  {displayTotal} species
                </span>
              </div>
            );
          })()}

          <div className={`flex justify-between items-center py-1 border-b ${sectionBorder}`}>
            <span className={`${textSecondary} text-xs`} style={{ fontWeight: 600 }}>Observation Sites</span>
            <span className={`${textPrimary} text-sm`} style={{ fontWeight: 700 }}>{foundCity.observationSites} sites</span>
          </div>

          <div>
            <p className={`${textSecondary} text-xs mb-2`} style={{ fontWeight: 600 }}>Species Observed in this City</p>
            <div className="space-y-1">
              {(expandSpecies ? foundCity.species : foundCity.species.slice(0, 8)).map((sp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                  <span className={`${textSecondary} text-xs`}>{sp}</span>
                </div>
              ))}
            </div>
            {foundCity.species.length > 8 && (
              <button
                onClick={() => setExpandSpecies(v => !v)}
                className="mt-1.5 text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
              >
                {expandSpecies ? "▲ Show less" : `▼ +${foundCity.species.length - 8} more species`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Analytics Page ───────────────────────────────────────────────────────
export function Analytics() {
  const { lightMode } = useOutletContext<{ lightMode: boolean }>();

  const pageBg       = lightMode ? "bg-white text-gray-900" : "bg-[#0d1117] text-white";
  const navBg        = lightMode ? "bg-white border-gray-200" : "bg-[#0d1117] border-[#1e2535]";
  const gridBg       = lightMode ? "bg-gray-50" : "bg-[#0d1117]";
  const inputBg      = lightMode ? "bg-white border border-gray-300 text-gray-900" : "bg-[#161b22] border border-[#2a2f42] text-gray-200";
  const tooltipBg    = lightMode ? "bg-gray-100/80 border-gray-300" : "bg-[#111]/80 border-[#333]";
  const cardBg       = lightMode ? "bg-white border border-gray-200" : "bg-[#161b27] border border-[#2a2f42]";
  const textPrimary  = lightMode ? "text-gray-900" : "text-white";
  const textSecondary= lightMode ? "text-gray-700" : "text-gray-400";
  const sectionBorder= lightMode ? "border-gray-200" : "border-[#1e2535]";
  const inputField   = lightMode
    ? "bg-white border border-gray-300 text-gray-900 focus:border-blue-500"
    : "bg-[#0d1117] border border-[#2a2f42] text-gray-200 focus:border-blue-500";

  // Filter controls (kept for city search panel)
  const [tolerance,  setTolerance]  = useState<Tolerance>("All");
  const [migration,  setMigration]  = useState<Migration>("All");
  const [month,      setMonth]      = useState(0);

  // Map hover/interaction
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [mousePos,    setMousePos]    = useState({ x: 0, y: 0 });

  // Local explainer
  const [searchText,    setSearchText]    = useState("");
  const [foundCity,     setFoundCity]     = useState<CityInfo | null>(null);
  const [searched,      setSearched]      = useState(false);
  const [expandSpecies, setExpandSpecies] = useState(false);
  const [selectedYear,  setSelectedYear]  = useState(2024);

  const [, setExpanded] = useState(false);

  function handleSearch() {
    setExpanded(false);
    const q = searchText.trim().toLowerCase();
    if (!q) { setFoundCity(null); setSearched(false); return; }
    const match = CITIES.find(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
    setFoundCity(match ?? null);
    setSearched(true);
    setExpandSpecies(false);
  }

  function handleCityClick(city: CityInfo) {
    setSearchText(city.name);
    setFoundCity(city);
    setSearched(true);
    setExpandSpecies(false);
    document.getElementById("local-explainer")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ── Richness prediction state ─────────────────────────────────────────────
  const [predCityId, setPredCityId] = useState<string>(CITIES[0].id);
  const predCity = CITIES.find(c => c.id === predCityId) ?? CITIES[0];

  const historicalCovariates = useMemo(() => {
    const city = CITIES.find(c => c.id === predCityId) ?? CITIES[0];
    const alanBase = city.shap.find(s => s.feature === "Light Intensity")?.value ?? 0.4;
    const ndviBase = city.shap.find(s => s.feature === "NDVI")?.value ?? 0.25;
    return {
      alan:   Math.round(10 + alanBase * 80),
      ndvi:   Math.round(10 + ndviBase * 220),
      temp:   city.dominantLandCover === "Forest" ? 26 : city.dominantLandCover === "Water Bodies" ? 28 : 31,
      precip: city.dominantLandCover === "Wetlands" ? 280 : 150,
    };
  }, [predCityId]);

  const [alanDelta,   setAlanDelta]   = useState(0);
  const [ndviDelta,   setNdviDelta]   = useState(0);
  const [tempDelta,   setTempDelta]   = useState(0);
  const [precipDelta, setPrecipDelta] = useState(0);

  useEffect(() => {
    setAlanDelta(0);
    setNdviDelta(0);
    setTempDelta(0);
    setPrecipDelta(0);
    setBauPrediction(null);
    setMitPrediction(null);
  }, [predCityId]);

  const [bauPrediction, setBauPrediction] = useState<PredictionResult | null>(null);
  const [mitPrediction, setMitPrediction] = useState<PredictionResult | null>(null);
  const [bauRunning,    setBauRunning]    = useState(false);
  const [mitRunning,    setMitRunning]    = useState(false);

  // Track the latest BAU result per city. Key: cityId, value: { result, month }.
  // A city gets colored once BAU is run for it; re-running (any month) overwrites.
  const [cityPredMap, setCityPredMap] = useState<Map<string, { result: PredictionResult; month: number }>>(new Map());

  const mitInputs = {
    alan:   Math.max(0, historicalCovariates.alan + alanDelta),
    ndvi:   Math.min(100, Math.max(0, historicalCovariates.ndvi + ndviDelta)),
    temp:   historicalCovariates.temp + tempDelta,
    precip: Math.max(0, historicalCovariates.precip + precipDelta),
  };

  function handleRunBAU() {
    setBauRunning(true);
    setMitPrediction(null);
    setTimeout(() => {
      const result = runPrediction({
        landType: predCity.dominantLandCover,
        landTemp: historicalCovariates.temp,
        alan: historicalCovariates.alan,
        precipitation: historicalCovariates.precip,
        ndvi: historicalCovariates.ndvi,
        nTrees: 100, maxDepth: 5, learningRate: 0.1, month,
      });
      setBauPrediction(result);
      setBauRunning(false);
      // Store latest prediction result + month for this city (overwrites any previous)
      setCityPredMap(prev => new Map(prev).set(predCityId, { result, month }));
    }, 700);
  }

  function handleRunMitigation() {
    setMitRunning(true);
    setTimeout(() => {
      const result = runPrediction({
        landType: predCity.dominantLandCover,
        landTemp: mitInputs.temp,
        alan: mitInputs.alan,
        precipitation: mitInputs.precip,
        ndvi: mitInputs.ndvi,
        nTrees: 100, maxDepth: 5, learningRate: 0.1, month,
      });
      setMitPrediction(result);
      setMitRunning(false);
    }, 700);
  }

  const richnessByCity = useMemo(() => {
    const m = new Map<string, number>();
    CITIES.forEach(c => {
      const dashCounts = getCitySpeciesFromData(c.id, selectedYear, month);
      if (dashCounts) {
        let val: number;
        if (tolerance === "Sensitive") val = dashCounts.lightSensitive;
        else if (tolerance === "Tolerant") val = dashCounts.lightTolerant;
        else if (migration === "Resident")  val = dashCounts.resident;
        else if (migration === "Migratory") val = dashCounts.migratory;
        else val = totalFromCounts(dashCounts);
        m.set(c.id, val);
      } else {
        m.set(c.id, getCityRichness(c, tolerance, migration, month));
      }
    });
    return m;
  }, [tolerance, migration, month, selectedYear]);

  // ── Map fill: gray until BAU run for that city; color persists and updates on re-run ──
  function getCityFill(city: CityInfo): string {
    const entry = cityPredMap.get(city.id);
    if (!entry) return "#6b7280"; // never predicted → gray
    return richnessColor(entry.result.total);
  }

  return (
    <div className={`flex flex-col min-h-full ${pageBg}`}>

      {/* ── Sticky top nav ─────────────────────────────────────────────────── */}
      <nav className={`sticky top-0 z-20 flex h-11 items-center justify-between px-4 ${navBg} border-b shrink-0`}>
        <div className="flex items-center gap-2">
          <span className={`${textSecondary} text-xs font-semibold`}>Prediction Mode</span>
          <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${lightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-300"}`}>
            <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
            Species Richness
          </span>
        </div>
        <span className={`text-xs ${textSecondary} italic`}>Select a city below → Run BAU Prediction to update map</span>
      </nav>

      {/* ── Map ──────────────────────────────────────────────────────────────── */}
      <div
        className={`relative w-full overflow-hidden border-b ${sectionBorder}`}
        style={{ height: "62vh", minHeight: "440px" }}
        onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
      >
        <svg
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          width="100%" height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block", background: "#e8e8e0" }}
        >
          <defs>
            <pattern id="bay-diag" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <line x1="0" y1="10" x2="10" y2="0" stroke="#7ab8d4" strokeWidth="1" opacity="0.5" />
            </pattern>
          </defs>

          {[121.0,121.1,121.2].map(lon => {
            const [x] = ll(14.86, lon);
            return <line key={lon} x1={x} y1={0} x2={x} y2={MAP_H} stroke="rgba(0,0,0,0.07)" strokeWidth={0.7} strokeDasharray="4 4" />;
          })}
          {[14.4,14.5,14.6,14.7,14.8].map(lat => {
            const [,y] = ll(lat, LON_MIN);
            return <line key={lat} x1={0} y1={y} x2={MAP_W} y2={y} stroke="rgba(0,0,0,0.07)" strokeWidth={0.7} strokeDasharray="4 4" />;
          })}

          <polygon points={`0,0 ${ll(14.82,120.90).join(",")} ${ll(14.70,120.91).join(",")} ${ll(14.67,120.93).join(",")} ${ll(14.62,120.96).join(",")} ${ll(14.55,120.97).join(",")} ${ll(14.52,120.97).join(",")} ${ll(14.45,120.99).join(",")} ${ll(14.43,120.96).join(",")} ${ll(14.38,120.96).join(",")} 0,${MAP_H}`} fill="#c8dce8" />
          <polygon points={`0,0 ${ll(14.82,120.90).join(",")} ${ll(14.70,120.91).join(",")} ${ll(14.67,120.93).join(",")} ${ll(14.62,120.96).join(",")} ${ll(14.55,120.97).join(",")} ${ll(14.52,120.97).join(",")} ${ll(14.45,120.99).join(",")} ${ll(14.43,120.96).join(",")} ${ll(14.38,120.96).join(",")} 0,${MAP_H}`} fill="url(#bay-diag)" />
          <polygon points={`${ll(14.57,121.13).join(",")} ${MAP_W},${ll(14.57,121.22)[1]} ${MAP_W},${MAP_H} ${ll(14.38,121.13).join(",")}`} fill="#c8dce8" />
          <polygon points={`${ll(14.57,121.13).join(",")} ${MAP_W},${ll(14.57,121.22)[1]} ${MAP_W},${MAP_H} ${ll(14.38,121.13).join(",")}`} fill="url(#bay-diag)" />

          {([ ["Manila Bay",14.60,120.84],["Laguna de Bay",14.45,121.18],["Bulacan",14.84,120.97],["Rizal / Antipolo",14.62,121.20],["Cavite",14.36,120.90]] as [string,number,number][]).map(([label,lat,lon]) => {
            const [x,y] = ll(lat,lon);
            if (x<0||x>MAP_W||y<0||y>MAP_H) return null;
            return <text key={label} x={x} y={y} textAnchor="middle" fill="rgba(80,90,100,0.55)" style={{ fontSize:"11px", fontStyle:"italic", userSelect:"none" }}>{label}</text>;
          })}

          {CITIES.map(city => {
            const fill      = getCityFill(city);
            const isHov     = hoveredCity === city.id;
            const isSel     = city.id === predCityId;
            const [lx,ly]   = ll(city.labelAt[0], city.labelAt[1]);
            const fsize     = city.name.length > 9 ? 7.5 : city.name.length > 6 ? 9 : 10;
            return (
              <g key={city.id}>
                <polygon
                  points={pts(city.polygon)}
                  fill={fill}
                  fillOpacity={isSel ? 0.97 : isHov ? 0.90 : 0.80}
                  stroke={isSel ? "#ffffff" : isHov ? "#ffffffaa" : "#111111"}
                  strokeWidth={isSel ? 2.4 : isHov ? 1.8 : 1.0}
                  strokeLinejoin="round"
                  style={{ cursor: "pointer", transition: "fill 0.4s ease" }}
                  onMouseEnter={e => { e.stopPropagation(); setHoveredCity(city.id); }}
                  onMouseLeave={() => setHoveredCity(null)}
                  onClick={() => {
                    setPredCityId(city.id);
                    handleCityClick(city);
                  }}
                />
                {isSel && (
                  <polygon
                    points={pts(city.polygon)}
                    fill="none"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    style={{ pointerEvents: "none" }}
                  />
                )}
                <text x={lx} y={ly} textAnchor="middle"
                  fill={lightMode ? "#ffffff" : (isSel||isHov ? "#ffffff" : "rgba(0,0,0,0.85)")}
                  paintOrder="stroke"
                  stroke={lightMode ? "rgba(0,0,0,0.75)" : (isSel||isHov ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.75)")}
                  strokeWidth={isSel||isHov ? "2.2" : "2.6"}
                  style={{ fontSize:`${fsize}px`, fontWeight:isSel?700:600, userSelect:"none", pointerEvents:"none" }}
                >{city.name}</text>
              </g>
            );
          })}
        </svg>

        {/* Zoom decorative */}
        <div className="absolute top-3 left-3 flex flex-col rounded overflow-hidden border border-[#bbb] shadow-md">
          <button className="w-7 h-7 flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 border-b border-[#bbb]"><Plus size={13} /></button>
          <button className="w-7 h-7 flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700"><Minus size={13} /></button>
        </div>

        {/* Legend — static, always visible */}
        <div className="absolute bottom-8 left-3 bg-white/92 border border-gray-300 rounded-lg p-3 shadow-lg backdrop-blur-sm">
          <p className="text-gray-800 mb-2" style={{ fontWeight: 700, fontSize: "12px" }}>Predicted Richness</p>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-500" style={{ fontSize: "10px" }}>Low</span>
            <div className="h-3 rounded" style={{ width: "100px", background: "linear-gradient(to right,#1a1e78,#1565c0,#42a5f5,#fff176,#f9a825)" }} />
            <span className="text-gray-500" style={{ fontSize: "10px" }}>High</span>
          </div>
          <div className="flex justify-between w-28">
            {["0","12","25","37","50"].map(v => (
              <span key={v} className="text-gray-500" style={{ fontSize: "9px" }}>{v}</span>
            ))}
          </div>
          <p className="text-gray-400 mt-1.5" style={{ fontSize: "9px" }}>Gray = no prediction yet</p>
        </div>

        <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 ${tooltipBg} rounded-full px-4 py-1.5 text-xs ${lightMode ? 'text-gray-700' : 'text-gray-200'} backdrop-blur-sm pointer-events-none whitespace-nowrap`}>
          Click a city to select it · Run BAU Prediction below to update colors
        </div>
        <div className={`absolute bottom-1 right-2 ${textSecondary}`} style={{ fontSize: "9px", opacity: 0.7 }}>© AVILIGHT NCR Map</div>
      </div>

      {/* ── Bottom section: Dual Scenario ─────────────────────────────────── */}
      <div className={`${gridBg}`}>

        {/* ── TOP ROW: City selector + BAU panel ── */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x ${lightMode ? "divide-gray-200" : "divide-[#1e2535]"}`}>

          {/* LEFT: City + Historical baseline (read-only) */}
          <div className="p-6 flex flex-col gap-4">
            <div>
              <h2 className={`${textPrimary} mb-0.5`} style={{ fontWeight: 700, fontSize: "15px" }}>
                Business as Usual (BAU)
              </h2>
              <p className={`text-xs ${textSecondary}`}>
                Inputs are locked to <span className="font-semibold">historical trend averages</span> derived from nighttime radiance and environmental records. No manual adjustment.
              </p>
            </div>

            {/* City picker */}
            <div>
              <label className={`block text-xs mb-1.5 ${textSecondary} font-semibold`}>
                <MapPin size={11} className="inline mr-1 text-purple-400" />City / Municipality
              </label>
              <select
                value={predCityId}
                onChange={e => setPredCityId(e.target.value)}
                className={`w-full rounded px-2 py-2 text-sm outline-none ${inputField} transition-colors font-semibold`}
              >
                {CITIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Land type badge */}
            <div className={`flex items-center gap-2 w-full rounded px-3 py-2 text-sm ${lightMode ? "bg-gray-100 border border-gray-200 text-gray-700" : "bg-[#0d1117] border border-[#2a2f42] text-gray-300"}`}>
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: LAND_COLORS[predCity.dominantLandCover] }} />
              <span className="font-semibold">{predCity.dominantLandCover}</span>
              <span className={`ml-auto text-xs ${textSecondary}`}>{predCity.landCoverPct}% cover</span>
            </div>

            {/* Historical covariate read-only cards — label shows last year baseline + avg annual increase */}
            <div>
              <p className={`text-xs font-semibold ${textSecondary} mb-2`}>📊 Historical Average Inputs (locked)</p>
              <div className="grid grid-cols-2 gap-2">
                {(() => {
                  const alan   = getCovariateBaseline(predCityId, "alan");
                  const ndvi   = getCovariateBaseline(predCityId, "ndvi");
                  const temp   = getCovariateBaseline(predCityId, "temp");
                  const precip = getCovariateBaseline(predCityId, "precip");
                  return [
                    {
                      label: "Nighttime Radiance (ALAN)", icon: "🌃",
                      color: lightMode ? "bg-amber-50 border-amber-200" : "bg-amber-900/10 border-amber-700/30",
                      value: `${historicalCovariates.alan} nW/cm²/sr`,
                      sub: `2023 baseline: ${alan.lastYear} nW · +${alan.avgIncrease} nW/yr avg`,
                    },
                    {
                      label: "NDVI (Vegetation Cover)", icon: "🌿",
                      color: lightMode ? "bg-green-50 border-green-200" : "bg-green-900/10 border-green-700/30",
                      value: `${historicalCovariates.ndvi}%`,
                      sub: `2023 baseline: ${ndvi.lastYear}% · ${ndvi.avgIncrease > 0 ? "+" : ""}${ndvi.avgIncrease}%pt/yr avg`,
                    },
                    {
                      label: "Land Surface Temp", icon: "🌡️",
                      color: lightMode ? "bg-red-50 border-red-200" : "bg-red-900/10 border-red-700/30",
                      value: `${historicalCovariates.temp}°C`,
                      sub: `2023 baseline: ${temp.lastYear}°C · ${temp.avgIncrease > 0 ? "+" : ""}${temp.avgIncrease}°C/yr avg`,
                    },
                    {
                      label: "Mean Precipitation", icon: "🌧️",
                      color: lightMode ? "bg-blue-50 border-blue-200" : "bg-blue-900/10 border-blue-700/30",
                      value: `${historicalCovariates.precip} mm`,
                      sub: `2023 baseline: ${precip.lastYear} mm · ${precip.avgIncrease > 0 ? "+" : ""}${precip.avgIncrease} mm/yr avg`,
                    },
                  ].map((card, i) => (
                    <div key={i} className={`rounded-lg border p-2.5 ${card.color}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span style={{ fontSize: "13px" }}>{card.icon}</span>
                        <span className={`text-xs font-semibold ${lightMode ? "text-gray-500" : "text-gray-400"}`} style={{ fontSize: "10px", lineHeight: 1.3 }}>{card.label}</span>
                      </div>
                      <p className={`${textPrimary} font-bold`} style={{ fontSize: "15px" }}>{card.value}</p>
                      <p className={`text-xs ${textSecondary} mt-0.5`} style={{ fontSize: "9px" }}>{card.sub}</p>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {/* Month selector */}
            <div>
              <label className={`block text-xs font-semibold ${textSecondary} mb-1.5`}>📅 Month</label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={11} step={1} value={month}
                  onChange={e => { setMonth(Number(e.target.value)); setBauPrediction(null); setMitPrediction(null); }}
                  className="flex-1 cursor-pointer accent-purple-500" style={{ height: "4px" }}
                />
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${lightMode ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-300"}`}>
                  {MONTHS[month]}
                </span>
              </div>
              <p className={`text-xs ${textSecondary} mt-1`} style={{ fontSize: "9px" }}>Mitigation scenario will use the same month.</p>
            </div>

            {/* BAU run button */}
            <button
              onClick={handleRunBAU}
              disabled={bauRunning}
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm text-white transition-all font-bold ${
                bauRunning ? "bg-slate-600/60 cursor-not-allowed" : "bg-slate-700 hover:bg-slate-600 active:scale-[0.98]"
              }`}
            >
              <Play size={13} />
              {bauRunning ? "Running BAU…" : "Run BAU Prediction"}
            </button>
          </div>

          {/* RIGHT: BAU result */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: "72vh" }}>
            <h2 className={`${textPrimary} mb-1`} style={{ fontWeight: 700, fontSize: "15px" }}>
              BAU Prediction Result
              {bauPrediction && <span className={`ml-2 text-xs font-normal ${textSecondary}`}>— {predCity.name} · {MONTHS[month]}</span>}
            </h2>
            <p className={`text-xs ${textSecondary} mb-4`}>Projected species richness if current environmental trends continue unchanged.</p>

            {!bauPrediction ? (
              <div className={`rounded-lg p-10 border text-center ${lightMode ? "bg-gray-50 border-gray-200" : "bg-[#0d1117] border-[#2a2f42]"}`}>
                <div className="text-4xl mb-3">📉</div>
                <p className={`text-sm font-semibold ${textSecondary}`}>Select a city and run the BAU prediction</p>
                <p className={`text-xs ${textSecondary} mt-1`}>Historical inputs will be used automatically.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* BAU total badge */}
                <div className={`rounded-lg p-4 border ${lightMode ? "bg-slate-100 border-slate-300" : "bg-slate-800/40 border-slate-600/40"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-bold ${textSecondary} mb-0.5 uppercase tracking-wide`}>BAU Total Predicted</p>
                      <p className={`text-xs ${textSecondary}`}>{predCity.dominantLandCover} · ALAN {historicalCovariates.alan} nW · {MONTHS[month]}</p>
                    </div>
                    <span className={`text-4xl font-extrabold ${lightMode ? "text-slate-700" : "text-slate-300"}`}>{bauPrediction.total}</span>
                  </div>
                </div>

                {/* BAU breakdown bars */}
                <div className={`rounded-lg border overflow-hidden ${lightMode ? "bg-white border-gray-200" : "bg-[#0d1117] border-[#2a2f42]"}`}>
                  {[
                    { label: "Light Sensitive", val: bauPrediction.lightSensitive, color: "#f87171", bg: "bg-red-400"     },
                    { label: "Light Tolerant",  val: bauPrediction.lightTolerant,  color: "#60a5fa", bg: "bg-blue-400"    },
                    { label: "Resident",        val: bauPrediction.resident,       color: "#34d399", bg: "bg-emerald-400" },
                    { label: "Migratory",       val: bauPrediction.migratory,      color: "#fbbf24", bg: "bg-amber-400"   },
                  ].map((row, i, arr) => (
                    <div key={i} className={`px-4 py-2.5 ${i < arr.length - 1 ? `border-b ${sectionBorder}` : ""}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-bold ${textPrimary}`}>{row.label}</span>
                        <span style={{ fontSize: "16px", fontWeight: 800, color: row.color }}>{row.val}</span>
                      </div>
                      <div className={`h-2 rounded-full ${lightMode ? "bg-gray-100" : "bg-[#1e2535]"}`}>
                        <div className={`h-2 rounded-full ${row.bg} transition-all duration-500`}
                          style={{ width: `${Math.round((row.val / bauPrediction.total) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── SHAP chart shown after BAU runs — always localised to predCity ── */}
                <div className={`rounded-lg border p-4 ${lightMode ? "bg-white border-gray-200" : "bg-[#0d1117] border-[#2a2f42]"}`}>
                  <h3 className={`${textPrimary} mb-0.5`} style={{ fontWeight: 700, fontSize: "13px" }}>
                    Feature Importance (SHAP) — {predCity.name}
                  </h3>
                  <p className={`${textSecondary} text-xs mb-3`}>
                    Local SHAP values for <span className="text-cyan-400 font-semibold">{predCity.name}</span> · {predCity.dominantLandCover}
                  </p>
                  {/* Fixed-height wrapper avoids ResizeObserver issues inside overflow-y-auto */}
                  <div style={{ width: "100%", height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={predCity.shap} margin={{ top: 4, right: 12, left: 10, bottom: 28 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={lightMode ? "#e5e7eb" : "#1e2535"} vertical={false} />
                        <XAxis dataKey="feature" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} interval={0} angle={-10} textAnchor="end" dy={8} />
                        <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} domain={[0, 0.60]} ticks={[0, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60]}
                          label={{ value: "(mean |SHAP|)", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: "#6b7280" }, dx: -2 }} />
                        <RTooltip
                          contentStyle={{ background: lightMode ? "#ffffff" : "#1e2538", border: lightMode ? "1px solid #e5e7eb" : "1px solid #2a2f42", borderRadius: "6px", fontSize: "12px" }}
                          itemStyle={{ color: "#22c55e" }} labelStyle={{ color: lightMode ? "#1f2937" : "#d1d5db" }}
                          formatter={(val: number) => [val.toFixed(2), "Feature Importance"]}
                        />
                        <Bar dataKey="value" fill="#22c55e" name="Feature Importance" radius={[3, 3, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className={`text-xs ${textSecondary} mt-2 leading-relaxed`}>
                    <span style={{ fontWeight: 600 }}>Interpretation: </span>
                    {`In ${predCity.name}, ${predCity.shap[0].feature.toLowerCase()} (${predCity.shap[0].value.toFixed(2)}) and ${predCity.shap[1].feature.toLowerCase()} (${predCity.shap[1].value.toFixed(2)}) are the strongest drivers of bird species richness.`}
                  </p>
                </div>

                <p className={`text-xs ${textSecondary} italic`}>
                  ✅ BAU baseline locked. Now configure the <span className="font-semibold text-emerald-500">Mitigation Scenario</span> below.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── MITIGATION SECTION (unlocked after BAU runs) ── */}
        <div className={`border-t ${lightMode ? "border-gray-200" : "border-[#1e2535]"}`}>
          {!bauPrediction ? (
            <div className={`p-6 text-center ${lightMode ? "bg-gray-50" : "bg-[#0a0d13]"}`}>
              <p className={`text-sm font-semibold ${textSecondary}`}>🔒 Run the BAU prediction first to unlock the Mitigation Scenario</p>
            </div>
          ) : (
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x ${lightMode ? "divide-gray-200" : "divide-[#1e2535]"}`}>

              {/* LEFT: Mitigation sliders */}
              <div className="p-6 flex flex-col gap-5">
                <div>
                  <h2 className={`${textPrimary} mb-0.5`} style={{ fontWeight: 700, fontSize: "15px" }}>
                    🌱 Mitigation Scenario
                  </h2>
                  <p className={`text-xs ${textSecondary}`}>
                    Adjust each slider relative to the historical baseline. Centre = no change.
                    Move left to worsen, right to improve conditions.
                  </p>
                </div>

                {/* ALAN slider */}
                {(() => {
                  const base = historicalCovariates.alan;
                  const range = 40;
                  const effective = Math.max(0, base + alanDelta);
                  const pctChange = Math.round((alanDelta / base) * 100);
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <span className={`text-xs font-bold ${textPrimary}`}>🌃 Nighttime Radiance (ALAN)</span>
                          <span className={`ml-2 text-xs ${textSecondary}`}>Baseline: {base} nW</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            alanDelta < 0
                              ? lightMode ? "bg-green-100 text-green-700" : "bg-green-900/30 text-green-400"
                              : alanDelta > 0
                                ? lightMode ? "bg-red-100 text-red-700" : "bg-red-900/30 text-red-400"
                                : lightMode ? "bg-gray-100 text-gray-600" : "bg-gray-700/40 text-gray-400"
                          }`}>
                            {effective} nW {alanDelta !== 0 && `(${pctChange > 0 ? "+" : ""}${pctChange}%)`}
                          </span>
                        </div>
                      </div>
                      <div className="relative">
                        <input type="range" min={-range} max={range} step={2} value={alanDelta}
                          onChange={e => { setAlanDelta(Number(e.target.value)); setMitPrediction(null); }}
                          className="w-full cursor-pointer accent-amber-500" style={{ height: "4px" }} />
                        <div className="flex justify-between text-xs mt-1" style={{ fontSize: "9px" }}>
                          <span className="text-green-500 font-semibold">← Reduce pollution</span>
                          <span className={`${textSecondary}`}>Historical avg</span>
                          <span className="text-red-400 font-semibold">More pollution →</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* NDVI slider */}
                {(() => {
                  const base = historicalCovariates.ndvi;
                  const range = 30;
                  const effective = Math.min(100, Math.max(0, base + ndviDelta));
                  const pctChange = ndviDelta;
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <span className={`text-xs font-bold ${textPrimary}`}>🌿 NDVI (Vegetation Cover)</span>
                          <span className={`ml-2 text-xs ${textSecondary}`}>Baseline: {base}%</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          ndviDelta > 0
                            ? lightMode ? "bg-green-100 text-green-700" : "bg-green-900/30 text-green-400"
                            : ndviDelta < 0
                              ? lightMode ? "bg-red-100 text-red-700" : "bg-red-900/30 text-red-400"
                              : lightMode ? "bg-gray-100 text-gray-600" : "bg-gray-700/40 text-gray-400"
                        }`}>
                          {effective}% {ndviDelta !== 0 && `(${pctChange > 0 ? "+" : ""}${pctChange}pp)`}
                        </span>
                      </div>
                      <div className="relative">
                        <input type="range" min={-range} max={range} step={1} value={ndviDelta}
                          onChange={e => { setNdviDelta(Number(e.target.value)); setMitPrediction(null); }}
                          className="w-full cursor-pointer accent-green-500" style={{ height: "4px" }} />
                        <div className="flex justify-between mt-1" style={{ fontSize: "9px" }}>
                          <span className="text-red-400 font-semibold">← Less vegetation</span>
                          <span className={`${textSecondary}`}>Historical avg</span>
                          <span className="text-green-500 font-semibold">More vegetation →</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Temp slider */}
                {(() => {
                  const base = historicalCovariates.temp;
                  const range = 4;
                  const effective = (base + tempDelta).toFixed(1);
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <span className={`text-xs font-bold ${textPrimary}`}>🌡️ Land Surface Temperature</span>
                          <span className={`ml-2 text-xs ${textSecondary}`}>Baseline: {base}°C</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          tempDelta < 0
                            ? lightMode ? "bg-green-100 text-green-700" : "bg-green-900/30 text-green-400"
                            : tempDelta > 0
                              ? lightMode ? "bg-red-100 text-red-700" : "bg-red-900/30 text-red-400"
                              : lightMode ? "bg-gray-100 text-gray-600" : "bg-gray-700/40 text-gray-400"
                        }`}>
                          {effective}°C {tempDelta !== 0 && `(${tempDelta > 0 ? "+" : ""}${tempDelta}°C)`}
                        </span>
                      </div>
                      <div className="relative">
                        <input type="range" min={-range} max={range} step={0.5} value={tempDelta}
                          onChange={e => { setTempDelta(Number(e.target.value)); setMitPrediction(null); }}
                          className="w-full cursor-pointer accent-red-400" style={{ height: "4px" }} />
                        <div className="flex justify-between mt-1" style={{ fontSize: "9px" }}>
                          <span className="text-green-500 font-semibold">← Cooler (urban greening)</span>
                          <span className={`${textSecondary}`}>Historical avg</span>
                          <span className="text-red-400 font-semibold">Warmer →</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Precipitation slider */}
                {(() => {
                  const base = historicalCovariates.precip;
                  const range = 100;
                  const effective = Math.max(0, base + precipDelta);
                  const pctChange = Math.round((precipDelta / base) * 100);
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div>
                          <span className={`text-xs font-bold ${textPrimary}`}>🌧️ Precipitation</span>
                          <span className={`ml-2 text-xs ${textSecondary}`}>Baseline: {base} mm</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          precipDelta > 0
                            ? lightMode ? "bg-blue-100 text-blue-700" : "bg-blue-900/30 text-blue-400"
                            : precipDelta < 0
                              ? lightMode ? "bg-red-100 text-red-700" : "bg-red-900/30 text-red-400"
                              : lightMode ? "bg-gray-100 text-gray-600" : "bg-gray-700/40 text-gray-400"
                        }`}>
                          {effective} mm {precipDelta !== 0 && `(${pctChange > 0 ? "+" : ""}${pctChange}%)`}
                        </span>
                      </div>
                      <div className="relative">
                        <input type="range" min={-range} max={range} step={5} value={precipDelta}
                          onChange={e => { setPrecipDelta(Number(e.target.value)); setMitPrediction(null); }}
                          className="w-full cursor-pointer accent-blue-400" style={{ height: "4px" }} />
                        <div className="flex justify-between mt-1" style={{ fontSize: "9px" }}>
                          <span className="text-red-400 font-semibold">← Drier conditions</span>
                          <span className={`${textSecondary}`}>Historical avg</span>
                          <span className="text-blue-500 font-semibold">More rainfall →</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Mitigation run button */}
                <button
                  onClick={handleRunMitigation}
                  disabled={mitRunning}
                  className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm text-white transition-all font-bold mt-auto ${
                    mitRunning ? "bg-emerald-700/60 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]"
                  }`}
                >
                  <Play size={13} />
                  {mitRunning ? "Running Mitigation…" : "Run Mitigation Prediction"}
                </button>
              </div>

              {/* RIGHT: Comparison output */}
              <div className="p-6 overflow-y-auto" style={{ maxHeight: "72vh" }}>
                <h2 className={`${textPrimary} mb-1`} style={{ fontWeight: 700, fontSize: "15px" }}>
                  Scenario Comparison
                </h2>
                <p className={`text-xs ${textSecondary} mb-4`}>
                  Side-by-side delta between BAU and Mitigation outcomes.
                </p>

                {!mitPrediction ? (
                  <div className={`rounded-lg p-8 border text-center ${lightMode ? "bg-gray-50 border-gray-200" : "bg-[#0d1117] border-[#2a2f42]"}`}>
                    <div className="text-4xl mb-3">⚖️</div>
                    <p className={`text-sm font-semibold ${textSecondary}`}>Adjust the mitigation sliders</p>
                    <p className={`text-xs ${textSecondary} mt-1`}>then click <span className="text-emerald-500 font-bold">Run Mitigation Prediction</span> to see the difference.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Total comparison header */}
                    <div className={`rounded-xl border overflow-hidden ${lightMode ? "border-gray-200" : "border-[#2a2f42]"}`}>
                      <div className={`grid grid-cols-3 text-center ${lightMode ? "bg-gray-50" : "bg-[#0d1117]"}`}>
                        {/* BAU */}
                        <div className={`p-4 border-r ${lightMode ? "border-gray-200" : "border-[#2a2f42]"}`}>
                          <p className={`text-xs font-bold ${lightMode ? "text-slate-500" : "text-slate-400"} uppercase tracking-wide mb-1`}>BAU</p>
                          <p className={`text-3xl font-extrabold ${lightMode ? "text-slate-700" : "text-slate-300"}`}>{bauPrediction.total}</p>
                          <p className={`text-xs ${textSecondary}`}>species</p>
                        </div>
                        {/* Delta */}
                        <div className="p-4 flex flex-col items-center justify-center">
                          {(() => {
                            const delta = mitPrediction.total - bauPrediction.total;
                            const isPositive = delta >= 0;
                            return (
                              <>
                                <p className={`text-2xl font-extrabold ${isPositive ? "text-emerald-500" : "text-red-400"}`}>
                                  {isPositive ? "+" : ""}{delta}
                                </p>
                                <p className={`text-xs font-semibold ${isPositive ? "text-emerald-500" : "text-red-400"}`}>
                                  {isPositive ? "▲ Gain" : "▼ Loss"}
                                </p>
                                <p className={`text-xs ${textSecondary} mt-0.5`}>
                                  {Math.abs(Math.round((delta / bauPrediction.total) * 100))}%
                                </p>
                              </>
                            );
                          })()}
                        </div>
                        {/* Mitigation */}
                        <div className={`p-4 border-l ${lightMode ? "border-gray-200 bg-emerald-50" : "border-[#2a2f42] bg-emerald-900/10"}`}>
                          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Mitigation</p>
                          <p className="text-3xl font-extrabold text-emerald-500">{mitPrediction.total}</p>
                          <p className={`text-xs ${textSecondary}`}>species</p>
                        </div>
                      </div>
                    </div>

                    {/* Category comparison rows */}
                    <div className={`rounded-lg border overflow-hidden ${lightMode ? "bg-white border-gray-200" : "bg-[#0d1117] border-[#2a2f42]"}`}>
                      <div className={`grid grid-cols-4 px-4 py-1.5 text-center ${lightMode ? "bg-gray-50 border-b border-gray-200" : "bg-[#161b27] border-b border-[#1e2535]"}`}>
                        <span className={`text-xs font-bold ${textSecondary} text-left`}>Category</span>
                        <span className={`text-xs font-bold ${lightMode ? "text-slate-500" : "text-slate-400"}`}>BAU</span>
                        <span className="text-xs font-bold text-emerald-500">Mitigation</span>
                        <span className={`text-xs font-bold ${textSecondary}`}>Change</span>
                      </div>
                      {[
                        { label: "Light Sensitive", bau: bauPrediction.lightSensitive, mit: mitPrediction.lightSensitive, color: "#f87171" },
                        { label: "Light Tolerant",  bau: bauPrediction.lightTolerant,  mit: mitPrediction.lightTolerant,  color: "#60a5fa" },
                        { label: "Resident",        bau: bauPrediction.resident,        mit: mitPrediction.resident,        color: "#34d399" },
                        { label: "Migratory",       bau: bauPrediction.migratory,       mit: mitPrediction.migratory,       color: "#fbbf24" },
                      ].map((row, i, arr) => {
                        const delta = row.mit - row.bau;
                        const isPos = delta >= 0;
                        return (
                          <div key={i} className={`grid grid-cols-4 px-4 py-2.5 text-center items-center ${i < arr.length - 1 ? `border-b ${sectionBorder}` : ""}`}>
                            <div className="flex items-center gap-1.5 text-left">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                              <span className={`text-xs font-semibold ${textPrimary}`}>{row.label}</span>
                            </div>
                            <span className={`text-sm font-bold ${lightMode ? "text-slate-600" : "text-slate-300"}`}>{row.bau}</span>
                            <span className="text-sm font-bold text-emerald-500">{row.mit}</span>
                            <span className={`text-sm font-bold ${isPos ? "text-emerald-500" : "text-red-400"}`}>
                              {isPos ? "+" : ""}{delta}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Narrative summary */}
                    <div className={`rounded-lg p-3 border ${lightMode ? "bg-emerald-50 border-emerald-200" : "bg-emerald-900/10 border-emerald-700/30"}`}>
                      {(() => {
                        const delta = mitPrediction.total - bauPrediction.total;
                        const lsDelta = mitPrediction.lightSensitive - bauPrediction.lightSensitive;
                        const isPositive = delta >= 0;
                        return (
                          <p className={`text-xs leading-relaxed ${textSecondary}`}>
                            <span className="font-bold">📋 Summary: </span>
                            {isPositive
                              ? `The mitigation scenario projects a gain of ${delta} species (+${Math.round((delta / bauPrediction.total) * 100)}%) over BAU. Light-sensitive species ${lsDelta >= 0 ? `increase by ${lsDelta}` : `decrease by ${Math.abs(lsDelta)}`}, indicating that ${alanDelta < 0 ? "reduced nighttime light pollution is a key driver of recovery." : "vegetation improvements partially offset light pollution effects."}`
                              : `The mitigation scenario results in ${Math.abs(delta)} fewer species than BAU. Adjusting the sliders toward beneficial values (reduce ALAN, increase NDVI) should improve outcomes.`
                            }
                          </p>
                        );
                      })()}
                    </div>

                    <p className={`text-xs ${textSecondary} italic`}>
                      Prototype model — values are illustrative for presentation purposes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── Hover tooltip ──────────────────────────────────────────────────────── */}
      {hoveredCity && (() => {
        const city = CITIES.find(c => c.id === hoveredCity);
        if (!city) return null;
        const predEntry = cityPredMap.get(city.id);

        return (
          <div className="fixed pointer-events-none z-50 rounded-lg shadow-xl overflow-hidden"
            style={{
              left: Math.min(mousePos.x + 14, window.innerWidth - 230),
              top:  Math.max(mousePos.y - 90, 8),
              minWidth: "210px",
              background: lightMode ? "#ffffff" : "#0d1117",
              border: lightMode ? "1px solid #d1d5db" : "1px solid #2a3550",
            }}
          >
            {/* Header */}
            <div className="px-3 py-2"
              style={{ background: lightMode ? "#f9fafb" : "#161b27" }}>
              <p className={`${textPrimary} text-xs`} style={{ fontWeight: 700 }}>{city.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: LAND_COLORS[city.dominantLandCover] }} />
                <span className={`${textSecondary} text-xs`}>{city.dominantLandCover}</span>
              </div>
            </div>

            {/* Body — show prediction breakdown if this city has ever been predicted */}
            {predEntry ? (
              <div className="px-3 py-2.5 border-t"
                style={{ borderColor: lightMode ? "#e5e7eb" : "#1e2535" }}>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${textSecondary}`}>Total Predicted</span>
                    <span className="text-purple-400 text-sm" style={{ fontWeight: 800 }}>{predEntry.result.total} spp.</span>
                  </div>
                  {[
                    { label: "Light Sensitive", val: predEntry.result.lightSensitive, color: "#f87171" },
                    { label: "Light Tolerant",  val: predEntry.result.lightTolerant,  color: "#60a5fa" },
                    { label: "Resident",        val: predEntry.result.resident,       color: "#34d399" },
                    { label: "Migratory",       val: predEntry.result.migratory,      color: "#fbbf24" },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: row.color }} />
                        <span className={`text-xs ${textSecondary}`}>{row.label}</span>
                      </div>
                      <span className="text-xs" style={{ fontWeight: 700, color: row.color }}>{row.val}</span>
                    </div>
                  ))}
                  <p className={`text-xs mt-1.5 pt-1.5 border-t ${textSecondary} italic`}
                    style={{ borderColor: lightMode ? "#e5e7eb" : "#1e2535" }}>
                    {MONTHS[predEntry.month]} · {city.dominantLandCover}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        );
      })()}
    </div>
  );
}
