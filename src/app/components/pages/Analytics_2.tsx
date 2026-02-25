import { useOutletContext } from "react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, Legend as RLegend,
} from "recharts";
import { Search, ChevronDown, Plus, Minus } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type LandType =
  | "Urban & Built-up" | "Water Bodies" | "Forest" | "Croplands"
  | "Grasslands" | "Wetlands" | "Savannas" | "Woody Savannas"
  | "Cropland Mosaics" | "Barren";
type ViewMode  = "landcover" | "richness";
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
  "Urban & Built-up": "#e53935", "Water Bodies":    "#42a5f5",
  "Forest":           "#2e7d32", "Croplands":       "#fdd835",
  "Grasslands":       "#66bb6a", "Wetlands":        "#00897b",
  "Savannas":         "#fb8c00", "Woody Savannas":  "#5d4037",
  "Cropland Mosaics": "#f06a1e", "Barren":          "#8d6e63",
};
const LEGEND_TYPES: LandType[] = [
  "Urban & Built-up","Water Bodies","Forest","Croplands",
  "Grasslands","Wetlands","Woody Savannas","Cropland Mosaics","Barren",
];
const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

// ── Map coordinate system — tightly zoomed on NCR ────────────────────────────
// This makes the city polygons large and prominent, matching the reference image
const MAP_W = 560, MAP_H = 700;
const LON_MIN = 120.82, LON_RANGE = 0.40;   // 120.82 → 121.22
const LAT_MAX = 14.86, LAT_RANGE = 0.56;    // 14.86 → 14.30

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

