import { useOutletContext } from "react-router";
import { useState, useMemo } from "react";
import { Search, X, ChevronDown, Filter, MapPin, ChevronLeft, ChevronRight, Bird } from "lucide-react";

type Tolerance = "Sensitive" | "Tolerant";
type Migration = "Resident" | "Migratory";

interface SpeciesEntry {
  id: number;
  common: string;
  scientific: string;
  tolerance: Tolerance;
  migration: Migration;
  mostlySeen: string[];
  description: string;
  imageUrl?: string;
}

// ── 757-entry catalogue (first 60 full data; rest generated) ─────────────────
const BASE_SPECIES: SpeciesEntry[] = [
  { id:1,  common:"Aberrant Bush Warbler",        scientific:"Horornis flavolivaceus",    tolerance:"Sensitive", migration:"Resident",  mostlySeen:["La Mesa Watershed","Marikina Watershed"],             description:"A small, secretive warbler that inhabits dense undergrowth in montane forests. It is highly sensitive to artificial light at night, which disrupts its foraging and breeding cycles. In Metro Manila it clings to remnant forest patches where light pollution is lowest." },
  { id:2,  common:"Aleutian Tern",                scientific:"Onychoprion aleuticus",     tolerance:"Sensitive", migration:"Migratory", mostlySeen:["Manila Bay Coastline","LPPCHEA"],                      description:"A long-distance migrant that breeds in Alaska and Siberia, wintering across the western Pacific. It is sensitive to coastal light pollution that can disorient nocturnal flights and disrupt roost sites. Best observed along Manila Bay during October–April." },
  { id:3,  common:"Ameline Swiftlet",             scientific:"Aerodramus amelis",         tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["NAPWC","La Mesa Watershed"],                  description:"A small cave-nesting swiftlet that uses echolocation to navigate, making it moderately tolerant of urban light conditions. Colonies are found in older buildings and limestone outcrops around Metro Manila. It feeds exclusively on aerial insects." },
  { id:4,  common:"Amethyst Brown-Dove",          scientific:"Phapitreron amethystinus",  tolerance:"Sensitive", migration:"Resident",  mostlySeen:["La Mesa Watershed","La Mesa Ecosystem Reserve"],            description:"A forest dove endemic to the Philippines, favouring the shaded interior of dipterocarp and mossy forests. It is highly sensitive to habitat fragmentation and artificial light, which disrupts its crepuscular foraging. Declining in Metro Manila due to urbanisation." },
  { id:5,  common:"Amur Paradise-Flycatcher",     scientific:"Terpsiphone incei",         tolerance:"Sensitive", migration:"Migratory", mostlySeen:["La Mesa Watershed","Marikina Watershed"],             description:"An elegant long-tailed flycatcher that migrates from East Asia to the Philippines each autumn. It prefers shaded forest understory and is highly sensitive to light pollution, which can delay or misdirect migration. Males display spectacular ribbon-like tail plumes." },
  { id:6,  common:"Amur Stonechat",               scientific:"Saxicola stejnegeri",       tolerance:"Sensitive", migration:"Migratory", mostlySeen:["Laguna de Bay Wetlands","LPPCHEA"],                     description:"A small chat that winters in open grasslands and marshes of the Philippines. It perches prominently on shrubs to scan for insects and is sensitive to prolonged artificial illumination that disrupts its circadian rhythms. Arrives October and departs by April." },
  { id:7,  common:"Apo Myna",                     scientific:"Basilornis miranda",        tolerance:"Sensitive", migration:"Resident",  mostlySeen:["La Mesa Watershed","La Mesa Ecosystem Reserve"],              description:"An endemic myna of the Philippines, associated with primary and tall secondary forests. In Metro Manila it persists only in the La Mesa Ecosystem Reserve. Sensitive to light intrusion because it forages and nests near forest edges that are increasingly illuminated." },
  { id:8,  common:"Apo Sunbird",                  scientific:"Aethopyga boltoni",         tolerance:"Sensitive", migration:"Resident",  mostlySeen:["La Mesa Watershed","Marikina Watershed"],             description:"A brilliantly coloured sunbird endemic to the Philippines. It feeds on nectar and small arthropods in flowering trees and is adversely affected by light pollution reducing insect availability. The male has a metallic violet crown and crimson breast-band." },
  { id:9,  common:"Arctic Warbler",               scientific:"Phylloscopus borealis",     tolerance:"Sensitive", migration:"Migratory", mostlySeen:["La Mesa Watershed","La Mesa Ecosystem Reserve"],          description:"A small, drab leaf warbler breeding in boreal forests of Eurasia and Alaska. It winters in the Philippines and Southeast Asia, frequenting secondary growth. Light-sensitive during migration, when it may fly at night and be confused by urban lighting." },
  { id:10, common:"Arctic/Kamchatka Leaf Warbler",scientific:"Phylloscopus examinandus",  tolerance:"Sensitive", migration:"Migratory", mostlySeen:["Marikina Watershed","La Mesa Watershed"],            description:"Recently split from Arctic Warbler, this taxon breeds in Kamchatka and winters in the Philippines. It inhabits scrubland and forest edges, gleaning insects from foliage. Sensitive to artificial light during its nocturnal migration across the Philippine Sea." },
  { id:11, common:"Ashy Drongo",                  scientific:"Dicrurus leucophaeus",      tolerance:"Tolerant",  migration:"Migratory", mostlySeen:["NAPWC","La Mesa Watershed"],                        description:"A medium-sized drongo that is one of the most conspicuous winter visitors to Metro Manila. It perches openly on wires and branches, sallying for insects. It tolerates moderate light pollution and is found in gardens, parks, and urban tree-lined streets." },
  { id:12, common:"Ashy Minivet",                 scientific:"Pericrocotus divaricatus",  tolerance:"Sensitive", migration:"Migratory", mostlySeen:["La Mesa Watershed","Marikina Watershed"],                 description:"A slender, black-and-grey minivet that migrates through and winters in the Philippines. It forages high in the canopy for insects and is moderately sensitive to light pollution that reduces canopy insect biomass. Often seen in small flocks of 5–15 birds." },
  { id:13, common:"Ashy Tailorbird",              scientific:"Orthotomus ruficeps",       tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["LPPCHEA","Las Piñas-Parañaque"],               description:"A small tailorbird found in mangroves, scrubland, and coastal thickets. It is tolerant of human-modified habitats and moderate light levels, making it one of the commoner birds in peri-urban Manila. It sews large leaves together to form a cup nest." },
  { id:14, common:"Ashy Thrush",                  scientific:"Geokichla cinerea",         tolerance:"Sensitive", migration:"Resident",  mostlySeen:["La Mesa Watershed","La Mesa Ecosystem Reserve"],            description:"An endemic Philippine thrush that frequents the forest floor, turning leaf litter for invertebrates. It is highly sensitive to artificial light at night, which disrupts feeding behaviour and may increase predation risk. A secretive species rarely seen in the open." },
  { id:15, common:"Ashy-breasted Flycatcher",     scientific:"Muscicapa randi",           tolerance:"Sensitive", migration:"Resident",  mostlySeen:["Marikina Watershed","La Mesa Watershed"],             description:"A small, inconspicuous flycatcher endemic to the Philippines. It inhabits the understorey of lowland and foothill forests, catching insects in short aerial sallies. Sensitive to forest-edge lighting that reduces its preferred dim-light foraging conditions." },
  { id:16, common:"Azure-breasted Pitta",         scientific:"Erythropitta steerii",      tolerance:"Sensitive", migration:"Resident",  mostlySeen:["La Mesa Watershed"],                                  description:"A gem-like pitta found in lowland forests of the Philippines. It is highly sensitive to any disturbance, including artificial light, which disrupts its quiet dawn and dusk foraging for snails and insects on the forest floor. One of the most sought-after birds in Manila." },
  { id:17, common:"Balicassiao",                  scientific:"Dicrurus balicassius",      tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["La Mesa Watershed","Marikina Watershed"],         description:"The Philippine drongo, conspicuous in forested and semi-forested habitats. It is bold and aggressive, even mobbing larger raptors. Relatively tolerant of suburban light conditions, persisting in parks with mature trees where insect prey remains available." },
  { id:18, common:"Bar-bellied Cuckoo-Shrike",    scientific:"Coracina striata",          tolerance:"Sensitive", migration:"Resident",  mostlySeen:["La Mesa Watershed","Marikina Watershed"],             description:"A large cuckoo-shrike endemic to the Philippines, frequenting the canopy of lowland dipterocarp forests. It is sensitive to light pollution and forest loss. Pairs rove the canopy in search of large caterpillars and other invertebrates." },
  { id:19, common:"Barn Swallow",                 scientific:"Hirundo rustica",           tolerance:"Tolerant",  migration:"Migratory", mostlySeen:["Manila Bay Coastline","Laguna de Bay Wetlands"],      description:"The world's most widespread swallow, wintering abundantly in the Philippines. It roosts in enormous numbers over reed beds and forages over open areas, tolerating urban environments well. Light pollution near roost sites can delay normal roost behaviour." },
  { id:20, common:"Black-and-White Triller",      scientific:"Lalage melanoleuca",        tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["NAPWC","LPPCHEA"],                                    description:"A small black-and-white pied triller endemic to the Philippines. It favours forest edges, secondary growth, and suburban gardens with mature trees. More tolerant of light pollution than forest interior specialists, it is a common garden bird in lower-density suburbs." },
  { id:21, common:"Black-backed Kingfisher",      scientific:"Ceyx erithaca",             tolerance:"Sensitive", migration:"Migratory", mostlySeen:["Laguna de Bay Wetlands","Marikina Watershed"],        description:"A tiny, brilliantly coloured kingfisher that winters in the Philippines. It requires clear, slow-flowing streams shaded by overhanging vegetation. Sensitive to artificial light that disturbs its crepuscular hunting along forested stream banks." },
  { id:22, common:"Black-bibbed Cicadabird",      scientific:"Edolisoma mindanense",      tolerance:"Sensitive", migration:"Resident",  mostlySeen:["La Mesa Watershed"],                                  description:"A Philippine endemic cicadabird of lowland and foothill forests. Males are slate-grey with a diagnostic black bib. It is sensitive to forest degradation and light spill that impairs insect availability in the forest interior." },
  { id:23, common:"Black-chinned Fruit Dove",     scientific:"Ptilinopus leclancheri",    tolerance:"Sensitive", migration:"Resident",  mostlySeen:["La Mesa Watershed","Marikina Watershed"],             description:"A colourful fruit dove endemic to the Philippines. Males bear a distinctive black chin patch set against green, yellow, and white plumage. It feeds on small fruits in the forest canopy and is sensitive to light disturbance and tree loss." },
  { id:24, common:"Black-crowned Night Heron",    scientific:"Nycticorax nycticorax",     tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["Laguna de Bay Wetlands","LPPCHEA"],                   description:"A stocky, nocturnal heron that roosts colonially in trees near water. It is relatively tolerant of urban environments and can exploit fish ponds and drainage canals. However, very high light levels at roost sites reduce its foraging efficiency after dark." },
  { id:25, common:"Black-naped Monarch",          scientific:"Hypothymis azurea",         tolerance:"Sensitive", migration:"Resident",  mostlySeen:["La Mesa Watershed","Marikina Watershed"],             description:"A beautiful azure-blue flycatcher common in lowland forests throughout the Philippines. It is sensitive to forest fragmentation and light pollution. Its sweet, whistling call is a hallmark of intact secondary forest in the La Mesa Ecosystem Reserve." },
  { id:26, common:"Black-naped Oriole",           scientific:"Oriolus chinensis",         tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["NAPWC","UP Diliman"],                                 description:"A large, strikingly yellow and black oriole found throughout Metro Manila wherever tall fruiting trees persist. It is tolerant of urbanisation and moderate light levels, and its loud, melodious call is heard even in busy residential areas." },
  { id:27, common:"Black-winged Stilt",           scientific:"Himantopus himantopus",     tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["LPPCHEA","Laguna de Bay Wetlands"],       description:"An elegant wader with extremely long pink legs. It breeds and winters in shallow wetlands, fish ponds, and paddy fields around Manila Bay. Relatively tolerant of moderate human activity, but exposed nests are vulnerable to nest-site lighting disturbance." },
  { id:28, common:"Blue Rock Thrush",             scientific:"Monticola solitarius",      tolerance:"Sensitive", migration:"Migratory", mostlySeen:["Manila Bay Coastline","Las Piñas-Parañaque"],                  description:"A winter visitor from Central Asia and Europe, favouring rocky coastal areas and sea walls. The male is blue-grey; the female is brown. Sensitive to light pollution along the urban foreshore that disrupts its preferred crepuscular insect foraging." },
  { id:29, common:"Blue-backed Parrot",           scientific:"Tanygnathus sumatranus",    tolerance:"Sensitive", migration:"Resident",  mostlySeen:["La Mesa Watershed","La Mesa Ecosystem Reserve"],              description:"A medium-sized parrot endemic to the Philippines and surrounding islands. It feeds on seeds, fruits, and flowers in the canopy of lowland forests. Sensitive to light pollution and illegal collection; numbers within Metro Manila are critically low." },
  { id:30, common:"Blue-tailed Bee-eater",        scientific:"Merops philippinus",        tolerance:"Tolerant",  migration:"Migratory", mostlySeen:["LPPCHEA","Las Piñas-Parañaque"],                     description:"A brilliantly coloured bee-eater that migrates through and winters in Metro Manila. It perches on wires and open branches, sallying for bees, wasps, and dragonflies. Tolerant of suburban habitats but needs open sky; roosts communally in reed beds." },
  { id:31, common:"Blue-throated Bee-eater",      scientific:"Merops viridis",            tolerance:"Tolerant",  migration:"Migratory", mostlySeen:["Laguna de Bay Wetlands","Manila Bay Coastline"],              description:"A summer visitor to the Philippines that breeds in riverine sandbanks. Its blue throat and chestnut crown are diagnostic. Tolerant of open urban areas but requires clean exposed earthen banks for nesting. Often roosts in large noisy flocks." },
  { id:32, common:"Brahminy Kite",                scientific:"Haliastur indus",           tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["Manila Bay Coastline","LPPCHEA"],        description:"A medium-sized raptor with a chestnut body and white head, frequently seen soaring over Manila Bay and coastal wetlands. It scavenges fish and carrion and is tolerant of urban settings. A common sight along Metro Manila's coast and river mouths." },
  { id:33, common:"Brown Shrike",                 scientific:"Lanius cristatus",          tolerance:"Tolerant",  migration:"Migratory", mostlySeen:["NAPWC","Marikina Watershed"],             description:"One of the most common winter visitors to the Philippines, found in virtually every garden and park in Metro Manila. It perches on exposed twigs, hunting insects, lizards, and small birds. Tolerant of urban noise and moderate artificial light." },
  { id:34, common:"Buff-banded Rail",             scientific:"Hypotaenidia philippensis", tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["LPPCHEA","Laguna de Bay Wetlands"],       description:"A widespread rail found in marshes, grasslands, and paddy fields. Despite its secretive nature it is relatively tolerant of human proximity and moderate light pollution. Its clucking call is often heard at night around wetland edges." },
  { id:35, common:"Cattle Egret",                 scientific:"Bubulcus ibis",             tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["Laguna de Bay Wetlands","Manila Bay Coastline"],                 description:"A small, stocky egret that follows large animals and farm machinery to catch disturbed insects. Very tolerant of urban and agricultural landscapes, roosting colonially in trees near water. One of the most common egrets in Metro Manila's peri-urban fringe." },
  { id:36, common:"Chestnut-cheeked Starling",    scientific:"Agropsar philippensis",     tolerance:"Sensitive", migration:"Migratory", mostlySeen:["La Mesa Watershed","La Mesa Ecosystem Reserve"],              description:"A small starling that migrates from Japan and Korea to winter in the Philippines. It feeds in fruiting trees and is sensitive to light pollution that disrupts its nocturnal migratory flight. Seen in fruiting fig trees in forest remnants during October–March." },
  { id:37, common:"Collared Kingfisher",          scientific:"Todiramphus chloris",       tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["Manila Bay Coastline","LPPCHEA"],            description:"The most common kingfisher in Metro Manila, found in mangroves, coastal areas, and even urban parks near water. It is tolerant of noise and moderate light pollution. Its loud, raucous call is a familiar sound along the Manila Bay coast." },
  { id:38, common:"Common Kingfisher",            scientific:"Alcedo atthis",             tolerance:"Sensitive", migration:"Resident",  mostlySeen:["Laguna de Bay Wetlands","Marikina Watershed"],            description:"A jewel-bright kingfisher that requires clear, unpolluted streams and rivers. It is sensitive to artificial light that disturbs its dawn and dusk hunting along waterways. Declining in Metro Manila as waterway lighting intensifies and water quality deteriorates." },
  { id:39, common:"Common Moorhen",               scientific:"Gallinula chloropus",       tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["Laguna de Bay Wetlands","LPPCHEA"],        description:"A medium-sized waterbird found in virtually any wetland with emergent vegetation. It is tolerant of moderate urbanisation and light spill into marshes, and can forage at night by starlight or low artificial illumination. A year-round resident in Manila wetlands." },
  { id:40, common:"Common Myna",                  scientific:"Acridotheres tristis",      tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["NAPWC","Manila Bay Coastline"],             description:"One of the most ubiquitous birds in Metro Manila, the Common Myna thrives in highly urbanised environments. It roosts communally in city centres and is completely tolerant of artificial light, often foraging under streetlights for insects and scraps." },
  { id:41, common:"Common Sandpiper",             scientific:"Actitis hypoleucos",        tolerance:"Tolerant",  migration:"Migratory", mostlySeen:["Laguna de Bay Wetlands","Manila Bay Coastline"],      description:"A small migratory wader that bobs constantly as it walks along riverbanks, lake shores, and tidal flats. It is tolerant of human disturbance and can be found along almost any waterway in Metro Manila during the northern winter." },
  { id:42, common:"Coppersmith Barbet",           scientific:"Psilopogon haemacephalus",  tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["NAPWC","UP Diliman"],                                 description:"A small barbet named for its metallic, anvil-like call—'tuk-tuk-tuk'. It nests in tree cavities and feeds on fruits and insects. Highly tolerant of urban conditions, it is common in gardens, parks, and roadside trees with mature fruit-bearing trees." },
  { id:43, common:"Eurasian Tree Sparrow",        scientific:"Passer montanus",           tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["NAPWC","UP Diliman"],                                 description:"The ubiquitous house sparrow of Southeast Asia, introduced to the Philippines. It breeds in building crevices and feeds on grain and urban scraps. Extremely tolerant of artificial light and the noisiest urban conditions. Present on virtually every street in Metro Manila." },
  { id:44, common:"Glossy Swiftlet",              scientific:"Collocalia esculenta",      tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["NAPWC","Manila Bay Coastline"],           description:"A tiny swiftlet that roosts and nests in buildings, caves, and bridges throughout Metro Manila. It feeds exclusively on airborne insects and is highly tolerant of urban light pollution, foraging at dusk under streetlights and building floodlights." },
  { id:45, common:"Great Egret",                  scientific:"Ardea alba",                tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["Laguna de Bay Wetlands","Manila Bay Coastline"],               description:"A large, stately white egret found in open wetlands, rice fields, and coastal flats. It is tolerant of human activity and moderate light pollution. Large communal roosts are present near Laguna de Bay, where it forages on fish and frogs." },
  { id:46, common:"Grey Heron",                   scientific:"Ardea cinerea",             tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["Laguna de Bay Wetlands","Manila Bay Coastline"],              description:"The largest heron in the Philippines, standing nearly a metre tall. It frequents open water margins and forages for fish, frogs, and rodents. Tolerant of urban proximity, it is found along major waterways and drainage canals throughout Metro Manila." },
  { id:47, common:"Island Collared Dove",         scientific:"Streptopelia bitorquata",   tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["LPPCHEA","Manila Bay Coastline"],           description:"A medium-sized dove endemic to the Philippines. It inhabits coastal scrub, mangroves, and suburban gardens. Tolerant of moderate light pollution, it forages on the ground for seeds and is frequently seen along the Manila Bay promenade." },
  { id:48, common:"Keel-billed Hornbill",         scientific:"Penelopides panini",        tolerance:"Sensitive", migration:"Resident",  mostlySeen:["La Mesa Watershed"],                                  description:"A medium-sized hornbill endemic to the Philippines with a striking yellow casque. It relies on large fruiting trees in intact forest and is highly sensitive to both habitat fragmentation and artificial light intrusion into its forest nesting sites." },
  { id:49, common:"Little Egret",                 scientific:"Egretta garzetta",          tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["Manila Bay Coastline","Laguna de Bay Wetlands"],    description:"A small, elegant white egret with black bill and yellow feet. One of the most common herons in Metro Manila, it forages in shallow water, paddy fields, drainage channels, and coastal flats. Tolerant of moderate urban light and human disturbance." },
  { id:50, common:"Little Tern",                  scientific:"Sternula albifrons",        tolerance:"Sensitive", migration:"Migratory", mostlySeen:["Manila Bay Coastline","LPPCHEA"],                     description:"The smallest tern in the Philippines, nesting on open sandy beaches and shingle shores. It is sensitive to artificial beach lighting that disorients chicks. A declining breeder along Manila Bay, with wintering populations from northern populations arriving each October." },
  { id:51, common:"Long-tailed Shrike",           scientific:"Lanius schach",             tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["NAPWC","LPPCHEA"],        description:"A large shrike with a long black tail, found in open country, scrub, and suburban gardens. It tolerates a wide range of habitats and moderate light pollution, hunting from exposed perches. One of the most visible birds along Metro Manila's urban-rural fringe." },
  { id:52, common:"Lowland White-eye",            scientific:"Zosterops meyeni",          tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["La Mesa Watershed","NAPWC"],         description:"A tiny, active bird with a conspicuous white eye-ring. It is a Philippine endemic that forages for nectar, insects, and small fruits in gardens, secondary forest, and suburban trees. Tolerant of light pollution, it is a common and widespread resident." },
  { id:53, common:"Luzon Bleeding-heart",         scientific:"Gallicolumba luzonica",     tolerance:"Sensitive", migration:"Resident",  mostlySeen:["La Mesa Watershed"],                                  description:"One of the most striking doves in the world, with a brilliant red patch on its breast resembling a wound. It walks quietly on the forest floor searching for seeds and invertebrates. Highly sensitive to light spill and human disturbance; very rare in Metro Manila." },
  { id:54, common:"Mangrove Blue Flycatcher",     scientific:"Cyornis rufigastra",        tolerance:"Sensitive", migration:"Resident",  mostlySeen:["LPPCHEA","Las Piñas-Parañaque"],                     description:"A bright blue flycatcher endemic to the Philippines that inhabits mangrove forests and their edges. It is sensitive to light pollution and coastal development. The LPPCHEA remains one of the last Metro Manila strongholds for this species." },
  { id:55, common:"Olive-backed Sunbird",         scientific:"Cinnyris jugularis",        tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["NAPWC","UP Diliman"],           description:"The most common sunbird in Metro Manila. The male has a metallic blue-black throat and bright yellow underparts. It feeds on nectar and insects in gardens, parks, and flowering street trees. Highly adaptable and tolerant of urban light and noise." },
  { id:56, common:"Pacific Reef Heron",           scientific:"Egretta sacra",             tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["Manila Bay Coastline","Las Piñas-Parañaque"],         description:"A coastal heron found in two colour morphs—white and dark grey—along rocky shores, seawalls, and breakwaters. It is tolerant of urban coastal environments and can be seen hunting fish along the Manila Bay baywalk after dark under pier lighting." },
  { id:57, common:"Pacific Swallow",              scientific:"Hirundo tahitica",          tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["NAPWC","Manila Bay Coastline"],                       description:"A resident swallow found throughout Metro Manila, nesting under bridges, eaves, and flyovers. It forages for aerial insects over open ground and water. Highly tolerant of urban environments, it often forages under lights after dark, catching insects attracted to lamps." },
  { id:58, common:"Pied Fantail",                 scientific:"Rhipidura javanica",        tolerance:"Tolerant",  migration:"Resident",  mostlySeen:["NAPWC","LPPCHEA"],                                    description:"A lively black-and-white fantail that fans and wags its tail incessantly. It inhabits gardens, parks, mangroves, and secondary growth. Very tolerant of human proximity and moderate light pollution. One of the most familiar birds in Metro Manila gardens." },
  { id:59, common:"Philippine Bulbul",            scientific:"Hypsipetes philippinus",    tolerance:"Sensitive", migration:"Resident",  mostlySeen:["La Mesa Watershed","Marikina Watershed"],             description:"A noisy, gregarious bulbul endemic to the Philippines. It travels in flocks through the forest canopy, feeding on fruits and insects. Sensitive to forest edge lighting that fragments foraging routes and disrupts its early-morning chorus." },
  { id:60, common:"Philippine Cockatoo",          scientific:"Cacatua haematuropygia",    tolerance:"Sensitive", migration:"Resident",  mostlySeen:["LPPCHEA","Las Piñas Parañaque Critical Habitat"],    description:"A critically endangered endemic cockatoo of the Philippines. Wild populations near Metro Manila are extremely small. It nests in tree cavities and is highly sensitive to artificial light, human noise, and habitat loss—any disturbance near nest sites leads to abandonment." },
];

