import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const configured = Boolean(url && key && key !== "your_publishable_key");
const sb = configured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
const $ = (s) => document.querySelector(s);
const esc = (v = "") =>
  String(v).replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
let loadSequence = 0;
const state = {
  page: "home",
  session: null,
  profile: null,
  qualifications: [],
  aircraft: [],
  aircraftCatalog: [],
  missions: [],
  active: null,
  history: [],
  achievements: [],
  pilotAchievements: [],
  selected: null,
  selectedAircraftId: null,
  missionFilter: "ALL",
  loading: false,
  loadErrors: [],
  submitting: false,
  recruitProfileId: null,
  trainingStaffId: null,
  trainingProgramId: null,
  feedbackRating: 0,
  announcements: [],
  staffStatus: null,
  staffCandidates: [],
  staff: [],
  staffQualifications: [],
  staffAssignments: [],
  staffOpsStatus: null,
  staffTraining: [],
  staffTrainingPrograms: [],
  isAdmin: false,
  adminOverview: null,
  adminStaff: [],
  adminCompanies: [],
  adminPilots: [],
  adminAssignments: [],
  adminIndependentCompanies: [],
  lastFlightResult: null,
  report: {
    outcome: "successful",
    landing: "good",
    condition: "no_issues",
    objective: "completed",
    notes: "",
    weather: "clear",
    flightMinutes: "",
    distanceNm: "",
    liveWeatherConfirm: false,
  },
};
function recruitAvatar(c) {
  const seed = encodeURIComponent(c?.candidate_name || c?.employee_name || "Pilot");
  return "https://api.dicebear.com/9.x/personas/svg?seed=" + seed + "&backgroundColor=0b1726";
}
function toast(message, bad = false) {
  const t = $("#toast");
  t.textContent = message;
  t.style.borderColor = bad ? "var(--red)" : "";
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3600);
}
function err(e, fallback) {
  toast(e?.message || fallback, true);
}
function num(v) {
  return Number(v || 0).toLocaleString();
}
const LEVEL_XP = [0,3500,6000,8000,12000,18000,23000,29000,36000,44000,53000,63000,74000,87000,101000,116000,132000,150000,170000,190000];
function levelForXp(xp) {
  const value = Number(xp || 0);
  let current = 1;
  LEVEL_XP.forEach((threshold, index) => { if (value >= threshold) current = index + 1; });
  return Math.min(20, current);
}
function level() {
  return state.profile?.level || levelForXp(state.profile?.xp || 0);
}
const EPauletStyle = "<style>\n.epaulet-wrap{display:flex;align-items:center;gap:12px;min-width:205px}\n.epaulet-board{position:relative;width:112px;height:39px;border-radius:4px 7px 7px 4px;background:linear-gradient(145deg,#25313c,#101820);border:1px solid #71808c;box-shadow:0 4px 9px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.16);overflow:hidden;display:flex;align-items:center}\n.epaulet-tip{width:15px;height:100%;background:linear-gradient(90deg,#0b1116,#26333e);clip-path:polygon(0 0,100% 50%,0 100%);flex:none}\n.epaulet-band{height:100%;width:50px;display:flex;align-items:center;justify-content:center;gap:3px;transform:skewX(-8deg)}\n.epaulet-stripe{display:block;width:5px;height:30px;background:linear-gradient(90deg,#c9a33a,#fff3b0 48%,#c9a33a);border-radius:1px;box-shadow:0 0 2px rgba(255,255,255,.35)}\n.epaulet-insignia{flex:1;text-align:center;color:#f4ca55;font-size:14px;letter-spacing:2px;text-shadow:0 1px 2px #000}\n.epaulet-star{display:inline-block;font-size:14px;margin:0 1px}.epaulet-command{display:inline-block;font-size:15px;margin-left:2px}\n.training-options{grid-template-columns:repeat(3,minmax(0,1fr))}.training-options .detail{display:flex;flex-direction:column}.training-options .detail .action{margin-top:auto}</style>";
function ensureEpauletStyle() {
  if (!document.getElementById("flightops-epaulet-style")) {
    const s = document.createElement("style");
    s.id = "flightops-epaulet-style";
    s.textContent = "\n.epaulet-wrap{display:flex;align-items:center;gap:12px;min-width:205px}\n.epaulet-board{position:relative;width:112px;height:39px;border-radius:4px 7px 7px 4px;background:linear-gradient(145deg,#25313c,#101820);border:1px solid #71808c;box-shadow:0 4px 9px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.16);overflow:hidden;display:flex;align-items:center}\n.epaulet-tip{width:15px;height:100%;background:linear-gradient(90deg,#0b1116,#26333e);clip-path:polygon(0 0,100% 50%,0 100%);flex:none}\n.epaulet-band{height:100%;width:50px;display:flex;align-items:center;justify-content:center;gap:3px;transform:skewX(-8deg)}\n.epaulet-stripe{display:block;width:5px;height:30px;background:linear-gradient(90deg,#c9a33a,#fff3b0 48%,#c9a33a);border-radius:1px;box-shadow:0 0 2px rgba(255,255,255,.35)}\n.epaulet-insignia{flex:1;text-align:center;color:#f4ca55;font-size:14px;letter-spacing:2px;text-shadow:0 1px 2px #000}\n.epaulet-star{display:inline-block;font-size:14px;margin:0 1px}.epaulet-command{display:inline-block;font-size:15px;margin-left:2px}\n";
    document.head.appendChild(s);
  }
}