// ── Global SHAP (average across all cities) ───────────────────────────────────
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
    dominantLandCover:"Urban & Built-up", landCoverPct:65,
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
    dominantLandCover:"Urban & Built-up", landCoverPct:70,
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
    dominantLandCover:"Urban & Built-up", landCoverPct:70,
    richness:{"All-All":33,"Sensitive-All":24,"Tolerant-All":29,"All-Resident":30,"All-Migratory":22},
    totalSpecies:33, observationSites:9,
    species:["Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Olive-backed Sunbird","Lowland White-eye","Glossy Swiftlet","Philippine Myna","Brown Shrike","Blue-tailed Bee-eater","Coppersmith Barbet","White-collared Kingfisher","Little Egret","Black-crowned Night Heron","Striated Heron","Purple Heron","Common Sandpiper","Black-winged Stilt","White-browed Crake","Common Moorhen","Little Ringed Plover","Little Tern","Whiskered Tern","Philippine Duck","Little Grebe","White-breasted Waterhen","Purple Swamphen","Common Kingfisher","Spotted Dove"],
    shap:[{feature:"Light Intensity",value:0.42},{feature:"NDVI",value:0.27},{feature:"Temperature",value:0.16},{feature:"Elevation",value:0.06},{feature:"Distance to Water",value:0.09}],
  },
  {
    id:"paranaque", name:"Parañaque",
    polygon: [[14.52,120.98],[14.52,121.07],[14.47,121.07],[14.45,121.03],[14.45,120.99],[14.48,120.98]],
    labelAt: [14.485,121.02],
    dominantLandCover:"Urban & Built-up", landCoverPct:72,
    richness:{"All-All":31,"Sensitive-All":22,"Tolerant-All":27,"All-Resident":28,"All-Migratory":21},
    totalSpecies:31, observationSites:8,
    species:["Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Olive-backed Sunbird","Lowland White-eye","Glossy Swiftlet","Philippine Myna","Brown Shrike","Blue-tailed Bee-eater","Common Tern","Little Tern","Whiskered Tern","Pacific Reef Heron","Little Egret","Black-crowned Night Heron","Common Sandpiper","Black-winged Stilt","White-browed Crake","Common Moorhen","Little Ringed Plover","Philippine Duck","White-breasted Waterhen","Little Cormorant","Spotted Dove","Coppersmith Barbet","Long-tailed Shrike"],
    shap:[{feature:"Light Intensity",value:0.45},{feature:"NDVI",value:0.24},{feature:"Temperature",value:0.17},{feature:"Elevation",value:0.05},{feature:"Distance to Water",value:0.09}],
  },
  {
    id:"las-pinas", name:"Las Piñas",
    polygon: [[14.49,120.96],[14.49,121.03],[14.44,121.03],[14.43,121.00],[14.43,120.96]],
    labelAt: [14.46,120.995],
    dominantLandCover:"Urban & Built-up", landCoverPct:68,
    richness:{"All-All":34,"Sensitive-All":25,"Tolerant-All":30,"All-Resident":31,"All-Migratory":22},
    totalSpecies:34, observationSites:7,
    species:["Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Olive-backed Sunbird","Lowland White-eye","Glossy Swiftlet","Philippine Myna","Brown Shrike","Blue-tailed Bee-eater","Common Tern","Little Tern","Little Egret","Black-crowned Night Heron","Common Sandpiper","Black-winged Stilt","White-browed Crake","Common Moorhen","Philippine Duck","White-breasted Waterhen","Little Cormorant","Spotted Dove","Coppersmith Barbet","Blue-backed Parrot","Pied Triller","Philippine Drongo","White-throated Kingfisher","Pacific Reef Egret","Long-tailed Shrike","Common Greenshank"],
    shap:[{feature:"Light Intensity",value:0.40},{feature:"NDVI",value:0.29},{feature:"Temperature",value:0.17},{feature:"Elevation",value:0.05},{feature:"Distance to Water",value:0.09}],
  },
  {
    id:"muntinlupa", name:"Muntinlupa",
    polygon: [[14.49,121.02],[14.50,121.13],[14.40,121.13],[14.38,121.05],[14.38,121.02]],
    labelAt: [14.43,121.07],
    dominantLandCover:"Urban & Built-up", landCoverPct:58,
    richness:{"All-All":42,"Sensitive-All":34,"Tolerant-All":38,"All-Resident":40,"All-Migratory":28},
    totalSpecies:42, observationSites:11,
    species:["Philippine Bulbul","Lowland White-eye","Black-naped Oriole","Philippine Drongo","White-breasted Waterhen","Purple Swamphen","Common Moorhen","Striated Heron","Little Egret","Black-crowned Night Heron","White-browed Crake","Ruddy-breasted Crake","Philippine Duck","Little Grebe","Little Cormorant","Whiskered Tern","Common Sandpiper","Black-winged Stilt","Little Tern","Yellow-vented Bulbul","Pied Fantail","Pacific Swallow","Collared Kingfisher","Common Kingfisher","Olive-backed Sunbird","Glossy Swiftlet","Eurasian Tree Sparrow","Rock Pigeon","Common Myna","Zebra Dove","Philippine Myna","Brown Shrike","Blue-tailed Bee-eater","Coppersmith Barbet","Pied Triller","White-throated Kingfisher","Philippine Nightjar","Philippine Hawk-Owl","Spotted Dove","Long-tailed Shrike","Pacific Reef Heron","Philippine Pond Heron"],
    shap:[{feature:"Light Intensity",value:0.36},{feature:"NDVI",value:0.35},{feature:"Temperature",value:0.15},{feature:"Elevation",value:0.07},{feature:"Distance to Water",value:0.07}],
  },
];