// ── Generate additional species to total 757 ─────────────────────────────────
const EXTRA_NAMES = [
  ["Philippine Duck","Anas luzonica"],["Spotted Wood Kingfisher","Actenoides lindsayi"],
  ["Philippine Nightjar","Caprimulgus manillensis"],["Coleto","Sarcops calvus"],
  ["Philippine Hawk-Eagle","Nisaetus philippensis"],["Guaiabero","Bolbopsittacus lunulatus"],
  ["Barred Rail","Gallirallus torquatus"],["Purple Heron","Ardea purpurea"],
  ["White-browed Crake","Porzana cinerea"],["Ruddy-breasted Crake","Porzana fusca"],
  ["Little Grebe","Tachybaptus ruficollis"],["Little Cormorant","Microcarbo niger"],
  ["White-breasted Waterhen","Amaurornis phoenicurus"],["Purple Swamphen","Porphyrio porphyrio"],
  ["Whiskered Tern","Chlidonias hybrida"],["Philippine Myna","Acridotheres cinereus"],
  ["Zebra Dove","Geopelia striata"],["Spotted Dove","Streptopelia chinensis"],
  ["Rock Pigeon","Columba livia"],["Pied Triller","Lalage nigra"],
  ["Ashy Minivet","Pericrocotus divaricatus"],["Philippine Drongo","Dicrurus samarensis"],
  ["White-throated Kingfisher","Halcyon smyrnensis"],["Blue-backed Parrot","Tanygnathus sumatranus"],
  ["Sulphur-billed Nuthatch","Sitta oenochlamys"],["Bar-bellied Cuckoo","Cacomantis sonneratii"],
  ["Silvery Kingfisher","Alcedo argentata"],["Philippine Hawk-Owl","Ninox philippensis"],
  ["Grass Owl","Tyto capensis"],["Scale-feathered Malkoha","Phaenicophaeus cumingi"],
  ["White-browed Shama","Copsychus luzoniensis"],["Blue-naped Parrot","Tanygnathus lucionensis"],
  ["Philippine Tailorbird","Orthotomus castaneiceps"],["Golden-bellied Gerygone","Gerygone sulphurea"],
  ["Grey-backed Tailorbird","Orthotomus derbianus"],["Black-naped Fruit Dove","Ptilinopus melanospila"],
  ["Stripe-headed Rhabdornis","Rhabdornis mysticalis"],["Philippine Falconet","Microhierax erythrogenys"],
  ["Slender-billed Crow","Corvus enca"],["Large-billed Crow","Corvus macrorhynchos"],
  ["Luzon Hornbill","Penelopides manillae"],["Philippine Nightjar","Caprimulgus manillensis"],
  ["Colasisi","Loriculus philippensis"],["Philippine Brown Dove","Phapitreron amethystinus"],
  ["White-eared Brown Dove","Phapitreron leucotis"],["Golden-bellied Flyeater","Gerygone sulphurea"],
  ["Philippine Pond Heron","Ardeola speciosa"],["Black-shouldered Kite","Elanus caeruleus"],
  ["Oriental Honey Buzzard","Pernis ptilorhynchus"],["Crested Serpent Eagle","Spilornis cheela"],
  ["Grey-faced Buzzard","Butastur indicus"],["Chinese Sparrowhawk","Accipiter soloensis"],
  ["Japanese Sparrowhawk","Accipiter gularis"],["Besra","Accipiter virgatus"],
  ["Oriental Scops Owl","Otus sunia"],["Philippine Scops Owl","Otus megalotis"],
  ["Cebu Scops Owl","Otus megalotis"],["Mantanani Scops Owl","Otus mantananensis"],
  ["White-faced Scops Owl","Otus sagittatus"],["Palawan Scops Owl","Otus fuliginosus"],
  ["Philippine Eagle Owl","Bubo philippensis"],["Camiguin Hawk Owl","Ninox leventisi"],
  ["Luzon Hawk Owl","Ninox philippensis"],["Cebu Boobook","Ninox rumseyi"],
  ["Mindanao Hawk Owl","Ninox spilocephala"],["Spotted Wood Owl","Strix seloputo"],
  ["Brown Boobook","Ninox scutulata"],["Philippine Frogmouth","Batrachostomus septimus"],
  ["Large-tailed Nightjar","Caprimulgus macrurus"],["Savanna Nightjar","Caprimulgus affinis"],
  ["Germain's Swiftlet","Aerodramus germani"],["Philippine Swiftlet","Aerodramus mearnsi"],
  ["Uniform Swiftlet","Aerodramus vanikorensis"],["Pygmy Swiftlet","Collocalia troglodytes"],
  ["White-rumped Swiftlet","Aerodramus spodiopygius"],["Giant Swiftlet","Hydrochous gigas"],
  ["Purple Needletail","Hirundapus celebensis"],["Silver-rumped Spinetail","Rhaphidura leucopygialis"],
  ["Philippine Needletail","Mearnsia picina"],["Mossy-nest Swiftlet","Aerodramus salanganus"],
  ["White-nest Swiftlet","Aerodramus fuciphagus"],["Edible-nest Swiftlet","Aerodramus fuciphagus"],
];