function pilotRank(lvl = level()) {
  const n = Math.max(1, Math.min(20, Number(lvl) || 1));
  if (n <= 2) return { title: "Junior Pilot", stripes: 1, stars: 0 };
  if (n <= 4) return { title: "First Officer", stripes: 2, stars: 0 };
  if (n <= 7) return { title: "Senior First Officer", stripes: 2, stars: 1 };
  if (n <= 10) return { title: "Captain", stripes: 3, stars: 0 };
  if (n <= 13) return { title: "Senior Captain", stripes: 4, stars: 0 };
  if (n <= 16) return { title: "Chief Captain", stripes: 4, stars: 1 };
  if (n <= 18) return { title: "Senior Command Captain", stripes: 4, stars: 2 };
  if (n === 19) return { title: "Master Captain", stripes: 4, stars: 3 };
  return { title: "FlightOps Command Pilot", stripes: 4, stars: 0, command: true };
}
function epaulet(lvl = level()) {
  ensureEpauletStyle();
  const r = pilotRank(lvl);
  const stripes = Array.from({ length: r.stripes }, () => '<span class="epaulet-stripe"></span>').join("");
  const stars = Array.from({ length: r.stars }, () => '<span class="epaulet-star">★</span>').join("");
  const command = r.command ? '<span class="epaulet-command">◆</span>' : "";
  return '<div class="epaulet-wrap" title="FlightOps career rank"><div class="epaulet-board" aria-label="' + esc(r.title) + ', Level ' + lvl + '"><div class="epaulet-tip"></div><div class="epaulet-band">' + stripes + '</div><div class="epaulet-insignia">' + stars + command + '</div></div><div><div class="label">Rank</div><strong>' + esc(r.title) + '</strong><div class="small">Level ' + lvl + '</div></div></div>';
}
function missionTitle(m) {
  return m.title || m.name || m.mission_id || "Mission";
}
function missionListText(value, fallback) {
  if (Array.isArray(value)) {
    const items = value.map((x) => typeof x === "string" ? x : x?.text || x?.name || "").filter(Boolean);
    return items.length ? items.join(" • ") : fallback;
  }
  if (value && typeof value === "object") {
    const items = Object.values(value).filter((x) => typeof x === "string" && x.trim());
    return items.length ? items.join(" • ") : fallback;
  }
  return value ? String(value) : fallback;
}
function isBushMission(m) {
  return String(m?.template_id || "").toUpperCase().startsWith("BUSH-") ||
    String(m?.template_id || "").toUpperCase().includes("-BUSH-") ||
    /\bbush\b|outpost|wilderness resupply|remote bush/i.test(
      String(m?.title || "") + " " + String(m?.description || "")
    );
}
function bushMissionNotice(m) {
  if (!isBushMission(m)) return "";
  return '<div class="notice"><b>🌲 BUSH OPERATION</b> — Remote/backcountry dispatch. Review terrain, runway surface, density altitude, wind, aircraft performance and current destination conditions before departure.</div>';
}
function missionWeather(m) {
  return String(m.weather_requirement || "").toUpperCase() === "LIVE_WEATHER"
    ? "Live Weather required"
    : (m.weather_requirement || "Check current weather before departure");
}
function missionPayload(m) {
  const manifest = m?.payload_manifest;
  if (manifest && !Array.isArray(manifest) && typeof manifest === "object") {
    const items = Array.isArray(manifest.items)
      ? manifest.items.map((x) => ({
          description: x?.description || x?.name || x?.type || "Payload",
          count: Number(x?.count ?? x?.quantity ?? 1),
          weight_lb: Number(x?.weight_lb || 0),
        }))
      : [];
    if (Number(manifest.passengers || 0)) {
      const count = Number(manifest.passengers);
      const totalWeight = Number(manifest.passenger_weight_lb || 0);
      items.push({ description: "Passengers", count, weight_lb: count ? Math.round(totalWeight / count) : 0 });
    }
    if (Number(manifest.baggage_weight_lb || 0)) {
      items.push({ description: "Baggage", count: 1, weight_lb: Number(manifest.baggage_weight_lb) });
    }
    if (Number(manifest.medical_equipment_lb || 0)) {
      items.push({ description: "Medical equipment", count: 1, weight_lb: Number(manifest.medical_equipment_lb) });
    }
    if (Number(manifest.patients || 0)) {
      items.push({ description: "Patient(s)", count: Number(manifest.patients), weight_lb: 0 });
    }
    if (Number(manifest.medical_crew || 0)) {
      items.push({ description: "Medical crew", count: Number(manifest.medical_crew), weight_lb: 0 });
    }
    const total = Number(manifest.total_weight_lb || 0) ||
      items.reduce((sum, x) => sum + Number(x.count || 1) * Number(x.weight_lb || 0), 0);
    return { items, total };
  }
  const raw = Array.isArray(manifest) ? manifest : [];
  const items = raw.filter((x) => x?.type !== "payload_total").map((x) => ({
    description: x?.description || x?.name || x?.type || "Payload",
    count: Number(x?.count ?? x?.quantity ?? 1),
    weight_lb: Number(x?.weight_lb || 0),
  }));
  const total = raw.find((x) => x?.type === "payload_total")?.weight_lb ??
    items.reduce((sum, x) => sum + Number(x.count || 1) * Number(x.weight_lb || 0), 0);
  return { items, total };
}
function missionPayloadCard(m) {
  const p = missionPayload(m);
  if (!p.items.length) return "";
  return `<div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Payload • Weight & Balance</div><h2>Mission Load Planning</h2></div><div class="ops-route-chip">MISSION PAYLOAD</div></div><p class="small">FlightOps shows the mission payload only. Enter the actual pilot, fuel and aircraft loading in MSFS Weight & Balance.</p><div class="details">${p.items.map((x) => `<div class="detail"><div class="label">${esc(x.description || x.type)}</div><strong>${num(x.count || 1)} × ${num(x.weight_lb || 0)} lb</strong><div class="small">Item total: ${num((x.count || 1) * (x.weight_lb || 0))} lb</div></div>`).join("")}<div class="detail"><div class="label">Mission payload total</div><strong>${num(p.total)} lb</strong><div class="small">FlightOps planning manifest</div></div></div><div class="callout"><b>MSFS loading:</b> Use this manifest to load the mission's actual passengers, baggage, cargo or equipment in MSFS. Pilot weight, fuel and final weight & balance are handled entirely in MSFS.</div></div>`;
}
function missionStorySource(m) {
  const sources = [
    ["mission_type", m?.mission_type || m?.type],
    ["template", m?.template_id],
    ["title", m?.title],
    ["payload", m?.payload_manifest],
    ["water_operation", m?.water_operation],
  ];
  return sources.filter(([,v]) => v !== undefined && v !== null && v !== "").map(([k,v]) => k + "=" + (typeof v === "object" ? JSON.stringify(v) : String(v))).join(" • ");
}
function missionStorySourceLabel(m) {
  const type = String(m?.mission_type || m?.type || "").toUpperCase();
  const title = String(m?.title || "");
  if (m?.template_id) return "Template dispatch • " + m.template_id;
  if (title) return "Contract dispatch • " + title;
  if (type) return "Contract dispatch • " + type;
  return "Contract dispatch";
}
function missionStoryFooter(m) {
  const type = String(m?.mission_type || m?.type || "").toUpperCase();
  if (type.includes("MEDEVAC") || type.includes("MEDICAL")) return "This assignment exists to support a real operational need. Complete the mission objective and record the flight accurately.";
  if (isBushMission(m) || m?.water_operation) return "This assignment supports a location where normal surface access is limited. The aircraft is providing the transportation link.";
  if (type.includes("CHARTER") || type.includes("VIP") || type.includes("EXECUTIVE")) return "The customer has contracted the aircraft for this scheduled movement. Professional passenger service is part of the assignment.";
  if (type.includes("CARGO")) return "The shipment has been scheduled for delivery to its receiving point. The flight provides the contracted air connection.";
  return "This flight was scheduled as an air transportation assignment. Complete the contracted objective and record the actual flight accurately.";
}
function missionStoryLead(m) {
  const type = String(m?.mission_type || m?.type || "").toUpperCase();
  const title = String(m?.title || "").toLowerCase();
  if (type.includes("MEDEVAC")) return "DISPATCH REQUEST — Patient transport";
  if (type.includes("MEDICAL")) return "DISPATCH REQUEST — Medical supply movement";
  if (title.includes("rescue") || title.includes("evacuation")) return "DISPATCH REQUEST — Emergency support";
  if (title.includes("survey")) return "DISPATCH REQUEST — Field survey support";
  if (title.includes("mail")) return "DISPATCH REQUEST — Remote mail service";
  if (title.includes("fuel")) return "DISPATCH REQUEST — Aviation fuel delivery";
  if (isBushMission(m)) return "DISPATCH REQUEST — Remote community support";
  if (type.includes("CHARTER") || type.includes("VIP") || type.includes("EXECUTIVE")) return "CHARTER REQUEST — Client transportation";
  if (type.includes("SCENIC")) return "CHARTER REQUEST — Aerial sightseeing";
  if (type.includes("CARGO")) return "DISPATCH REQUEST — Scheduled air cargo";
  return "DISPATCH REQUEST — Air transportation";
}
function missionStory(m) {
  const type = String(m?.mission_type || m?.type || "").toUpperCase();
  const title = String(m?.title || "").toLowerCase();
  const origin = m?.origin_airport?.name || m?.origin_airport?.airport_name || m?.origin_icao || "the departure airport";
  const destination = m?.destination_airport?.name || m?.destination_airport?.airport_name || m?.destination_icao || "the destination";
  const p = missionPayload(m);
  const passengerItem = p.items.find((x) => /passenger/i.test(String(x.description || "")));
  const passengers = passengerItem ? Number(passengerItem.count || 0) : 0;
  const countText = passengers ? passengers + " passenger" + (passengers === 1 ? "" : "s") : "a private group";
  const water = Boolean(m?.water_operation);
  const bush = isBushMission(m);
  if (type.includes("MEDEVAC") || title.includes("medevac")) return "A patient transfer has been arranged between medical facilities, with the flight providing the air connection needed to move the patient to the receiving facility.";
  if (type.includes("MEDICAL") || title.includes("medical")) return "A medical facility has requested delivery of time-sensitive equipment needed for patient care. The shipment is being moved by air because the receiving facility needs the supplies on schedule.";
  if (title.includes("rescue") || title.includes("evacuation")) return water ? "Emergency support personnel and supplies need transportation between isolated communities that depend on water access. The flight is part of the local response effort." : "Emergency support personnel and supplies need transportation to an isolated field location where normal surface access is limited.";
  if (title.includes("survey")) return water ? "A survey team and field equipment need transportation to a remote site accessible by water. The aircraft is providing the connection needed to begin the scheduled field work." : "A survey team and field equipment need transportation to a remote field site. The aircraft is providing the connection needed to begin the scheduled work.";
  if (title.includes("mail")) return "Mail and light parcels have been scheduled for delivery to a remote community. Air transportation is being used to maintain the community’s regular connection to the regional distribution point.";
  if (title.includes("fuel")) return "A remote operating site has requested aviation fuel and essential supplies. The delivery is being moved by air because the site has limited surface access.";
  if (bush || title.includes("outpost") || title.includes("wilderness") || title.includes("resupply")) return "A remote community or field operation is awaiting a scheduled supply delivery. Air service is providing the practical connection to a location with limited surface transportation.";
  if (type.includes("CARGO") || title.includes("cargo") || title.includes("supply")) return "A customer has arranged an air shipment between " + origin + " and " + destination + " for a scheduled delivery. The aircraft is being used to move the shipment directly to its receiving point.";
  if (type.includes("CHARTER") || type.includes("EXECUTIVE") || type.includes("VIP") || title.includes("charter") || title.includes("executive") || title.includes("vip")) return "A private client has arranged transportation from " + origin + " to " + destination + " for " + countText + ". The passengers have requested a direct, professional transfer for their scheduled travel.";
  if (type.includes("SCENIC") || title.includes("scenic")) return "A group of passengers has booked an aerial sightseeing flight to experience the area from the air. The operation is being conducted as a scheduled recreational charter.";
  if (water) return "A scheduled passenger or supply movement is being made to a community that depends on water access. The aircraft is providing the connection that conventional surface transportation cannot.";
  return "A customer has arranged this flight to move people or goods between the two scheduled locations. The aircraft is being used to provide a direct air connection for the assignment.";
}
function missionTypeContext(m) {
  const type = String(m.mission_type || "").toUpperCase();
  const title = String(m.title || "").toLowerCase();
  if (type.includes("MEDICAL") || type.includes("MEDEVAC") || title.includes("medical")) {
    return "Priority medical operation — minimize unnecessary delay while maintaining safe margins.";
  }
  if (type.includes("CARGO") || title.includes("cargo") || title.includes("supply")) {
    return "Cargo operation — verify loading, aircraft limitations, fuel and destination handling requirements.";
  }
  if (type.includes("CHARTER") || title.includes("executive") || title.includes("vip") || title.includes("scenic")) {
    return "Passenger charter — prioritize a smooth, professional flight and confirm destination suitability.";
  }
  return "General flight operation — complete the assigned objective safely and professionally.";
}
function missionDestinationContext(m) {
  const destination = m.destination_icao || m.destination_airport?.icao_code || "destination";
  const distance = Number(m.distance_nm || 0);
  if (distance <= 75) return destination + " is a short-range assignment from home base; local weather and runway conditions are the primary planning focus.";
  if (distance <= 150) return destination + " is within the current local career radius; review fuel, winds, terrain and destination conditions before departure.";
  if (distance <= 500) return destination + " is a regional assignment; confirm fuel reserves, alternate planning and changing weather along the route.";
  return destination + " is an extended assignment; complete captain-level route, altitude, fuel, alternate and weather planning.";
}
function aircraftName(a) {
  const master = a.aircraft_master || a;
  return (
    master.name ||
    (master.manufacturer && master.model
      ? `${master.manufacturer} ${master.model}`
      : master.model) ||
    a.name ||
    a.aircraft_id ||
    "Assigned aircraft"
  );
}
function missionLegs(m) {
  const raw = m?.legs;
  if (Array.isArray(raw) && raw.length) return raw;
  return [{ leg_number: 1, origin_icao: m?.origin_icao || "—", destination_icao: m?.destination_icao || "—", distance_nm: Number(m?.distance_nm || m?.distance || 0) }];
}
function route(m) {
  const legs = missionLegs(m);
  if (legs.length > 1) return legs.map((leg) => `${leg.origin_icao || "—"} → ${leg.destination_icao || "—"}`).join(" → ");
  return m.route || `${m.origin_icao || m.departure_icao || m.departure_airport?.icao_code || "—"} → ${m.destination_icao || m.destination_airport?.icao_code || "—"}`;
}
function legDisplay(m, currentLeg = 1) {
  const legs = missionLegs(m);
  const leg = legs[Math.max(0, Number(currentLeg || 1) - 1)] || legs[0];
  return { legs, leg, current: Number(currentLeg || 1), count: legs.length };
}
function legPurpose(leg, current, count) {
  return leg?.leg_purpose || (
    current === 1 ? "Mission departure" :
    current === count ? "Mission arrival / final destination" :
    "Intermediate mission stop"
  );
}
function nav() {
  $("#nav").innerHTML = state.session
    ? ["home", "missions", "active", "hangar", "pilot", "career", ...(state.staffStatus?.eligible ? ["crew", "training", "recruiting"] : []), ...(state.isAdmin ? ["admin"] : []), "updates", "feedback"]
        .map(
          (x) =>
            `<button data-page="${x}" class="${state.page === x ? "active" : ""}">${x === "training" ? "Training Academy" : x[0].toUpperCase() + x.slice(1)}</button>`,
        )
        .join("") + '<button data-action="logout">Logout</button>'
    : "";
  $("#nav")
    .querySelectorAll("[data-page]")
    .forEach(
      (b) =>
        (b.onclick = async () => {
          if (b.dataset.page === "active") {
            await openActivePage();
            return;
          }
          state.page = b.dataset.page;
          render();
        }),
    );
  $('[data-action="logout"]')?.addEventListener("click", logout);
}
async function load() {
  if (!sb || !state.session) return;

  const loadToken = ++loadSequence;
  const uid = state.session.user.id;
  const adminCheck = await sb.rpc("is_admin");
  state.isAdmin = adminCheck.data === true;
  state.adminOverview = state.isAdmin ? (await sb.rpc("admin_overview")).data : null;
  state.adminStaff = state.isAdmin ? ((await sb.rpc("admin_staff_list")).data || []) : [];
  state.adminCompanies = state.isAdmin ? ((await sb.rpc("admin_company_list")).data || []) : [];
  state.adminPilots = state.isAdmin ? ((await sb.rpc("admin_pilot_list")).data || []) : [];
  state.adminAssignments = state.isAdmin ? ((await sb.rpc("admin_assignment_list")).data || []) : [];
  state.adminIndependentCompanies = state.isAdmin ? ((await sb.rpc("admin_independent_company_list")).data || []) : [];
  state.loadErrors = [];
  state.loading = true;

  // Refresh the mission board from the secure generator before loading offers.
  // Ensure pilots who own float-capable aircraft can actually receive a water-operation offer.
  const water = await sb.rpc("ensure_water_mission_offer");
  if (water.error && water.error.code !== "PGRST202") {
    state.loadErrors.push(`water mission generator: ${water.error.message || "request failed"}`);
  }
  const beaver = await sb.rpc("ensure_beaver_dispatch_offer");
  if (beaver.error && beaver.error.code !== "PGRST202") {
    state.loadErrors.push(`Beaver dispatch: ${beaver.error.message || "request failed"}`);
  }
  const generated = await sb.rpc("generate_mission_offers");
  if (generated.error) {
    state.loadErrors.push(`mission generator: ${generated.error.message || "request failed"}`);
  }
  const advanced = await sb.rpc("upgrade_generated_multileg_missions");
  if (advanced.error) {
    state.loadErrors.push(`advanced mission generator: ${advanced.error.message || "request failed"}`);
  }

  // Ensure each currently owned, eligible aircraft has at least one contract
  // that explicitly names that aircraft. This prevents the global generated-offer
  // cap from starving newer aircraft such as the C182Q, PC-12, or jets.
  const ownedOfferAircraft = await sb
    .from("pilot_aircraft")
    .select("aircraft_id")
    .eq("pilot_id", uid);
  if (ownedOfferAircraft.error) {
    state.loadErrors.push(`aircraft offer preparation: ${ownedOfferAircraft.error.message || "request failed"}`);
  } else {
    for (const row of ownedOfferAircraft.data || []) {
      const offer = await sb.rpc("ensure_aircraft_mission_offer", {
        p_aircraft_id: row.aircraft_id,
      });
      if (offer.error && offer.error.code !== "PGRST202") {
        state.loadErrors.push(`aircraft offer ${row.aircraft_id}: ${offer.error.message || "request failed"}`);
      }
    }
  }

  const run = async () =>
    Promise.all([
      sb.from("pilot_profiles").select("*").eq("id", uid).maybeSingle(),
      sb.from("pilot_qualifications").select("*").eq("pilot_id", uid),
      sb.from("pilot_aircraft").select("*").eq("pilot_id", uid),
      sb.from("missions").select("*").eq("active", true),
      sb.from("active_missions").select("*").eq("pilot_id", uid).maybeSingle(),
      sb.from("achievements").select("*").eq("active", true).order("id"),
      sb.from("pilot_achievements").select("*").eq("pilot_id", uid),
      sb.from("announcements").select("*").eq("active", true).lte("published_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(5),
      sb.from("pilot_staff").select("*").eq("owner_pilot_id", uid).order("hired_at", { ascending: false }),
      sb.from("staff_assignments").select("*").eq("owner_pilot_id", uid).order("dispatched_at", { ascending: false }).limit(30),
      sb
        .from("flight_reports")
        .select("*")
        .eq("pilot_id", uid)
        .order("completed_at", { ascending: false })
        .limit(30),
    ]);

  let base = await run();

  // Read the active contract through an ownership-checked RPC as the authoritative
  // browser path. This avoids losing a real contract when the direct table read
  // is affected by the table's RLS visibility.
  const activeRpc = await sb.rpc("get_active_mission_for_current_pilot");
  if (!activeRpc.error && activeRpc.data) {
    base[4] = { data: activeRpc.data, error: null };
  } else if (activeRpc.error) {
    state.loadErrors.push(`active mission RPC: ${activeRpc.error.message || "request failed"}`);
  }

  // A stale browser access token can make an otherwise healthy career look empty.
  // Refresh once before treating authenticated reads as failed.
  if (base.some((x) => x.error?.code === "PGRST301" || x.status === 401)) {
    const refreshed = await sb.auth.refreshSession();
    if (!refreshed.error && refreshed.data.session) {
      state.session = refreshed.data.session;
      base = await run();
    }
  }

  const names = [
    "pilot profile",
    "pilot qualifications",
    "pilot aircraft",
    "missions",
    "active mission",
    "achievements",
    "pilot achievements",
    "announcements",
    "staff",
    "staff assignments",
    "flight history",
  ];

  const values = base.map((x, i) => {
    if (x.error) {
      state.loadErrors.push(`${names[i]}: ${x.error.message || "request failed"}`);
      return i === 0 ? null : [];
    }
    return x.data;
  });

  const [
    profile,
    pilotQualifications,
    pilotAircraft,
    missionsData,
    activeData,
    achievementsData,
    pilotAchievementsData,
    announcementsData,
    staffData,
    staffAssignmentsData,
    historyData,
  ] = values;

  const assignedMissionIds = [...new Set((staffAssignmentsData || []).map((a) => a.mission_id).filter(Boolean))];
  const assignedMissionResult = assignedMissionIds.length
    ? await sb.from("missions").select("*").in("id", assignedMissionIds)
    : { data: [], error: null };
  if (assignedMissionResult.error) {
    state.loadErrors.push(`staff mission records: ${assignedMissionResult.error.message || "request failed"}`);
  }
  // Load the permanent/core contract catalog separately as a safety net.
  // This prevents a partial Mission Board response from hiding valid career contracts.
  const coreMissionResult = await sb
    .from("missions")
    .select("*")
    .eq("active", true)
    .eq("generated", false);
  if (coreMissionResult.error) {
    state.loadErrors.push(`core mission catalog: ${coreMissionResult.error.message || "request failed"}`);
  }
  const CORE_MISSION_IDS = [
    "OPS-001","OPS-002","OPS-003","OPS-005","OPS-006","OPS-007","OPS-008",
    "OPS-009","OPS-010","OPS-011","OPS-012","OPS-013","OPS-014","OPS-015",
    "OPS-016","OPS-017"
  ];
  const coreByIdResult = await sb
    .from("missions")
    .select("*")
    .in("id", CORE_MISSION_IDS)
    .eq("active", true);
  if (coreByIdResult.error) {
    state.loadErrors.push(`core mission recovery: ${coreByIdResult.error.message || "request failed"}`);
  }
  const missionSource = [
    ...(missionsData || []),
    ...(coreMissionResult.data || []),
    ...(coreByIdResult.data || []),
    ...(assignedMissionResult.data || []),
  ];
  const missionRows = missionSource.filter(
    (m, index, rows) => rows.findIndex((x) => x.id === m.id) === index,
  );

  const qualificationIds = [
    ...new Set([
      ...pilotQualifications.map((x) => x.qualification_id).filter(Boolean),
      ...missionRows
        .map((x) => x.required_qualification_id)
        .filter(Boolean),
    ]),
  ];

  const aircraftIds = [
    ...new Set([
      ...pilotAircraft.map((x) => x.aircraft_id).filter(Boolean),
      ...missionRows.map((x) => x.required_aircraft_id).filter(Boolean),
      ...historyData.map((x) => x.aircraft_id).filter(Boolean),
    ]),
  ];

  const lookups = await Promise.all([
    qualificationIds.length
      ? sb.from("qualifications").select("*").in("id", qualificationIds)
      : Promise.resolve({ data: [], error: null }),
    sb.from("aircraft_master").select("*").eq("active", true).order("required_level", { ascending: true }),
  ]);

  const qualificationLookup = lookups[0];
  const aircraftLookup = lookups[1];

  if (qualificationLookup.error) {
    state.loadErrors.push(
      `qualification catalog: ${qualificationLookup.error.message || "request failed"}`,
    );
  }
  if (aircraftLookup.error) {
    state.loadErrors.push(
      `aircraft catalog: ${aircraftLookup.error.message || "request failed"}`,
    );
  }

  const qualificationMap = new Map(
    (qualificationLookup.data || []).map((x) => [x.id, x]),
  );
  const aircraftCatalog = aircraftLookup.data || [];
  const aircraftMap = new Map(aircraftCatalog.map((x) => [x.id, x]));

  const qualifications = pilotQualifications.map((x) => ({
    ...x,
    qualifications: qualificationMap.get(x.qualification_id) || null,
  }));

  const aircraft = pilotAircraft.map((x) => ({
    ...x,
    aircraft_master: aircraftMap.get(x.aircraft_id) || null,
  }));

  const missions = missionRows.map((x) => ({
    ...x,
    // Normalize database field names to the UI's career model.
    reward_credits: x.reward_credits ?? x.base_reward ?? 0,
    reward_xp: x.reward_xp ?? x.base_xp ?? 0,
    objective: x.objective ?? x.special_objective ?? null,
    route: x.route ?? `${x.origin_icao || "—"} → ${x.destination_icao || "—"}`,
    aircraft_master: aircraftMap.get(x.required_aircraft_id) || null,
    compatible_aircraft: (x.compatible_aircraft_ids || []).map((id) => aircraftMap.get(id)).filter(Boolean),
    required_qualification:
      qualificationMap.get(x.required_qualification_id) || null,
    hazards_text: missionListText(
      x.hazards,
      x.mission_type === "SCENIC" || x.template_id?.includes("SCENIC")
        ? "Terrain, traffic, weather and destination conditions."
        : "Terrain, weather, traffic, runway and destination conditions.",
    ),
    references_text: missionListText(
      x.reference_items,
      "Review current MSFS airport information, navigation data and applicable procedures.",
    ),
    weather_text: missionWeather(x),
    water_operation: Boolean(x.water_operation),
    bush_operation: isBushMission(x),
  }));

  // Resolve the active contract deterministically. The primary query uses maybeSingle(),
  // but a malformed/empty response must never make a real active mission disappear.
  let active =
    activeData && !Array.isArray(activeData) ? activeData : null;

  if (!active) {
    const activeFallback = await sb
      .from("active_missions")
      .select("*")
      .eq("pilot_id", uid)
      .order("accepted_at", { ascending: false })
      .limit(1);
    if (activeFallback.error) {
      state.loadErrors.push(`active mission fallback: ${activeFallback.error.message || "request failed"}`);
    } else {
      active = activeFallback.data?.[0] || null;
    }
  }

  const activeMission = active
    ? missions.find((x) => String(x.id) === String(active.mission_id)) || null
    : null;

  if (active) {
    active.missions = activeMission;
    active.aircraft_master =
      aircraftMap.get(active.aircraft_id) ||
      activeMission?.aircraft_master ||
      (activeMission ? aircraftMap.get(activeMission.required_aircraft_id) : null) ||
      null;
  }

  const history = historyData.map((x) => ({
    ...x,
    aircraft_master: aircraftMap.get(x.aircraft_id) || null,
    missions: missions.find((m) => m.id === x.mission_id) || null,
  }));

  if (loadToken !== loadSequence) return;

  state.profile = profile;
  state.qualifications = qualifications;
  state.aircraft = aircraft;
  state.aircraftCatalog = aircraftCatalog;
  state.missions = missions;
  state.active = active;
  state.achievements = achievementsData || [];
  state.announcements = announcementsData || [];
  state.staff = staffData || [];
  const staffIds = state.staff.map((x) => x.id).filter(Boolean);
  const staffQualificationsResult = staffIds.length
    ? await sb.from("pilot_staff_qualifications").select("staff_id,qualification_id,earned_at").in("staff_id", staffIds).order("earned_at", { ascending: true })
    : { data: [], error: null };
  if (staffQualificationsResult.error) {
    state.loadErrors.push(`staff qualifications: ${staffQualificationsResult.error.message || "request failed"}`);
  }
  state.staffQualifications = staffQualificationsResult.data || [];
  const trainingStaffIds = state.staff.map((x) => x.id).filter(Boolean);
  const trainingResult = trainingStaffIds.length
    ? await sb.from("staff_training").select("*,staff_training_programs(*)").eq("owner_pilot_id", uid).in("staff_id", trainingStaffIds).order("started_at", { ascending: false })
    : { data: [], error: null };
  if (trainingResult.error) {
    state.loadErrors.push(`staff training: ${trainingResult.error.message || "request failed"}`);
  }
  state.staffTraining = trainingResult.data || [];
  const trainingProgramsResult = await sb.from("staff_training_programs").select("*").eq("active", true).order("required_level", { ascending: true });
  if (trainingProgramsResult.error) {
    state.loadErrors.push(`training programs: ${trainingProgramsResult.error.message || "request failed"}`);
  }
  state.staffTrainingPrograms = (trainingProgramsResult.data || []).map((p) => ({ ...p, cost_credits: Number(p.cost ?? p.cost_credits ?? 0) }));
  const staffBoardResult = await sb.rpc("staff_assignment_board");
  if (staffBoardResult.error) {
    state.loadErrors.push(`staff assignment board: ${staffBoardResult.error.message || "request failed"}`);
  }
  state.staffAssignments = (staffBoardResult.data || staffAssignmentsData || []).map((a) => ({
    ...a,
    id: a.id || a.assignment_id,
    mission: missions.find((m) => m.id === a.mission_id) || {
      id: a.mission_id,
      title: a.mission_title,
      origin_icao: a.origin_icao,
      destination_icao: a.destination_icao,
      base_reward: a.base_reward,
      base_xp: a.base_xp,
      reward_credits: a.base_reward,
      reward_xp: a.base_xp,
    },
    aircraft_master: aircraftMap.get(a.aircraft_id) || null,
  }));
  const staffOpsResult = await sb.rpc("staff_operations_status");
  if (staffOpsResult.error) {
    state.loadErrors.push(`staff operations: ${staffOpsResult.error.message || "request failed"}`);
    state.staffOpsStatus = null;
  } else {
    state.staffOpsStatus = staffOpsResult.data || null;
  }
  const staffStatusResult = await sb.rpc("staff_hiring_status");
  if (staffStatusResult.error) {
    state.staffStatus = null;
    state.loadErrors.push(`staff eligibility: ${staffStatusResult.error.message || "request failed"}`);
  } else {
    state.staffStatus = staffStatusResult.data || null;
    if (state.staffStatus?.eligible) {
      const candidatesResult = await sb.rpc("ensure_staff_candidates");
      if (candidatesResult.error) {
        state.loadErrors.push(`staff candidates: ${candidatesResult.error.message || "request failed"}`);
        state.staffCandidates = [];
      } else {
        state.staffCandidates = candidatesResult.data || [];
      }
    } else {
      state.staffCandidates = [];
    }
  }
  state.pilotAchievements = pilotAchievementsData || [];
  state.history = history;
  state.loading = false;

  if (state.loadErrors.length) {
    console.warn("FlightOps career load issues:", state.loadErrors);
  }

  if (!state.profile) {
    toast(
      "Your pilot profile could not be loaded. Sign out and back in if this persists.",
      true,
    );
  }
}
function staffQualificationCodes(staffId) {
  const rows = (state.staffQualifications || []).filter((x) => x.staff_id === staffId);
  const codes = rows.map((x) => x.qualification_id).filter(Boolean);
  const staffMember = (state.staff || []).find((x) => x.id === staffId);
  if (staffMember?.qualification_id) codes.push(staffMember.qualification_id);
  return [...new Set(codes)];
}
function staffQualificationText(staffId) {
  const codes = staffQualificationCodes(staffId);
  return codes.length ? codes.join(" • ") : "No qualification recorded";
}
function qIds() {
  return new Set(
    state.qualifications.map(
      (q) =>
        q.qualification_id || q.qualifications?.id || q.qualifications?.code,
    ),
  );
}
function missionAircraftChoices(m) {
  const choices = Array.isArray(m?.compatible_aircraft) ? m.compatible_aircraft : [];
  const filtered = m?.water_operation
    ? choices.filter((a) => a?.float_capable || a?.amphibious_capable)
    : choices;
  return filtered.length ? filtered : (m?.water_operation ? [] : (m?.aircraft_master ? [m.aircraft_master] : []));
}
function aircraftUsable(a) {
  if (!a?.id) return false;
  const requiredLevel = Number(a.required_level || a.level_required || 1);
  const requiredQualification = a.required_qualification_id;
  return (
    level() >= requiredLevel &&
    (!requiredQualification || qIds().has(requiredQualification))
  );
}
function ownedMissionAircraft(m) {
  return missionAircraftChoices(m).filter((a) =>
    aircraftUsable(a) &&
    state.aircraft.some((owned) => (owned.aircraft_id || owned.aircraft_master?.id) === a.id)
  );
}
function owns(m) {
  return ownedMissionAircraft(m).length > 0;
}
function missionOriginAvailable(m) {
  const origin = String(m?.origin_icao || m?.departure_icao || "").trim().toUpperCase();
  if (!origin) return false;
  return ownedMissionAircraft(m).some((candidate) => {
    const owned = state.aircraft.find(
      (x) => (x.aircraft_id || x.aircraft_master?.id) === candidate.id,
    );
    const base = String(owned?.base_icao || state.profile?.home_base_icao || "").trim().toUpperCase();
    return base === origin;
  });
}
function eligible(m) {
  const req =
    m.required_qualification_id ||
    m.qualification_id ||
    m.required_qualification?.id;
  return (
    owns(m) &&
    (!req || qIds().has(req)) &&
    level() >= Number(m.required_level || m.minimum_level || 1)
  );
}
function missionId(m) {
  return m.id || m.mission_id;
}
function completedMissionIds() {
  return new Set(
    state.history
      .map((report) => report.mission_id || report.missions?.id)
      .filter(Boolean),
  );
}
function missions() {
  const completed = completedMissionIds();
  // Only an actively dispatched employee flight should reserve a mission on the owner's board.
  // Completed/cancelled assignment history must not hide a contract from the owner.
  const assigned = new Set(
    (state.staffAssignments || [])
      .filter((a) => String(a.status || "").toLowerCase() === "dispatched")
      .map((a) => a.mission_id)
      .filter(Boolean),
  );
  return state.missions.filter(
    (mission) =>
      !assigned.has(missionId(mission)) &&
      eligible(mission) &&
      missionOriginAvailable(mission) &&
      (mission.is_repeatable === true || !completed.has(missionId(mission))),
  );
}
async function loadActiveMissionDirect() {
  const activeLoadToken = ++loadSequence;
  if (!sb) return false;
  const userResult = await sb.auth.getUser();
  if (userResult.error || !userResult.data?.user) {
    state.active = null;
    state.loadErrors = [...(state.loadErrors || []), "Active mission: Supabase session is not authenticated."];
    return false;
  }
  const uid = userResult.data.user.id;
  state.session = { ...(state.session || {}), user: userResult.data.user };

  let active = null;
  const direct = await sb
    .from("active_missions")
    .select("*")
    .eq("pilot_id", uid)
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!direct.error) active = direct.data || null;

  if (!active) {
    const rpc = await sb.rpc("get_active_mission_for_current_pilot");
    if (!rpc.error && rpc.data && typeof rpc.data === "object") active = rpc.data;
  }

  if (!active) {
    state.active = null;
    state.loadErrors = [...(state.loadErrors || []), "Active mission: no active contract was returned for the signed-in pilot."];
    return false;
  }

  let mission = state.missions.find((m) => String(m.id) === String(active.mission_id)) || null;
  if (!mission) {
    const missionResult = await sb.from("missions").select("*").eq("id", active.mission_id).maybeSingle();
    if (!missionResult.error) mission = missionResult.data || null;
  }

  active.missions = mission;
  active.aircraft_master =
    state.aircraft.find((a) => String(a.aircraft_id) === String(active.aircraft_id))?.aircraft_master ||
    mission?.aircraft_master ||
    null;
  if (activeLoadToken !== loadSequence) return false;
  state.active = active;
  return true;
}

