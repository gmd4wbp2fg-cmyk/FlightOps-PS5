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
  loading: false,
  loadErrors: [],
  submitting: false,
  feedbackRating: 0,
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
const EPauletStyle = "<style>\n.epaulet-wrap{display:flex;align-items:center;gap:12px;min-width:205px}\n.epaulet-board{position:relative;width:112px;height:39px;border-radius:4px 7px 7px 4px;background:linear-gradient(145deg,#25313c,#101820);border:1px solid #71808c;box-shadow:0 4px 9px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.16);overflow:hidden;display:flex;align-items:center}\n.epaulet-tip{width:15px;height:100%;background:linear-gradient(90deg,#0b1116,#26333e);clip-path:polygon(0 0,100% 50%,0 100%);flex:none}\n.epaulet-band{height:100%;width:50px;display:flex;align-items:center;justify-content:center;gap:3px;transform:skewX(-8deg)}\n.epaulet-stripe{display:block;width:5px;height:30px;background:linear-gradient(90deg,#c9a33a,#fff3b0 48%,#c9a33a);border-radius:1px;box-shadow:0 0 2px rgba(255,255,255,.35)}\n.epaulet-insignia{flex:1;text-align:center;color:#f4ca55;font-size:14px;letter-spacing:2px;text-shadow:0 1px 2px #000}\n.epaulet-star{display:inline-block;font-size:14px;margin:0 1px}.epaulet-command{display:inline-block;font-size:15px;margin-left:2px}\n</style>";
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
  const raw = Array.isArray(m?.payload_manifest) ? m.payload_manifest : [];
  const items = raw.filter((x) => x?.type !== "payload_total");
  const total = raw.find((x) => x?.type === "payload_total")?.weight_lb ??
    items.reduce((sum, x) => sum + Number(x?.weight_lb || 0), 0);
  return { items, total };
}
function missionPayloadCard(m) {
  const p = missionPayload(m);
  if (!p.items.length) return "";
  return `<div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Payload • Weight & Balance</div><h2>Mission Load Planning</h2></div><div class="ops-route-chip">MISSION PAYLOAD</div></div><p class="small">FlightOps shows the mission payload only. Enter the actual pilot, fuel and aircraft loading in MSFS Weight & Balance.</p><div class="details">${p.items.map((x) => `<div class="detail"><div class="label">${esc(x.description || x.type)}</div><strong>${num(x.count || 1)} × ${num(x.weight_lb || 0)} lb</strong><div class="small">Item total: ${num((x.count || 1) * (x.weight_lb || 0))} lb</div></div>`).join("")}<div class="detail"><div class="label">Mission payload total</div><strong>${num(p.total)} lb</strong><div class="small">FlightOps planning manifest</div></div></div><div class="callout"><b>MSFS loading:</b> Use this manifest to load the mission's actual passengers, baggage, cargo or equipment in MSFS. Pilot weight, fuel and final weight & balance are handled entirely in MSFS.</div></div>`;
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
    ? ["home", "missions", "active", "hangar", "pilot", "career", "feedback"]
        .map(
          (x) =>
            `<button data-page="${x}" class="${state.page === x ? "active" : ""}">${x[0].toUpperCase() + x.slice(1)}</button>`,
        )
        .join("") + '<button data-action="logout">Logout</button>'
    : "";
  $("#nav")
    .querySelectorAll("[data-page]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          state.page = b.dataset.page;
          render();
        }),
    );
  $('[data-action="logout"]')?.addEventListener("click", logout);
}
async function load() {
  if (!sb || !state.session) return;

  const uid = state.session.user.id;
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

  const run = async () =>
    Promise.all([
      sb.from("pilot_profiles").select("*").eq("id", uid).maybeSingle(),
      sb.from("pilot_qualifications").select("*").eq("pilot_id", uid),
      sb.from("pilot_aircraft").select("*").eq("pilot_id", uid),
      sb.from("missions").select("*").eq("active", true),
      sb.from("active_missions").select("*").eq("pilot_id", uid).maybeSingle(),
      sb.from("achievements").select("*").eq("active", true).order("id"),
      sb.from("pilot_achievements").select("*").eq("pilot_id", uid),
      sb
        .from("flight_reports")
        .select("*")
        .eq("pilot_id", uid)
        .order("completed_at", { ascending: false })
        .limit(30),
    ]);

  let base = await run();

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
    historyData,
  ] = values;

  const qualificationIds = [
    ...new Set([
      ...pilotQualifications.map((x) => x.qualification_id).filter(Boolean),
      ...missionsData
        .map((x) => x.required_qualification_id)
        .filter(Boolean),
    ]),
  ];

  const aircraftIds = [
    ...new Set([
      ...pilotAircraft.map((x) => x.aircraft_id).filter(Boolean),
      ...missionsData.map((x) => x.required_aircraft_id).filter(Boolean),
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

  const missions = missionsData.map((x) => ({
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

  const active =
    activeData && !Array.isArray(activeData) ? activeData : null;

  const activeMission = active
    ? missions.find((x) => x.id === active.mission_id) || null
    : null;

  if (active && activeMission) {
    active.missions = activeMission;
    active.aircraft_master = aircraftMap.get(active.aircraft_id || activeMission.required_aircraft_id) || activeMission.aircraft_master;
  }

  const history = historyData.map((x) => ({
    ...x,
    aircraft_master: aircraftMap.get(x.aircraft_id) || null,
    missions: missions.find((m) => m.id === x.mission_id) || null,
  }));

  state.profile = profile;
  state.qualifications = qualifications;
  state.aircraft = aircraft;
  state.aircraftCatalog = aircraftCatalog;
  state.missions = missions;
  state.active = active;
  state.achievements = achievementsData || [];
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
function owns(m) {
  return missionAircraftChoices(m).some((a) => state.aircraft.some((owned) => (owned.aircraft_id || owned.aircraft_master?.id) === a.id));
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
  return state.missions.filter(
    (mission) =>
      eligible(mission) &&
      (mission.is_repeatable === true || !completed.has(missionId(mission))),
  );
}
function activeMission() {
  return state.active?.missions || state.active;
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
  return `<section class="hero"><div><div class="eyebrow">Active Mission • Dispatch</div><h1>${esc(missionTitle(m))}</h1><p>${esc(m.mission_code || m.id)} • ${esc(route(m))}</p></div><div><div class="label">Contract Value</div><div class="money">${num(m.reward_credits || m.credits)} Cr</div></div></section>
  <div class="grid">
    <div class="card s8 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Mission Card</div><h2>Ready for departure</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> DISPATCHED</div></div><div class="details">
      <div class="detail"><div class="label">Aircraft</div><strong>${esc(aircraftName(a))}</strong></div>
      <div class="detail"><div class="label">Route</div><strong>${esc(route(m))}</strong></div>
      <div class="detail"><div class="label">Distance</div><strong>${esc(m.distance_nm || m.distance || "—")} NM</strong></div>
      <div class="detail"><div class="label">Base XP</div><strong>+${num(m.reward_xp || m.xp)} XP</strong></div>
    </div>
    <div class="eyebrow">Flight Operations</div><div class="callout"><b>Objective:</b> ${esc(m.objective || m.mission_objective || "Complete the assigned route safely.")}<br><b>Planning:</b> ${esc(m.planning_level || "Pilot responsibility")}<br><b>Leg:</b> ${legDisplay(m, state.active?.current_leg).current} of ${legDisplay(m, state.active?.current_leg).count}<br><b>Current leg:</b> ${esc(legDisplay(m, state.active?.current_leg).leg.origin_icao)} → ${esc(legDisplay(m, state.active?.current_leg).leg.destination_icao)} (${num(legDisplay(m, state.active?.current_leg).leg.distance_nm)} NM)<br><b>Leg purpose:</b> ${esc(legPurpose(legDisplay(m, state.active?.current_leg).leg, legDisplay(m, state.active?.current_leg).current, legDisplay(m, state.active?.current_leg).count))}<br><b>Leg objective:</b> ${esc(legDisplay(m, state.active?.current_leg).leg.leg_objective || "Complete the assigned stop objective safely.")}<br><b>Status:</b> ACTIVE — this contract is locked to your pilot.</div>
    <p class="copy">Launch MSFS 2024 Free Flight and fly the mission using <b>Live Weather</b>. FlightOps does not control the simulator or collect automatic telemetry. When you land, return here and complete the debrief.</p>
    <button class="action primary" data-action="report">${legDisplay(m, state.active?.current_leg).count > 1 ? `Complete Leg ${legDisplay(m, state.active?.current_leg).current} / Debrief` : "Complete Mission / Debrief"}</button>
    </div>
    ${bushMissionNotice(m)}
    ${missionPayloadCard(m)}
    <div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">03 • Before Departure</div><h2>Release Checklist</h2></div><div class="ops-icon">✓</div></div><p class="copy">✓ Aircraft selected<br>✓ Route reviewed<br>✓ <b>MSFS Live Weather enabled</b><br>✓ Fuel and alternate considered<br>✓ Mission objective understood<br>✓ Fly within aircraft limitations</p><div class="eyebrow">Reward</div><h2>${num(m.reward_credits || m.credits)} Cr</h2><p class="small">Base XP +${num(m.reward_xp || m.xp)} XP. Final rewards are calculated after the debrief.</p></div>
    <div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">04 • Mission Continuity</div><h2>Return to FlightOps after Landing</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> ACTIVE</div></div><p class="copy"><p class="copy">This mission remains active if you close Safari or leave FlightOps. You can return later and continue the career.</p></div>
  </div>`;
}
function home() {
  const p = state.profile;
  const active = activeMission();
  return `${loadNotice()}<section class="hero"><div><div class="eyebrow">Pilot Career</div><div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div><h1>Welcome, ${esc(p?.pilot_name || p?.name || "Pilot")}.</h1><p>${esc(p?.callsign || "Independent operator")} • Your browser career is synced securely.</p></div>${epaulet()}</div></div><div><div class="label">Available Funds</div><div class="money">${num(p?.credits)} Cr</div></div></section><div class="ops-visual"><div class="ops-horizon"></div><div class="ops-route"></div><div class="ops-plane">✈</div><div class="ops-visual-copy"><div class="eyebrow">FlightOps Command Center</div><h2>Fly the mission. Build the career.</h2><p class="small">Your aircraft, contracts, qualifications and performance — all in one cockpit.</p></div></div><div class="grid"><div class="card s4 ops-card"><div class="ops-section-head"><div><div class="label">Pilot Level</div></div><div class="ops-icon">✦</div></div><div class="stat">Level ${level()}</div><div class="small">${num(p?.xp)} XP • ${num(p?.reputation)} reputation</div></div><div class="card s4 ops-card"><div class="ops-section-head"><div><div class="label">Completed Flights</div></div><div class="ops-icon">✈</div></div><div class="stat">${num(p?.total_flights || state.history.length)}</div><div class="small">${num(p?.completed_missions)} missions completed</div><div class="small">${Math.floor(Number(p?.total_flight_minutes || 0) / 60)}h ${Number(p?.total_flight_minutes || 0) % 60}m • ${num(p?.total_nm || 0)} NM</div></div><div class="card s4 ops-card"><div class="ops-section-head"><div><div class="label">Current Aircraft</div></div><div class="ops-icon">◈</div></div><div class="stat">${esc(aircraftName(state.aircraft[0] || {}))}</div><div class="small">${state.qualifications.map((x) => esc(x.qualifications?.code || x.qualifications?.name)).join(" • ") || "Loading starter PPL…"}</div></div><div class="card s12">${active ? `<div class="eyebrow">Active Mission</div><h2>${esc(missionTitle(active))}</h2><p class="route">${esc(route(active))} • ${esc(aircraftName(active.aircraft_master || active))}</p>${activeMissionDetails(active)}<button class="action primary" data-page="active">View Active Mission</button>` : `<div class="eyebrow">Next Flight</div><h2>${missions().length ? "Available contracts" : "No eligible missions"}</h2><p class="small">${missions().length ? "Choose a contract from the mission board." : "Missions appear only when you own the required aircraft, qualification, and level."}</p>${missions().length ? "<button class=\"action primary\" data-page=\"missions\">View Mission Board</button>" : "<button class=\"action\" data-page=\"career\">View Career Progress</button>"}`}</div><div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Recent Activity</div><h2>Latest Flights</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> FLIGHT LOG</div>${state.history.length ? state.history.slice(0,3).map(h=>`<div class="historyrow"><div><b>${esc(missionTitle(h.missions || h))}</b><div class="small">${esc(new Date(h.completed_at || h.created_at).toLocaleString())} • ${esc(aircraftName(h.aircraft_master || h))} • ${esc(route(h.missions || h))}</div></div><div style="text-align:right"><b class="owned">+${num(h.earned_credits || h.credits_earned || h.reward_credits)} Cr</b><div class="small">+${num(h.earned_xp || h.xp_earned || h.reward_xp)} XP${h.performance_score != null ? ` • Score ${num(h.performance_score)}/100` : ""}</div></div></div>`).join("") : '<p class="small">Your first recorded flight will appear here.</p>'}<button class="action" data-page="pilot">Open Pilot Logbook</button></div></div>`;
}
function missionList() {
  const active = activeMission();
  const activeId = active ? missionId(active) : null;
  // Mission Board shows available NEW work; the accepted contract belongs on Active.
  const ms = missions().filter((m) => missionId(m) !== activeId);
  return `${loadNotice()}<section class="hero"><div><div class="eyebrow">Mission Board</div><h1>Choose your next assignment.</h1><p>Browse available contracts. Your current flight is shown on the Active tab.</p></div><div><div class="label">Available Contracts</div><div class="money">${ms.length}</div></div></section>
  ${active ? `<div class="notice"><b>Active mission:</b> ${esc(missionTitle(active))} • ${esc(route(active))}. Complete it before accepting another contract. <button class="action primary" data-action="report">Complete Mission</button></div>` : ""}
  <div class="grid"><div class="card s8 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Available Contracts</div><h2>Mission Dispatch</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> LIVE OPS</div></div>${ms.length ? ms.map((m) => `<div class="mission"><div><span class="tag">${esc(m.mission_code || m.id)}</span><span class="tag">${esc(m.mission_type || m.type || "MISSION")}</span><span class="tag">LIVE WEATHER</span>${m.water_operation ? '<span class="tag">🌊 WATER OPERATION</span>' : ""}${m.bush_operation ? '<span class="tag">🌲 BUSH OPERATION</span>' : ""}${m.region_id ? `<span class="tag">${esc(m.region_id)}</span>` : ""}<h3>${esc(missionTitle(m))}</h3><div class="route">${esc(route(m))} • ${esc(aircraftName(m.aircraft_master || m))}</div><div class="small">${esc(m.distance_nm || m.distance || "—")} NM • ${esc(m.difficulty || "STANDARD")} • ${esc(m.priority || "STANDARD")}</div><div class="small">${num(m.reward_credits || m.credits)} Cr • +${num(m.reward_xp || m.xp)} XP</div></div><button class="action primary" data-brief="${m.id}" ${state.active ? "disabled" : ""}>View Brief</button></div>`).join("") : '<p class="small">No missions currently meet your ownership, qualification, and level requirements.</p>'}</div><div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Career Geography</div><h2>Grow your range.</h2></div><div class="ops-icon">◎</div></div><p class="copy">Your mission geography expands outward from your home base as your career grows. Early pilots stay close to home; higher levels open nationwide, North American, Caribbean, Central American, South American, European, African, Middle Eastern, and Asia-Pacific contracts.</p><div class="callout"><b>Career rule:</b> You only see missions you can actually fly with your aircraft, qualification, and level.</div></div></div>`;
}
function brief() {
  const m = state.selected;
  if (!m) { state.page = "missions"; return missionList(); }
  const choices = missionAircraftChoices(m);
  const ownedChoices = choices.filter((a) => state.aircraft.some((owned) => (owned.aircraft_id || owned.aircraft_master?.id) === a.id));
  const selectedId = state.selectedAircraftId || ownedChoices[0]?.id || m.required_aircraft_id;
  const a = ownedChoices.find((x) => x.id === selectedId) || m.aircraft_master || m;
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
  return `<section class="hero"><div><div class="eyebrow">FlightOps Dispatch Release • Pre-Flight</div><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><span class="ops-route-chip"><span class="ops-dot"></span> DISPATCH ${esc(m.mission_code || m.id)}</span><span class="ops-route-chip">LIVE WEATHER</span></div><h1>${esc(missionTitle(m))}</h1><p>${esc(m.mission_type || m.type || "MISSION")} • ${esc(route(m))}</p></div><div><div class="label">Contract Value</div><div class="money">${num(m.reward_credits || m.credits)} Cr</div></div></section>
  <div class="grid">
    <div class="card s8 ops-card"><div class="ops-section-head"><div><div class="eyebrow">01 • Dispatch Information</div><h2>Operational Release</h2></div><div class="ops-icon">✈</div></div>
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
      <div class="details">${legs.map((leg,i)=>`<div class="detail"><div class="label">Leg ${i+1} of ${legs.length}</div><strong>${esc(leg.origin_icao)} → ${esc(leg.destination_icao)}</strong><div class="small">${num(leg.distance_nm)} NM • ${esc(legPurpose(leg,i+1,legs.length))}</div>${leg.leg_objective ? `<div class="small"><b>Leg objective:</b> ${esc(leg.leg_objective)}</div>` : ""}</div>`).join("")}</div>
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
    <div class="callout"><b>Aircraft choice:</b> This mission has ${ownedChoices.length || 1} eligible aircraft option${ownedChoices.length === 1 ? "" : "s"}. Choose which aircraft you want to use.</div>
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
  const ownedIds = new Set(state.aircraft.map((a) => a.aircraft_id));
  const qualSet = qIds();
  const cards = state.aircraftCatalog.map((a) => {
    const owned = ownedIds.has(a.id);
    const hasQualification = !a.required_qualification_id || qualSet.has(a.required_qualification_id);
    const hasLevel = level() >= Number(a.required_level || 1);
    const unlockable = !owned && hasQualification && hasLevel;
    const status = owned ? "OWNED" : unlockable ? "UNLOCKABLE" : "LOCKED";
    const qualification = a.required_qualification_id || "—";
    const price = Number(a.purchase_price || 0);
    return `<div class="plane ${status === "LOCKED" ? "locked" : ""}">
      <div class="${status === "OWNED" ? "owned" : status === "UNLOCKABLE" ? "reward" : "small"}">${status === "OWNED" ? "● OWNED" : status === "UNLOCKABLE" ? "◆ UNLOCKABLE" : "🔒 LOCKED"}</div>
      <h3>${esc(a.manufacturer)} ${esc(a.model)}</h3>
      <div class="small">${esc(a.category)} • ${esc(a.engine_type || "—")} • ${Number(a.engines || 1)} engine${Number(a.engines || 1) === 1 ? "" : "s"} • ${Number(a.seats || 0)} seats</div>
      <div class="details"><div class="detail"><div class="label">Required Level</div><strong>${num(a.required_level || 1)}</strong></div><div class="detail"><div class="label">Qualification</div><strong>${esc(qualification)}</strong></div></div>
      <div class="price">${price ? `${num(price)} Cr` : "Starter aircraft"}</div>
      <div class="small">${a.float_capable ? "🌊 Float capable" : ""}${a.float_capable && a.amphibious_capable ? " • Amphibious capable" : ""}${a.float_capable ? "<br>" : ""}${owned ? "Available for eligible missions." : unlockable ? "You meet the current level and qualification requirements. Purchase this aircraft to add it to your hangar and unlock its eligible missions." : `Reach Level ${num(a.required_level || 1)} and earn ${esc(qualification)} to unlock.`}</div>\n      ${unlockable ? `<button class="action primary" data-action="purchase-aircraft" data-aircraft="${esc(a.id)}">Purchase Aircraft</button>` : ""}
    </div>`;
  });
  return `<section class="hero"><div><div class="eyebrow">Aircraft Hangar</div><h1>Build your hangar.</h1><p>Aircraft progress from locked → unlockable → owned as your career develops.</p></div><div><div class="label">Owned Aircraft</div><div class="money">${ownedIds.size}</div></div></section>
  <div class="grid"><div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Hangar Status</div><h2>Aircraft Status</h2></div><div class="ops-icon">◈</div></div><div class="details"><div class="detail"><div class="label">OWNED</div><strong>Ready to Fly</strong><div class="small">Available for eligible missions.</div></div><div class="detail"><div class="label">UNLOCKABLE</div><strong>Ready to Purchase</strong><div class="small">You meet the level and qualification requirements.</div></div><div class="detail"><div class="label">LOCKED</div><strong>Career Goal</strong><div class="small">Advance your level and qualifications to unlock it.</div></div></div></div></div>
  <div class="fleet">${cards.length ? cards.join("") : '<div class="notice">No aircraft are currently in the FlightOps catalog.</div>'}</div>`;
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
    const earnedReports = state.history.filter(r => String(r.outcome || "").toLowerCase() === "completed");\n    const beaverFlights = earnedReports.filter(r => r.aircraft_id === "dhc2_beaver").length;\n    const floatFlights = earnedReports.filter(r => String(r.mission_id || "").startsWith("FLOAT-") || r.water_operation === true).length;\n    const bushFlights = earnedReports.filter(r => String(r.mission_id || "").includes("BUSH-")).length;\n    const targets = { FIRST_FLIGHT:[flights,1], FIRST_MISSION:[missions,1], TEN_FLIGHTS:[flights,10], TEN_MISSIONS:[missions,10], FIRST_TURBOPROP:[qual.includes("TURBOPROP")?1:0,1], FIRST_JET:[qual.includes("JET")?1:0,1], TEN_HOURS:[minutes,600], THOUSAND_NM:[nm,1000], TWENTY_FIVE_FLIGHTS:[flights,25], TWENTY_FIVE_MISSIONS:[missions,25], LEVEL_10:[current,10], LEVEL_20:[current,20], EXCELLENT_FLIGHT:[avgScore || 0,90], PERFECT_FLIGHT:[bestScore || 0,100], BEAVER_OPERATOR:[beaverFlights,1], FLOAT_PILOT:[floatFlights,1], BUSH_PILOT:[bushFlights,1] };
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
  const levelHours = [0,2,5,10,20,30,45,60,80,100,125,150,175,200,250,300,350,400,450,500];
  const totalHours = Number(p.total_flight_minutes || 0) / 60;
  const levelRows = [
    ["1","New Pilot","C172 / basic GA"],["2","Developing Pilot","Local contracts"],["3","Commercial Track","Caravan eligibility"],["4","Regional Pilot","Corvalis / regional contracts"],["5","Experienced Pilot","Higher-value GA"],["6","Turboprop Track","PC-12 / TBM path"],["7","Senior Pilot","Advanced regional"],["8","Senior Captain","Complex operations"],["9","Jet Track","PC-24 / Vision Jet path"],["10","Captain","Premium executive contracts"],["11","Senior Captain","Higher-risk contracts"],["12","Jet Captain","CJ4 path"],["13","Executive Captain","Executive charter"],["14","Advanced Captain","Special operations"],["15","Command Pilot","Premium operations"],["16","Long Range Track","Longitude path"],["17","International Captain","Long-range missions"],["18","Senior Command","Elite contracts"],["19","Master Track","Highest-tier preparation"],["20","Master Pilot","Endgame career"]
  ];
  return `<section class="hero"><div><div class="eyebrow">Career Progression</div><div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div><h1>Level ${current} • ${esc(pilotRank(current).title)}</h1><p>Earn XP by flying missions. Qualifications and aircraft expand your career.</p></div>${epaulet(current)}</div></div><div><div class="label">Career XP</div><div class="money">${num(xp)} XP</div></div></section>
  <div class="grid">
    <div class="card s8 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Level Progress</div><h2>Level ${current}${current < 20 ? ` → Level ${current + 1}` : " • MAX"}</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> CAREER</div></div><div class="bar"><div class="fill" style="width:${progress}%"></div></div><p class="small">${current < 20 ? `${num(Math.max(0,next-xp))} XP to next level • ${Math.max(0, levelHours[current] - totalHours).toFixed(1)} flight hours to next level target` : "Master Pilot reached."}</p></div>
    <div class="card s4 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Career Record</div><h2>${num(p.total_flights || state.history.length)} Flights</h2></div><div class="ops-icon">✈</div></div><p class="small">${num(p.completed_missions)} missions • ${num(p.reputation)} reputation</p><div class="details"><div class="detail"><span class="label">Flight Time</span><strong>${Math.floor(Number(p.total_flight_minutes || 0) / 60)}h ${Number(p.total_flight_minutes || 0) % 60}m</strong></div><div class="detail"><span class="label">Distance</span><strong>${num(p.total_nm || 0)} NM</strong></div><div class="detail"><span class="label">Avg Score</span><strong>${avgScore != null ? `${avgScore}/100` : "—"}</strong></div><div class="detail"><span class="label">Best Score</span><strong>${bestScore != null ? `${bestScore}/100` : "—"}</strong></div></div></div>
    <div class="card s5 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Pilot Performance</div><h2>${esc(scoreBand)}</h2></div><div class="ops-icon">★</div></div><p class="small">Average flight score: ${avgScore != null ? `${avgScore}/100` : "—"}</p><p class="small">Best flight: ${bestScore != null ? `${bestScore}/100` : "—"}</p><p class="small">Based on outcome, landing, objective completion, and aircraft condition.</p></div>
    <div class="card s7 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Performance Coaching</div><h2>${esc(performanceNote)}</h2></div><div class="ops-icon">◆</div></div><p class="small">Keep building your flight record through safe, objective-focused flying.</p></div>
    <div class="card s7 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Qualification Path</div><h2>Your Ratings</h2></div><div class="ops-icon">✦</div></div>${milestones.map(([code,name,owned,desc])=>`<div class="historyrow"><div><b>${esc(name)}</b><div class="small">${esc(code)} • ${esc(desc)}</div></div><div class="${owned ? "owned" : "small"}">${owned ? "● ACTIVE" : "LOCKED"}</div></div>`).join("")}</div>
    <div class="card s5 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Aircraft Path</div><h2>Current Hangar</h2></div><div class="ops-icon">◈</div></div>${aircraft.length ? aircraft.map(x=>`<div class="historyrow"><div><b>${esc(x)}</b></div><div class="owned">OWNED</div></div>`).join("") : '<p class="small">No aircraft assigned.</p>'}<p class="copy">New aircraft become useful when your qualifications and level support them.</p></div>
    <div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Achievements</div><h2>Career Milestones</h2></div><div class="ops-route-chip"><span class="ops-dot"></span> PROGRESS</div></div><p class="copy">Earn rewards by flying, completing missions, building hours and distance, and reaching command-level milestones.</p><div class="fleet">${state.achievements.map(a=>`<div class="plane ${earnedAchievementIds.has(a.id) ? "" : "locked"}"><h3>${esc(a.name)}</h3><div class="small">${esc(a.description)}</div><div class="small">${earnedAchievementIds.has(a.id) ? "● EARNED" : achievementProgress(a.id)} • +${num(a.xp_reward)} XP • ${num(a.credit_reward)} Cr</div></div>`).join("")}</div></div>
    <div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">20-Level Career Ladder</div><h2>Where you're going</h2></div><div class="ops-icon">⬆</div></div>${levelRows.map((r)=>{ const n=Number(r[0]); const targetXp=LEVEL_XP[n-1]; const targetHours=levelHours[n-1]; const status=n===current?"CURRENT":n<current?"COMPLETED":"LOCKED"; return `<div class="historyrow"><div><b>Level ${r[0]} • ${esc(r[1])}</b><div class="small">${esc(r[2])}</div><div class="small">Flight Time: ${targetHours}h • XP: ${num(targetXp)} XP</div></div><div class="${status==="CURRENT" ? "owned" : "small"}">${status}</div></div>`;}).join("")}</div>
  </div>`;
}
function pilot() {
  const p = state.profile || {};
  const flights = state.history || [];
  const totalMinutes = flights.reduce((s, h) => s + Number(h.flight_minutes || 0), 0);
  const totalNm = flights.reduce((s, h) => s + Number(h.distance_nm || 0), 0);
  const successful = flights.filter((h) => String(h.outcome || "").toLowerCase() === "successful").length;
  const successRate = flights.length ? Math.round((successful / flights.length) * 100) : 0;
  return `${loadNotice()}<section class="hero"><div><div class="eyebrow">Pilot Record</div><div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div><h1>${esc(p.pilot_name || p.name || "Pilot")}</h1><p>${esc(p.callsign || "No callsign set")} • MSFS 2024 • PS5</p></div>${epaulet()}</div></div><button class="action" data-action="edit-profile">Edit profile</button></section><div class="grid"><div class="card s4"><div class="label">Level / XP</div><div class="stat">${level()} / ${num(p.xp)} XP</div></div><div class="card s4"><div class="label">Credits / Reputation</div><div class="stat">${num(p.credits)} Cr</div><div class="small">${num(p.reputation)} reputation</div></div><div class="card s4"><div class="label">Home Base</div><div class="stat">${esc(p.home_base_icao || "Not set")}</div><div class="small">Mission geography expands from this airport as your career grows.</div></div><div class="card s4"><div class="label">Qualifications</div><div class="small">${state.qualifications.map((x) => esc(x.qualifications?.name || x.qualifications?.code)).join("<br>") || "None"}</div></div><div class="card s12 ops-card"><div class="ops-section-head"><div><div class="eyebrow">Pilot Logbook</div><h2>${num(state.history.length)} Recent Flights</h2><div class="details"><div class="detail"><span class="label">Total Time</span><strong>${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m</strong></div><div class="detail"><span class="label">Total Distance</span><strong>${num(totalNm)} NM</strong></div><div class="detail"><span class="label">Successful</span><strong>${num(successRate)}%</strong></div></div>${state.history.length ? state.history.map((h) => `<div class="historyrow"><div><b>${esc(missionTitle(h.missions || h))}</b><div class="small">${esc(new Date(h.completed_at || h.created_at).toLocaleString())} • ${esc(aircraftName(h.aircraft_master || h))}</div><div class="small">${esc(route(h.missions || h))} • ${esc(h.outcome || "Recorded")} • Landing: ${esc(h.landing || h.landing_quality || "—")} • Score: ${h.performance_score != null ? `${num(h.performance_score)}/100` : "—"}</div><div class="small">Objective: ${esc(h.objective_result || h.objective || "—")} • Aircraft: ${esc(h.aircraft_condition || "—")}</div><div class="small">Flight time: ${h.flight_minutes ? `${Math.floor(Number(h.flight_minutes)/60)}h ${Number(h.flight_minutes)%60}m` : "—"} • Distance: ${h.distance_nm ? `${num(h.distance_nm)} NM` : "—"}</div></div><div style="text-align:right"><b class="owned">+${num(h.earned_credits || h.credits_earned || h.reward_credits)} Cr</b><div class="small">+${num(h.earned_xp || h.xp_earned || h.reward_xp)} XP</div><div class="small">Rep: ${num(h.earned_reputation || h.reputation_earned || 0)}</div></div></div>`).join("") : '<p class="small">Your completed flights will appear here.</p>'}</div></div>`;
}
function report() {
  const m = state.active?.missions || state.active;
  if (!m) { state.page = "home"; return home(); }
  const d = legDisplay(m, state.active?.current_leg);
  const choice = (field, values) => `<div class="fleet">${values.map(([v,l]) => `<button class="plane choice ${state.report[field]===v?"selected":""}" data-choice="${field}" data-value="${v}"><b>${l}</b></button>`).join("")}</div>`;
  const legObj = d.leg.leg_objective || m.objective || "Complete the assigned stop objective safely.";
  return `<section class="hero"><div><div class="eyebrow">Flight Operations • Post-Flight Debrief</div><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="ops-route-chip"><span class="ops-dot"></span> DEBRIEF</span><span class="ops-route-chip">LEG ${d.current}/${d.count}</span><span class="ops-route-chip">LIVE WEATHER</span></div><h1>${esc(missionTitle(m))}</h1><p>${esc(d.leg.origin_icao)} → ${esc(d.leg.destination_icao)} • Record the flight honestly and accurately.</p></div></section>
  <div class="grid">
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
  $("#app").innerHTML = !state.session
    ? auth()
    : (
        {
          home,
          missions: missionList,
          active: activeView,
          brief,
          hangar,
          pilot,
          career,
          feedback,
          report,
          edit: editProfile,
        }[state.page] || home
      )();
  bind();
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
        (b.onclick = () => {
          state.page = b.dataset.page;
          render();
        }),
    );
  $("#app")
    .querySelectorAll("[data-brief]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          state.selected = state.missions.find(
            (m) => String(m.id) === b.dataset.brief,
          );
          state.selectedAircraftId = missionAircraftChoices(state.selected)[0]?.id || state.selected?.required_aircraft_id || null;
          state.page = "brief";
          render();
        }),
    );
  $("#wb-pilot")?.addEventListener("input", (e) => updateWeightPlan("pilot", e.target.value));
  $("#wb-fuel")?.addEventListener("input", (e) => updateWeightPlan("fuel", e.target.value));
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
    const aircraftId = state.selectedAircraftId || missionAircraftChoices(state.selected)[0]?.id || state.selected.required_aircraft_id;
    await rpc("accept_mission", [
      { p_mission_id: id, p_aircraft_id: aircraftId },
      { p_mission_id: id },
      { mission_id: id, aircraft_id: aircraftId },
      { mission_id: id },
    ]);
    toast("Mission accepted. It will remain active after refresh.");
    await load();
    state.page = "home";
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
    toast(`${d?.mission_complete === false ? `Leg ${d.leg_number} complete • Next leg ${d.next_leg}: ${d.next_origin} → ${d.next_destination}` : "Flight recorded"}${d && d.credits != null ? ` • +${num(d.credits)} Cr, +${num(d.xp)} XP` : ""}${d && d.performance_score != null ? ` • Flight Score ${num(d.performance_score)}/100` : ""}${earned.length ? ` • ${earned.length} achievement${earned.length === 1 ? "" : "s"} earned` : ""}${newQuals.length ? ` • ${newQuals.length} new rating${newQuals.length === 1 ? "" : "s"}` : ""}.`);
    state.submitting = false;
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
    state.page = d?.mission_complete === false ? "active" : "pilot";
    render();
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