const TOLERANCES: Tolerance[] = ["Sensitive","Tolerant","Tolerant","Sensitive","Tolerant"];
const MIGRATIONS: Migration[]  = ["Resident","Migratory","Resident","Migratory","Resident"];
const SITES = [
  ["La Mesa Watershed",          "NAPWC"],
  ["Laguna de Bay Wetlands",     "LPPCHEA"],
  ["Las Piñas-Parañaque",        "Marikina Watershed"],
  ["La Mesa Ecosystem Reserve",  "Laguna de Bay Wetlands"],
  ["Manila Bay Coastline",       "LPPCHEA"],
  ["Marikina Watershed",         "NAPWC"],
  ["NAPWC",                      "UP Diliman"],
  ["LPPCHEA",                    "Manila Bay Coastline"],
];

const ALL_SPECIES: SpeciesEntry[] = [
  ...BASE_SPECIES,
  ...EXTRA_NAMES.map(([common, scientific], i) => ({
    id: 61 + i,
    common,
    scientific,
    tolerance: TOLERANCES[(61 + i) % TOLERANCES.length],
    migration: MIGRATIONS[(61 + i) % MIGRATIONS.length],
    mostlySeen: SITES[(61 + i) % SITES.length],
    description: `${common} (${scientific}) is a bird species recorded in Metro Manila monitoring stations. It contributes to the region's rich avifauna and serves as an indicator of ecosystem health. Continued monitoring helps track population trends and light-pollution impacts on this species.`,
  })),
  // fill remaining to 757
  ...Array.from({ length: 757 - 60 - EXTRA_NAMES.length }, (_, i) => {
    const n = 61 + EXTRA_NAMES.length + i;
    return {
      id: n,
      common: `Species ${n}`,
      scientific: `Aves speciosa var. ${n}`,
      tolerance: TOLERANCES[n % TOLERANCES.length],
      migration: MIGRATIONS[n % MIGRATIONS.length],
      mostlySeen: SITES[n % SITES.length],
      description: `Species #${n} is part of the 757 bird species recorded in Metro Manila. It is monitored across multiple stations to track light pollution impacts and seasonal abundance.`,
    };
  }),
];