function activeMission() {
  if (!state.active) return null;
  return (
    state.active.missions ||
    state.missions.find((m) => String(missionId(m)) === String(state.active.mission_id)) ||
    state.active
  );
}
function activeMissionDetails(mission) {
  return `<div class="details"><div class="detail"><div class="label">Aircraft</div><strong>${esc(aircraftName(mission.aircraft_master || mission))}</strong></div><div class="detail"><div class="label">Route</div><strong>${esc(route(mission))}</strong></div><div class="detail"><div class="label">Reward</div><strong>${num(mission.reward_credits || mission.credits)} Cr</strong></div><div class="detail"><div class="label">Experience</div><strong>+${num(mission.reward_xp || mission.xp)} XP</strong></div></div><div class="callout"><b>Objective:</b> ${esc(mission.objective || mission.mission_objective || "Complete the assigned route safely.")}</div>`;
}
function loadNotice() {
  if (!state.loadErrors?.length) return "";
  return `<div class="notice"><b>Career data needs attention.</b><br>${esc(state.loadErrors.join(" • "))}</div>`;
}
function activeView() {
  const m = activeMission();
  if (!m) {
    return `${loadNotice()}<section class="hero"><div><div class="eyebrow">Active Flight</div><h1>No active mission.</h1><p>Once you accept a mission, it will appear here. This page is reserved for the contract you are currently flying.</p></div><div><div class="label">Status</div><div class="money">STANDBY</div></div></section>
    <div class="grid"><div class="card s8"><div class="eyebrow">Active Mission</div><h2>Nothing dispatched</h2><p class="copy">You do not have a mission in progress right now.</p><button class="action primary" data-page="missions">Go to Mission Board</button></div><div class="card s4"><div class="eyebrow">Mission Flow</div><h2>Choose → Accept → Fly</h2><p class="copy">Pick a contract from the Mission Board. After you accept it, the full dispatch information will appear here.</p></div></div>`;
  }
  const a = m.aircraft_master || m;
  const legs = missionLegs(m);
  const totalDistance = Number(m.distance_nm || legs.reduce((sum, leg) => sum + Number(leg.distance_nm || 0), 0) || 0);
  const cruise = Number(a.cruise_kts || 0);
  const blockMinutes = cruise > 0 && totalDistance > 0 ? Math.round((totalDistance / cruise) * 60 * 1.12) : null;
  const blockText = blockMinutes ? Math.floor(blockMinutes / 60) + "h " + (blockMinutes % 60) + "m est. block" : "Pilot to calculate";
  const planning = m.planning_level || (m.required_aircraft_id === "c172" ? "Suggested planning" : "Pilot planning");
  const legState = legDisplay(m, state.active?.current_leg);
  const currentLeg = legState.leg;
  return `<section class="hero"><div><div class="eyebrow">Active Mission • Dispatch</div><h1>${esc(missionTitle(m))}</h1><p>${esc(m.mission_code || m.id)} • ${esc(route(m))}</p></div><div><div class="label">Contract Value</div><div class="money">${num(m.reward_credits || m.credits)} Cr</div></div></section>
  <div class="active-command-strip">
    <div class="active-command-main"><span class="ops-dot"></span><div><span class="label">Operational Status</span><strong>DISPATCHED • READY FOR FLIGHT</strong><span class="small">Assignment accepted. Complete your preflight in MSFS before departure.</span></div></div>
    <div><span class="label">Current Leg</span><strong>${legState.current} / ${legState.count}</strong><span class="small">${esc(currentLeg.origin_icao)} → ${esc(currentLeg.destination_icao)}</span></div>
    <div><span class="label">Weather</span><strong>LIVE WEATHER</strong><span class="small">Required for this operation</span></div>
  </div>
  <div class="brief-route-banner"><div><div class="eyebrow">ROUTE</div><strong>${esc(legs[0]?.origin_icao || m.origin_icao || "—")} → ${esc(legs[legs.length-1]?.destination_icao || m.destination_icao || "—")}</strong></div><div class="brief-route-stats"><span>${num(totalDistance)} NM</span><span>${esc(blockText)}</span><span>${esc(planning)}</span></div></div><div class="grid">
    <div class="card s12 dispatch-accepted-card"><div class="dispatch-accepted-head"><div><div class="eyebrow">DISPATCH ACCEPTED • OPERATIONAL ASSIGNMENT</div><h2>Assignment Confirmed</h2><p class="copy">This mission is now assigned to you. The contract is locked, the selected aircraft is reserved for the operation, and the flight may proceed when you are ready.</p></div><div class="dispatch-accepted-badge"><span class="ops-dot"></span> ACTIVE</div></div><div class="dispatch-accepted-grid"><div><span class="label">Aircraft</span><strong>${esc(aircraftName(a))}</strong></div><div><span class="label">Route</span><strong>${esc(route(m))}</strong></div><div><span class="label">Contract</span><strong>${num(m.reward_credits || m.credits)} Cr</strong></div><div><span class="label">Next Step</span><strong>Preflight &amp; Dispatch</strong></div></div></div>
    <div class="card s8 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Mission Card</div><h2>Ready for departure</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> DISPATCHED</div></div><div class="callout"><div class="eyebrow">${missionStoryLead(m)}</div><div class="small" style="margin-top:4px">MISSION STORY • ${missionStoryTitle(m)}</div><p style="margin:6px 0 0">${missionStory(m)}</p><p class="small" style="margin:10px 0 0">${missionStoryFooter(m)}</p></div><div class="details">
      <div class="detail"><div class="label">Aircraft</div><strong>${esc(aircraftName(a))}</strong></div>
      <div class="detail"><div class="label">Route</div><strong>${esc(route(m))}</strong></div>
      <div class="detail"><div class="label">Distance</div><strong>${esc(m.distance_nm || m.distance || "—")} NM</strong></div>
      <div class="detail"><div class="label">Base XP</div><strong>+${num(m.reward_xp || m.xp)} XP</strong></div>
    </div>
    <div class="eyebrow">Flight Operations</div><div class="callout"><b>Objective:</b> ${esc(m.objective || m.mission_objective || "Complete the assigned route safely.")}<br><b>Planning:</b> ${esc(m.planning_level || "Pilot responsibility")}<br><b>Leg:</b> ${legDisplay(m, state.active?.current_leg).current} of ${legDisplay(m, state.active?.current_leg).count}<br><b>Current leg:</b> ${esc(legDisplay(m, state.active?.current_leg).leg.origin_icao)} → ${esc(legDisplay(m, state.active?.current_leg).leg.destination_icao)} (${num(legDisplay(m, state.active?.current_leg).leg.distance_nm)} NM)<br><b>Leg purpose:</b> ${esc(legPurpose(legDisplay(m, state.active?.current_leg).leg, legDisplay(m, state.active?.current_leg).current, legDisplay(m, state.active?.current_leg).count))}<br><b>Stop plan:</b> ${esc(legDisplay(m, state.active?.current_leg).leg.stop_notes || "Complete the assigned stop objective safely.")}<br><b>Leg objective:</b> ${esc(legDisplay(m, state.active?.current_leg).leg.leg_objective || "Complete the assigned stop objective safely.")}<br><b>Status:</b> ACTIVE — this contract is locked to your pilot.</div>
    <p class="copy">Launch MSFS 2024 Free Flight and fly the mission using <b>Live Weather</b>. FlightOps does not control the simulator or collect automatic telemetry. When you land, return here and complete the debrief.</p>
    <button class="action primary" data-action="report">${legDisplay(m, state.active?.current_leg).count > 1 ? `Complete Leg ${legDisplay(m, state.active?.current_leg).current} / Debrief` : "Complete Mission / Debrief"}</button>
    </div>
    ${bushMissionNotice(m)}
    ${missionPayloadCard(m)}
    <div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">03 • Before Departure</div><h2>Release Checklist</h2></div><div class="ops-icon">✓</div></div><p class="copy">✓ Aircraft selected<br>✓ Route reviewed<br>✓ <b>MSFS Live Weather enabled</b><br>✓ Fuel and alternate considered<br>✓ Mission objective understood<br>✓ Fly within aircraft limitations</p><div class="eyebrow">Reward</div><h2>${num(m.reward_credits || m.credits)} Cr</h2><p class="small">Base XP +${num(m.reward_xp || m.xp)} XP. Final rewards are calculated after the debrief.</p></div>
    <div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">04 • Mission Continuity</div><h2>Return to FlightOps after Landing</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> ACTIVE</div></div><p class="copy">This mission remains active if you close Safari or leave FlightOps. You can return later and continue the career.</p></div>
  </div>`;
}
function home() {
  const p = state.profile;
  const announcements = state.announcements || [];
  const latestAnnouncement = announcements[0];
  const announcementsCard = latestAnnouncement
    ? '<div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">📢 FlightOps Updates</div><h2>' + esc(latestAnnouncement.title) + '</h2></div><div class="ops-route-chip">LATEST</div></div><p class="copy">' + esc(latestAnnouncement.body) + '</p><div class="small">' + esc(new Date(latestAnnouncement.published_at).toLocaleDateString()) + ' • Updates are delivered automatically to live pilots.</div><button class="primary" data-page="updates">View all updates</button></div>'
    : '';

  const active = activeMission();
  return `${loadNotice()}<section class="hero"><div><div class="eyebrow">Flight Operations</div><div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div><h1>Welcome, ${esc(p?.pilot_name || p?.name || "Pilot")}.</h1><p>${esc(p?.callsign || "Independent operator")} • Your FlightOps profile is synced securely.</p></div>${epaulet()}</div></div><div><div class="label">Available Funds</div><div class="money">${num(p?.credits)} Cr</div></div></section><div class="card s12 ops-card flightops-intro"><div class="ops-section-head"><div><div class="eyebrow">ABOUT FLIGHTOPS</div><h2>Your Flight. Your Aircraft. Your Operation.</h2></div><div class="ops-route-chip">FREE FLIGHT</div></div><p class="copy"><b>FlightOps</b> is a standalone flight-operations management system designed to work alongside Microsoft Flight Simulator. It is built for <b>any MSFS version, on any supported platform</b>, and is designed specifically for <b>Free Flight operations</b>.</p><p class="small">FlightOps is not MSFS Career Mode and does not depend on Career Mode. The simulator provides the aircraft, world and flying. <b>FlightOps provides the operation.</b></p><div class="details"><div class="detail"><div class="label">01 • Plan</div><strong>Choose the operation and mission</strong><div class="small">Select or create the flight you want to conduct.</div></div><div class="detail"><div class="label">02 • Assign</div><strong>Aircraft + Crew</strong><div class="small">Match the right aircraft and pilot to the operation.</div></div><div class="detail"><div class="label">03 • Dispatch</div><strong>Prepare the flight</strong><div class="small">Review the route, requirements and operational conditions.</div></div><div class="detail"><div class="label">04 • Fly</div><strong>Use MSFS Free Flight</strong><div class="small">Fly the mission in the simulator on your platform of choice.</div></div><div class="detail"><div class="label">05 • Debrief</div><strong>Record the result</strong><div class="small">Return to FlightOps, complete the debrief and update the operation.</div></div><div class="detail"><div class="label">06 • Continue</div><strong>Build the operation</strong><div class="small">Pilot experience, aircraft utilization, history and future missions continue to evolve.</div></div></div><div class="callout"><b>FlightOps philosophy:</b> The simulator gives you the aircraft and the world. You provide the flying. FlightOps gives the flight a purpose.</div></div><div class="ops-visual"><div class="ops-horizon"></div><div class="ops-route"></div><div class="ops-plane">✈</div><div class="ops-visual-copy"><div class="eyebrow">FlightOps Command Center</div><h2>Fly the mission. Run the operation.</h2><p class="small">Your aircraft, crew, missions, qualifications and performance — all in one cockpit.</p></div></div><div class="grid">${announcementsCard}<div class="card s4 ops-card"><div class="ops-section-head"><div><div class="label">Pilot Level</div></div><div class="ops-icon">✦</div></div><div class="stat">Level ${level()}</div><div class="small">${num(p?.xp)} XP • ${num(p?.reputation)} reputation</div></div><div class="card s4 ops-card"><div class="ops-section-head"><div><div class="label">Completed Flights</div></div><div class="ops-icon">✈</div></div><div class="stat">${num(p?.total_flights || state.history.length)}</div><div class="small">${num(p?.completed_missions)} missions completed</div><div class="small">${Math.floor(Number(p?.total_flight_minutes || 0) / 60)}h ${Number(p?.total_flight_minutes || 0) % 60}m • ${num(p?.total_nm || 0)} NM</div></div><div class="card s4 ops-card"><div class="ops-section-head"><div><div class="label">Current Aircraft</div></div><div class="ops-icon">◈</div></div><div class="stat">${esc(aircraftName(state.aircraft[0] || {}))}</div><div class="small">${state.qualifications.map((x) => esc(x.qualifications?.code || x.qualifications?.name)).join(" • ") || "Loading starter PPL…"}</div></div><div class="card s12">${active ? `<div class="eyebrow">Active Mission</div><h2>${esc(missionTitle(active))}</h2><p class="route">${esc(route(active))} • ${esc(aircraftName(active.aircraft_master || active))}</p>${activeMissionDetails(active)}<button class="action primary" data-page="active">View Active Mission</button>` : `<div class="eyebrow">Next Operation</div><h2>${missions().length ? "Available contracts" : "No eligible missions"}</h2><p class="small">${missions().length ? "Choose a contract from the mission board." : "Missions appear only when you own the required aircraft, qualification, and level."}</p>${missions().length ? "<button class=\"action primary\" data-page=\"missions\">View Mission Board</button>" : "<button class=\"action\" data-page=\"career\">View Career Progress</button>"}`}</div><div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Recent Activity</div><h2>Latest Flights</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> FLIGHT LOG</div>${state.history.length ? state.history.slice(0,3).map(h=>`<div class="historyrow"><div><b>${esc(missionTitle(h.missions || h))}</b><div class="small">${esc(new Date(h.completed_at || h.created_at).toLocaleString())} • ${esc(aircraftName(h.aircraft_master || h))} • ${esc(route(h.missions || h))}</div></div><div style="text-align:right"><b class="owned">+${num(h.earned_credits || h.credits_earned || h.reward_credits)} Cr</b><div class="small">+${num(h.earned_xp || h.xp_earned || h.reward_xp)} XP${h.performance_score != null ? ` • Score ${num(h.performance_score)}/100` : ""}</div></div></div>`).join("") : '<p class="small">Your first recorded flight will appear here.</p>'}<button class="action" data-page="pilot">Open Pilot Logbook</button></div></div>`;
}
function missionStoryTitle(m) {
  const type = String(m?.mission_type || m?.type || "").toUpperCase();
  const title = String(m?.title || "").toLowerCase();
  if (type.includes("MEDEVAC") || title.includes("medevac")) return "Patient Transfer";
  if (type.includes("MEDICAL") || title.includes("medical")) return "Medical Logistics";
  if (title.includes("rescue") || title.includes("evacuation")) return "Emergency Response";
  if (title.includes("survey")) return "Field Survey Operation";
  if (title.includes("mail")) return "Remote Mail Service";
  if (title.includes("fuel")) return "Remote Fuel Delivery";
  if (isBushMission(m)) return "Remote Community Support";
  if (type.includes("CHARTER") || type.includes("EXECUTIVE") || type.includes("VIP") || title.includes("charter")) return "Client Charter";
  if (type.includes("SCENIC") || title.includes("scenic")) return "Scenic Charter";
  if (type.includes("CARGO") || title.includes("cargo") || title.includes("supply")) return "Scheduled Air Cargo";
  if (m?.water_operation) return "Water Access Operation";
  return "Scheduled Flight Assignment";
}
function missionRecommendationReason(m) {
  const type = String(m?.mission_type || m?.type || "").toUpperCase();
  const title = String(m?.title || "").toLowerCase();
  if (m?.water_operation) return "Recommended for specialty water-operation experience.";
  if (isBushMission(m)) return "Recommended for bush-operation experience and remote dispatch work.";
  if (type.includes("MEDEVAC") || type.includes("MEDICAL")) return "Recommended for high-priority medical operations.";
  if (title.includes("rescue") || title.includes("emergency")) return "Recommended for emergency-response experience.";
  if (title.includes("survey")) return "Recommended for field-operation experience.";
  if (type.includes("CHARTER") || type.includes("VIP") || type.includes("EXECUTIVE")) return "Recommended for professional passenger-service experience.";
  if (Number(m?.reward_xp || m?.xp_reward || m?.xp || 0) > 0) return "Recommended for strong career XP and mission value.";
  return "Recommended as a strong next-flight fit.";
}
function missionRecommendationLabel(m) {
  const score = missionRecommendationScore(m);
  if (score >= 200000) return "High-value assignment";
  if (m?.water_operation) return "Specialty water operation";
  if (isBushMission(m)) return "Specialty bush operation";
  return "Strong next-flight fit";
}
function missionRecommendationScore(m) {
  const credits = Number(m?.reward_credits || m?.reward || m?.credits || 0);
  const xp = Number(m?.reward_xp || m?.xp_reward || m?.xp || 0);
  const distance = Number(m?.distance_nm || m?.distance || 0);
  const type = String(m?.mission_type || m?.type || "").toUpperCase();
  const qualification = String(m?.required_qualification_id || m?.qualification_id || "").toUpperCase();
  const title = String(m?.title || "").toLowerCase();
  const currentLevel = Number(state.profile?.level || 1);
  const currentXp = Number(state.profile?.xp || 0);
  let score = credits + xp * 20 - distance * 10;

  // Favor operations that build toward the pilot's current career path.
  if (m?.water_operation) score += 25000;
  if (isBushMission(m)) score += 15000;
  if (qualification && qualification !== "PPL") score += 5000;
  if (type.includes("MEDEVAC") || type.includes("MEDICAL")) score += 7000;
  if (title.includes("survey") || title.includes("rescue") || title.includes("emergency")) score += 4000;

  const nextAircraft = state.aircraftCatalog
    .filter((a) => Number(a?.level_required ?? a?.min_level ?? a?.unlock_level ?? 99) > currentLevel)
    .sort((a,b) => Number(a?.level_required ?? a?.min_level ?? a?.unlock_level ?? 99) - Number(b?.level_required ?? b?.min_level ?? b?.unlock_level ?? 99))[0];

  if (nextAircraft) {
    const targetLevel = Number(nextAircraft?.level_required ?? nextAircraft?.min_level ?? nextAircraft?.unlock_level ?? 99);
    const remainingXp = Math.max(0, targetLevel * 1000 - currentXp);
    if (remainingXp > 0 && xp >= Math.min(remainingXp, 500)) score += 3000;
  }

  return score;
}
function missionList() {
  const active = activeMission();
  const activeId = active ? missionId(active) : null;
  const allMissions = missions().filter((m) => missionId(m) !== activeId);
  const filter = String(state.missionFilter || "ALL").toUpperCase();
  const ms = allMissions.filter((m) => {
    if (filter === "ALL") return true;
    if (filter === "WATER") return !!m.water_operation;
    if (filter === "BUSH") return isBushMission(m) || !!m.bush_operation;
    return String(m.mission_type || m.type || "").toUpperCase() === filter;
  }).sort((a, b) => missionRecommendationScore(b) - missionRecommendationScore(a));
  const recommended = filter === "ALL" ? ms[0] : null;
  const recommendedId = recommended ? missionId(recommended) : null;
  const aircraftChoices = recommended ? ownedMissionAircraft(recommended) : [];
  const readyAircraft = aircraftChoices.filter((a) => aircraftUsable(a));
  const recAircraft = readyAircraft[0] || aircraftChoices[0] || null;
  const recOrigin = String(recommended?.origin_icao || recommended?.departure_icao || "").toUpperCase();
  const recBase = String(recAircraft ? (state.aircraft.find((x) => (x.aircraft_id || x.aircraft_master?.id) === recAircraft.id)?.base_icao || "") : "").toUpperCase();
  const recReady = !!recommended && readyAircraft.length > 0 && (!recOrigin || recBase === recOrigin);
  const recommendationStatus = recommended
    ? recReady ? "READY FOR BRIEF" : "REVIEW AIRCRAFT / BASE"
    : "NO RECOMMENDATION";
  return `${loadNotice()}<section class="hero"><div><div class="eyebrow">Mission Board • ${esc(state.profile?.home_base_icao || "—")}</div><h1>Continue Operations.</h1><p>Your Pilot Record is filed. FlightOps has now handed you back to the next available operation.</p></div><div><div class="label">Available Contracts</div><div class="money">${ms.length}</div></div></section>
  ${active ? `<div class="notice"><b>Active mission:</b> ${esc(missionTitle(active))} • ${esc(route(active))}. Complete it before accepting another contract. <button class="action primary" data-action="report">Complete Mission</button></div>` : ""}
  ${recommended ? `<div class="next-operation-card">
    <div class="next-operation-head">
      <div>
        <div class="eyebrow">NEXT OPERATION • FLIGHTOPS RECOMMENDATION</div>
        <h2>${esc(missionTitle(recommended))}</h2>
        <p>${esc(missionRecommendationReason(recommended))}</p>
      </div>
      <div class="next-operation-status"><span class="ops-dot"></span>${recommendationStatus}</div>
    </div>
    <div class="next-operation-grid">
      <div><span class="label">Route</span><strong>${esc(route(recommended))}</strong></div>
      <div><span class="label">Aircraft</span><strong>${esc(recAircraft ? aircraftName(recAircraft) : "Review required")}</strong></div>
      <div><span class="label">Contract</span><strong>${num(recommended.reward_credits || recommended.credits)} Cr</strong></div>
      <div><span class="label">Experience</span><strong>+${num(recommended.reward_xp || recommended.xp)} XP</strong></div>
      <div><span class="label">Difficulty</span><strong>${esc(recommended.difficulty || "STANDARD")}</strong></div>
      <div><span class="label">Priority</span><strong>${esc(recommended.priority || "STANDARD")}</strong></div>
    </div>
    <div class="next-operation-reason"><b>Why this operation:</b> ${esc(missionRecommendationLabel(recommended))}. ${recReady ? "A suitable aircraft is currently based at the mission origin." : "Review aircraft availability and base compatibility before dispatch."}</div>
    <div class="result-actions"><button class="action primary" data-brief="${esc(recommendedId)}" ${active ? "disabled" : ""}>Review Mission Brief</button><button class="action" data-mission-filter="ALL">View All Operations</button></div>
  </div>` : `<div class="next-operation-card next-operation-empty"><div class="eyebrow">NEXT OPERATION</div><h2>No recommended operation is ready.</h2><p>Use the filters below to review other eligible contracts, or complete your active assignment first.</p></div>`}
  <div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Mission Filters</div><h2>Dispatch Categories</h2></div><div class="ops-route-chip">FILTER: ${esc(filter)}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="action ${filter === "ALL" ? "primary" : ""}" data-mission-filter="ALL">All</button><button class="action ${filter === "CARGO" ? "primary" : ""}" data-mission-filter="CARGO">Cargo</button><button class="action ${filter === "MEDICAL" ? "primary" : ""}" data-mission-filter="MEDICAL">Medical</button><button class="action ${filter === "MEDEVAC" ? "primary" : ""}" data-mission-filter="MEDEVAC">Medevac</button><button class="action ${filter === "CHARTER" ? "primary" : ""}" data-mission-filter="CHARTER">Charter</button><button class="action ${filter === "SCENIC" ? "primary" : ""}" data-mission-filter="SCENIC">Scenic</button><button class="action ${filter === "WATER" ? "primary" : ""}" data-mission-filter="WATER">Water</button><button class="action ${filter === "BUSH" ? "primary" : ""}" data-mission-filter="BUSH">Bush</button></div></div><div class="grid"><div class="card s8 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Available Contracts</div><h2>Mission Dispatch</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> LIVE OPS</div></div>${ms.length ? ms.map((m) => `<div class="mission"><div><span class="tag">${esc(m.mission_code || m.id)}</span>${(m.id === recommendedId || m.mission_id === recommendedId) ? `<span class="tag">⭐ RECOMMENDED</span><div class="small" style="margin-top:6px">${missionRecommendationReason(m)}</div><span class="tag">${esc(missionRecommendationLabel(m))}</span>` : ""}<span class="tag">${esc(m.mission_type || m.type || "MISSION")}</span><span class="tag">LIVE WEATHER</span>${m.water_operation ? '<span class="tag">🌊 WATER OPERATION</span>' : ""}${m.bush_operation ? '<span class="tag">🌲 BUSH OPERATION</span>' : ""}${m.region_id ? `<span class="tag">${esc(m.region_id)}</span>` : ""}<h3>${esc(missionTitle(m))}</h3><div class="route">${esc(route(m))}</div><div class="small">${esc(m.distance_nm || m.distance || "—")} NM • ${esc(m.difficulty || "STANDARD")} • ${esc(m.priority || "STANDARD")}</div><div class="small">${num(m.reward_credits || m.credits)} Cr • +${num(m.reward_xp || m.xp)} XP</div><div class="small"><b>Why fly:</b> ${num(m.reward_credits || m.credits)} Cr • +${num(m.reward_xp || m.xp)} XP • ${esc(m.distance_nm || m.distance || "—")} NM${m.water_operation ? " • Water operation" : ""}${isBushMission(m) ? " • Bush operation" : ""}</div><div class="small"><b>Dispatch:</b> ${esc(missionTypeContext(m))} ${m.water_operation ? " Water operation — destination water access required." : ""} ${isBushMission(m) ? " Remote/backcountry operation — terrain and runway conditions require extra planning." : ""}</div></div><button class="action primary" data-brief="${m.id}" ${state.active ? "disabled" : ""}>View Brief</button></div>`).join("") : '<p class="small">No missions currently meet your ownership, qualification, and level requirements.</p>'}</div><div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Operational Continuation</div><h2>Run the next operation.</h2></div><div class="ops-icon">◎</div></div><p class="copy">FlightOps keeps the operation moving after each completed flight. Your aircraft, qualifications, home base, mission history and current level shape what appears here.</p><div class="callout"><b>Next step:</b> Select an eligible contract, review the dispatch brief, assign the aircraft, accept the release, then fly it in MSFS Free Flight.</div></div></div>`;
}
function brief() {
  const m = state.selected;
  if (!m) { state.page = "missions"; return missionList(); }
  const choices = missionAircraftChoices(m);
  const ownedChoices = ownedMissionAircraft(m);
  const multipleAircraft = ownedChoices.length > 1;
  const selectedId = multipleAircraft
    ? state.selectedAircraftId
    : (state.selectedAircraftId || ownedChoices[0]?.id || m.required_aircraft_id);
  const a = ownedChoices.find((x) => x.id === selectedId) || (multipleAircraft ? {} : (m.aircraft_master || m));
  const q = m.required_qualification?.code || m.required_qualification_code || "Pilot qualification";
  const planning = m.planning_level || (m.required_aircraft_id === "c172" ? "Suggested planning" : "Pilot planning");
  const legs = missionLegs(m);
  const totalDistance = Number(m.distance_nm || legs.reduce((s,l)=>s+Number(l.distance_nm||0),0) || 0);
  const cruise = Number(a.cruise_kts || 0);
  const blockMinutes = cruise > 0 && totalDistance > 0 ? Math.round((totalDistance / cruise) * 60 * 1.12) : null;
  const blockText = blockMinutes ? `${Math.floor(blockMinutes/60)}h ${blockMinutes%60}m est. block` : "Pilot to calculate";
  const altText = a.typical_altitude_ft ? `${num(a.typical_altitude_ft)} ft typical aircraft ceiling/planning reference` : "Pilot to determine";
  const airportText = "Pilot must verify runway, NOTAM-style operational information, procedures, services, and current airport conditions in MSFS before departure.";
  const fuelText = "Pilot responsibility — calculate usable fuel, reserves, alternate requirements, and expected wind/weather effects for the actual flight.";
  const contingencyText = "If weather, runway, aircraft condition, fuel, or destination conditions become unacceptable, reassess the flight and divert or discontinue as appropriate.";
  return `<section class="brief-hero"><div class="brief-hero-main"><div class="eyebrow">FlightOps Dispatch Release • Pre-Flight</div><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span class="ops-route-chip"><span class="ops-dot"></span> DISPATCH ${esc(m.mission_code || m.id)}</span><span class="ops-route-chip">LIVE WEATHER</span></div><div class="brief-status-row"><span class="ops-route-chip"><span class="ops-dot"></span> CONTRACT OPEN</span><span class="ops-route-chip">${esc(m.mission_type || m.type || "MISSION")}</span>${m.water_operation ? '<span class="ops-route-chip">🌊 WATER OPERATION</span>' : ""}${isBushMission(m) ? '<span class="ops-route-chip">🌲 BUSH OPERATION</span>' : ""}</div><h1>${esc(missionTitle(m))}</h1><p>${esc(m.mission_type || m.type || "MISSION")} • ${esc(route(m))}</p></div><div class="brief-value"><div class="label">Contract Value</div><div class="money">${num(m.reward_credits || m.credits)} Cr</div><div class="small">+${num(m.reward_xp || m.xp)} XP</div></div></section>
  <div class="brief-command-strip">
    <div><span class="label">Dispatch Status</span><strong>OPEN FOR ACCEPTANCE</strong><span class="small">Pilot review required before release.</span></div>
    <div><span class="label">Operation</span><strong>${esc(m.mission_type || m.type || "MISSION")}</strong><span class="small">${esc(m.priority || "STANDARD")} priority</span></div>
    <div><span class="label">Difficulty</span><strong>${esc(m.difficulty || "STANDARD")}</strong><span class="small">${esc(q)}</span></div>
    <div><span class="label">Weather</span><strong>LIVE WEATHER</strong><span class="small">MSFS Live Weather required</span></div>
  </div>
  <div class="grid">
    <div class="card s8 ops-card"><div class="ops-section-head"><div><div class="eyebrow">01 • Dispatch Information</div><h2>Operational Release</h2></div><div class="ops-icon">✈</div></div>
      <div class="callout"><div class="eyebrow">MISSION STORY</div><p style="margin:6px 0 0">${missionStory(m)}</p></div>
      <div class="notice"><b>LIVE WEATHER REQUIRED</b> — This mission must be flown in MSFS 2024 using Live Weather. FlightOps does not create or control simulator weather.</div>
      ${m.water_operation ? '<div class="notice"><b>🌊 WATER OPERATION</b> — This release requires a float/amphibious-equipped aircraft and a suitable water landing/takeoff area. Verify actual water conditions, wind, obstacles, surface, depth/clearance, and local operating considerations in MSFS before departure.</div>' : ""}
      <div class="details">
        <div class="detail"><div class="label">Aircraft</div><strong>${esc(aircraftName(a))}</strong></div>
        <div class="detail"><div class="label">Qualification</div><strong>${esc(q)}</strong></div>
        <div class="detail"><div class="label">Distance</div><strong>${num(totalDistance)} NM</strong></div>
        <div class="detail"><div class="label">Est. Block</div><strong>${blockText}</strong></div>
        <div class="detail"><div class="label">Cruise Reference</div><strong>${cruise ? `${num(cruise)} KTAS` : "Pilot calculate"}</strong></div>
        <div class="detail"><div class="label">Planning</div><strong>${esc(planning)}</strong></div>
        ${m.water_operation ? '<div class="detail"><div class="label">Operation</div><strong>FLOAT / WATER</strong><div class="small">Water landing/takeoff required.</div></div>' : ""}
        <div class="detail"><div class="label">Home / Origin</div><strong>${esc(legs[0]?.origin_icao || m.origin_icao || "—")}</strong></div>
        <div class="detail"><div class="label">Final Destination</div><strong>${esc(legs[legs.length-1]?.destination_icao || m.destination_icao || "—")}</strong></div>
      </div>
      <div class="eyebrow">02 • Flight Plan</div><h2>Route & Leg Sequence</h2>
      <div class="details">${legs.map((leg,i)=>`<div class="detail"><div class="label">Leg ${i+1} of ${legs.length}</div><strong>${esc(leg.origin_icao)} → ${esc(leg.destination_icao)}</strong><div class="small">${num(leg.distance_nm)} NM • ${esc(legPurpose(leg,i+1,legs.length))}</div>${leg.stop_notes ? `<div class="small"><b>Stop plan:</b> ${esc(leg.stop_notes)}</div>` : ""}${leg.leg_objective ? `<div class="small"><b>Leg objective:</b> ${esc(leg.leg_objective)}</div>` : ""}</div>`).join("")}</div>
      <div class="callout"><b>Planning standard:</b> ${esc(planning)}<br>${planning === "Suggested planning" ? "FlightOps provides a suggested framework. The pilot may modify the route and remains responsible for the final plan." : "The pilot is responsible for the final route, altitude, fuel, alternate, weather, and navigation plan."}</div>
      <p class="copy"><b>Altitude reference:</b> ${altText}<br><b>Fuel planning:</b> ${fuelText}<br><b>Estimated time:</b> ${blockText}. Actual time will depend on routing, winds, traffic, taxi, and ATC.</p>
    </div>
    ${bushMissionNotice(m)}
    ${missionPayloadCard(m)}
    <div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">03 • Weight & Balance</div><h2>Load Planning</h2></div><div class="ops-icon">⚖</div></div>
      <p class="copy">Use the mission manifest as your starting load. In MSFS, enter the actual passenger/cargo distribution, fuel and pilot weight for the aircraft.</p>
      <div class="callout"><b>Before departure:</b><br>Confirm takeoff weight, center of gravity and aircraft loading remain within the aircraft's published limits.</div>
      <p class="small">FlightOps provides mission payload guidance only. The simulator's aircraft-specific weight-and-balance model is authoritative.</p>
    </div>
    <div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">03 • Aircraft & Airport</div><h2>Dispatch Checks</h2></div><div class="ops-icon">◈</div></div>
      <p class="copy"><b>Aircraft:</b> ${esc(aircraftName(a))}<br>${num(a.seats || 0)} seats • ${num(a.engines || 1)} engine${Number(a.engines||1)===1?"":"s"} • ${esc(a.engine_type || "—")}</p>
      <div class="eyebrow">Airport Review</div><p class="copy">${airportText}</p>
      <div class="eyebrow">Weather</div><p class="copy">Use MSFS Live Weather and review departure, enroute, destination, winds, visibility, ceilings, precipitation, turbulence, and storm activity before launch.</p>
      <div class="eyebrow">Operational Hazards</div><p class="copy">${esc(m.hazards_text || "Review terrain, runway length, weather, traffic, airspace, obstacles, and destination conditions appropriate to the aircraft.")}</p>
    </div>
    <div class="card s8 ops-card"><div class="ops-section-head"><div><div class="eyebrow">04 • Mission Execution</div><h2>Captain's Brief</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> PILOT IN COMMAND</div></div>
      <p class="copy"><b>Mission context:</b> ${esc(missionTypeContext(m))}</p>
      <div class="callout"><b>Primary objective:</b> ${esc(m.objective || m.mission_objective || "Complete the assigned route safely and accomplish the mission objective.")}</div>
      <div class="details">
        <div class="detail"><div class="label">Departure</div><strong>${esc(legs[0]?.origin_icao || "—")}</strong><div class="small">Complete preflight and departure checks.</div></div>
        <div class="detail"><div class="label">Enroute</div><strong>Monitor conditions</strong><div class="small">Reassess fuel, weather, navigation and aircraft status.</div></div>
        <div class="detail"><div class="label">Arrival</div><strong>${esc(legs[legs.length-1]?.destination_icao || "—")}</strong><div class="small">Confirm runway and approach suitability before descent.</div></div>
        <div class="detail"><div class="label">Contingency</div><strong>Reassess / Divert</strong><div class="small">${contingencyText}</div></div>
      </div>
    </div>
    <div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">05 • Dispatch Notes</div><h2>Things to Watch</h2></div><div class="ops-icon">!</div></div>
      <p class="copy">${esc(m.watch_items || "Protect aircraft limitations, fuel reserves, weather margins, terrain clearance, runway suitability, and passenger/cargo objectives.")}</p>
      <p class="copy"><b>Destination planning:</b> ${esc(missionDestinationContext(m))}</p>
      <p class="copy"><b>Weather requirement:</b> Live Weather only.</p>
    </div>
    <div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">06 • Pilot Responsibilities</div><h2>Before You Accept</h2></div><div class="ops-route-chip">FLIGHTOPS STANDARD</div></div>
    <div class="callout"><b>Aircraft choice:</b> This mission has ${ownedChoices.length || 1} eligible aircraft option${ownedChoices.length === 1 ? "" : "s"}. ${ownedChoices.length > 1 ? "Select the aircraft you want to use before accepting the mission." : "The eligible aircraft is shown below."}</div>
    <div class="fleet">${ownedChoices.map((x) => `<button type="button" class="plane choice ${selectedId===x.id?"selected":""}" data-aircraft-choice="${esc(x.id)}"><b>${esc(x.manufacturer)} ${esc(x.model)}</b><span class="small">${esc(x.category)} • ${num(x.cruise_kts)} KTAS • ${num(x.range_nm)} NM range</span></button>`).join("")}</div>
      <div class="details">
        <div class="detail"><div class="label">1</div><strong>Verify aircraft</strong><div class="small">Use the assigned/eligible aircraft in MSFS.</div></div>
        <div class="detail"><div class="label">2</div><strong>Build the flight plan</strong><div class="small">Route, altitude, fuel, alternate and navigation.</div></div>
        <div class="detail"><div class="label">3</div><strong>Set Live Weather</strong><div class="small">Preset/custom weather is not permitted.</div></div>
        <div class="detail"><div class="label">4</div><strong>Load Mission Payload</strong><div class="small">Use the FlightOps manifest to set the actual passenger/cargo load in MSFS Weight & Balance.</div></div>
        <div class="detail"><div class="label">5</div><strong>Fly the mission</strong><div class="small">Use normal operating procedures and sound judgment.</div></div>
        <div class="detail"><div class="label">6</div><strong>Debrief honestly</strong><div class="small">Report outcome, landing, weather, aircraft condition and objective.</div></div>
      </div>
    </div>
    <div class="card s8 ops-card"><div class="ops-section-head"><div><div class="eyebrow">07 • Mission Objective</div><h2>Success Standard</h2></div><div class="ops-icon">✓</div></div><div class="callout"><b>${esc(m.objective || m.mission_objective || "Complete the assigned route safely and accomplish the mission objective.")}</b></div><p class="copy">Mission success is determined during debrief. Safe flight and objective completion matter more than simply reaching the destination.</p></div>
    <div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">08 • Compensation</div><h2>${num(m.reward_credits || m.credits)} Cr</h2></div><div class="ops-icon">◆</div></div><p class="small">Base XP: +${num(m.reward_xp || m.xp)} XP</p><p class="small">Final rewards are adjusted for flight outcome, landing, objective completion and aircraft condition.</p></div>
    <div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">09 • Dispatch Decision</div><h2>Ready for Departure?</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> ${state.active ? "MISSION UNAVAILABLE" : "CONTRACT OPEN"}</div></div><p class="copy">Accepting this release locks the contract to your pilot. Only one active mission is permitted at a time.</p><button class="action primary" data-action="accept" ${state.active ? "disabled" : ""}>Accept Mission</button> <button class="action" data-page="missions">Back to Mission Board</button></div>
  </div>`;
}
function hangar() {
  const owned = state.aircraft || [];
  const ownedIds = new Set(owned.map((a) => a.aircraft_id));
  const qualSet = qIds();
  const capacity = Math.max(2, level() * 2);
  const full = owned.length >= capacity;
  const activeAircraftId = state.active?.aircraft_id || null;
  const history = state.history || [];

  const aircraftName = (a) =>
    a?.aircraft_master?.name ||
    [a?.aircraft_master?.manufacturer, a?.aircraft_master?.model].filter(Boolean).join(" ") ||
    a?.aircraft_id ||
    "Aircraft";

  const aircraftTail = (a) =>
    a?.tail_number ||
    a?.registration ||
    a?.aircraft_master?.tail_number ||
    a?.aircraft_master?.registration ||
    "—";

  const aircraftStats = (a) => {
    const rows = history.filter((h) => String(h.aircraft_id || "") === String(a.aircraft_id || ""));
    const minutes = rows.reduce((sum, h) => sum + Number(h.flight_minutes || h.actual_flight_minutes || h.duration_minutes || 0), 0);
    const distance = rows.reduce((sum, h) => sum + Number(h.distance_nm || h.actual_distance_nm || 0), 0);
    return { flights: rows.length, minutes, distance };
  };

  const fleetOperational = owned.filter((a) => String(a.status || "").toLowerCase() !== "inactive").length;
  const fleetAssigned = owned.filter((a) => String(a.aircraft_id || "") === String(activeAircraftId || "")).length;

  const ownedCards = owned.length
    ? owned.map((a) => {
        const master = a.aircraft_master || {};
        const stats = aircraftStats(a);
        const isActive = String(a.aircraft_id || "") === String(activeAircraftId || "");
        const status = String(a.status || "active").toLowerCase();
        const statusLabel = status === "inactive" ? "OUT OF SERVICE" : isActive ? "ASSIGNED TO ACTIVE FLIGHT" : "AVAILABLE";
        const statusClass = status === "inactive" ? "fleet-status-muted" : isActive ? "fleet-status-active" : "fleet-status-ready";
        const capabilities = [
          master.category,
          master.engine_type,
          Number(master.engines || 0) > 1 ? (Number(master.engines) + " engines") : "Single engine",
          Number(master.seats || 0) ? (Number(master.seats) + " seats") : "",
          master.float_capable ? "Float capable" : "",
          master.amphibious_capable ? "Amphibious" : "",
        ].filter(Boolean).join(" • ");

        return '<div class="fleet-command-card">' +
          '<div class="fleet-command-head"><div><div class="eyebrow">FLEET AIRCRAFT</div><h3>' + esc(aircraftName(a)) + '</h3><div class="fleet-tail">' + esc(aircraftTail(a)) + '</div></div><span class="fleet-status ' + statusClass + '">' + statusLabel + '</span></div>' +
          '<div class="fleet-command-grid">' +
            '<div><div class="label">Base</div><strong>' + esc(a.base_icao || state.profile?.home_base_icao || "—") + '</strong></div>' +
            '<div><div class="label">Aircraft Status</div><strong>' + esc(status === "inactive" ? "Inactive" : "Operational") + '</strong></div>' +
            '<div><div class="label">Flight Operations</div><strong>' + num(stats.flights) + '</strong></div>' +
            '<div><div class="label">Flight Time</div><strong>' + Math.floor(stats.minutes / 60) + 'h ' + (stats.minutes % 60) + 'm</strong></div>' +
            '<div><div class="label">Distance</div><strong>' + num(stats.distance) + ' NM</strong></div>' +
            '<div><div class="label">Capability</div><strong>' + esc(capabilities || "General aviation") + '</strong></div>' +
          '</div>' +
          (isActive ? '<div class="fleet-command-callout"><b>ACTIVE ASSIGNMENT</b><br>This aircraft is reserved for your current FlightOps operation. Complete the active dispatch before assigning it to another operation.</div>' :
            status === "inactive" ? '<div class="fleet-command-callout muted"><b>OUT OF SERVICE</b><br>This aircraft is not available for mission assignment until its status is restored.</div>' :
            '<div class="fleet-command-ready"><span class="ops-dot"></span><b>READY FOR ELIGIBLE OPERATIONS</b><span>Base ' + esc(a.base_icao || state.profile?.home_base_icao || "—") + '</span></div>') +
        '</div>';
      }).join("")
    : '<div class="card s12 ops-card"><h2>No aircraft assigned to your operation.</h2><p class="copy">Your starter aircraft or first purchase will appear here once FlightOps has an owned aircraft record.</p></div>';

  const catalogCards = state.aircraftCatalog.map((a) => {
    const ownedAlready = ownedIds.has(a.id);
    const hasQualification = !a.required_qualification_id || qualSet.has(a.required_qualification_id);
    const hasLevel = level() >= Number(a.required_level || 1);
    const unlockable = !ownedAlready && hasQualification && hasLevel && !full;
    const purchasable = !ownedAlready && !full;
    const status = ownedAlready ? "OWNED" : unlockable ? "UNLOCKABLE" : purchasable ? "AVAILABLE" : "LOCKED";
    const qualification = a.required_qualification_id || "—";
    const price = Number(a.purchase_price || 0);
    return '<div class="plane ' + (status === "LOCKED" ? "locked" : "") + '">' +
      '<div class="' + (status === "OWNED" ? "owned" : status === "UNLOCKABLE" || status === "AVAILABLE" ? "reward" : "small") + '">' +
      (status === "OWNED" ? "● OWNED" : status === "UNLOCKABLE" ? "◆ UNLOCKABLE" : status === "AVAILABLE" ? "◆ AVAILABLE TO PURCHASE" : "🔒 LOCKED") + '</div>' +
      '<h3>' + esc(a.manufacturer) + ' ' + esc(a.model) + '</h3>' +
      '<div class="small">' + esc(a.category) + ' • ' + esc(a.engine_type || "—") + ' • ' + Number(a.engines || 1) + ' engine' + (Number(a.engines || 1) === 1 ? "" : "s") + ' • ' + Number(a.seats || 0) + ' seats</div>' +
      '<div class="details"><div class="detail"><div class="label">Required Level</div><strong>' + num(a.required_level || 1) + '</strong></div><div class="detail"><div class="label">Qualification</div><strong>' + esc(qualification) + '</strong></div></div>' +
      '<div class="price">' + (price ? num(price) + " Cr" : "Starter aircraft") + '</div>' +
      '<div class="small">' + (a.float_capable ? "🌊 Float capable" : "") + (a.float_capable && a.amphibious_capable ? " • Amphibious capable" : "") +
      (a.float_capable ? "<br>" : "") + (ownedAlready ? "Assigned to your FlightOps fleet." : full ? "Hangar full. Advance your career to expand capacity." : unlockable ? "You meet the current level and qualification requirements." : "Reach Level " + num(a.required_level || 1) + " and earn " + esc(qualification) + " to unlock.") + '</div>' +
      (purchasable ? '<button class="action primary" data-action="purchase-aircraft" data-aircraft="' + esc(a.id) + '">Purchase Aircraft</button>' : '') +
      '</div>';
  }).join("");

  return '<section class="hero fleet-command-hero"><div><div class="eyebrow">Aircraft Operations • Fleet Command</div><h1>Manage your fleet.</h1><p>Your aircraft are operational assets. FlightOps tracks where they are based, whether they are available, and how much flight activity each aircraft has accumulated.</p></div><div><div class="label">Fleet Capacity</div><div class="money">' + owned.length + ' / ' + capacity + '</div></div></section>' +
    '<section class="grid">' +
      '<div class="card s3 ops-card fleet-summary-card"><div class="label">Fleet Status</div><div class="fleet-summary-value">' + num(fleetOperational) + '</div><div class="small">Operational aircraft</div></div>' +
      '<div class="card s3 ops-card fleet-summary-card"><div class="label">Available</div><div class="fleet-summary-value">' + num(Math.max(0, fleetOperational - fleetAssigned)) + '</div><div class="small">Ready for eligible missions</div></div>' +
      '<div class="card s3 ops-card fleet-summary-card"><div class="label">Assigned</div><div class="fleet-summary-value">' + num(fleetAssigned) + '</div><div class="small">Current FlightOps operation</div></div>' +
      '<div class="card s3 ops-card fleet-summary-card"><div class="label">Home Base</div><div class="fleet-summary-value fleet-summary-base">' + esc(state.profile?.home_base_icao || "—") + '</div><div class="small">Primary pilot base</div></div>' +
      '<div class="s12"><div class="ops-section-head"><div><div class="eyebrow">Owned Fleet</div><h2>Fleet Operations Board</h2></div><div class="ops-route-chip">' + num(owned.length) + ' AIRCRAFT</div></div><div class="fleet-command-list">' + ownedCards + '</div></div>' +
      '<div class="s12"><div class="card ops-card"><div class="ops-section-head"><div><div class="eyebrow">Fleet Readiness</div><h2>Operational rule</h2></div><div class="ops-route-chip">BASE • STATUS • MISSION</div></div><p class="copy">An aircraft is considered ready when it is active, based within its operating location, and not already committed to an active FlightOps assignment. Mission-specific aircraft, qualification, and water-operation requirements are checked at dispatch.</p><div class="callout"><b>FlightOps does not replace MSFS aircraft setup.</b> Fuel, weight & balance, performance calculations, avionics configuration, and final preflight remain the pilot responsibility inside MSFS.</div></div></div>' +
    '</section>' +
    '<section class="fleet-catalog-section"><div class="ops-section-head"><div><div class="eyebrow">Aircraft Catalog</div><h2>Build your hangar</h2></div><div class="ops-route-chip">' + capacity + ' CAPACITY</div></div><p class="small">Purchase aircraft as your level, qualifications, and finances allow. Purchased aircraft immediately enter the Fleet Operations Board.</p><div class="fleet">' + (catalogCards || '<div class="notice">No aircraft are currently in the FlightOps catalog.</div>') + '</div></section>';
}

