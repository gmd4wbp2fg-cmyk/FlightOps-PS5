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
  loading: false,
  loadErrors: [],
  submitting: false,
  report: {
    outcome: "successful",
    landing: "good",
    condition: "no_issues",
    objective: "completed",
    notes: "",
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
function level() {
  return (
    state.profile?.level ||
    Math.floor(Number(state.profile?.xp || 0) / 1000) + 1
  );
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
function route(m) {
  return (
    m.route ||
    `${m.origin_icao || m.departure_icao || m.departure_airport?.icao_code || "—"} → ${m.destination_icao || m.destination_airport?.icao_code || "—"}`
  );
}
function nav() {
  $("#nav").innerHTML = state.session
    ? ["home", "missions", "active", "hangar", "pilot", "career"]
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
  const generated = await sb.rpc("generate_mission_offers");
  if (generated.error) {
    state.loadErrors.push(`mission generator: ${generated.error.message || "request failed"}`);
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
    required_qualification:
      qualificationMap.get(x.required_qualification_id) || null,
  }));

  const active =
    activeData && !Array.isArray(activeData) ? activeData : null;

  const activeMission = active
    ? missions.find((x) => x.id === active.mission_id) || null
    : null;

  if (active && activeMission) {
    active.missions = activeMission;
    active.aircraft_master = activeMission.aircraft_master;
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
function owns(m) {
  return state.aircraft.some(
    (a) =>
      (a.aircraft_id || a.aircraft_master?.id) ===
      (m.required_aircraft_id || m.aircraft_id || m.aircraft_master?.id),
  );
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
    <div class="card s8"><div class="eyebrow">Mission Card</div><h2>Ready for departure</h2><div class="details">
      <div class="detail"><div class="label">Aircraft</div><strong>${esc(aircraftName(a))}</strong></div>
      <div class="detail"><div class="label">Route</div><strong>${esc(route(m))}</strong></div>
      <div class="detail"><div class="label">Distance</div><strong>${esc(m.distance_nm || m.distance || "—")} NM</strong></div>
      <div class="detail"><div class="label">Base XP</div><strong>+${num(m.reward_xp || m.xp)} XP</strong></div>
    </div>
    <div class="eyebrow">Flight Operations</div><div class="callout"><b>Objective:</b> ${esc(m.objective || m.mission_objective || "Complete the assigned route safely.")}<br><b>Planning:</b> ${esc(m.planning_level || "Pilot responsibility")}<br><b>Status:</b> ACTIVE — this contract is locked to your pilot.</div>
    <p class="copy">Launch MSFS 2024 Free Flight and fly the mission. FlightOps does not control the simulator or collect automatic telemetry. When you land, return here and complete the debrief.</p>
    <button class="action primary" data-action="report">Complete Mission / Debrief</button>
    </div>
    <div class="card s4"><div class="eyebrow">Pilot Checklist</div><h2>Before Pushback</h2><p class="copy">✓ Aircraft selected<br>✓ Route reviewed<br>✓ Weather checked<br>✓ Fuel and alternate considered<br>✓ Mission objective understood<br>✓ Fly within aircraft limitations</p><div class="eyebrow">Reward</div><h2>${num(m.reward_credits || m.credits)} Cr</h2><p class="small">Base XP +${num(m.reward_xp || m.xp)} XP. Final rewards are calculated after the debrief.</p></div>
    <div class="card s12"><div class="eyebrow">Mission Flow</div><h2>Accept → Fly → Land → Debrief → Get Paid</h2><p class="copy">This mission remains active if you close Safari or leave FlightOps. You can return later and continue the career.</p></div>
  </div>`;
}
function home() {
  const p = state.profile;
  const active = activeMission();
  return `${loadNotice()}<section class="hero"><div><div class="eyebrow">Pilot Career</div><div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div><h1>Welcome, ${esc(p?.pilot_name || p?.name || "Pilot")}.</h1><p>${esc(p?.callsign || "Independent operator")} • Your browser career is synced securely.</p></div>${epaulet()}</div></div><div><div class="label">Available Funds</div><div class="money">${num(p?.credits)} Cr</div></div></section><div class="grid"><div class="card s4"><div class="label">Pilot Level</div><div class="stat">Level ${level()}</div><div class="small">${num(p?.xp)} XP • ${num(p?.reputation)} reputation</div></div><div class="card s4"><div class="label">Completed Flights</div><div class="stat">${num(p?.total_flights || state.history.length)}</div><div class="small">${num(p?.completed_missions)} missions completed</div></div><div class="card s4"><div class="label">Current Aircraft</div><div class="stat">${esc(aircraftName(state.aircraft[0] || {}))}</div><div class="small">${state.qualifications.map((x) => esc(x.qualifications?.code || x.qualifications?.name)).join(" • ") || "Loading starter PPL…"}</div></div><div class="card s12">${active ? `<div class="eyebrow">Active Mission</div><h2>${esc(missionTitle(active))}</h2><p class="route">${esc(route(active))} • ${esc(aircraftName(active.aircraft_master || active))}</p>${activeMissionDetails(active)}<button class="action primary" data-action="report">Complete Mission</button>` : `<div class="eyebrow">Next Flight</div><h2>${missions().length ? "Available contracts" : "No eligible missions"}</h2><p class="small">${missions().length ? "Choose a contract from the mission board." : "Missions appear only when you own the required aircraft, qualification, and level."}</p>`}</div></div>`;
}
function missionList() {
  const active = activeMission();
  const activeId = active ? missionId(active) : null;
  // Mission Board shows available NEW work; the accepted contract belongs on Active.
  const ms = missions().filter((m) => missionId(m) !== activeId);
  return `${loadNotice()}<section class="hero"><div><div class="eyebrow">Mission Board</div><h1>Choose your next assignment.</h1><p>Browse available contracts. Your current flight is shown on the Active tab.</p></div><div><div class="label">Available Contracts</div><div class="money">${ms.length}</div></div></section>
  ${active ? `<div class="notice"><b>Active mission:</b> ${esc(missionTitle(active))} • ${esc(route(active))}. Complete it before accepting another contract. <button class="action primary" data-action="report">Complete Mission</button></div>` : ""}
  <div class="grid"><div class="card s8">${ms.length ? ms.map((m) => `<div class="mission"><div><span class="tag">${esc(m.mission_code || m.id)}</span><span class="tag">${esc(m.mission_type || m.type || "MISSION")}</span>${m.region_id ? `<span class="tag">${esc(m.region_id)}</span>` : ""}<h3>${esc(missionTitle(m))}</h3><div class="route">${esc(route(m))} • ${esc(aircraftName(m.aircraft_master || m))}</div><div class="small">${esc(m.distance_nm || m.distance || "—")} NM • ${num(m.reward_credits || m.credits)} Cr • +${num(m.reward_xp || m.xp)} XP</div></div><button class="action primary" data-brief="${m.id}" ${state.active ? "disabled" : ""}>View Brief</button></div>`).join("") : '<p class="small">No missions currently meet your ownership, qualification, and level requirements.</p>'}</div><div class="card s4"><div class="eyebrow">Career Geography</div><h2>Grow your range.</h2><p class="copy">Your mission geography expands with your career. Early pilots stay close to home; higher levels open nationwide, North American, Caribbean, Central American, South American, European, African, Middle Eastern, and Asia-Pacific contracts.</p><div class="callout"><b>Career rule:</b> You only see missions you can actually fly with your aircraft, qualification, and level.</div></div></div>`;
}
function brief() {
  const m = state.selected;
  if (!m) { state.page = "missions"; return missionList(); }
  const a = m.aircraft_master || m;
  const q = m.required_qualification?.code || m.required_qualification_code || "Pilot qualification";
  const planning = m.planning_level || (m.required_aircraft_id === "c172" ? "Suggested planning" : "Pilot planning");
  return `<section class="hero"><div><div class="eyebrow">Mission Brief • Pre-Flight</div><h1>${esc(missionTitle(m))}</h1><p>${esc(m.mission_code || m.id)} • ${esc(m.mission_type || m.type || "MISSION")} • ${esc(route(m))}</p></div><div><div class="label">Mission Reward</div><div class="money">${num(m.reward_credits || m.credits)} Cr</div></div></section>
  <div class="grid">
    <div class="card s8"><div class="eyebrow">01 • Mission Details</div><h2>Assignment</h2><div class="details">
      <div class="detail"><div class="label">Aircraft</div><strong>${esc(aircraftName(a))}</strong></div>
      <div class="detail"><div class="label">Route</div><strong>${esc(route(m))}</strong></div>
      <div class="detail"><div class="label">Distance</div><strong>${esc(m.distance_nm || m.distance || "—")} NM</strong></div>
      <div class="detail"><div class="label">Qualification</div><strong>${esc(q)}</strong></div>\n      ${m.region_id ? `<div class="detail"><div class="label">Region</div><strong>${esc(m.region_id)}</strong></div>` : ""}
    </div>
    <div class="eyebrow">02 • Route & Flight Planning</div><p class="copy">${esc(m.route_guidance || m.planning_notes || "Plan the flight in MSFS 2024 Free Flight. Verify the route, altitude, fuel, weather, and destination conditions before departure.")}</p>
    <div class="callout"><b>Planning level:</b> ${esc(planning)}<br><b>FlightOps role:</b> ${planning === "Suggested planning" ? "Use the suggested guidance or plan your own route." : "FlightOps provides the mission requirements; the pilot is responsible for the final flight plan."}</div>
    <div class="eyebrow">03 • Charts & References</div><p class="copy">Use the current MSFS airport information, navigation data, charts, and procedures available to you before departure.</p></div>
    <div class="card s4"><div class="eyebrow">04 • Operational Conditions</div><h2>Before You Fly</h2><p class="copy">${esc(m.weather_notes || "Check current weather, winds, visibility, runway conditions, and operational considerations in your available references.")}</p>
      <div class="eyebrow">05 • Route Hazards</div><p class="copy">${esc(m.hazards || m.operational_notes || "Review terrain, weather, traffic, runway length, and destination conditions appropriate to the aircraft.")}</p>
      <div class="eyebrow">06 • Things to Watch</div><p class="copy">${esc(m.watch_items || "Fly the aircraft within its normal operating limits. Reassess the plan if conditions change.")}</p></div>
    <div class="card s8"><div class="eyebrow">07 • Pilot Responsibilities</div><h2>Your Job</h2><p class="copy">You fly the aircraft in MSFS 2024 Free Flight. FlightOps does not control the simulator or provide automatic telemetry. Complete the mission manually, then return here for the debrief.</p>
      <div class="callout"><b>Mission Objective:</b> ${esc(m.objective || m.mission_objective || "Complete the assigned route safely and accomplish the mission objective.")}</div></div>
    <div class="card s4"><div class="eyebrow">08 • Reward</div><h2>${num(m.reward_credits || m.credits)} Cr</h2><p class="small">Base XP: +${num(m.reward_xp || m.xp)} XP</p><p class="small">Rewards are finalized after your flight report.</p></div>
    <div class="card s12"><div class="eyebrow">09 • Ready?</div><h2>Accept → Fly → Complete → Debrief</h2><p class="copy">Accepting locks this contract to your pilot. Only one active mission is allowed at a time.</p><button class="action primary" data-action="accept" ${state.active ? "disabled" : ""}>Accept Mission</button> <button class="action" data-page="missions">Back to Mission Board</button></div>
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
      <div class="small">${owned ? "Available for eligible missions." : unlockable ? "You meet the current level and qualification requirements. Purchase this aircraft to add it to your hangar and unlock its eligible missions." : `Reach Level ${num(a.required_level || 1)} and earn ${esc(qualification)} to unlock.`}</div>\n      ${unlockable ? `<button class="action primary" data-action="purchase-aircraft" data-aircraft="${esc(a.id)}">Purchase Aircraft</button>` : ""}
    </div>`;
  });
  return `<section class="hero"><div><div class="eyebrow">Aircraft Hangar</div><h1>Build your hangar.</h1><p>Aircraft progress from locked → unlockable → owned as your career develops.</p></div><div><div class="label">Owned Aircraft</div><div class="money">${ownedIds.size}</div></div></section>
  <div class="grid"><div class="card s12"><div class="eyebrow">Hangar Status</div><h2>Owned • Unlockable • Locked</h2><p class="copy">Owned aircraft are available for eligible missions. Unlockable aircraft meet your current level and qualification requirements. Locked aircraft remain visible so you can see what you're working toward.</p></div></div>
  <div class="fleet">${cards.length ? cards.join("") : '<div class="notice">No aircraft are currently in the FlightOps catalog.</div>'}</div>`;
}
function career() {
  const p = state.profile || {};
  const xp = Number(p.xp || 0);
  const current = level();
  const next = current >= 20 ? 20000 : current * 1000;
  const previous = Math.max(0, (current - 1) * 1000);
  const progress = current >= 20 ? 100 : Math.min(100, Math.max(0, ((xp - previous) / Math.max(1, next - previous)) * 100));
  const qual = state.qualifications.map(q => q.qualifications?.code || q.qualification_id).filter(Boolean);
  const aircraft = state.aircraft.map(a => a.aircraft_master?.name || a.aircraft_master?.model || a.aircraft_id).filter(Boolean);
  const earnedAchievementIds = new Set(state.pilotAchievements.map(a => a.achievement_id));
  const milestones = [
    ["PPL", "Starter qualification", qual.includes("PPL"), "Complete your first flight career milestone."],
    ["CPL", "Commercial Pilot", qual.includes("CPL"), "Unlock cargo and charter operations."],
    ["IR", "Instrument Rating", qual.includes("IR"), "Unlock IFR and weather-sensitive missions."],
    ["MULTI", "Multi-Engine", qual.includes("MULTI"), "Unlock multi-engine aircraft operations."],
    ["TURBOPROP", "Turboprop", qual.includes("TURBOPROP"), "Unlock PC-12 and similar missions."],
    ["JET", "Jet Rating", qual.includes("JET"), "Unlock business jet operations."],
    ["LONG", "Long Range", qual.includes("LONG"), "Unlock long-range captain missions."]
  ];
  const levelRows = [
    ["1","New Pilot","C172 / basic GA"],["2","Developing Pilot","Local contracts"],["3","Commercial Track","Caravan eligibility"],["4","Regional Pilot","Corvalis / regional contracts"],["5","Experienced Pilot","Higher-value GA"],["6","Turboprop Track","PC-12 / TBM path"],["7","Senior Pilot","Advanced regional"],["8","Senior Captain","Complex operations"],["9","Jet Track","PC-24 / Vision Jet path"],["10","Captain","Premium executive contracts"],["11","Senior Captain","Higher-risk contracts"],["12","Jet Captain","CJ4 path"],["13","Executive Captain","Executive charter"],["14","Advanced Captain","Special operations"],["15","Command Pilot","Premium operations"],["16","Long Range Track","Longitude path"],["17","International Captain","Long-range missions"],["18","Senior Command","Elite contracts"],["19","Master Track","Highest-tier preparation"],["20","Master Pilot","Endgame career"]
  ];
  return `<section class="hero"><div><div class="eyebrow">Career Progression</div><div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div><h1>Level ${current} • ${esc(pilotRank(current).title)}</h1><p>Earn XP by flying missions. Qualifications and aircraft expand your career.</p></div>${epaulet(current)}</div></div><div><div class="label">Career XP</div><div class="money">${num(xp)} XP</div></div></section>
  <div class="grid">
    <div class="card s8"><div class="eyebrow">Level Progress</div><h2>Level ${current}${current < 20 ? ` → Level ${current + 1}` : " • MAX"} </h2><div class="bar"><div class="fill" style="width:${progress}%"></div></div><p class="small">${current < 20 ? `${num(Math.max(0,next-xp))} XP to next level` : "Master Pilot reached."}</p></div>
    <div class="card s4"><div class="eyebrow">Career Record</div><h2>${num(p.total_flights || state.history.length)} Flights</h2><p class="small">${num(p.completed_missions)} missions • ${num(p.reputation)} reputation</p></div>
    <div class="card s7"><div class="eyebrow">Qualification Path</div><h2>Your Ratings</h2>${milestones.map(([code,name,owned,desc])=>`<div class="historyrow"><div><b>${esc(name)}</b><div class="small">${esc(code)} • ${esc(desc)}</div></div><div class="${owned ? "owned" : "small"}">${owned ? "● ACTIVE" : "LOCKED"}</div></div>`).join("")}</div>
    <div class="card s5"><div class="eyebrow">Aircraft Path</div><h2>Current Hangar</h2>${aircraft.length ? aircraft.map(x=>`<div class="historyrow"><div><b>${esc(x)}</b></div><div class="owned">OWNED</div></div>`).join("") : '<p class="small">No aircraft assigned.</p>'}<p class="copy">New aircraft become useful when your qualifications and level support them.</p></div>
    <div class="card s12"><div class="eyebrow">Achievements</div><h2>Career Milestones</h2><div class="fleet">${state.achievements.map(a=>`<div class="plane ${earnedAchievementIds.has(a.id) ? "" : "locked"}"><h3>${esc(a.name)}</h3><div class="small">${esc(a.description)}</div><div class="small">${earnedAchievementIds.has(a.id) ? "● EARNED" : "LOCKED"} • +${num(a.xp_reward)} XP • ${num(a.credit_reward)} Cr</div></div>`).join("")}</div></div>
    <div class="card s12"><div class="eyebrow">20-Level Career Ladder</div><h2>Where you're going</h2>${levelRows.map((r,i)=>`<div class="historyrow"><div><b>Level ${r[0]} • ${esc(r[1])}</b><div class="small">${esc(r[2])}</div></div><div class="${Number(r[0])===current ? "owned" : "small"}">${Number(r[0])===current ? "CURRENT" : Number(r[0])<current ? "COMPLETED" : "LOCKED"}</div></div>`).join("")}</div>
  </div>`;
}
function pilot() {
  const p = state.profile || {};
  return `${loadNotice()}<section class="hero"><div><div class="eyebrow">Pilot Record</div><div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div><h1>${esc(p.pilot_name || p.name || "Pilot")}</h1><p>${esc(p.callsign || "No callsign set")} • MSFS 2024 • PS5</p></div>${epaulet()}</div></div><button class="action" data-action="edit-profile">Edit profile</button></section><div class="grid"><div class="card s4"><div class="label">Level / XP</div><div class="stat">${level()} / ${num(p.xp)} XP</div></div><div class="card s4"><div class="label">Credits / Reputation</div><div class="stat">${num(p.credits)} Cr</div><div class="small">${num(p.reputation)} reputation</div></div><div class="card s4"><div class="label">Qualifications</div><div class="small">${state.qualifications.map((x) => esc(x.qualifications?.name || x.qualifications?.code)).join("<br>") || "None"}</div></div><div class="card s12"><div class="eyebrow">Flight History</div>${state.history.length ? state.history.map((h) => `<div class="historyrow"><div><b>${esc(missionTitle(h.missions || h))}</b><div class="small">${esc(new Date(h.completed_at || h.created_at).toLocaleString())} • ${esc(aircraftName(h.aircraft_master || h))}</div><div class="small">${esc(route(h.missions || h))} • ${esc(h.outcome || "Recorded")} • Landing: ${esc(h.landing || h.landing_quality || "—")}</div></div><div style="text-align:right"><b class="owned">+${num(h.earned_credits || h.credits_earned || h.reward_credits)} Cr</b><div class="small">+${num(h.earned_xp || h.xp_earned || h.reward_xp)} XP</div></div></div>`).join("") : '<p class="small">Your completed flights will appear here.</p>'}</div></div>`;
}
function report() {
  const m = state.active?.missions || state.active;
  if (!m) {
    state.page = "home";
    return home();
  }
  const choice = (field, values) =>
    `<div class="fleet">${values.map(([v, l]) => `<button class="plane choice ${state.report[field] === v ? "selected" : ""}" data-choice="${field}" data-value="${v}"><b>${l}</b></button>`).join("")}</div>`;
  return `<section class="hero"><div><div class="eyebrow">Flight Debrief</div><div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div><h1>${esc(missionTitle(m))}</h1><p>${esc(route(m))} • Tell FlightOps what happened.</p></div>${epaulet()}</div></div></section><div class="card"><h3>Outcome</h3>${choice(
    "outcome",
    [
      ["successful", "Successful"],
      ["rough", "Rough Flight"],
      ["failed", "Mission Failed"],
    ],
  )}<h3>Landing</h3>${choice("landing", [
    ["good", "Good"],
    ["hard", "Hard"],
    ["go_around", "Go-around"],
  ])}<h3>Aircraft condition</h3>${choice("condition", [
    ["no_issues", "No Damage"],
    ["minor_issue", "Minor issue"],
    ["significant_damage", "Significant damage"],
  ])}<h3>Objective</h3>${choice("objective", [
    ["completed", "Completed"],
    ["partial", "Partial"],
    ["not_completed", "Not completed"],
  ])}<div class="details"><label class="detail"><span class="label">Flight time</span><input id="flight-minutes" type="number" min="0" step="1" inputmode="numeric" placeholder="Minutes"></label><label class="detail"><span class="label">Distance</span><input id="distance-nm" type="number" min="0" step="1" inputmode="numeric" placeholder="NM"></label></div><label class="label" for="notes">Notable event / pilot notes</label><textarea id="notes" placeholder="Optional operational notes">${esc(state.report.notes)}</textarea><br><button class="action primary" data-action="complete" ${state.submitting ? "disabled" : ""}>${state.submitting ? "Submitting…" : "Submit Flight Report"}</button></div>`;
}
function auth() {
  return `<section class="hero"><div><div class="eyebrow">Pilot Career</div><h1>Sign in to FlightOps.</h1><p>Your career progression is stored securely in Supabase, not in this browser.</p></div></section><div class="card"><div class="form"><label class="label">Email<input id="email" type="email" autocomplete="email" required></label><label class="label">Password<input id="password" type="password" autocomplete="current-password" required minlength="6"></label><label class="label">Pilot name (new accounts)<input id="pilot-name" maxlength="50"></label><label class="label">Callsign (new accounts)<input id="callsign" maxlength="30"></label><div><button class="action primary" data-action="login" ${configured ? "" : "disabled"}>Login</button> <button class="action" data-action="signup" ${configured ? "" : "disabled"}>Create Account</button></div>${configured ? "" : '<div class="notice">Deployment configuration is incomplete. Set <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_PUBLISHABLE_KEY</b> before using FlightOps.</div>'}</div></div>`;
}
function editProfile() {
  return `<div class="card"><div class="eyebrow">Pilot Profile</div><h2>Update pilot details</h2><div class="form"><label class="label">Pilot name<input id="pilot-name" value="${esc(state.profile?.pilot_name || state.profile?.name)}"></label><label class="label">Callsign<input id="callsign" value="${esc(state.profile?.callsign)}"></label><button class="action primary" data-action="save-profile">Save Profile</button> <button class="action" data-page="pilot">Cancel</button></div></div>`;
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
          report,
          edit: editProfile,
        }[state.page] || home
      )();
  bind();
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
          state.page = "brief";
          render();
        }),
    );
  $("#app")
    .querySelectorAll("[data-choice]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          state.report[b.dataset.choice] = b.dataset.value;
          render();
        }),
    );
  $('[data-action="login"]')?.addEventListener("click", login);
  $('[data-action="signup"]')?.addEventListener("click", signup);
  $('[data-action="accept"]')?.addEventListener("click", accept);
  $('[data-action="report"]')?.addEventListener("click", () => {
    state.page = "report";
    render();
  });
  $('[data-action="complete"]')?.addEventListener("click", complete);
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
    callsign = $("#callsign").value.trim();
  if (!email || password.length < 6 || !name || !callsign)
    return toast(
      "Enter your email, a 6+ character password, pilot name, and callsign.",
      true,
    );
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { pilot_name: name, callsign } },
  });
  if (error) return err(error, "Account creation failed.");
  toast(
    data.session
      ? "Account created. Your starter C172 and PPL are being prepared."
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
    await rpc("accept_mission", [
      { p_mission_id: id },
      { mission_id: id },
      { mission_uuid: id },
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
    state.report.notes = $("#notes")?.value || "";
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
      p_notable_event: r.notes,
      p_notes: r.notes,
      p_flight_minutes: r.flightMinutes || null,
      p_distance_nm: r.distanceNm || null,
    });
    if (result.error) throw result.error;
    const d = result.data;
    const earned = Array.isArray(d?.achievements) ? d.achievements : [];
    const newQuals = Array.isArray(d?.qualifications) ? d.qualifications : [];
    toast(`Flight recorded${d ? `: +${num(d.credits || d.credits_earned)} Cr, +${num(d.xp || d.xp_earned)} XP` : ""}${earned.length ? ` • ${earned.length} achievement${earned.length === 1 ? "" : "s"} earned` : ""}${newQuals.length ? ` • ${newQuals.length} new rating${newQuals.length === 1 ? "" : "s"}` : ""}.`);
    state.submitting = false;
    state.report = {
      outcome: "successful",
      landing: "good",
      condition: "no_issues",
      objective: "completed",
      notes: "",
      flightMinutes: 0,
      distanceNm: 0,
    };
    await load();
    state.page = "pilot";
    render();
  } catch (e) {
    state.submitting = false;
    err(e, "Mission completion failed. No rewards were applied.");
    render();
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
      callsign = $("#callsign").value.trim();
    if (!name || !callsign)
      throw new Error("Pilot name and callsign are required.");
    await rpc("update_pilot_profile", [
      { p_pilot_name: name, p_callsign: callsign },
      { pilot_name: name, callsign },
    ]);
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