// ── Main Analytics Page ───────────────────────────────────────────────────────
export function Analytics() {
  const { lightMode } = useOutletContext<{ lightMode: boolean }>();

  // theme helpers
  const pageBg = lightMode ? "bg-white text-gray-900" : "bg-[#0d1117] text-white";
  const navBg = lightMode ? "bg-white border-gray-200" : "bg-[#0d1117] border-[#1e2535]";
  const pillActiveBg = lightMode
    ? "bg-blue-600 text-white"
    : "bg-[#161b22] text-gray-400";
  const dividerColor = lightMode ? "bg-gray-300" : "bg-[#2a2f42]";
  const gridBg = lightMode ? "bg-gray-50" : "bg-[#0d1117]";
  const dropdownBg = lightMode
    ? "bg-white border border-gray-300"
    : "bg-[#0f1623] border border-[#2a2f42]";
  const inputBg = lightMode
    ? "bg-white border border-gray-300 text-gray-900"
    : "bg-[#161b22] border border-[#2a2f42] text-gray-200";
  const tooltipBg = lightMode ? "bg-gray-100/80 border-gray-300" : "bg-[#111]/80 border-[#333]";
  // card / pagination / modal styles
  const cardBg = lightMode ? "bg-white border border-gray-200" : "bg-[#161b27] border border-[#2a2f42]";
  const cardImageBg = lightMode ? "bg-gray-100" : "bg-[#1e2538]";
  const overlayBgValue = lightMode ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.75)";
  const gradientBg = lightMode ? "linear-gradient(to top, #f3f4f6, transparent)" : "linear-gradient(to top, #161b27, transparent)";
  const paginationBtnBase = lightMode ? "text-gray-700" : "text-gray-400";
  const textPrimary = lightMode ? "text-gray-900" : "text-white";
  const textSecondary = lightMode ? "text-gray-700" : "text-gray-400";

  // Filter controls
  const [viewMode,  setViewMode]  = useState<ViewMode>("landcover");
  const [tolerance, setTolerance] = useState<Tolerance>("All");
  const [migration, setMigration] = useState<Migration>("All");
  const [month,     setMonth]     = useState(0);

  // Map hover/interaction
  const [hoveredCity,  setHoveredCity]  = useState<string | null>(null);
  const [mousePos,     setMousePos]     = useState({ x: 0, y: 0 });

  // Local explainer
  const [searchText,   setSearchText]   = useState("");
  const [foundCity,    setFoundCity]    = useState<CityInfo | null>(null);
  const [searched,     setSearched]     = useState(false);
  const [expandSpecies, setExpandSpecies] = useState(false);

  // Land cover multi-select filter (right navbar button)
  const ALL_LC = Object.keys(LAND_COLORS) as LandType[];
  const [selectedCovers, setSelectedCovers] = useState<Set<LandType>>(new Set(ALL_LC));
  const [showLCFilter,   setShowLCFilter]   = useState(false);
  const lcRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (lcRef.current && !lcRef.current.contains(e.target as Node)) setShowLCFilter(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  function toggleCover(lt: LandType) {
    setSelectedCovers(prev => {
      const next = new Set(prev);
      next.has(lt) ? next.delete(lt) : next.add(lt);
      return next;
    });
  }
  const allCoversSelected = selectedCovers.size === ALL_LC.length;

  const richnessByCity = useMemo(() => {
    const m = new Map<string, number>();
    CITIES.forEach(c => m.set(c.id, getCityRichness(c, tolerance, migration, month)));
    return m;
  }, [tolerance, migration, month]);

  // The SHAP data shown in the chart — global if no city found, city-specific otherwise
  const shapData = foundCity ? foundCity.shap : GLOBAL_SHAP;
  const shapTitle = foundCity
    ? `City Feature Importance (SHAP) — ${foundCity.name}`
    : "Global Feature Importance (SHAP)";

  function handleSearch() {
    setExpanded(false);
    const q = searchText.trim().toLowerCase();
    if (!q) { setFoundCity(null); setSearched(false); return; }
    const match = CITIES.find(c =>
      c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
    setFoundCity(match ?? null);
    setSearched(true);
    setExpandSpecies(false);
  }

  // "expand" state for species list (only used in local explainer)
  const [, setExpanded] = useState(false);

  function handleCityClick(city: CityInfo) {
    setSearchText(city.name);
    setFoundCity(city);
    setSearched(true);
    setExpandSpecies(false);
    // Scroll to local explainer
    document.getElementById("local-explainer")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ── Pill button helper ────────────────────────────────────────────────────
  function Pill({ active, label, dot, onClick }: {
    active: boolean; label: string; dot?: string; onClick: () => void;
  }) {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-colors shrink-0 ${
          active ? pillActiveBg : `${textSecondary} hover:${lightMode?'text-gray-900':'text-gray-200'} border border-[#2a2f42]`
        }`}
      >
        {dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />}
        {label}
      </button>
    );
  }

  const div = <div className={`w-px h-5 ${dividerColor} mx-0.5 shrink-0`} />;

  return (
    <div className={`flex flex-col min-h-full ${pageBg}`}>

      {/* ── Sticky filter navbar ─────────────────────────────────────────────
          Split: scrollable-left filters | static-right view selector.
          Right section is outside overflow-x-auto so its dropdown overlaps the map. */}
      <nav className={`sticky top-0 z-20 flex h-11 ${navBg} shrink-0`}>

        {/* Scrollable filter pills — scrollbar hidden */}
        <div className="flex items-center gap-2 px-4 flex-1 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}>
          <span className={`${textSecondary} text-xs shrink-0`}>View</span>
          <Pill active={viewMode==="landcover"} label="Land Cover" dot="#42a5f5" onClick={()=>setViewMode("landcover")} />
          <Pill active={viewMode==="richness"}  label="Richness"   dot="#8b5cf6" onClick={()=>setViewMode("richness")} />
          {div}
          <span className={`${textSecondary} text-xs shrink-0`}>Tolerance</span>
          <Pill active={tolerance==="All"}       label="All"           onClick={()=>setTolerance("All")} />
          <Pill active={tolerance==="Sensitive"} label="🔆 Sensitive" dot="#fbbf24" onClick={()=>setTolerance("Sensitive")} />
          <Pill active={tolerance==="Tolerant"}  label="🌙 Tolerant"  dot="#f97316" onClick={()=>setTolerance("Tolerant")} />
          {div}
          <span className={`${textSecondary} text-xs shrink-0`}>Migration</span>
          <Pill active={migration==="All"}       label="All"            onClick={()=>setMigration("All")} />
          <Pill active={migration==="Resident"}  label="🐦 Resident"  dot="#22c55e" onClick={()=>setMigration("Resident")} />
          <Pill active={migration==="Migratory"} label="✈️ Migratory" dot="#38bdf8" onClick={()=>setMigration("Migratory")} />
          {div}
          {/* Month — range slider */}
          <span className={`${textSecondary} text-xs shrink-0`}>Month</span>
          <span className="text-blue-300 text-xs shrink-0 w-[68px]">{MONTHS[month]}</span>
          <input
            type="range" min={0} max={11} value={month}
            onChange={e => setMonth(Number(e.target.value))}
            className="w-28 shrink-0 cursor-pointer accent-blue-500"
            style={{ height: "4px" }}
          />
        </div>

        {/* Land Cover multi-select filter — outside overflow so dropdown overlaps the map */}
        <div ref={lcRef} className="shrink-0 px-3 flex items-center relative">
          <button
            onClick={() => setShowLCFilter(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
              allCoversSelected
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-orange-600 hover:bg-orange-700 text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white/50 shrink-0" />
            Land Cover
            {!allCoversSelected && (
              <span className="bg-white/25 rounded-full px-1.5 py-0.5 text-white" style={{ fontSize: "9px" }}>
                {selectedCovers.size}/{ALL_LC.length}
              </span>
            )}
            <ChevronDown size={11} />
          </button>

          {showLCFilter && (
            <div className={`absolute top-10 right-0 z-[100] ${dropdownBg} rounded-lg shadow-2xl w-56 overflow-hidden`}>
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e2535]">
                <span className={`${textPrimary} text-xs`} style={{ fontWeight: 700 }}>Filter by Land Cover</span>
                <button
                  onClick={() =>
                    setSelectedCovers(allCoversSelected ? new Set() : new Set(ALL_LC))
                  }
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {allCoversSelected ? "Clear all" : "Select all"}
                </button>
              </div>
              {/* Options */}
              <div className="py-1 max-h-72 overflow-y-auto">
                {ALL_LC.map(lt => (
                  <label
                    key={lt}
                    className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCovers.has(lt)}
                      onChange={() => toggleCover(lt)}
                      className="accent-blue-500 w-3.5 h-3.5 shrink-0"
                    />
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: LAND_COLORS[lt] }} />
                    <span className={`text-xs ${selectedCovers.has(lt) ? "text-gray-200" : textSecondary}`}>
                      {lt}
                    </span>
                  </label>
                ))}
              </div>
              {/* Footer count */}
              <div className="px-3 py-2 border-t border-[#1e2535]" style={{ fontSize: "10px" }}>
                {selectedCovers.size} of {ALL_LC.length} types shown ·{" "}
                {CITIES.filter(c => selectedCovers.has(c.dominantLandCover)).length} cities visible
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── Map — full width, tall ──────────────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden border-b border-[#1e2535]"
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
            {/* diagonal stripe for Manila Bay */}
            <pattern id="bay-diag" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
              <line x1="0" y1="10" x2="10" y2="0" stroke="#7ab8d4" strokeWidth="1" opacity="0.5" />
            </pattern>
          </defs>

          {/* ── Surrounding area textures ── */}
          {/* Light land outside NCR (already #e8e8e0 background) */}

          {/* Faint grid / graticule lines */}
          {[121.0,121.1,121.2].map(lon => {
            const [x] = ll(14.86, lon);
            return <line key={lon} x1={x} y1={0} x2={x} y2={MAP_H} stroke="rgba(0,0,0,0.07)" strokeWidth={0.7} strokeDasharray="4 4" />;
          })}
          {[14.4,14.5,14.6,14.7,14.8].map(lat => {
            const [,y] = ll(lat, LON_MIN);
            return <line key={lat} x1={0} y1={y} x2={MAP_W} y2={y} stroke="rgba(0,0,0,0.07)" strokeWidth={0.7} strokeDasharray="4 4" />;
          })}

          {/* Manila Bay — big water body on the left */}
          <polygon
            points={`
              0,0
              ${ll(14.82,120.90).join(",")}
              ${ll(14.70,120.91).join(",")}
              ${ll(14.67,120.93).join(",")}
              ${ll(14.62,120.96).join(",")}
              ${ll(14.55,120.97).join(",")}
              ${ll(14.52,120.97).join(",")}
              ${ll(14.45,120.99).join(",")}
              ${ll(14.43,120.96).join(",")}
              ${ll(14.38,120.96).join(",")}
              0,${MAP_H}
            `}
            fill="#c8dce8"
          />
          {/* Bay stripe texture overlay */}
          <polygon
            points={`
              0,0
              ${ll(14.82,120.90).join(",")}
              ${ll(14.70,120.91).join(",")}
              ${ll(14.67,120.93).join(",")}
              ${ll(14.62,120.96).join(",")}
              ${ll(14.55,120.97).join(",")}
              ${ll(14.52,120.97).join(",")}
              ${ll(14.45,120.99).join(",")}
              ${ll(14.43,120.96).join(",")}
              ${ll(14.38,120.96).join(",")}
              0,${MAP_H}
            `}
            fill="url(#bay-diag)"
          />

          {/* Laguna de Bay — SE corner */}
          <polygon
            points={`
              ${ll(14.57,121.13).join(",")}
              ${MAP_W},${ll(14.57,121.22)[1]}
              ${MAP_W},${MAP_H}
              ${ll(14.38,121.13).join(",")}
            `}
            fill="#c8dce8"
          />
          <polygon
            points={`
              ${ll(14.57,121.13).join(",")}
              ${MAP_W},${ll(14.57,121.22)[1]}
              ${MAP_W},${MAP_H}
              ${ll(14.38,121.13).join(",")}
            `}
            fill="url(#bay-diag)"
          />

          {/* Context place labels */}
          {([
            ["Manila Bay",       14.60, 120.84],
            ["Laguna de Bay",    14.45, 121.18],
            ["Bulacan",          14.84, 120.97],
            ["Rizal / Antipolo", 14.62, 121.20],
            ["Cavite",           14.36, 120.90],
          ] as [string, number, number][]).map(([label, lat, lon]) => {
            const [x, y] = ll(lat, lon);
            if (x < 0 || x > MAP_W || y < 0 || y > MAP_H) return null;
            return (
              <text key={label} x={x} y={y} textAnchor="middle" fill="rgba(80,90,100,0.55)"
                style={{ fontSize: "11px", fontStyle: "italic", userSelect: "none" }}>
                {label}
              </text>
            );
          })}

          {/* ── City polygons ── */}
          {CITIES.map(city => {
            const r          = richnessByCity.get(city.id) ?? city.totalSpecies;
            const isFiltered = !selectedCovers.has(city.dominantLandCover);
            const fill       = isFiltered
              ? "#888888"
              : viewMode === "landcover" ? LAND_COLORS[city.dominantLandCover] : richnessColor(r);
            const isHov   = hoveredCity === city.id;
            const isSel   = foundCity?.id === city.id;
            const [lx,ly] = ll(city.labelAt[0], city.labelAt[1]);
            const fsize   = city.name.length > 9 ? 7.5 : city.name.length > 6 ? 9 : 10;

            return (
              <g key={city.id} style={{ transition: "opacity 0.25s" }} opacity={isFiltered ? 0.22 : 1}>
                <polygon
                  points={pts(city.polygon)}
                  fill={fill}
                  fillOpacity={isSel ? 0.94 : isHov ? 0.90 : 0.80}
                  stroke={isSel ? "#ffffff" : isHov ? "#ffffffaa" : "#111111"}
                  strokeWidth={isSel ? 2.2 : isHov ? 1.8 : 1.0}
                  strokeLinejoin="round"
                  style={{ cursor: isFiltered ? "default" : "pointer", transition: "fill-opacity 0.1s" }}
                  onMouseEnter={e => { if (!isFiltered) { e.stopPropagation(); setHoveredCity(city.id); } }}
                  onMouseLeave={() => setHoveredCity(null)}
                  onClick={() => { if (!isFiltered) handleCityClick(city); }}
                />
                <text x={lx} y={ly} textAnchor="middle"
                  fill={
                    lightMode
                      ? "#ffffff"
                      : (isSel || isHov ? "#ffffff" : "rgba(0,0,0,0.85)")
                  }
                  paintOrder="stroke"
                  stroke={
                    lightMode
                      ? "rgba(0,0,0,0.75)"
                      : (isSel || isHov ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.75)")
                  }
                  strokeWidth={isSel||isHov ? "2.2" : "2.6"}
                  style={{ fontSize:`${fsize}px`, fontWeight:isSel?700:600, userSelect:"none", pointerEvents:"none" }}
                >
                  {city.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* ── Leaflet-style zoom buttons (decorative) ── */}
        <div className="absolute top-3 left-3 flex flex-col rounded overflow-hidden border border-[#bbb] shadow-md">
          <button className="w-7 h-7 flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700 border-b border-[#bbb]">
            <Plus size={13} />
          </button>
          <button className="w-7 h-7 flex items-center justify-center bg-white hover:bg-gray-100 text-gray-700">
            <Minus size={13} />
          </button>
        </div>

        {/* ── Legend overlay ── */}
        <div className="absolute bottom-8 left-3 bg-white/92 border border-gray-300 rounded-lg p-3 shadow-lg backdrop-blur-sm">
          {viewMode === "landcover" ? (
            <>
              <p className="text-gray-800 mb-2" style={{ fontWeight: 700, fontSize: "12px" }}>Land Cover Types</p>
              {LEGEND_TYPES.map(lt => (
                <div key={lt} className="flex items-center gap-2 mb-1">
                  <span className="w-3.5 h-3.5 rounded-sm shrink-0" style={{ background: LAND_COLORS[lt] }} />
                  <span className="text-gray-700" style={{ fontSize: "11px" }}>{lt}</span>
                </div>
              ))}
            </>
          ) : (
            <>
              <p className="text-gray-800 mb-2" style={{ fontWeight: 700, fontSize: "12px" }}>Species Richness</p>
              <div className="flex items-center gap-2 mb-1">
                <span className={textSecondary} style={{ fontSize: "10px" }}>Low</span>
                <div className="h-3 rounded" style={{ width: "100px", background: "linear-gradient(to right,#1a1e78,#1565c0,#42a5f5,#fff176,#f9a825)" }} />
                <span className={textSecondary} style={{ fontSize: "10px" }}>High</span>
              </div>
              <div className="flex justify-between w-28">
                {["0","12","25","37","50"].map(v => (
                  <span key={v} className={textSecondary} style={{ fontSize: "9px" }}>{v}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Bottom hint ── */}
        <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 ${tooltipBg} rounded-full px-4 py-1.5 text-xs ${lightMode ? 'text-gray-700' : 'text-gray-200'} backdrop-blur-sm pointer-events-none whitespace-nowrap`}>
          Click a city area to explore predictions
        </div>

        {/* ── Leaflet attribution badge ── */}
        <div className={`absolute bottom-1 right-2 ${textSecondary}`} style={{ fontSize: "9px", opacity: 0.7 }}>
          © AVILIGHT NCR Map
        </div>
      </div>

      {/* ── Bottom section: SHAP chart + Local Explainer ───────────────────── */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#1e2535] ${gridBg}`}>

        {/* ── Left: Global / City SHAP chart ── */}
        <div className="p-6">
          <h2 className={`${textPrimary} mb-1`} style={{ fontWeight: 700, fontSize: "15px" }}>
            {shapTitle}
          </h2>
          {foundCity && (
            <p className={`${textSecondary} text-xs mb-4`}>
              Showing local SHAP values for <span className="text-cyan-400">{foundCity.name}</span>. Click elsewhere on map to reset to global.
            </p>
          )}
          {!foundCity && (
            <p className={`${textSecondary} text-xs mb-4`}>
              Average feature importance across all {CITIES.length} NCR municipalities.
            </p>
          )}

          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={shapData} margin={{ top: 8, right: 16, left: 10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
              <XAxis
                dataKey="feature"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false} tickLine={false}
                interval={0} angle={-10} textAnchor="end" dy={8}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={false} tickLine={false}
                domain={[0, 0.60]}
                ticks={[0, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60]}
                label={{ value: "(mean |SHAP| value)", angle: -90, position: "insideLeft",
                  style: { fontSize: 10, fill: "#6b7280" }, dx: -2 }}
              />
              <RTooltip
                contentStyle={{
                  background: lightMode ? "#ffffff" : "#1e2538",
                  border: lightMode ? "1px solid #e5e7eb" : "1px solid #2a2f42",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                itemStyle={{ color: "#22c55e" }} labelStyle={{ color: lightMode ? "#1f2937" : "#d1d5db" }}
                formatter={(val: number) => [val.toFixed(2), "Feature Importance"]}
              />
              <RLegend
                wrapperStyle={{ paddingTop: "8px" }}
                formatter={() => "Feature Importance"}
              />
              <Bar dataKey="value" fill="#22c55e" name="Feature Importance" radius={[3, 3, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>

          <p className={`text-xs ${textSecondary} mt-2 leading-relaxed`}>
            <span className={`${textSecondary}`} style={{ fontWeight: 600 }}>Interpretation: </span>
            {foundCity
              ? `In ${foundCity.name}, ${foundCity.shap[0].feature.toLowerCase()} (${foundCity.shap[0].value.toFixed(2)}) and ${foundCity.shap[1].feature} (${foundCity.shap[1].value.toFixed(2)}) are the strongest drivers of bird species richness. ${foundCity.dominantLandCover === "Urban & Built-up" ? "High artificial light-at-night suppresses light-sensitive species while NDVI green cover provides refugia." : "Proximity to water and vegetation cover together drive high species turnover in this area."}`
              : "Light intensity and NDVI are the strongest predictors of bird species richness in Metro Manila. Higher light pollution consistently reduces species diversity, while vegetation cover (NDVI) has a positive effect."
            }
          </p>
        </div>

        {/* ── Right: Local Explainer — Search City ── */}
        <div id="local-explainer" className="p-6">
          <h2 className={`${textPrimary} mb-4`} style={{ fontWeight: 700, fontSize: "15px" }}>
            Local Explainer – Search City
          </h2>

          <label className="block text-gray-300 text-sm mb-2">Enter City / Municipality Name:</label>
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

          {/* Not found */}
          {searched && !foundCity && (
            <div className="rounded px-3 py-2 bg-red-900/20 border border-red-800/40 text-red-400 text-sm mb-4">
              City not found. Try: Manila, Makati, Taguig, Quezon City…
            </div>
          )}

          {/* Found: city name header */}
          {foundCity && (
            <>
              <div className="rounded px-3 py-2 bg-teal-900/30 border border-teal-700/50 text-sm mb-4">
                <span className="text-gray-300">Found: </span>
                <span className="text-teal-300" style={{ fontWeight: 700 }}>{foundCity.name}</span>
              </div>

              {/* City details grid */}
              <div className="space-y-3">

                {/* City / Area */}
                <div className="flex justify-between items-center py-1 border-b border-[#1e2535]">
                  <span className={`${textSecondary} text-xs`} style={{ fontWeight: 600 }}>City / Area</span>
                  <span className={`${textPrimary} text-sm`} style={{ fontWeight: 700 }}>{foundCity.name}</span>
                </div>

                {/* Dominant Land Cover */}
                <div className="flex justify-between items-center py-1 border-b border-[#1e2535]">
                  <span className={`${textSecondary} text-xs`} style={{ fontWeight: 600 }}>Dominant Land Cover</span>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ background: LAND_COLORS[foundCity.dominantLandCover] }} />
                    <span className={`${textSecondary} text-xs`}>{foundCity.dominantLandCover} ({foundCity.landCoverPct}%)</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex justify-between items-center py-1 border-b border-[#1e2535]">
                  <span className={`${textSecondary} text-xs`} style={{ fontWeight: 600 }}>Total Unique Species</span>
                  <span className="text-cyan-400 text-sm" style={{ fontWeight: 700 }}>
                    {richnessByCity.get(foundCity.id) ?? foundCity.totalSpecies} species
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-[#1e2535]">
                  <span className={`${textSecondary} text-xs`} style={{ fontWeight: 600 }}>Observation Sites</span>
                  <span className={`${textPrimary} text-sm`} style={{ fontWeight: 700 }}>
                    {foundCity.observationSites} sites
                  </span>
                </div>

                {/* Species list */}
                <div>
                  <p className={`${textSecondary} text-xs mb-2`} style={{ fontWeight: 600 }}>Species Observed in this City</p>
                  <div className="space-y-1">
                    {(expandSpecies ? foundCity.species : foundCity.species.slice(0, 8)).map((sp, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                        <span className="text-gray-300 text-xs">{sp}</span>
                      </div>
                    ))}
                  </div>
                  {foundCity.species.length > 8 && (
                    <button
                      onClick={() => setExpandSpecies(v => !v)}
                      className="mt-1.5 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                    >
                      {expandSpecies ? "▲ Show less" : `▼ +${foundCity.species.length - 8} more species`}
                    </button>
                  )}
                </div>

                {/* Environmental Factors (SHAP) */}
                <div>
                  <p className={`${textSecondary} text-xs mb-2`} style={{ fontWeight: 600 }}>Environmental Factors (SHAP)</p>
                  <div className="space-y-2">
                    {foundCity.shap.map((item, i) => {
                      const barColors = ["#22c55e","#3b82f6","#f59e0b","#8b5cf6","#06b6d4"];
                      const maxVal = Math.max(...foundCity.shap.map(s=>s.value));
                      return (
                        <div key={i}>
                          <div className="flex justify-between mb-0.5">
                            <span className={`${textSecondary}`} style={{ fontSize: "11px" }}>{item.feature}</span>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: barColors[i] }}>{item.value.toFixed(2)}</span>
                          </div>
                          <div className={`h-2 rounded-full ${lightMode ? 'bg-gray-200' : 'bg-[#1e2535]'} overflow-hidden`}>
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width:`${(item.value/maxVal)*100}%`, background: barColors[i] }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Hover tooltip ──────────────────────────────────────────────────────── */}
      {hoveredCity && (() => {
        const city = CITIES.find(c => c.id === hoveredCity);
        if (!city) return null;
        const r = richnessByCity.get(city.id) ?? city.totalSpecies;
        return (
          <div className="fixed pointer-events-none z-50 rounded-lg p-2.5 shadow-xl"
            style={{
              left: Math.min(mousePos.x + 14, window.innerWidth - 210),
              top:  Math.max(mousePos.y - 80, 8),
              minWidth: "175px",
              background: lightMode ? "#ffffff" : "#0d1117",
              border: lightMode ? "1px solid #d1d5db" : "1px solid #2a3550",
            }}
          >
            <p className={`${textPrimary} text-xs mb-1`} style={{ fontWeight: 700 }}>{city.name}</p>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: LAND_COLORS[city.dominantLandCover] }} />
              <span className={`${textSecondary} text-xs`}>{city.dominantLandCover}</span>
            </div>
            {viewMode === "richness" && (
              <p className="text-cyan-400 text-xs mb-1">{r} predicted species</p>
            )}
            <p className="text-cyan-500 mt-1" style={{ fontSize: "9px" }}>Click to explore →</p>
          </div>
        );
      })()}
    </div>
  );
}