function career() {
  const p = state.profile || {};
  const xp = Number(p.xp || 0);
  const current = level();
  const next = current >= 20 ? LEVEL_XP[19] : LEVEL_XP[current];
  const previous = LEVEL_XP[current - 1];
  const progress = current >= 20 ? 100 : Math.min(100, Math.max(0, ((xp - previous) / Math.max(1, next - previous)) * 100));
  const qual = state.qualifications.map(q => q.qualifications?.code || q.qualification_id).filter(Boolean);
  const aircraft = state.aircraft.map(a => a.aircraft_master?.name || a.aircraft_master?.model || a.aircraft_id).filter(Boolean);
  const scoredFlights = state.history.filter(h => h.performance_score != null).map(h => Number(h.performance_score)).filter(Number.isFinite);
  const avgScore = scoredFlights.length ? Math.round(scoredFlights.reduce((a,b) => a+b, 0) / scoredFlights.length) : null;
  const bestScore = scoredFlights.length ? Math.max(...scoredFlights) : null;
  const earnedAchievementIds = new Set(state.pilotAchievements.map(a => a.achievement_id));
  const achievementProgress = (id) => {
    const flights = Number(p.total_flights || state.history.length || 0);
    const missions = Number(p.completed_missions || 0);
    const minutes = Number(p.total_flight_minutes || 0);
    const nm = Number(p.total_nm || 0);
    const earnedReports = state.history.filter(r => String(r.outcome || "").toLowerCase() === "completed");
    const beaverFlights = earnedReports.filter(r => r.aircraft_id === "dhc2_beaver").length;
    const floatFlights = earnedReports.filter(r => String(r.mission_id || "").startsWith("FLOAT-") || r.water_operation === true).length;
    const bushFlights = earnedReports.filter(r => String(r.mission_id || "").includes("BUSH-")).length;
    const targets = { FIRST_FLIGHT:[flights,1], FIRST_MISSION:[missions,1], TEN_FLIGHTS:[flights,10], TEN_MISSIONS:[missions,10], FIRST_TURBOPROP:[qual.includes("TURBOPROP")?1:0,1], FIRST_JET:[qual.includes("JET")?1:0,1], TEN_HOURS:[minutes,600], THOUSAND_NM:[nm,1000], TWENTY_FIVE_FLIGHTS:[flights,25], TWENTY_FIVE_MISSIONS:[missions,25], LEVEL_10:[current,10], LEVEL_20:[current,20], EXCELLENT_FLIGHT:[avgScore || 0,90], PERFECT_FLIGHT:[bestScore || 0,100], BEAVER_OPERATOR:[beaverFlights,1], FLOAT_PILOT:[floatFlights,1], BUSH_PILOT:[bushFlights,1] };
    const t = targets[id];
    if (!t) return "";
    return t[0] >= t[1] ? "EARNED" : ["BEAVER_OPERATOR","FLOAT_PILOT","BUSH_PILOT"].includes(id) ? "Complete 1 qualifying operation" : id === "TEN_HOURS" ? `${Math.floor(t[0]/60)} / 10h` : id === "THOUSAND_NM" ? `${num(t[0])} / 1,000 NM` : `${num(t[0])} / ${num(t[1])}`;
  };
  const milestones = [
    ["PPL", "Starter qualification", qual.includes("PPL"), "Complete your first flight career milestone."],
    ["CPL", "Commercial Pilot", qual.includes("CPL"), "Unlock cargo and charter operations."],
    ["IR", "Instrument Rating", qual.includes("IR"), "Unlock IFR and weather-sensitive missions."],
    ["MULTI", "Multi-Engine", qual.includes("MULTI"), "Unlock multi-engine aircraft operations."],
    ["TURBOPROP", "Turboprop", qual.includes("TURBOPROP"), "Unlock PC-12 and similar missions."],
    ["JET", "Jet Rating", qual.includes("JET"), "Unlock business jet operations."],
    ["LONG", "Long Range", qual.includes("LONG"), "Unlock long-range captain missions."]
  ];
  const scoreBand = avgScore == null ? "No scored flights yet" : avgScore >= 95 ? "Elite" : avgScore >= 90 ? "Excellent" : avgScore >= 80 ? "Professional" : avgScore >= 70 ? "Developing" : "Needs Improvement";
  const performanceNote = avgScore == null ? "Complete a flight to establish your performance record." : avgScore >= 95 ? "Elite-level consistency. Keep flying at this standard." : avgScore >= 90 ? "Excellent professional standard. One perfect flight earns the top performance badge." : avgScore >= 80 ? "Solid professional flying. Push toward 90+ for the Excellent Flight achievement." : "Focus on clean landings, complete objectives, and protecting the aircraft.";
  const nextUnlocks = [[2,"Developing Pilot","Broader local contracts and the next aircraft tier."],[3,"Commercial Track","Caravan, utility and bush-operation opportunities."],[5,"Experienced Pilot","Higher-value regional work and advanced GA."],[6,"Turboprop Track","PC-12, TBM and higher-range operations."],[9,"Jet Track","PC-24 and Vision Jet career path."],[12,"Jet Captain","CJ4 and advanced business-jet contracts."],[16,"Long Range Track","Citation Longitude and long-range missions."]];
  const nextUnlock = nextUnlocks.find((x) => x[0] > current) || null;
  const nextAircraft = state.aircraftCatalog
    .filter((a) => Number(a.level_required || a.min_level || a.unlock_level || 0) > current)
    .sort((a,b) => Number(a.level_required || a.min_level || a.unlock_level || 0) - Number(b.level_required || b.min_level || b.unlock_level || 0))[0] || null;

  const levelHours = [0,2,5,10,20,30,45,60,80,100,125,150,175,200,250,300,350,400,450,500];
  const totalHours = Number(p.total_flight_minutes || 0) / 60;
  const levelRows = [
    ["1","New Pilot","C172 / basic GA"],["2","Developing Pilot","Local contracts"],["3","Commercial Track","Caravan eligibility"],["4","Regional Pilot","Corvalis / regional contracts"],["5","Experienced Pilot","Higher-value GA"],["6","Turboprop Track","PC-12 / TBM path"],["7","Senior Pilot","Advanced regional"],["8","Senior Captain","Complex operations"],["9","Jet Track","PC-24 / Vision Jet path"],["10","Captain","Premium executive contracts"],["11","Senior Captain","Higher-risk contracts"],["12","Jet Captain","CJ4 path"],["13","Executive Captain","Executive charter"],["14","Advanced Captain","Special operations"],["15","Command Pilot","Premium operations"],["16","Long Range Track","Longitude path"],["17","International Captain","Long-range missions"],["18","Senior Command","Elite contracts"],["19","Master Track","Highest-tier preparation"],["20","Master Pilot","Endgame career"]
  ];
  return `<section class="hero"><div><div class="eyebrow">Career Progression</div><div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div><h1>Level ${current} • ${esc(pilotRank(current).title)}</h1><p>Earn XP by flying missions. Qualifications and aircraft expand your career.</p></div>${epaulet(current)}</div></div><div><div class="label">Career XP</div><div class="money">${num(xp)} XP</div></div></section>
  <div class="grid">
    <div class="card s8 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Level Progress</div><h2>Level ${current}${current < 20 ? ` → Level ${current + 1}` : " • MAX"}</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> CAREER</div></div><div class="bar"><div class="fill" style="width:${progress}%"></div></div><p class="small">${current < 20 ? `${num(Math.max(0,next-xp))} XP to next level • ${Math.max(0, levelHours[current] - totalHours).toFixed(1)} flight hours to next level target` : "Master Pilot reached."}</p></div>
    <div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Career Record</div><h2>${num(p.total_flights || state.history.length)} Flights</h2></div><div class="ops-icon">✈</div></div><p class="small">${num(p.completed_missions)} missions • ${num(p.reputation)} reputation</p><div class="details"><div class="detail"><span class="label">Flight Time</span><strong>${Math.floor(Number(p.total_flight_minutes || 0) / 60)}h ${Number(p.total_flight_minutes || 0) % 60}m</strong></div><div class="detail"><span class="label">Distance</span><strong>${num(p.total_nm || 0)} NM</strong></div><div class="detail"><span class="label">Avg Score</span><strong>${avgScore != null ? `${avgScore}/100` : "—"}</strong></div><div class="detail"><span class="label">Best Score</span><strong>${bestScore != null ? `${bestScore}/100` : "—"}</strong></div></div></div>
    <div class="card s5 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Next Career Unlock</div><h2>${nextUnlock ? "Level " + nextUnlock[0] + " • " + esc(nextUnlock[1]) : "Master Pilot"}</h2></div><div class="ops-icon">⬆</div></div><p class="copy">${nextUnlock ? esc(nextUnlock[2]) : "You have reached the current career ladder ceiling."}</p>${nextUnlock ? "<div class=\"callout\"><b>Remaining:</b> " + num(Math.max(0, LEVEL_XP[nextUnlock[0]-1] - xp)) + " XP to Level " + nextUnlock[0] + ".</div>" : ""}</div>\n    <div class="card s5 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Pilot Performance</div><h2>${esc(scoreBand)}</h2></div><div class="ops-icon">★</div></div><p class="small">Average flight score: ${avgScore != null ? `${avgScore}/100` : "—"}</p><p class="small">Best flight: ${bestScore != null ? `${bestScore}/100` : "—"}</p><p class="small">Based on outcome, landing, objective completion, and aircraft condition.</p></div>
    <div class="card s7 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Performance Coaching</div><h2>${esc(performanceNote)}</h2></div><div class="ops-icon">◆</div></div><p class="small">Keep building your flight record through safe, objective-focused flying.</p></div>
    <div class="card s7 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Qualification Path</div><h2>Your Ratings</h2></div><div class="ops-icon">✦</div></div>${milestones.map(([code,name,owned,desc])=>`<div class="historyrow"><div><b>${esc(name)}</b><div class="small">${esc(code)} • ${esc(desc)}</div></div><div class="${owned ? "owned" : "small"}">${owned ? "● ACTIVE" : "LOCKED"}</div></div>`).join("")}</div>
    <div class="card s5 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Aircraft Path</div><h2>Current Hangar</h2></div><div class="ops-icon">◈</div></div><div class="callout"><b>Next aircraft target:</b> ${nextAircraft ? esc(nextAircraft.name || nextAircraft.model || nextAircraft.id) + " • Level " + Number(nextAircraft.level_required || nextAircraft.min_level || nextAircraft.unlock_level) : "Continue building your career to unlock the next aircraft tier."}</div>${aircraft.length ? aircraft.map(x=>`<div class="historyrow"><div><b>${esc(x)}</b></div><div class="owned">OWNED</div></div>`).join("") : '<p class="small">No aircraft assigned.</p>'}<p class="copy">New aircraft become useful when your qualifications and level support them.</p></div>
    <div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Achievements</div><h2>Career Milestones</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> PROGRESS</div></div><p class="copy">Earn rewards by flying, completing missions, building hours and distance, and reaching command-level milestones.</p><div class="fleet">${state.achievements.map(a=>`<div class="plane ${earnedAchievementIds.has(a.id) ? "" : "locked"}"><h3>${esc(a.name)}</h3><div class="small">${esc(a.description)}</div><div class="small">${earnedAchievementIds.has(a.id) ? "● EARNED" : achievementProgress(a.id)} • +${num(a.xp_reward)} XP • ${num(a.credit_reward)} Cr</div></div>`).join("")}</div></div>
    <div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">20-Level Career Ladder</div><h2>Where you're going</h2></div><div class="ops-icon">⬆</div></div>${levelRows.map((r)=>{ const n=Number(r[0]); const targetXp=LEVEL_XP[n-1]; const targetHours=levelHours[n-1]; const status=n===current?"CURRENT":n<current?"COMPLETED":"LOCKED"; return `<div class="historyrow"><div><b>Level ${r[0]} • ${esc(r[1])}</b><div class="small">${esc(r[2])}</div><div class="small">Flight Time: ${targetHours}h • XP: ${num(targetXp)} XP</div></div><div class="${status==="CURRENT" ? "owned" : "small"}">${status}</div></div>`;}).join("")}</div>
  </div>`;
}
function flightResult() {
  const r = state.lastFlightResult;
  if (!r) { state.page = "pilot"; return pilot(); }
  const completed = r.mission_complete !== false;
  const score = r.performance_score != null ? Number(r.performance_score) : null;
  const outcomeLabel = ({successful:"SUCCESSFUL",rough:"ROUGH FLIGHT",failed:"MISSION FAILED"})[r.outcome] || String(r.outcome || "RECORDED").toUpperCase();
  const landingLabel = ({good:"GOOD",hard:"HARD",go_around:"GO-AROUND"})[r.landing] || String(r.landing || "—").toUpperCase();
  return `<section class="hero result-hero"><div><div class="eyebrow">Flight Operations • Post-Flight Record</div><div class="result-status"><span class="ops-dot"></span> ${completed ? "FLIGHT COMPLETED" : "LEG COMPLETED"}</div><h1>${esc(r.title || "Flight Recorded")}</h1><p>${esc(r.route || "")} • ${esc(r.aircraft || "")}</p></div><div class="result-score"><div class="label">Flight Score</div><div class="result-score-number">${score != null ? score + "/100" : "RECORDED"}</div></div></section>
  <div class="result-command-strip">
    <div><span class="label">Outcome</span><strong>${outcomeLabel}</strong></div>
    <div><span class="label">Landing</span><strong>${landingLabel}</strong></div>
    <div><span class="label">Objective</span><strong>${esc(r.objective || "—")}</strong></div>
    <div><span class="label">Aircraft</span><strong>${esc(r.aircraft || "—")}</strong></div>
  </div>
  <div class="grid">
    <div class="card s8 result-reward-card"><div class="ops-section-head"><div><div class="eyebrow">01 • Flight Performance</div><h2>Operational Result</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> FILED</div></div>
      <div class="result-rewards"><div><span class="label">Credits Earned</span><strong>+${num(r.credits || 0)} Cr</strong></div><div><span class="label">XP Earned</span><strong>+${num(r.xp || 0)} XP</strong></div><div><span class="label">Reputation</span><strong>+${num(r.reputation || 0)}</strong></div></div>
      <div class="details"><div class="detail"><span class="label">Flight Time</span><strong>${r.flightMinutes ? Math.floor(Number(r.flightMinutes)/60)+"h "+(Number(r.flightMinutes)%60)+"m" : "—"}</strong></div><div class="detail"><span class="label">Distance</span><strong>${r.distanceNm ? num(r.distanceNm)+" NM" : "—"}</strong></div><div class="detail"><span class="label">Weather</span><strong>${esc(r.weather || "—")}</strong></div><div class="detail"><span class="label">Aircraft Condition</span><strong>${esc(r.condition || "—")}</strong></div></div>
    </div>
    <div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">02 • Dispatch Status</div><h2>${completed ? "Contract Closed" : "Next Leg Released"}</h2></div><div class="ops-route-chip">${completed ? "COMPLETE" : "ACTIVE"}</div></div><p class="copy">${completed ? "The mission has been filed and closed. Your flight record is now part of your operational history." : "The submitted leg is recorded. FlightOps has advanced the operation to its next assigned leg."}</p></div>
    <div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">03 • Pilot Record</div><h2>What happens next?</h2></div></div><div class="result-next-grid"><div><b>${completed ? "Review your flight history" : "Continue the next leg"}</b><span>${completed ? "Your performance is now available in your Pilot Record." : "The next dispatch is ready when you are."}</span></div><div><b>Keep operating</b><span>Return to the Mission Board when you are ready for another assignment.</span></div></div><div class="result-actions"><button class="action primary" data-page="pilot">Open Pilot Record</button><button class="action" data-page="missions">Mission Board</button></div></div>
  </div>`;
}
function pilot() {
  const p = state.profile || {};
  const flights = state.history || [];
  const totalMinutes = flights.reduce((s, h) => s + Number(h.flight_minutes || 0), 0);
  const totalNm = flights.reduce((s, h) => s + Number(h.distance_nm || 0), 0);
  const successful = flights.filter((h) => String(h.outcome || "").toLowerCase() === "successful").length;
  const successRate = flights.length ? Math.round((successful / flights.length) * 100) : 0;
  const scored = flights.map((h) => Number(h.performance_score)).filter((n) => Number.isFinite(n));
  const averageScore = scored.length ? Math.round(scored.reduce((s, n) => s + n, 0) / scored.length) : null;
  const bestScore = scored.length ? Math.max(...scored) : null;
  const totalCredits = flights.reduce((s, h) => s + Number(h.earned_credits || h.credits_earned || h.reward_credits || 0), 0);
  const totalXp = flights.reduce((s, h) => s + Number(h.earned_xp || h.xp_earned || h.reward_xp || 0), 0);
  const totalRep = flights.reduce((s, h) => s + Number(h.earned_reputation || h.reputation_earned || 0), 0);
  const aircraftCounts = new Map();
  flights.forEach((h) => {
    const name = aircraftName(h.aircraft_master || h) || "Aircraft";
    aircraftCounts.set(name, (aircraftCounts.get(name) || 0) + 1);
  });
  const aircraftFlown = [...aircraftCounts.entries()].sort((a, b) => b[1] - a[1]);
  const failed = flights.filter((h) => String(h.outcome || "").toLowerCase() === "failed").length;
  const rough = flights.filter((h) => String(h.outcome || "").toLowerCase() === "rough").length;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const qualificationNames = state.qualifications
    .map((x) => x.qualifications?.name || x.qualifications?.code)
    .filter(Boolean);
  const recentFlights = flights.slice(0, 8);

  const aircraftRows = aircraftFlown.length
    ? aircraftFlown.map(([name, count]) => `<div class="pilot-aircraft-row"><div><b>${esc(name)}</b><div class="small">Recorded Flight Operations</div></div><strong>${num(count)}</strong></div>`).join("")
    : '<p class="small">Aircraft flown will appear here after your first completed operation.</p>';

  const recentRows = recentFlights.length
    ? recentFlights.map((h) => `<div class="pilot-history-row">
        <div class="pilot-history-main">
          <div class="pilot-history-title"><b>${esc(missionTitle(h.missions || h))}</b><span class="ops-route-chip">FILED</span></div>
          <div class="small">${esc(new Date(h.completed_at || h.created_at).toLocaleString())} • ${esc(aircraftName(h.aircraft_master || h))}</div>
          <div class="small">${esc(route(h.missions || h))} • ${esc(String(h.outcome || "Recorded").replace(/_/g, " "))} • Landing: ${esc(h.landing || h.landing_quality || "—")}</div>
        </div>
        <div class="pilot-history-result">
          <b>${h.performance_score != null ? num(h.performance_score) + "/100" : "RECORDED"}</b>
          <span>+${num(h.earned_credits || h.credits_earned || h.reward_credits)} Cr</span>
          <span>+${num(h.earned_xp || h.xp_earned || h.reward_xp)} XP</span>
        </div>
      </div>`).join("")
    : '<p class="small">Your completed operations will become part of the official Pilot Record here.</p>';

  return `${loadNotice()}
  <section class="hero pilot-record-hero">
    <div>
      <div class="eyebrow">Flight Operations • Official Pilot Record</div>
      <div class="pilot-record-title">
        <div>
          <h1>${esc(p.pilot_name || p.name || "Pilot")}</h1>
          <p>${esc(p.callsign || "No callsign set")} • MSFS Free Flight • FlightOps Operations</p>
        </div>
        ${epaulet()}
      </div>
    </div>
    <button class="action" data-action="edit-profile">Edit profile</button>
  </section>

  <div class="pilot-command-strip">
    <div class="pilot-command-main"><span class="ops-dot"></span><div><span class="label">Record Status</span><strong>${flights.length ? "OPERATIONAL RECORD ACTIVE" : "READY FOR FIRST OPERATION"}</strong></div></div>
    <div><span class="label">Level</span><strong>${level()}</strong></div>
    <div><span class="label">Flights</span><strong>${num(flights.length)}</strong></div>
    <div><span class="label">Success Rate</span><strong>${num(successRate)}%</strong></div>
  </div>

  <div class="grid pilot-summary-grid">
    <div class="card s3 pilot-stat-card"><div class="label">Total Flight Time</div><div class="pilot-stat-value">${hours}h ${minutes}m</div><div class="small">Filed flight time</div></div>
    <div class="card s3 pilot-stat-card"><div class="label">Total Distance</div><div class="pilot-stat-value">${num(totalNm)} NM</div><div class="small">Recorded distance flown</div></div>
    <div class="card s3 pilot-stat-card"><div class="label">Average Score</div><div class="pilot-stat-value">${averageScore != null ? averageScore + "/100" : "—"}</div><div class="small">${bestScore != null ? "Best: " + bestScore + "/100" : "Scores appear after completed flights"}</div></div>
    <div class="card s3 pilot-stat-card"><div class="label">Aircraft Flown</div><div class="pilot-stat-value">${num(aircraftFlown.length)}</div><div class="small">Unique aircraft in record</div></div>

    <div class="card s4 ops-card">
      <div class="ops-section-head"><div><div class="eyebrow">01 • Pilot Standing</div><h2>Current Status</h2></div><div class="ops-route-chip">LEVEL ${level()}</div></div>
      <div class="pilot-standing-grid">
        <div><span class="label">Credits</span><strong>${num(p.credits)} Cr</strong></div>
        <div><span class="label">Reputation</span><strong>${num(p.reputation)}</strong></div>
        <div><span class="label">XP</span><strong>${num(p.xp)} XP</strong></div>
        <div><span class="label">Home Base</span><strong>${esc(p.home_base_icao || "Not set")}</strong></div>
      </div>
    </div>

    <div class="card s4 ops-card">
      <div class="ops-section-head"><div><div class="eyebrow">02 • Qualifications</div><h2>Ratings & Authorizations</h2></div><div class="ops-route-chip">${num(qualificationNames.length)} ACTIVE</div></div>
      <div class="pilot-qualifications">${qualificationNames.length ? qualificationNames.map((q) => `<span>${esc(q)}</span>`).join("") : '<p class="small">No additional qualifications recorded.</p>'}</div>
    </div>

    <div class="card s4 ops-card">
      <div class="ops-section-head"><div><div class="eyebrow">03 • Performance</div><h2>Operating Record</h2></div><div class="ops-route-chip">HISTORY</div></div>
      <div class="pilot-performance-list">
        <div><span>Successful operations</span><strong>${num(successful)}</strong></div>
        <div><span>Rough flights</span><strong>${num(rough)}</strong></div>
        <div><span>Mission failures</span><strong>${num(failed)}</strong></div>
        <div><span>Scored flights</span><strong>${num(scored.length)}</strong></div>
      </div>
    </div>

    <div class="card s8 ops-card">
      <div class="ops-section-head"><div><div class="eyebrow">04 • Official Logbook</div><h2>Recent Flight Operations</h2><div class="small">The operational history of your FlightOps activity.</div></div><div class="ops-route-chip">LAST ${num(recentFlights.length)}</div></div>
      <div class="pilot-history-list">${recentRows}</div>
    </div>

    <div class="card s4 ops-card">
      <div class="ops-section-head"><div><div class="eyebrow">05 • Aircraft Record</div><h2>Aircraft Flown</h2></div><div class="ops-route-chip">${num(aircraftFlown.length)} TYPES</div></div>
      <div class="pilot-aircraft-list">${aircraftRows}</div>
    </div>

    <div class="card s8 ops-card">
      <div class="ops-section-head"><div><div class="eyebrow">06 • Progression</div><h2>Flight Earnings & Progress</h2></div><div class="ops-route-chip">LIFETIME RECORD</div></div>
      <div class="pilot-progression-grid">
        <div><span class="label">Flight Earnings</span><strong>+${num(totalCredits)} Cr</strong><small>Total recorded mission rewards</small></div>
        <div><span class="label">Flight XP</span><strong>+${num(totalXp)} XP</strong><small>Total recorded flight XP</small></div>
        <div><span class="label">Reputation Earned</span><strong>+${num(totalRep)}</strong><small>Total recorded flight reputation</small></div>
      </div>
    </div>

    <div class="card s4 ops-card pilot-next-card">
      <div class="ops-section-head"><div><div class="eyebrow">07 • Continue Operations</div><h2>Next Action</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> READY</div></div>
      <p class="copy">Your Pilot Record is the permanent operational history behind every FlightOps assignment. Review your record, then return to the Mission Board when you are ready for the next operation.</p>
      <div class="result-actions"><button class="action primary" data-page="missions">Mission Board</button></div>
    </div>
  </div>`;
}
function report() {
  const m = state.active?.missions || state.active;
  if (!m) { state.page = "home"; return home(); }
  const d = legDisplay(m, state.active?.current_leg);
  const choice = (field, values) => `<div class="fleet">${values.map(([v,l]) => `<button class="plane choice ${state.report[field]===v?"selected":""}" data-choice="${field}" data-value="${v}"><b>${l}</b></button>`).join("")}</div>`;
  const legObj = d.leg.leg_objective || m.objective || "Complete the assigned stop objective safely.";
  const story = missionStory(m);
  return `<section class="hero"><div><div class="eyebrow">Flight Operations • Post-Flight Debrief</div><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="ops-route-chip"><span class="ops-dot"></span> DEBRIEF</span><span class="ops-route-chip">LEG ${d.current}/${d.count}</span><span class="ops-route-chip">LIVE WEATHER</span></div><h1>${esc(missionTitle(m))}</h1><p>${esc(d.leg.origin_icao)} → ${esc(d.leg.destination_icao)} • Record the flight honestly and accurately.</p></div></section>
  <div class="grid">
    <div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">MISSION STORY • ${missionStoryTitle(m)}</div><h2>Why This Flight Happened</h2></div><div class="ops-route-chip">DISPATCH CONTEXT</div></div><p class="copy">${story}</p></div>
    <div class="card s8 ops-card"><div class="ops-section-head"><div><div class="eyebrow">01 • Flight Outcome</div><h2>How did the flight go?</h2></div><div class="ops-icon">✓</div></div>
      <div class="label">Overall outcome</div>${choice("outcome",[["successful","Successful"],["rough","Rough Flight"],["failed","Mission Failed"]])}
      <div class="label">Landing performance</div>${choice("landing",[["good","Good"],["hard","Hard"],["go_around","Go-around"]])}
      <div class="label">Aircraft condition</div>${choice("condition",[["no_issues","No Damage"],["minor_issue","Minor Issue"],["significant_damage","Significant Damage"]])}
      <div class="label">Weather encountered</div>${choice("weather",[["clear","Clear / VMC"],["overcast","Overcast"],["wind","Strong Winds"],["rain","Rain"],["low_visibility","Low Visibility"],["imc","IMC"],["turbulence","Turbulence"],["storms","Storms"]])}
    </div>
    <div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">02 • Flight Record</div><h2>Log the actual flight</h2></div><div class="ops-icon">✈</div></div>
      <div class="detail"><div class="label">Flight Time</div><input id="flight-minutes" type="number" min="0" step="1" inputmode="numeric" placeholder="Minutes" aria-label="Flight time in minutes" value="${esc(state.report.flightMinutes || "")}"></div>
      <div class="detail"><div class="label">Distance Flown</div><input id="distance-nm" type="number" min="0" step="1" inputmode="numeric" placeholder="NM" aria-label="Distance flown in nautical miles" value="${esc(state.report.distanceNm || "")}"></div>
      <p class="small">Enter the actual time and distance shown by your MSFS flight, not the mission estimate.</p>
    </div>
     ${missionPayloadCard(m)}

    <div class="card s8 ops-card"><div class="ops-section-head"><div><div class="eyebrow">03 • Mission Objective</div><h2>Was the objective completed?</h2></div><div class="ops-route-chip">MISSION STANDARD</div></div>
      <div class="callout"><b>Assigned objective:</b><br>${esc(legObj)}<br><span class="small">This result directly affects mission pay, XP, reputation and whether the mission advances.</span></div>
      ${choice("objective",[["completed","Completed"],["partial","Partial"],["not_completed","Not Completed"]])}
    </div>
    <div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">04 • Weather Verification</div><h2>Live Weather</h2></div><div class="ops-icon">☁</div></div>
      <div class="notice"><b>REQUIRED</b><br>FlightOps missions must be flown using MSFS 2024 Live Weather.</div>
      <label class="small"><input id="live-weather-confirm" type="checkbox" ${state.report.liveWeatherConfirm ? "checked" : ""}> I confirm this mission was flown in MSFS 2024 using Live Weather.</label>
    </div>
    <div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">05 • Pilot Report</div><h2>Operational Notes</h2></div><div class="ops-route-chip">PILOT REPORT</div></div>
      <label class="label" for="notes">Notable event / pilot notes</label><textarea id="notes" placeholder="Record weather, diversions, passenger/cargo issues, go-arounds, abnormal events, or anything FlightOps should know.">${esc(state.report.notes)}</textarea>
    </div>
    <div class="card s8 ops-card"><div class="ops-section-head"><div><div class="eyebrow">06 • Submission Review</div><h2>Before you file the report</h2></div><div class="ops-icon">◆</div></div>
      <div class="details"><div class="detail"><div class="label">Mission</div><strong>${esc(missionTitle(m))}</strong></div><div class="detail"><div class="label">Aircraft</div><strong>${esc(aircraftName(m.aircraft_master || m))}</strong></div><div class="detail"><div class="label">Route</div><strong>${esc(d.leg.origin_icao)} → ${esc(d.leg.destination_icao)}</strong></div><div class="detail"><div class="label">Leg</div><strong>${d.current} / ${d.count}</strong></div></div>
      <p class="small">FlightOps will calculate the final credits, XP, reputation and performance score after submission.</p>
      <button class="action primary" data-action="complete" ${state.submitting ? "disabled" : ""}>${state.submitting ? "Filing Report…" : (d.count > 1 ? `File Leg ${d.current} Flight Report` : "File Flight Report")}</button>
    </div>
    <div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">07 • Dispatch Result</div><h2>${d.count > 1 && d.current < d.count ? "Next Leg" : "Mission Completion"}</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> PENDING</div></div><p class="copy">${d.count > 1 && d.current < d.count ? "A successful submission advances the dispatch to the next leg. An incomplete objective still advances with reduced rewards." : "Final mission rewards are calculated after the report is accepted."}</p></div>
  </div>`;
}
function updates() {
  const items = state.announcements || [];
  const label = (category) => ({
    feature: "🆕 FEATURE",
    aircraft: "✈️ AIRCRAFT",
    mission: "🗺️ MISSION",
    fix: "🛠️ FIX",
    notice: "📢 NOTICE",
    general: "📣 UPDATE",
  }[category] || "📣 UPDATE");
  return `<section class="hero"><div><div class="eyebrow">FlightOps Communications</div><h1>Updates & Release Notes</h1><p>Follow new features, aircraft, missions, fixes, and important pilot notices as FlightOps continues to evolve.</p></div><div><div class="label">Published Updates</div><div class="money">${items.length}</div></div></section>
  <div class="grid">${items.length ? items.map((a) => `<div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">${label(a.category)}</div><h2>${esc(a.title)}</h2></div><div class="ops-route-chip">${esc(new Date(a.published_at).toLocaleDateString())}</div></div><p class="copy">${esc(a.body)}</p></div>`).join("") : '<div class="card s12"><h2>No release notes yet</h2><p class="small">New FlightOps changes will appear here automatically.</p></div>'}</div>`;
}