const PAGE_SIZE = 50;

// ── Component ─────────────────────────────────────────────────────────────────
export function Species() {
  const { lightMode } = useOutletContext<{ lightMode: boolean }>();

  // theme-aware class helpers
  const pageBg = lightMode ? "bg-white text-gray-900" : "bg-[#0d1117] text-white";
  const filterBarBg = lightMode
    ? "bg-gray-100 border border-gray-200"
    : "bg-[#161b27] border border-[#2a2f42]";
  const textPrimary = lightMode ? "text-gray-900" : "text-white";
  const textSecondary = lightMode ? "text-gray-700" : "text-gray-400";
  const inputBase = lightMode
    ? "bg-white border border-gray-300 text-gray-900 placeholder-gray-500"
    : "bg-[#0d1117] border border-[#2a2f42] text-gray-200 placeholder-gray-600";
  const dropdownBtnBase = lightMode
    ? "text-gray-700 hover:border-gray-300"
    : "text-gray-300 hover:border-gray-500";
  const dropdownBg = lightMode
    ? "bg-white border border-gray-300"
    : "bg-[#161b27] border border-[#2a2f42]";
  // additional theme helpers for cards, pagination, modal
  const cardBg = lightMode ? "bg-white border border-gray-200" : "bg-[#161b27] border border-[#2a2f42]";
  const cardImageBg = lightMode ? "bg-gray-100" : "bg-[#1e2538]";
  const overlayBgValue = lightMode ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.75)";
  const gradientBg = lightMode ? "linear-gradient(to top, #f3f4f6, transparent)" : "linear-gradient(to top, #161b27, transparent)";
  const paginationBtnBase = lightMode ? "text-gray-700" : "text-gray-400";
  const iconColor = lightMode ? "text-gray-500" : "text-gray-400";

  const [search,    setSearch]    = useState("");
  const [tolFilter, setTolFilter] = useState<"All"|Tolerance>("All");
  const [migFilter, setMigFilter] = useState<"All"|Migration>("All");
  const [page,      setPage]      = useState(1);
  const [selected,  setSelected]  = useState<SpeciesEntry | null>(null);

  // Dropdown open states
  const [tolOpen, setTolOpen] = useState(false);
  const [migOpen, setMigOpen] = useState(false);

  const filtered = useMemo(() => {
    return ALL_SPECIES.filter(s => {
      const q = search.toLowerCase();
      const matchName = !q || s.common.toLowerCase().includes(q) || s.scientific.toLowerCase().includes(q);
      const matchTol  = tolFilter === "All" || s.tolerance === tolFilter;
      const matchMig  = migFilter === "All" || s.migration === migFilter;
      return matchName && matchTol && matchMig;
    });
  }, [search, tolFilter, migFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function applyFilter() { setPage(1); setTolOpen(false); setMigOpen(false); }
  function clearFilter()  { setSearch(""); setTolFilter("All"); setMigFilter("All"); setPage(1); }

  const tolBadge = (t: Tolerance) =>
    t === "Sensitive"
      ? "bg-red-600 text-white"
      : "bg-green-700 text-white";

  const migBadge = (m: Migration) =>
    m === "Resident"
      ? "bg-teal-600 text-white"
      : "bg-blue-600 text-white";

  return (
    <div className={`min-h-full px-6 py-6 ${pageBg}`}>

      {/* ── Header ── */}
      <div className="mb-5">
        <h1 className={textPrimary} style={{ fontWeight: 700, fontSize: "22px" }}>
          Bird Species Catalog
        </h1>
        <p className={`${textSecondary} text-sm mt-1`}>
          Searchable library of 757 bird species recorded in Metro Manila
        </p>
      </div>

      {/* ── Filter bar ── */}
      <div className={`${filterBarBg} rounded-xl px-5 py-4 mb-5 flex flex-wrap items-center gap-3`}>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${iconColor}`} />
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className={`w-full pl-8 pr-3 py-1.5 rounded-lg ${inputBase} text-sm outline-none focus:border-blue-500 transition-colors`}
          />
        </div>

        {/* Tolerance dropdown */}
        <div className="relative">
          <button
            onClick={() => { setTolOpen(o => !o); setMigOpen(false); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${inputBase} ${dropdownBtnBase} text-sm whitespace-nowrap transition-colors`}
          >
            {tolFilter === "All" ? "All Tolerance Levels" : tolFilter}
            <ChevronDown size={13} className={iconColor} />
          </button>
          {tolOpen && (
            <div className={`absolute top-9 left-0 z-50 ${dropdownBg} rounded-lg shadow-xl py-1 w-52`}>
              {(["All","Sensitive","Tolerant"] as const).map(o => (
                <button key={o} onClick={() => { setTolFilter(o); setTolOpen(false); setPage(1); }}
                  className={`w-full px-3 py-2 text-sm text-left transition-colors ${tolFilter===o?"text-blue-400 bg-blue-500/10":"text-gray-400 hover:bg-white/5"}`}>
                  {o === "All" ? "All Tolerance Levels" : o}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Migration dropdown */}
        <div className="relative">
          <button
            onClick={() => { setMigOpen(o => !o); setTolOpen(false); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${inputBase} ${dropdownBtnBase} text-sm whitespace-nowrap transition-colors`}
          >
            {migFilter === "All" ? "All Migration Types" : migFilter}
            <ChevronDown size={13} className={iconColor} />
          </button>
          {migOpen && (
            <div className={`absolute top-9 left-0 z-50 ${dropdownBg} rounded-lg shadow-xl py-1 w-44`}>
              {(["All","Resident","Migratory"] as const).map(o => (
                <button key={o} onClick={() => { setMigFilter(o); setMigOpen(false); setPage(1); }}
                  className={`w-full px-3 py-2 text-sm text-left transition-colors ${migFilter===o?"text-blue-400 bg-blue-500/10":"text-gray-400 hover:bg-white/5"}`}>
                  {o === "All" ? "All Migration Types" : o}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Filter button */}
        <button
          onClick={applyFilter}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
        >
          <Filter size={13} /> Filter
        </button>

        {/* Clear button */}
        <button
          onClick={clearFilter}
          className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm transition-colors"
        >
          Clear
        </button>
      </div>

      {/* ── Result count ── */}
      <p className={`${textSecondary} text-sm mb-4`}>
        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
        <span className={textSecondary} style={{ fontWeight: 600 }}>{filtered.length}</span> species
      </p>

      {/* ── Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        {pageItems.map(sp => (
          <div
            key={sp.id}
            className={`${cardBg} rounded-xl overflow-hidden flex flex-col`}
          >
            {/* Image area — card */}
            <div className={`relative ${cardImageBg} flex items-center justify-center`}
              style={{ height: "130px" }}>
              {sp.imageUrl ? (
                <img src={sp.imageUrl} alt={sp.common}
                  className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center w-full h-full gap-2">
                  <Bird size={40} className={iconColor} strokeWidth={1.2} />
                  <span className={`${textSecondary}`} style={{ fontSize: "10px" }}>Photo not available</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3 flex flex-col gap-2 flex-1">
              <p className={`${textPrimary} leading-snug`} style={{ fontWeight: 700, fontSize: "13px" }}>
                {sp.common}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap gap-1">
                <span className={`text-xs px-2 py-0.5 rounded ${tolBadge(sp.tolerance)}`}
                  style={{ fontWeight: 600, fontSize: "10px" }}>
                  {sp.tolerance}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${migBadge(sp.migration)}`}
                  style={{ fontWeight: 600, fontSize: "10px" }}>
                  {sp.migration}
                </span>
              </div>

              {/* View Details */}
              <button
                onClick={() => setSelected(sp)}
                className="mt-auto w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                style={{ fontSize: "12px", fontWeight: 600 }}
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pb-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${cardBg} ${paginationBtnBase} text-sm disabled:opacity-40 hover:border-gray-500 transition-colors`}
          >
            <ChevronLeft size={14} /> Prev
          </button>

          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let pg: number;
            if (totalPages <= 7) { pg = i + 1; }
            else if (page <= 4) { pg = i + 1; }
            else if (page >= totalPages - 3) { pg = totalPages - 6 + i; }
            else { pg = page - 3 + i; }
            return (
              <button
                key={pg}
                onClick={() => setPage(pg)}
                className={`w-9 h-9 rounded-lg text-sm transition-colors ${
                  pg === page
                    ? "bg-blue-600 text-white"
                    : `${cardBg} ${paginationBtnBase} hover:border-gray-500`
                }`}
                style={{ fontWeight: pg === page ? 700 : 400 }}
              >
                {pg}
              </button>
            );
          })}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg ${cardBg} ${paginationBtnBase} text-sm disabled:opacity-40 hover:border-gray-500 transition-colors`}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ── View Details Modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: overlayBgValue, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div
            className={`${cardBg} rounded-2xl shadow-2xl w-full overflow-hidden`}
            style={{ maxWidth: "560px", maxHeight: "90vh", overflowY: "auto" }}
          >
            {/* Close */}
            <button
              onClick={() => setSelected(null)}
              className={`absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full ${lightMode ? 'bg-gray-200/80 text-gray-600 hover:bg-gray-300 hover:text-gray-900' : 'bg-[#0d1117]/80 text-gray-400 hover:text-white hover:bg-[#0d1117]'} transition-colors`}
            >
              <X size={16} />
            </button>

            {/* Image */}
            <div className={`relative ${cardImageBg} flex items-center justify-center`}
              style={{ height: "200px" }}>
              {selected.imageUrl ? (
                <img src={selected.imageUrl} alt={selected.common}
                  className="w-full h-full object-cover" />
              ) : (
                <>
                  <Bird size={72} className={iconColor} strokeWidth={1} />
                  <div className="absolute inset-x-0 bottom-0 h-10"
                    style={{ background: gradientBg }} />
                </>
              )}
            </div>

            {/* Content */}
            <div className="px-6 pb-6 pt-4">

              {/* Names */}
              <h2 className={textPrimary} style={{ fontWeight: 800, fontSize: "20px" }}>
                {selected.common}
              </h2>
              <p className={`${textSecondary} text-sm italic mt-0.5 mb-4`}>
                {selected.scientific}
              </p>

              {/* Bird Type row */}
              <div className="flex items-center gap-2 mb-5">
                <span className={`${textSecondary} text-xs`} style={{ fontWeight: 600 }}>Bird Type:</span>
                <span className={`text-xs px-2.5 py-1 rounded-full ${tolBadge(selected.tolerance)}`}
                  style={{ fontWeight: 700 }}>
                  {selected.tolerance}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full ${migBadge(selected.migration)}`}
                  style={{ fontWeight: 700 }}>
                  {selected.migration}
                </span>
              </div>

              <div className="space-y-4">

                {/* Mostly seen */}
                <div className={`${cardImageBg} rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin size={14} className="text-blue-400 shrink-0" />
                    <span className={`${textPrimary} text-sm`} style={{ fontWeight: 700 }}>Mostly Seen</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.mostlySeen.map((loc, i) => (
                      <span key={i}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/20 border border-blue-600/30 text-blue-300"
                        style={{ fontSize: "12px", fontWeight: 500 }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        {loc}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className={`${cardImageBg} rounded-xl p-4`}>
                  <p className={`${textPrimary} text-sm mb-2`} style={{ fontWeight: 700 }}>Description</p>
                  <p className={`${textSecondary} text-sm leading-relaxed`}>
                    {selected.description}
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}