function admin() {
  const a = state.adminOverview || {};
  const staff = state.adminStaff || [];
  const companies = state.adminCompanies || [];
  const pilots = state.adminPilots || [];
  const assignments = state.adminAssignments || [];
  const independentCompanies = state.adminIndependentCompanies || [];
  const cards = [
    ["Pilots", a.pilots, "Registered pilot profiles"],
    ["Flight Reports", a.flight_reports, "Completed/debriefed flights"],
    ["Active Staff", a.active_staff, "Employee pilots"],
    ["New Feedback", a.new_feedback, "Feedback awaiting review"],
    ["Missions", a.missions, "Mission records"],
    ["Company Revenue", a.company_revenue || 0, "Reported staff/company revenue"],
  ];
  const staffRows = staff.length ? staff.map((s) =>
    '<div class="mission"><div><strong>' + esc(s.employee_name) + '</strong><div class="small">Owner: ' + esc(s.owner_name) + ' • ' +
    num(s.experience_hours) + ' hrs • ' + esc(s.qualification_id) + '</div><div class="small">' +
    esc(Array.isArray(s.specialties) ? s.specialties.join(" • ") : "") + ' • Reliability ' + num(s.reliability) +
    '% • Safety ' + num(s.safety_score) + '%</div></div><div><div class="reward">' + num(s.credits_generated) +
    ' Cr</div><div class="small">' + num(s.company_flights) + ' flights • ' + num(s.employee_xp) + ' XP</div></div></div>'
  ).join("") : '<p class="copy">No employee pilots have been hired yet.</p>';
  const pilotRows = pilots.length ? pilots.map((p) =>
    '<div class="mission"><div><strong>' + esc(p.pilot_name) + '</strong><div class="small">' + esc(p.callsign || "") +
    ' • Level ' + num(p.level) + ' • Home ' + esc(p.home_base_icao || "—") + '</div><div class="small">' +
    num(p.total_flights) + ' flights • ' + num(p.completed_missions) + ' completed • ' + num(p.failed_missions) +
    ' failed • ' + num(p.total_nm) + ' NM</div></div><div><div class="reward">' + num(p.credits) + ' Cr</div><div class="small">' +
    num(p.xp) + ' XP • Rep ' + num(p.reputation) + '</div></div></div>'
  ).join("") : '<p class="copy">No pilot profiles found.</p>';
  const assignmentRows = assignments.length ? assignments.slice(0,20).map((x) =>
    '<div class="mission"><div><strong>' + esc(x.employee_name) + '</strong><div class="small">' +
    esc(x.owner_name) + ' • ' + esc(x.mission_title || "Mission") + ' • ' + esc(x.aircraft_id) +
    '</div><div class="small">Dispatched ' + esc(x.status) + '</div></div><div><div class="reward">' +
    num(x.earned_credits) + ' Cr</div><div class="small">' + num(x.earned_xp) + ' XP • ' + num(x.employee_xp) + ' employee XP</div></div></div>'
  ).join("") : '<p class="copy">No staff assignments have been recorded.</p>';
  const independentCompanyRows = independentCompanies.length ? independentCompanies.map((c) =>
    '<div class="mission"><div><strong>' + esc(c.company_name) + '</strong><div class="small">' + esc(c.callsign || "") + ' • Founder: ' + esc(c.founder_name || "—") + ' • Base ' + esc(c.home_base_icao || "—") + '</div><div class="small">Level ' + num(c.level) + ' • ' + num(c.xp) + ' XP • ' + num(c.company_flights) + ' flights • Fleet ' + num(c.fleet_count) + '/' + num(c.fleet_capacity) + '</div></div><div><div class="reward">' + num(c.revenue) + ' Cr</div><div class="small">' + (c.active ? 'ACTIVE' : 'INACTIVE') + '</div></div></div>'
  ).join("") : '<p class="copy">No independent companies have been created yet.</p>';
  const companyRows = companies.length ? companies.map((p) =>
    '<div class="mission"><div><strong>' + esc(p.pilot_name) + '</strong><div class="small">' + esc(p.callsign || "") +
    ' • Level ' + num(p.level) + ' • ' + num(p.total_flights) + ' flights</div></div><div><div class="reward">' +
    num(p.company_revenue) + ' Cr</div><div class="small">' + num(p.company_xp) + ' company XP</div></div></div>'
  ).join("") : '<p class="copy">No company activity has been generated yet.</p>';
  return '<section class="hero"><div><div class="eyebrow">FlightOps Administration</div><h1>Command Center</h1><p>Administrator view of the FlightOps PS5 operation. Your pilot account remains separate from your pilot career.</p></div><div class="hero-stat"><b>ADMIN</b><span>Super Administrator</span></div></section><section class="grid">' +
    cards.map((x) => '<div class="card s4 ops-card"><div class="label">' + esc(x[0]) + '</div><div class="stat">' +
      (x[0] === "Company Revenue" ? num(x[1]) + " Cr" : num(x[1])) + '</div><div class="small">' + esc(x[2]) + '</div></div>').join("") +
    '<div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Pilots</div><h2>Pilot roster</h2></div><div class="ops-route-chip">' + num(pilots.length) + ' pilots</div></div>' + pilotRows + '</div>' +
    '<div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Crew & Staff</div><h2>Employee pilots</h2></div><div class="ops-route-chip">' + num(staff.length) + ' records</div></div>' + staffRows + '</div>' +
    '<div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Staff Operations</div><h2>Assignment history</h2></div><div class="ops-route-chip">' + num(assignments.length) + ' assignments</div></div>' + assignmentRows + '</div>' +
    '<div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Companies</div><h2>Company performance</h2></div><div class="ops-route-chip">' + num(companies.length) + ' operators</div></div>' + companyRows + '</div>' +
    '<div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Independent Operators</div><h2>Employee-founded companies</h2></div><div class="ops-route-chip">' + num(independentCompanies.length) + ' companies</div></div>' + independentCompanyRows + '</div>' +
    '<div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">System Control</div><h2>FlightOps is running</h2></div><div class="ops-route-chip">ADMIN ACCESS</div></div><p class="copy">The command center now covers pilot roster, staffing, company performance, and staff assignment history.</p><div class="callout"><b>Separation:</b> Admin activity is separate from your Tone73 pilot.</div></div></section>';
}

function employeeFitScore(employee, mission) {
  let score = 50;
  const specs = Array.isArray(employee?.specialties) ? employee.specialties : [];
  const type = String(mission?.mission_type || "").toUpperCase();
  const hours = Number(employee?.experience_hours || 0);
  if (hours >= 1500) score += 8; else if (hours >= 500) score += 4;
  if (Number(employee?.safety_score || 0) >= 95) score += 8; else if (Number(employee?.safety_score || 0) >= 90) score += 4; else if (Number(employee?.safety_score || 0) < 85) score -= 6;
  if (Number(employee?.reliability || 0) >= 95) score += 8; else if (Number(employee?.reliability || 0) >= 90) score += 4; else if (Number(employee?.reliability || 0) < 85) score -= 5;
  if ((type === "CARGO" || type === "SUPPLY") && specs.includes("Cargo")) score += 15;
  if (["CHARTER","EXECUTIVE","VIP"].includes(type) && specs.includes("Charter")) score += 15;
  if ((type === "CARGO" || type === "SUPPLY") && specs.includes("Bush")) score += 8;
  if (["MEDICAL","MEDEVAC"].includes(type) && specs.includes("Medical")) score += 15;
  return Math.max(1, Math.min(100, score));
}
function employeeFitLabel(score) {
  return score >= 85 ? "Excellent Fit" : score >= 70 ? "Strong Fit" : score >= 55 ? "Potential Fit" : "Weak Fit";
}
async function loadStaffCareer(staffId) {
  if (!sb || !staffId) return [];
  const result = await sb.rpc("staff_career_history_list", { p_staff_id: staffId });
  return result.error ? [] : (result.data || []);
}
async function loadTraining(staffId) {
  if (!sb || !staffId) return [];
  const result = await sb.from("staff_training").select("*,staff_training_programs(*)").eq("staff_id", staffId).eq("owner_pilot_id", state.profile?.id).order("started_at",{ascending:false});
  return result.error ? [] : (result.data || []);
}
function crew() {
  const s = state.staffStatus || {};
  const staff = state.staff || [];
  const candidates = state.staffCandidates || [];
  const missions = state.missions || [];
  const owned = state.aircraft || [];
  const aircraftForMission = (m, employee) => owned.filter((pa) => {
    const ac = pa.aircraft_master;
    if (!ac || pa.status === "inactive") return false;
    const choices = Array.isArray(m.compatible_aircraft) ? m.compatible_aircraft.map((x) => x.id) : [];
    const allowed = choices.length ? choices.includes(ac.id) : (m.required_aircraft_id ? m.required_aircraft_id === ac.id : true);
    const req = String(m.required_qualification_id || "").toUpperCase();
    const qualCodes = new Set(
      staffQualificationCodes(employee?.id).map((x) => String(x || "").toUpperCase()),
    );
    const qualificationOk =
      !req ||
      (req === "PPL" && (qualCodes.has("PPL") || qualCodes.has("CPL"))) ||
      (req === "CPL" && qualCodes.has("CPL")) ||
      (req === "IR" && qualCodes.has("IR")) ||
      (["MULTI", "TURBOPROP", "JET", "LONG"].includes(req) && qualCodes.has(req));
    const baseOk = !employee?.home_base_icao || !pa.base_icao || pa.base_icao === employee.home_base_icao;
    return allowed && qualificationOk && baseOk;
  });
  const assignments = state.staffAssignments || [];
  const trainingRows = (state.staffTraining || []).map((t) => {
    const employee = staff.find((e) => e.id === t.staff_id);
    const program = t.staff_training_programs || state.staffTrainingPrograms.find((p) => p.id === t.program_id) || {};
    return { ...t, employee, program };
  });
  const activeTraining = trainingRows.filter((t) => t.status === "active").sort((a,b) => new Date(a.completes_at || 0) - new Date(b.completes_at || 0));
  const completedTraining = trainingRows.filter((t) => t.status === "completed").slice(0, 8);
  const trainingDashboard = "";
  const trainingOptions = "";

  const staffOps = state.staffOpsStatus || {};
  const ownerCanOperate = staffOps.can_dispatch_employee !== false;
  const activeDispatchBlocks = staff
    .map((e) => {
      const activeAssignment = assignments.find((a) => a.staff_id === e.id && a.status === "dispatched");
      if (!activeAssignment) return "";
      return '<div class="card s6 ops-card"><div class="eyebrow">ACTIVE EMPLOYEE FLIGHT</div><h2>' + esc(e.employee_name) +
        '</h2><p class="copy">' + num(e.experience_hours) + ' hrs • Level ' + num(e.employee_level || 1) + ' • ' + esc(staffQualificationText(e.id)) + ' • ' +
        num(e.monthly_salary) + ' Cr/month • Base ' + esc(e.home_base_icao || state.profile?.home_base_icao || '—') + '</p>' +
        '<div class="callout"><b>✈️ IN FLIGHT / DISPATCHED</b><br>' +
        esc(activeAssignment.mission?.title || activeAssignment.mission_id) + ' • ' + esc((activeAssignment.mission?.origin_icao || e.home_base_icao || "—") + " → " + (activeAssignment.mission?.destination_icao || "—")) +
        '<br>Aircraft: ' + esc(activeAssignment.aircraft_master?.model || activeAssignment.aircraft_id) +
        '<br><span class="small">Projected contract revenue: ' + num(activeAssignment.mission?.reward_credits || activeAssignment.mission?.base_reward || 0) + ' Cr</span>' +
        '<br><div class="notice"><b>⏳ EMPLOYEE FLIGHT PENDING</b><br>This employee flight will complete automatically after you complete your next personal flight.</div>' +
        '</div></div>';
    })
    .join("");
  const availableStaffBlocks = staff
    .map((e) => {
      const activeAssignment = assignments.find((a) => a.staff_id === e.id && a.status === "dispatched");
      const activeTrainingRecord = activeTraining.find((t) => t.staff_id === e.id);
      if (activeAssignment) return "";
      if (activeTrainingRecord) return '<div class="card s6 ops-card"><div class="eyebrow">UNAVAILABLE</div><h2>' + esc(e.employee_name) + '</h2><p class="copy">' + num(e.experience_hours) + ' hrs • Level ' + num(e.employee_level || 1) + ' • ' + esc(staffQualificationText(e.id)) + ' • Base ' + esc(e.home_base_icao || state.profile?.home_base_icao || "—") + '</p><div class="notice"><b>🎓 IN TRAINING ACADEMY</b><br>' + esc(activeTrainingRecord.program?.name || activeTrainingRecord.program_id || "Training") + '<br><span class="small">Unavailable for company flight assignments until training is completed.</span></div></div>';
      const eligible = missions.filter((m) => m.active !== false && aircraftForMission(m, e).length).slice(0, 6);
      const options = eligible.map((m) => {
        const ac = aircraftForMission(m, e)[0];
        const fit = employeeFitScore(e, m);
        return '<option value="' + esc(m.id + "|" + ac.aircraft_id) + '">' + esc((m.title || "Contract") + " • " + (m.origin_icao || "—") + " → " + (m.destination_icao || "—") + " • " + num(m.reward_credits || 0) + " Cr • " + fit + "% fit") + '</option>';
      }).join("");
      const firstFit = eligible.length ? employeeFitScore(e, eligible[0]) : 0;
      return '<div class="card s6 ops-card"><div class="eyebrow">READY FOR DISPATCH</div><h2>' + esc(e.employee_name) +
        '</h2><p class="copy">' + num(e.experience_hours) + ' hrs • Level ' + num(e.employee_level || 1) + ' • ' + staffQualificationText(e.id) + ' • Base ' + esc(e.home_base_icao || state.profile?.home_base_icao || '—') + '</p>' +
        (eligible.length && ownerCanOperate ? '<label class="label">Available company contract<select data-staff-contract="' + esc(e.id) + '">' + options +
        '</select></label><div class="small">Pilot profile match: <b>' + firstFit + '% — ' + employeeFitLabel(firstFit) + '</b>. The selected pilot profile influences company performance.</div><button class="action primary" data-dispatch-staff="' + esc(e.id) + '">Dispatch Pilot</button>' :
        (eligible.length && !ownerCanOperate ? '<div class="notice"><b>Owner flight required.</b> Complete a personal flight before dispatching another employee contract.</div>' :
        '<div class="callout">No eligible owned-aircraft contracts are currently available for this employee.</div>')) +
        '</div>';
    })
    .join("");
  const staffCards = staff.length
    ? staff.map((e) => {
      const training = activeTraining.find((t) => t.staff_id === e.id);
      return '<div class="card s4 ops-card"><div class="eyebrow">' + (training ? 'EMPLOYEE PILOT • UNAVAILABLE' : 'EMPLOYEE PILOT') + '</div><h2>' + esc(e.employee_name) + '</h2><p class="copy">' + staffQualificationText(e.id) + ' • Base ' + esc(e.home_base_icao || state.profile?.home_base_icao || "—") + '</p><div class="details"><div class="detail"><div class="label">Level</div><strong>' + num(e.employee_level || 1) + '</strong></div><div class="detail"><div class="label">Company flights</div><strong>' + num(e.company_flights) + '</strong></div><div class="detail"><div class="label">Employee XP</div><strong>' + num(e.employee_xp) + '</strong></div><div class="detail"><div class="label">Salary</div><strong>' + num(e.monthly_salary) + ' Cr / month</strong></div></div>' + (training ? '<div class="notice"><b>🎓 IN TRAINING ACADEMY</b><br>' + esc(training.program?.name || training.program_id || "Training") + '<br><span class="small">Unavailable for company operations until training is completed.</span></div>' : '') + '<div class="small">Reliability ' + num(e.reliability) + '% • Safety ' + num(e.safety_score || 0) + '% • ' + num(e.experience_hours) + ' hrs • Credits generated ' + num(e.credits_generated) + ' Cr</div>' + (Number(e.employee_level || 1) >= 10 && Number(e.company_flights || 0) >= 25 && Number(e.employee_xp || 0) >= 35000 ? '<div class="callout"><b>Independent operator path unlocked.</b> This pilot can eventually leave and establish their own company.</div>' : '') + '<button class="action" data-history-staff="' + esc(e.id) + '">View Career History</button> ' + (training ? '<button class="action" disabled title="Pilot is currently attending the Training Academy.">Training • IN ACADEMY</button>' : '<button class="action" data-training-staff="' + esc(e.id) + '">Training</button>') + ' ' + (training ? '<button class="action" disabled title="Pilot cannot be terminated while in training.">Fire Pilot • LOCKED</button>' : '<button class="action" data-fire-staff="' + esc(e.id) + '" data-staff-name="' + esc(e.employee_name) + '">Fire Pilot</button>') + '</div>';
    }).join("")
    : '<div class="card s12 ops-card"><h2>No employees yet</h2><p class="copy">Hire a pilot from Recruiting when you are ready.</p></div>';
  const completedOperations = assignments
    .filter((a) => a.status === "completed")
    .sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0))
    .slice(0, 5)
    .map((a) => '<div class="historyrow"><div><b>✅ ' + esc(a.employee_name || a.staff_name || "Employee pilot") + '</b><br><span class="small">' + esc(a.mission?.title || a.mission_title || a.mission_id || "Company contract") + ' • ' + esc((a.mission?.origin_icao || a.origin_icao || "—") + " → " + (a.mission?.destination_icao || a.destination_icao || "—")) + '</span></div><div class="reward">+' + num(a.earned_credits || 0) + ' Cr<br><span class="small">+' + num(a.earned_xp || 0) + ' XP</span></div></div>')
    .join("");
  const completedOperationsCard = completedOperations
    ? '<div class="s12"><div class="ops-section-head"><div><div class="eyebrow">Company Activity</div><h2>Completed employee operations</h2></div><div class="ops-route-chip">AUTO-RESOLVED</div></div><div class="card ops-card">' + completedOperations + '</div></div>'
    : "";
  const candidateCards = candidates.map((c) => '<div class="card s4 ops-card"><div class="eyebrow">AVAILABLE PILOT</div><h2>' + esc(c.candidate_name) + '</h2><p class="copy">' + num(c.experience_hours) + ' hrs • ' + esc(c.qualification_id) + '</p><div class="details"><div class="detail"><div class="label">Specialties</div><strong>' + esc(Array.isArray(c.specialties) ? c.specialties.join(" • ") : "") + '</strong></div><div class="detail"><div class="label">Reliability</div><strong>' + num(c.reliability) + '%</strong></div><div class="detail"><div class="label">Safety record</div><strong>' + num(c.safety_score) + '%</strong></div><div class="detail"><div class="label">Salary</div><strong>' + num(c.monthly_salary) + ' Cr / month</strong></div></div><button class="primary" data-hire-staff="' + esc(c.id) + '">Hire Pilot</button></div>').join("");
  const modalStaff = staff.find(e => e.id === state.trainingStaffId);
  const modalPrograms = modalStaff ? (state.staffTrainingPrograms || []).filter(p => Number(modalStaff.employee_level || 1) >= Number(p.required_level || 1)) : [];
  const modalProgram = modalPrograms.find(p => p.id === state.trainingProgramId);
  const trainingModal = modalStaff ? `
    <div class="training-modal-backdrop" data-training-cancel>
      <div class="training-modal" role="dialog" aria-modal="true" aria-labelledby="training-modal-title">
        <div class="eyebrow">EMPLOYEE DEVELOPMENT</div>
        <h2 id="training-modal-title">${esc(modalStaff.employee_name)} — Training</h2>
        <p class="copy">Choose a training program for this pilot. Select a program to review the full training description before sending the pilot to the Training Academy.</p>
        ${modalProgram ? `
          <div class="training-detail-card">
            <div class="eyebrow">TRAINING PROGRAM</div>
            <h3>${esc(modalProgram.name)}</h3>
            <p class="copy">${esc(modalProgram.description || "No description available.")}</p>
            <div class="training-investment"><div class="training-investment-block"><div class="label">Why this training is necessary</div><p>${esc(modalProgram.id === "INSTRUMENT" ? modalStaff.employee_name + " is beginning his company career. This training gives him a formal foundation for operating safely when weather, visibility, and routing become more demanding." : "This program develops a specific capability " + modalStaff.employee_name + " needs for the next stage of his company career.")}</p></div><div class="training-investment-block"><div class="label">Why invest in Taylor</div><p>${esc(modalProgram.id === "INSTRUMENT" ? "Instrument capability makes Taylor more useful to the company, improves his suitability for demanding operations, and establishes the foundation for later qualifications." : "The investment increases Taylor's operational value and expands the company contracts he can handle as he progresses.")}</p></div><div class="training-investment-block"><div class="label">Expected company benefit</div><p>${esc("Taylor receives the " + (modalProgram.name || "training") + " qualification path, " + num(modalProgram.xp_reward || 0) + " XP, and progression toward higher-level company operations.")}</p></div></div>
            <div class="details training-modal-details">
              <div class="detail"><div class="label">Cost</div><strong>${num(modalProgram.cost_credits || 0)} Cr</strong></div>
              <div class="detail"><div class="label">Duration</div><strong>${num(modalProgram.duration_days || 0)} days</strong></div>
              <div class="detail"><div class="label">XP Reward</div><strong>+${num(modalProgram.xp_reward || 0)} XP</strong></div>
              <div class="detail"><div class="label">Required Level</div><strong>Level ${num(modalProgram.required_level || 1)}</strong></div>
            </div>
            <div class="callout"><b>Qualification:</b> ${esc(modalProgram.qualification_id || "—")}<br><span class="small">Company investment: the cost is paid now, Taylor is unavailable for company operations while training is active, and the qualification and XP are awarded when the Academy program is completed.</span></div>
            <div class="training-modal-actions">
              <button class="action" data-training-back>Back to Training List</button>
              <button class="action primary" data-training-send>Send to Training Academy</button>
              <button class="action" data-training-cancel>Cancel</button>
            </div>
          </div>` : `
          <div class="training-program-list">
            ${modalPrograms.length ? modalPrograms.map(p => `
              <button type="button" class="training-program-option" data-training-program="${esc(modalStaff.id)}|${esc(p.id)}">
                <span><b>${esc(p.name)}</b><small>Level ${num(p.required_level || 1)} • ${num(p.duration_days || 0)} days • +${num(p.xp_reward || 0)} XP</small></span>
                <strong>${num(p.cost_credits || 0)} Cr</strong>
              </button>`).join("") : '<div class="callout">No training programs are currently available for this employee.</div>'}
          </div>`}
      </div>
    </div>` : "";
  return '<section class="hero"><div><div class="eyebrow">FlightOps Crew & Staff</div><h1>Build your operation.</h1><p>Hire pilots based on experience, qualifications, reliability, and cost — then put them to work on company contracts.</p></div><div class="hero-stat"><b>' + num(s.company_xp || 0) + '</b><span>Company XP</span></div></section><section class="grid"><div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Hiring Status</div><h2>Employee pilots</h2></div><div class="ops-route-chip">' + num(s.active_staff || 0) + ' / ' + num(s.max_staff || 0) + '</div></div><p class="copy">Your first employee pilot costs one month of salary up front. Company assignments generate company revenue, company XP, and employee experience.</p><div class="callout"><b>Company revenue:</b> ' + num(s.company_revenue || 0) + ' Cr<br><span class="small"><b>Owner activity:</b> ' + num(staffOps.owner_flights || 0) + ' personal flights • ' + num(staffOps.employee_flights || 0) + ' employee flights resolved • <b>' + num(staffOps.available_operation_slots || 0) + '</b> employee operation slot(s) available.</span></div></div><div class="s12"><div class="ops-section-head"><div><div class="eyebrow">Dispatch Board</div><h2>Put your staff to work</h2></div></div></div>' + (activeDispatchBlocks || '<div class="card s12 ops-card"><p class="copy">No employee is currently in flight.</p></div>') + '<div class="s12"><div class="ops-section-head"><div><div class="eyebrow">Available Staff</div><h2>Ready for dispatch</h2></div></div></div>' + (availableStaffBlocks || '<div class="card s12 ops-card"><p class="copy">No employees are currently available for another company contract.</p></div>') + completedOperationsCard + '<div class="s12"><div class="ops-section-head"><div><div class="eyebrow">Your Staff</div><h2>Current employees</h2></div></div></div>' + staffCards + '</section>' + trainingModal;
}

function training() {
  const staff = state.staff || [];
  const rows = (state.staffTraining || []).map((t) => ({
    ...t,
    employee: staff.find((e) => e.id === t.staff_id),
    program: t.staff_training_programs || state.staffTrainingPrograms.find((p) => p.id === t.program_id) || {},
  }));
  const active = rows.filter((t) => t.status === "active").sort((a,b) => new Date(a.completes_at || 0) - new Date(b.completes_at || 0));
  const completed = rows.filter((t) => t.status === "completed").slice(0, 12);
  const activeRows = active.length ? active.map(t => {
    const ready = t.completes_at && new Date(t.completes_at) <= new Date();
    return '<div class="historyrow"><div><b>' + esc(t.employee?.employee_name || "Employee pilot") + '</b><br><span class="small">' + esc(t.program?.name || t.program_id || "Training") + '</span></div><div><b>' + (ready ? "READY TO COMPLETE" : new Date(t.completes_at).toLocaleDateString()) + '</b><br><span class="small">Started ' + new Date(t.started_at).toLocaleDateString() + '</span></div><div>' + (ready ? '<button class="action primary" data-complete-training="' + esc(t.id) + '">Complete Training</button>' : '<span class="small">' + num(t.cost_paid || 0) + ' Cr paid</span>') + '</div></div>';
  }).join("") : '<div class="callout"><b>Training Academy is ready.</b><br>No employee has been sent to training yet. Go to <b>Crew</b>, select an employee, choose <b>Training</b>, review a program, and send the pilot to the Academy.</div>';
  const completedRows = completed.length
    ? completed.map(t => '<div class="historyrow"><div><b>' + esc(t.employee?.employee_name || "Employee pilot") + '</b><br><span class="small">' + esc(t.program?.name || t.program_id || "Training") + '</span></div><div class="small">Completed ' + (t.completed_at ? new Date(t.completed_at).toLocaleDateString() : "—") + '<br>+' + num(t.xp_reward || 0) + ' XP</div></div>').join("")
    : "";
  return '<section class="hero"><div><div class="eyebrow">FlightOps Staff Development</div><h1>Training Academy.</h1><p>Employees only appear here after you approve their training. Select training from the employee profile in Crew, review the program, and send the pilot to the Academy.</p></div><div class="hero-stat"><b>' + num(active.length) + '</b><span>Active programs</span></div></section><section class="grid"><div class="s12"><div class="ops-section-head"><div><div class="eyebrow">Academy Operations</div><h2>Employees in Training</h2></div><div class="ops-route-chip">' + num(active.length) + ' ACTIVE</div></div><div class="card ops-card">' + activeRows + '</div></div>' + (completedRows ? '<div class="s12"><div class="ops-section-head"><div><div class="eyebrow">Training History</div><h2>Recently Completed</h2></div></div><div class="card ops-card">' + completedRows + '</div></div>' : '') + '</section>';
}

function recruiting() {
  const s = state.staffStatus || {};
  const candidates = state.staffCandidates || [];
  const candidateCards = candidates.length
    ? candidates.map((c) => {
      const open = state.recruitProfileId === c.id;
      return '<div class="card s4 ops-card"><div class="eyebrow">AVAILABLE PILOT</div><h2>' + esc(c.candidate_name) + '</h2><p class="copy">' + num(c.experience_hours) + ' hrs • ' + esc(c.qualification_id) + '</p><div class="details"><div class="detail"><div class="label">Specialties</div><strong>' + esc(Array.isArray(c.specialties) ? c.specialties.join(" • ") : "") + '</strong></div><div class="detail"><div class="label">Reliability</div><strong>' + num(c.reliability) + '%</strong></div><div class="detail"><div class="label">Safety record</div><strong>' + num(c.safety_score) + '%</strong></div><div class="detail"><div class="label">Salary</div><strong>' + num(c.monthly_salary) + ' Cr / month</strong></div></div>' + (open ? '<div class="callout"><b>Pilot Profile</b><p><b>Education</b><br>' + esc(c.degree || "") + ' — ' + esc(c.education || "") + '<br>' + esc(c.school || "") + '</p><p><b>Professional Background</b><br>' + esc(c.experience_summary || c.bio || "") + '</p><p><b>Previous Employer</b><br>' + esc(c.previous_employer || "—") + '</p><p><b>Home Region</b><br>' + esc(c.home_region || "—") + '</p><p><b>Certifications</b><br>' + esc(Array.isArray(c.certifications) ? c.certifications.join(" • ") : "—") + '</p><p><b>Aircraft Experience</b><br>' + esc(Array.isArray(c.aircraft_experience) ? c.aircraft_experience.join(" • ") : "—") + '</p><p><b>Career Ambition</b><br>' + esc(c.career_ambition || "—") + '</p></div>' : '') + '<button class="action" data-view-recruit="' + esc(c.id) + '">' + (open ? "Hide Profile" : "View Full Profile") + '</button> <button class="primary" data-hire-staff="' + esc(c.id) + '">Hire Pilot</button></div>';
    }).join("")
    : '<div class="card s12 ops-card"><p class="copy">No pilots are currently available.</p></div>';
  return '<section class="hero"><div><div class="eyebrow">FlightOps Recruiting</div><h1>Find your next pilot.</h1><p>Recruitment is separate from Crew operations. Review candidates here, then manage hired employees from the Crew tab.</p></div><div class="hero-stat"><b>' + num(s.active_staff || 0) + ' / ' + num(s.max_staff || 0) + '</b><span>Staff positions</span></div></section><section class="grid"><div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Recruiting Status</div><h2>Hiring capacity</h2></div><div class="ops-route-chip">' + num(s.active_staff || 0) + ' / ' + num(s.max_staff || 0) + '</div></div><p class="copy">Your first employee pilot costs one month of salary up front. Choose pilots based on experience, qualification, specialties, reliability, safety record, and cost.</p><div class="callout"><b>Company revenue:</b> ' + num(s.company_revenue || 0) + ' Cr<br><span class="small"><b>Hiring unlocked:</b> Level ' + num(s.level || state.profile?.level || 1) + ' • <b>' + num(s.max_staff || 0) + '</b> staff positions available.</span></div></div><div class="s12"><div class="ops-section-head"><div><div class="eyebrow">Hiring Board</div><h2>Choose your pilot</h2></div><div class="ops-route-chip">RECRUITING</div></div></div>' + candidateCards + '</section>';
}
function feedback() {
  const stars = [1, 2, 3, 4, 5].map((n) =>
    '<button type="button" class="plane choice ' + (state.feedbackRating === n ? "selected" : "") + '" data-feedback-rating="' + n + '"><b>' + "★".repeat(n) + '</b><span class="small">' + n + '/5</span></button>'
  ).join("");
  return '<section class="hero"><div><div class="eyebrow">FlightOps Pilot Feedback</div><h1>Help us improve FlightOps.</h1><p>This is an early pilot test. Tell us what works, what does not, and what you want added. Your feedback goes directly into the FlightOps feedback log.</p></div></section>' +
  '<div class="grid">' +
  '<div class="card s8 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Pilot Feedback</div><h2>Send us your input</h2></div><div class="ops-route-chip">FEEDBACK</div></div>' +
  '<label class="label">Feedback type<select id="feedback-category"><option value="general">General feedback</option><option value="bug">Bug / something not working</option><option value="mission">Mission / flight operations</option><option value="career">Career progression</option><option value="ui">Website / user interface</option><option value="feature_request">Feature request</option><option value="other">Other</option></select></label>' +
  '<div class="label">Overall experience<div class="fleet">' + stars + '</div></div>' +
  '<label class="label" for="feedback-message">Your feedback<textarea id="feedback-message" maxlength="4000" placeholder="What do you like? What should we change? What would make you come back and fly another mission?"></textarea></label>' +
  '<button class="action primary" data-action="submit-feedback">Send Feedback</button><p class="small">Please do not include passwords, payment information, or other sensitive information.</p></div>' +
  '<div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">What we want to know</div><h2>Be honest</h2></div><div class="ops-icon">◆</div></div>' +
  '<ul class="small"><li>Would you use FlightOps for your MSFS 2024 career?</li><li>What should we add?</li><li>What is confusing or frustrating?</li><li>What would make you fly another mission?</li></ul>' +
  '<div class="callout"><b>Your feedback matters.</b><br>We are using pilot feedback to decide what FlightOps becomes next.</div></div></div>';
}
function auth() {
  return `<section class="hero"><div><div class="eyebrow">Pilot Career</div><h1>Sign in to FlightOps.</h1><p>Your career progression is stored securely in Supabase, not in this browser.</p></div></section><div class="card"><div class="form"><label class="label">Email<input id="email" type="email" autocomplete="email" required></label><label class="label">Password<input id="password" type="password" autocomplete="current-password" required minlength="6"></label><div class="eyebrow">New Pilot Account</div><p class="small">Set your home base. Your career mission geography will grow outward from this airport as you level up.</p><label class="label">Pilot name (new accounts)<input id="pilot-name" maxlength="50" autocomplete="name"></label><label class="label">Callsign (new accounts)<input id="callsign" maxlength="30" autocomplete="nickname"></label><label class="label">Home base airport ICAO (new accounts)<input id="home-base-icao" maxlength="4" minlength="4" autocapitalize="characters" autocomplete="off" placeholder="Example: KCHA" required></label><div class="small">Use the four-letter ICAO code for your home airport. FlightOps uses it as the starting point for your mission geography.</div><div><button class="action primary" data-action="login" ${configured ? "" : "disabled"}>Login</button> <button class="action" data-action="signup" ${configured ? "" : "disabled"}>Create Account</button></div>${configured ? "" : '<div class="notice">Deployment configuration is incomplete. Set <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_PUBLISHABLE_KEY</b> before using FlightOps.</div>'}</div></div>`;
}
function editProfile() {
  return `<div class="card"><div class="eyebrow">Pilot Profile</div><h2>Update pilot details</h2><div class="form"><label class="label">Pilot name<input id="pilot-name" value="${esc(state.profile?.pilot_name || state.profile?.name)}"></label><label class="label">Callsign<input id="callsign" value="${esc(state.profile?.callsign)}"></label><label class="label">Home base airport ICAO<input id="home-base-icao" maxlength="4" minlength="4" autocapitalize="characters" value="${esc(state.profile?.home_base_icao || "")}" placeholder="Example: KCHA"></label><div class="small">Mission geography expands outward from your home base as your career level increases.</div><button class="action primary" data-action="save-profile">Save Profile</button> <button class="action" data-page="pilot">Cancel</button></div></div>`;
}
function render() {
  nav();
  const pageRenderer = !state.session
    ? auth
    : (
        {
          home,
          missions: missionList,
          active: activeView,
          brief,
          hangar,
          pilot,
          result: flightResult,
          career,
          crew,
          training,
          recruiting,
          admin: admin,
          updates,
          feedback,
          report,
          edit: editProfile,
        }[state.page] || home
      );
  $("#app").innerHTML = pageRenderer();
  bind();
}
async function openActivePage() {
  state.page = "active";
  render();
  await loadActiveMissionDirect();
  state.page = "active";
  render();
}

function captureReportInputs() {
  const minutes = $("#flight-minutes")?.value;
  const distance = $("#distance-nm")?.value;
  const notes = $("#notes")?.value;
  const liveWeather = $("#live-weather-confirm")?.checked;
  if (minutes !== undefined) state.report.flightMinutes = minutes;
  if (distance !== undefined) state.report.distanceNm = distance;
  if (notes !== undefined) state.report.notes = notes;
  if (liveWeather !== undefined) state.report.liveWeatherConfirm = liveWeather;
}
function bind() {
  $("#app")
    .querySelectorAll("[data-page]")
    .forEach(
      (b) =>
        (b.onclick = async () => {
          state.page = b.dataset.page;
          render();
          if (state.page === "active") {
            await loadActiveMissionDirect();
            if (state.page === "active") render();
          }
        }),
    );
  $("#app")
    .querySelectorAll("[data-view-recruit]")
    .forEach((b) => {
      b.onclick = () => {
        state.recruitProfileId = state.recruitProfileId === b.dataset.viewRecruit ? null : b.dataset.viewRecruit;
        render();
      };
    });

  $("#app")
    .querySelectorAll("[data-view-recruit]")
    .forEach((b) => {
      b.onclick = () => {
        state.recruitProfileId = state.recruitProfileId === b.dataset.viewRecruit ? null : b.dataset.viewRecruit;
        render();
      };
    });

  $("#app")
    .querySelectorAll("[data-hire-staff]")
    .forEach((b) => {
      b.onclick = async () => {
        if (state.submitting) return;
        state.submitting = true;
        render();
        try {
          const result = await sb.rpc("hire_staff_pilot", { p_candidate_id: b.dataset.hireStaff });
          if (result.error) throw result.error;
          await load();
          state.page = "recruiting";
          render();
          toast("Pilot hired. First month salary paid.");
        } catch (e) {
          state.submitting = false;
          render();
          err(e, "Pilot hiring failed.");
        }
      };
    });

  $("#app").querySelectorAll("[data-training-staff]").forEach((b) => {
    b.onclick = () => {
      state.trainingStaffId = b.dataset.trainingStaff;
      state.trainingProgramId = null;
      state.page = "crew";
      render();
    };
  });
  $("#app").querySelectorAll("[data-training-program]").forEach((b) => {
    b.onclick = () => {
      const parts = String(b.dataset.trainingProgram || "").split("|");
      if (parts.length !== 2) return;
      state.trainingStaffId = parts[0];
      state.trainingProgramId = parts[1];
      render();
    };
  });
  $("#app").querySelectorAll("[data-training-back]").forEach((b) => {
    b.onclick = () => { state.trainingProgramId = null; render(); };
  });
  $("#app").querySelectorAll("[data-training-cancel]").forEach((b) => {
    b.onclick = (e) => {
      if (e.target !== b) return;
      state.trainingStaffId = null;
      state.trainingProgramId = null;
      render();
    };
  });
  $("#app").querySelectorAll("[data-training-send]").forEach((b) => {
    b.onclick = async () => {
      if (state.submitting || !state.trainingStaffId || !state.trainingProgramId) return;
      const staffMember = (state.staff || []).find(x => x.id === state.trainingStaffId);
      const program = (state.staffTrainingPrograms || []).find(x => x.id === state.trainingProgramId);
      if (!staffMember || !program) return toast("Training selection is no longer available.", true);
      state.submitting = true;
      render();
      try {
        const result = await sb.rpc("start_staff_training", { p_staff_id: state.trainingStaffId, p_program_id: state.trainingProgramId });
        if (result.error) throw result.error;
        const name = staffMember.employee_name || "Employee pilot";
        const programName = program.name || "training";
        state.trainingStaffId = null;
        state.trainingProgramId = null;
        await load();
        state.page = "training";
        render();
        toast(name + " has been sent to the Training Academy for " + programName + ".");
      } catch (e) {
        state.submitting = false;
        render();
        err(e, "Employee training could not be started.");
      }
    };
  });

  $("#app")
    .querySelectorAll("[data-history-staff]")
    .forEach((b) => {
      b.onclick = async () => {
        const rows = await loadStaffCareer(b.dataset.historyStaff);
        const textRows = rows.length ? rows.slice(0,10).map(x => x.title + " — " + (x.description || "")).join("\n") : "No career history recorded yet.";
        alert(textRows);
      };
    });

  $("#app")
    .querySelectorAll("[data-fire-staff]")
    .forEach((b) => {
      b.onclick = async () => {
        if (state.submitting) return;
        const name = b.dataset.staffName || "this pilot";
        if (!confirm("Fire " + name + "? This cannot be undone.")) return;
        state.submitting = true;
        render();
        try {
          const result = await sb.rpc("fire_staff_pilot", { p_staff_id: b.dataset.fireStaff });
          if (result.error) throw result.error;
          await load();
          state.page = "crew";
          render();
          toast(name + " has been removed from the company.");
        } catch (e) {
          state.submitting = false;
          render();
          err(e, "Staff termination failed.");
        }
      };
    });

  $("#app")
    .querySelectorAll("[data-dispatch-staff]")
    .forEach((b) => {
      b.onclick = async () => {
        if (state.submitting) return;
        const select = document.querySelector('[data-staff-contract="' + b.dataset.dispatchStaff + '"]');
        const parts = String(select?.value || "").split("|");
        if (parts.length !== 2 || !parts[0] || !parts[1]) return toast("Select a company contract first.", true);
        state.submitting = true;
        render();
        try {
          const result = await sb.rpc("dispatch_staff_pilot", {
            p_staff_id: b.dataset.dispatchStaff,
            p_mission_id: parts[0],
            p_aircraft_id: parts[1],
          });
          if (result.error) throw result.error;
          await load();
          state.page = "crew";
          render();
          toast("Employee dispatched on company contract.");
        } catch (e) {
          state.submitting = false;
          render();
          err(e, "Staff dispatch failed.");
        }
      };
    });

  $("#app")
    .querySelectorAll("[data-brief]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          state.selected = state.missions.find(
            (m) => String(m.id) === b.dataset.brief,
          );
          const choices = ownedMissionAircraft(state.selected);
          state.selectedAircraftId = choices.length === 1 ? choices[0].id : null;
          state.page = "brief";
          render();
        }),
    );
  $("#wb-pilot")?.addEventListener("input", (e) => updateWeightPlan("pilot", e.target.value));
  $("#wb-fuel")?.addEventListener("input", (e) => updateWeightPlan("fuel", e.target.value));
  $("#app").querySelectorAll("[data-mission-filter]").forEach((b) => b.addEventListener("click", () => { state.missionFilter = b.dataset.missionFilter || "ALL"; render(); }));
  $("#app")
    .querySelectorAll("[data-choice]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          captureReportInputs();
          state.report[b.dataset.choice] = b.dataset.value;
          render();
        }),
    );
  $("#flight-minutes")?.addEventListener("input", (e) => { state.report.flightMinutes = e.target.value; });
  $("#distance-nm")?.addEventListener("input", (e) => { state.report.distanceNm = e.target.value; });
  $("#notes")?.addEventListener("input", (e) => { state.report.notes = e.target.value; });
  $("#live-weather-confirm")?.addEventListener("change", (e) => { state.report.liveWeatherConfirm = e.target.checked; });
  $('[data-action="login"]')?.addEventListener("click", login);
  $('[data-action="signup"]')?.addEventListener("click", signup);
  $('[data-action="accept"]')?.addEventListener("click", accept);
  $("#app").querySelectorAll("[data-aircraft-choice]").forEach((b) => b.addEventListener("click", () => { state.selectedAircraftId = b.dataset.aircraftChoice; render(); }));
  $('[data-action="report"]')?.addEventListener("click", () => {
    state.page = "report";
    render();
  });
  $('[data-action="complete"]')?.addEventListener("click", complete);
  $('[data-action="submit-feedback"]')?.addEventListener("click", submitFeedback);
  $("#app").querySelectorAll("[data-feedback-rating]").forEach((b) =>
    b.addEventListener("click", () => {
      $("#app").querySelectorAll("[data-feedback-rating]").forEach((x) => x.classList.remove("selected"));
      b.classList.add("selected");
      state.feedbackRating = Number(b.dataset.feedbackRating);
    }),
  );
  $('[data-action="edit-profile"]')?.addEventListener("click", () => {
    state.page = "edit";
    render();
  });
  $('[data-action="save-profile"]')?.addEventListener("click", saveProfile);
  $("#app").querySelectorAll('[data-action="purchase-aircraft"]').forEach((b) =>
    b.addEventListener("click", () => purchaseAircraft(b.dataset.aircraft)),
  );
}
async function login() {
  if (!sb) return;
  const email = $("#email").value.trim(),
    password = $("#password").value;
  if (!email || !password) return toast("Enter your email and password.", true);
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) err(error, "Login failed.");
}
async function signup() {
  if (!sb) return;
  const email = $("#email").value.trim(),
    password = $("#password").value,
    name = $("#pilot-name").value.trim(),
    callsign = $("#callsign").value.trim(),
    homeBase = $("#home-base-icao").value.trim().toUpperCase();
  if (!email || password.length < 6 || !name || !callsign || homeBase.length !== 4)
    return toast(
      "Enter your email, a 6+ character password, pilot name, callsign, and a 4-letter home base ICAO.",
      true,
    );
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { pilot_name: name, callsign, home_base_icao: homeBase } },
  });
  if (error) return err(error, "Account creation failed.");
  toast(
    data.session
      ? "Account created. Your starter C172 and PPL are being prepared from your home base."
      : "Account created. Check your email to confirm sign-in.",
  );
}
async function logout() {
  if (sb) {
    await sb.auth.signOut();
    toast("Logged out.");
  }
}
async function rpc(name, candidates) {
  let last;
  for (const args of candidates) {
    const r = await sb.rpc(name, args);
    if (!r.error) return r;
    last = r;
  }
  throw last.error;
}
async function accept() {
  try {
    if (state.active) throw new Error("You already have an active mission.");
    if (
      !state.selected ||
      !missions().some(
        (mission) => missionId(mission) === missionId(state.selected),
      )
    )
      throw new Error("This mission is no longer available.");
    const id = state.selected.id;
    const choices = ownedMissionAircraft(state.selected);
    const aircraftId = state.selectedAircraftId || (choices.length === 1 ? choices[0].id : null);
    if (!aircraftId) {
      throw new Error("Select an aircraft before accepting this mission.");
    }
    const selectedAircraft = state.aircraft.find(
      (x) => (x.aircraft_id || x.aircraft_master?.id) === aircraftId,
    );
    const selectedBase = String(
      selectedAircraft?.base_icao || state.profile?.home_base_icao || "",
    ).trim().toUpperCase();
    const missionOrigin = String(
      state.selected?.origin_icao || state.selected?.departure_icao || "",
    ).trim().toUpperCase();
    if (!selectedBase || selectedBase !== missionOrigin) {
      throw new Error("This aircraft is not currently based at this mission origin.");
    }
    const result = await sb.rpc("accept_mission", {
      p_mission_id: id,
      p_aircraft_id: aircraftId,
    });
    if (result.error) throw result.error;
    toast("Dispatch accepted. Your operational assignment is now active.");
    await load();
    state.page = "active";
    render();
  } catch (e) {
    err(
      e,
      "Mission acceptance failed. The mission may no longer be available.",
    );
  }
}
async function complete() {
  try {
    if (state.submitting) return;
    if (!state.active)
      throw new Error("There is no active mission to complete.");
    captureReportInputs();
    if (!state.report.liveWeatherConfirm)
      throw new Error("Confirm that Live Weather was used before submitting the flight.");
    state.report.notes = $("#notes")?.value || "";
    const currentLegState = legDisplay(state.active, state.active?.current_leg);
    if (state.report.objective === "not_completed") {
      const isFinalLeg = currentLegState.current >= currentLegState.count;
      const warning = isFinalLeg
        ? "This final leg objective was not completed. The mission will close with reduced pay, XP, and reputation."
        : "This leg objective was not completed. You will still advance, but this leg will pay reduced credits/XP and reputation.";
      if (!confirm(warning + "\n\nSubmit this result?")) return;
    }
    const weatherLabels = { clear: "Clear / VMC", overcast: "Overcast", wind: "Strong Winds", rain: "Rain", low_visibility: "Low Visibility", imc: "IMC", turbulence: "Turbulence", storms: "Storms" };
    const combinedNotes = "Weather encountered: " + (weatherLabels[state.report.weather] || "Not reported") + ". " + state.report.notes;
    state.report.flightMinutes = Math.max(0, Number($("#flight-minutes")?.value || 0));
    state.report.distanceNm = Math.max(0, Number($("#distance-nm")?.value || 0));
    const employeePendingBefore = (state.staffAssignments || [])
      .filter((a) => a.status === "dispatched")
      .map((a) => a.id);
    state.submitting = true;
    render();
    const r = state.report,
      id = state.active?.id;
    const result = await sb.rpc("complete_active_mission", {
      p_outcome: r.outcome,
      p_landing: r.landing,
      p_aircraft_condition: r.condition,
      p_objective_result: r.objective,
      p_notable_event: combinedNotes,
      p_notes: combinedNotes,
      p_flight_minutes: r.flightMinutes || null,
      p_distance_nm: r.distanceNm || null,
      p_live_weather_confirm: true,
    });
    if (result.error) throw result.error;
    const d = result.data;
    const earned = Array.isArray(d?.achievements) ? d.achievements : [];
    const newQuals = Array.isArray(d?.qualifications) ? d.qualifications : [];
    const flightToast = `${d?.mission_complete === false ? `Leg ${d.leg_number} complete • Next leg ${d.next_leg}: ${d.next_origin} → ${d.next_destination}` : "Flight recorded"}${d && d.credits != null ? ` • +${num(d.credits)} Cr, +${num(d.xp)} XP` : ""}${d && d.performance_score != null ? ` • Flight Score ${num(d.performance_score)}/100` : ""}${earned.length ? ` • ${earned.length} achievement${earned.length === 1 ? "" : "s"} earned` : ""}${newQuals.length ? ` • ${newQuals.length} new rating${newQuals.length === 1 ? "" : "s"}` : ""}.`;
    state.submitting = false;
    state.lastFlightResult = {
      title: missionTitle(state.active?.missions || state.active || {}),
      route: route(state.active?.missions || state.active || {}),
      aircraft: aircraftName(state.active?.aircraft_master || state.active || {}),
      outcome: r.outcome,
      landing: r.landing,
      condition: r.condition,
      objective: r.objective,
      weather: weatherLabels[r.weather] || r.weather,
      flightMinutes: r.flightMinutes,
      distanceNm: r.distanceNm,
      mission_complete: d?.mission_complete !== false,
      credits: Number(d?.credits || 0),
      xp: Number(d?.xp || 0),
      reputation: Number(d?.reputation || 0),
      performance_score: d?.performance_score,
    };
    state.report = {
      outcome: "successful",
      landing: "good",
      condition: "no_issues",
      objective: "completed",
      notes: "",
      weather: "clear",
      flightMinutes: 0,
      distanceNm: 0,
    };
    await load();
    const completedEmployee = (state.staffAssignments || []).find(
      (a) => employeePendingBefore.includes(a.id) && a.status === "completed",
    );
    state.page = d?.mission_complete === false ? "active" : "result";
    render();
    if (completedEmployee) {
      const employeeName = completedEmployee.employee_name || completedEmployee.staff_name || "Employee pilot";
      const missionTitle = completedEmployee.mission?.title || completedEmployee.mission_title || "company contract";
      toast("✈️ Employee Flight Complete • " + employeeName + " completed " + missionTitle + " • +" + num(completedEmployee.earned_credits || 0) + " Cr company revenue • +" + num(completedEmployee.earned_xp || 0) + " XP");
    } else {
      toast(flightToast);
    }
  } catch (e) {
    state.submitting = false;
    err(e, "Mission completion failed. No rewards were applied.");
    render();
  }
}
async function submitFeedback() {
  try {
    const message = $("#feedback-message")?.value.trim();
    const category = $("#feedback-category")?.value || "general";
    const rating = Number(state.feedbackRating || 0) || null;
    if (!message || message.length < 3) throw new Error("Please enter at least a few words of feedback.");
    const result = await sb.from("pilot_feedback").insert({
      pilot_id: state.session.user.id,
      pilot_name: state.profile?.pilot_name || state.profile?.name || null,
      callsign: state.profile?.callsign || null,
      category,
      rating,
      message,
      page: state.page,
    });
    if (result.error) throw result.error;
    state.feedbackRating = 0;
    toast("Thank you. Your feedback was submitted.");
    state.page = "home";
    render();
  } catch (e) {
    err(e, "Feedback could not be submitted.");
  }
}
async function purchaseAircraft(aircraftId) {
  try {
    const aircraft = state.aircraftCatalog.find((a) => a.id === aircraftId);
    if (!aircraft) throw new Error("Aircraft is no longer available.");
    if (state.aircraft.some((a) => a.aircraft_id === aircraftId)) throw new Error("You already own this aircraft.");
    if (level() < Number(aircraft.required_level || 1)) throw new Error(`Level ${aircraft.required_level || 1} is required.`);
    if (aircraft.required_qualification_id && !qIds().has(aircraft.required_qualification_id)) throw new Error("Required qualification is not held.");
    if (Number(state.profile?.credits || 0) < Number(aircraft.purchase_price || 0)) throw new Error("Insufficient credits.");
    if (!confirm(`Purchase ${aircraft.manufacturer} ${aircraft.model} for ${num(aircraft.purchase_price)} Cr?`)) return;
    const result = await sb.rpc("purchase_aircraft", { p_aircraft_id: aircraftId });
    if (result.error) throw result.error;
    toast(`Aircraft purchased: ${aircraft.manufacturer} ${aircraft.model}`);
    await load();
    state.page = "hangar";
    render();
  } catch (e) {
    err(e, "Aircraft purchase failed. No credits were deducted.");
  }
}
async function saveProfile() {
  try {
    const name = $("#pilot-name").value.trim(),
      callsign = $("#callsign").value.trim(),
      homeBase = $("#home-base-icao").value.trim().toUpperCase();
    if (!name || !callsign || homeBase.length !== 4)
      throw new Error("Pilot name, callsign, and a 4-letter home base ICAO are required.");
    const result = await sb.rpc("update_pilot_profile", {
      p_pilot_name: name,
      p_callsign: callsign,
      p_is_public: false,
      p_home_base_icao: homeBase,
    });
    if (result.error) throw result.error;
    await load();
    state.page = "pilot";
    render();
    toast("Pilot profile updated.");
  } catch (e) {
    err(e, "Profile update failed.");
  }
}
async function boot() {
  render();
  if (!sb) return;
  const {
    data: { session },
  } = await sb.auth.getSession();
  state.session = session;
  if (session) await load();
  render();
  sb.auth.onAuthStateChange(async (event, session) => {
    state.session = session;
    if (event === "SIGNED_OUT") {
      Object.assign(state, {
        profile: null,
        qualifications: [],
        aircraft: [],
        missions: [],
        active: null,
        history: [],
        achievements: [],
        pilotAchievements: [],
      });
      render();
    }
    if (event === "SIGNED_IN") {
      await load();
      render();
    }
  });
}
boot();
