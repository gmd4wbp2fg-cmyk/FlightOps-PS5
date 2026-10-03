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
  missions: [],
  active: null,
  history: [],
  selected: null,
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
function missionTitle(m) {
  return m.title || m.name || m.mission_id || "Mission";
}
function aircraftName(a) {
  return (
    a.aircraft_master?.name ||
    a.name ||
    a.aircraft_master?.model ||
    a.aircraft_id ||
    "Assigned aircraft"
  );
}
function route(m) {
  return (
    m.route ||
    `${m.departure_airport?.icao_code || m.departure_icao || "—"} → ${m.destination_airport?.icao_code || m.destination_icao || "—"}`
  );
}
function nav() {
  $("#nav").innerHTML = state.session
    ? ["home", "missions", "hangar", "pilot"]
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
  const [
    profileResult,
    qualificationsResult,
    aircraftResult,
    missionsResult,
    activeResult,
    historyResult,
  ] = await Promise.all([
    sb.from("pilot_profiles").select("*").eq("id", uid).maybeSingle(),
    sb.from("pilot_qualifications").select("*").eq("pilot_id", uid),
    sb.from("pilot_aircraft").select("*").eq("pilot_id", uid),
    sb.from("missions").select("*"),
    sb.from("active_missions").select("*").eq("pilot_id", uid).maybeSingle(),
    sb
      .from("flight_reports")
      .select("*")
      .eq("pilot_id", uid)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const qualifications = qualificationsResult.data || [];
  const aircraft = aircraftResult.data || [];
  const missions = missionsResult.data || [];
  const history = historyResult.data || [];
  const qualificationIds = [
    ...new Set(
      [
        ...qualifications.map((row) => row.qualification_id),
        ...missions.map(
          (mission) =>
            mission.required_qualification_id || mission.qualification_id,
        ),
      ].filter(Boolean),
    ),
  ];
  const aircraftIds = [
    ...new Set(
      [
        ...aircraft.map((row) => row.aircraft_id),
        ...missions.map(
          (mission) => mission.required_aircraft_id || mission.aircraft_id,
        ),
        ...history.map((report) => report.aircraft_id),
      ].filter(Boolean),
    ),
  ];
  const [qualificationMasterResult, aircraftMasterResult] = await Promise.all([
    qualificationIds.length
      ? sb.from("qualifications").select("*").in("id", qualificationIds)
      : Promise.resolve({ data: [], error: null }),
    aircraftIds.length
      ? sb.from("aircraft_master").select("*").in("id", aircraftIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const errors = [
    profileResult,
    qualificationsResult,
    aircraftResult,
    missionsResult,
    activeResult,
    historyResult,
    qualificationMasterResult,
    aircraftMasterResult,
  ].filter((result) => result.error);
  if (errors.length) {
    err(errors[0].error, "Some career data could not be loaded.");
  }

  const qualificationsById = new Map(
    (qualificationMasterResult.data || []).map((row) => [row.id, row]),
  );
  const aircraftById = new Map(
    (aircraftMasterResult.data || []).map((row) => [row.id, row]),
  );
  const missionsById = new Map(
    missions.map((mission) => [mission.id, mission]),
  );
  const withMissionRelations = (mission) =>
    mission
      ? {
          ...mission,
          aircraft_master:
            aircraftById.get(
              mission.required_aircraft_id || mission.aircraft_id,
            ) || null,
          required_qualification:
            qualificationsById.get(
              mission.required_qualification_id || mission.qualification_id,
            ) || null,
        }
      : null;

  state.profile = profileResult.data || null;
  state.qualifications = qualifications.map((row) => ({
    ...row,
    qualifications: qualificationsById.get(row.qualification_id) || null,
  }));
  state.aircraft = aircraft.map((row) => ({
    ...row,
    aircraft_master: aircraftById.get(row.aircraft_id) || null,
  }));
  state.missions = missions.map(withMissionRelations);
  state.active = activeResult.data
    ? {
        ...activeResult.data,
        missions: withMissionRelations(
          missionsById.get(activeResult.data.mission_id),
        ),
      }
    : null;
  state.history = history.map((report) => ({
    ...report,
    missions: withMissionRelations(missionsById.get(report.mission_id)),
    aircraft_master: aircraftById.get(report.aircraft_id) || null,
  }));

  if (!state.profile) {
    toast(
      "Your pilot profile is still being created. Reload in a moment.",
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
function home() {
  const p = state.profile;
  const active = activeMission();
  return `<section class="hero"><div><div class="eyebrow">Pilot Career</div><h1>Welcome, ${esc(p?.pilot_name || p?.name || "Pilot")}.</h1><p>${esc(p?.callsign || "Independent operator")} • Your browser career is synced securely.</p></div><div><div class="label">Available Funds</div><div class="money">${num(p?.credits)} Cr</div></div></section><div class="grid"><div class="card s4"><div class="label">Pilot Level</div><div class="stat">Level ${level()}</div><div class="small">${num(p?.xp)} XP • ${num(p?.reputation)} reputation</div></div><div class="card s4"><div class="label">Completed Flights</div><div class="stat">${num(p?.flights_completed || state.history.length)}</div><div class="small">${num(p?.missions_completed)} missions completed</div></div><div class="card s4"><div class="label">Current Aircraft</div><div class="stat">${esc(aircraftName(state.aircraft[0] || {}))}</div><div class="small">${state.qualifications.map((x) => esc(x.qualifications?.code || x.qualifications?.name)).join(" • ") || "Loading starter PPL…"}</div></div><div class="card s12">${active ? `<div class="eyebrow">Active Mission</div><h2>${esc(missionTitle(active))}</h2><p class="route">${esc(route(active))} • ${esc(aircraftName(active.aircraft_master || active))}</p>${activeMissionDetails(active)}<button class="action primary" data-action="report">Complete Mission</button>` : `<div class="eyebrow">Next Flight</div><h2>${missions().length ? "Available contracts" : "No eligible missions"}</h2><p class="small">${missions().length ? "Choose a contract from the mission board." : "Missions appear only when you own the required aircraft, qualification, and level."}</p>`}</div></div>`;
}
function missionList() {
  const ms = missions();
  return `<section class="hero"><div><div class="eyebrow">Mission Board</div><h1>Choose your assignment.</h1><p>Only contracts your pilot can legally fly are shown.</p></div></section><div class="grid"><div class="card s8">${state.active ? '<div class="notice"><b>You already have an active mission.</b><br>Complete or resolve it before accepting another contract.</div>' : ""}${ms.length ? ms.map((m) => `<div class="mission"><div><span class="tag">${esc(m.mission_code || m.id)}</span><span class="tag">${esc(m.mission_type || m.type || "MISSION")}</span><h3>${esc(missionTitle(m))}</h3><div class="route">${esc(route(m))} • ${esc(aircraftName(m.aircraft_master || m))}</div><div class="small">${num(m.reward_credits || m.credits)} Cr • ${num(m.reward_xp || m.xp)} XP</div></div><button class="action primary" data-brief="${m.id}" ${state.active ? "disabled" : ""}>View brief</button></div>`).join("") : '<p class="small">No missions currently meet your ownership, qualification, and level requirements.</p>'}</div><div class="card s4"><div class="eyebrow">Eligibility</div><h2>Fly what you own.</h2><p class="copy">FlightOps checks the authoritative pilot aircraft, qualifications, and level before showing a contract.</p></div></div>`;
}
function brief() {
  const m = state.selected;
  if (!m) {
    state.page = "missions";
    return missionList();
  }
  return `<div class="card"><div class="eyebrow">Mission Brief</div><span class="tag">${esc(m.mission_code || m.id)}</span><span class="tag">${esc(m.mission_type || m.type || "MISSION")}</span><h1>${esc(missionTitle(m))}</h1><div class="details"><div class="detail"><div class="label">Aircraft</div><strong>${esc(aircraftName(m.aircraft_master || m))}</strong></div><div class="detail"><div class="label">Route</div><strong>${esc(route(m))}</strong></div><div class="detail"><div class="label">Distance</div><strong>${esc(m.distance_nm || m.distance || "—")} NM</strong></div><div class="detail"><div class="label">Required qualification</div><strong>${esc(m.required_qualification?.code || m.required_qualification_code || "See mission")}</strong></div></div><p class="copy">${esc(m.description || m.briefing || "Plan the route in MSFS 2024 Free Flight, then complete the stated mission objective.")}</p><div class="callout"><b>Objective:</b> ${esc(m.objective || m.mission_objective || "Complete the assigned route safely.")}<br><b>Operational notes:</b> ${esc(m.operational_notes || m.hazards || "Review weather and airport conditions before departure.")}</div><p class="reward">${num(m.reward_credits || m.credits)} Cr • +${num(m.reward_xp || m.xp)} XP</p><button class="action primary" data-action="accept" ${state.active ? "disabled" : ""}>Accept Mission</button> <button class="action" data-page="missions">Back</button></div>`;
}
function hangar() {
  return `<section class="hero"><div><div class="eyebrow">Virtual Hangar</div><h1>Your aircraft.</h1><p>Ownership is loaded from your FlightOps career record.</p></div></section><div class="fleet">${state.aircraft.length ? state.aircraft.map((a) => `<div class="plane"><div class="owned">● OWNED</div><h3>${esc(aircraftName(a))}</h3><div class="small">${esc(a.aircraft_master?.category || a.aircraft_master?.role || "Aircraft")}</div></div>`).join("") : '<div class="notice">No aircraft are available yet. New pilots receive the C172 through the backend starter trigger.</div>'}</div>`;
}
function pilot() {
  const p = state.profile || {};
  return `<section class="hero"><div><div class="eyebrow">Pilot Record</div><h1>${esc(p.pilot_name || p.name || "Pilot")}</h1><p>${esc(p.callsign || "No callsign set")} • MSFS 2024 • PS5</p></div><button class="action" data-action="edit-profile">Edit profile</button></section><div class="grid"><div class="card s4"><div class="label">Level / XP</div><div class="stat">${level()} / ${num(p.xp)} XP</div></div><div class="card s4"><div class="label">Credits / Reputation</div><div class="stat">${num(p.credits)} Cr</div><div class="small">${num(p.reputation)} reputation</div></div><div class="card s4"><div class="label">Qualifications</div><div class="small">${state.qualifications.map((x) => esc(x.qualifications?.name || x.qualifications?.code)).join("<br>") || "None"}</div></div><div class="card s12"><div class="eyebrow">Flight History</div>${state.history.length ? state.history.map((h) => `<div class="historyrow"><div><b>${esc(missionTitle(h.missions || h))}</b><div class="small">${esc(new Date(h.completed_at || h.created_at).toLocaleString())} • ${esc(aircraftName(h.aircraft_master || h))}</div><div class="small">${esc(route(h.missions || h))} • ${esc(h.outcome || "Recorded")} • Landing: ${esc(h.landing || h.landing_quality || "—")}</div></div><div style="text-align:right"><b class="owned">+${num(h.credits_earned || h.reward_credits)} Cr</b><div class="small">+${num(h.xp_earned || h.reward_xp)} XP</div></div></div>`).join("") : '<p class="small">Your completed flights will appear here.</p>'}</div></div>`;
}
function report() {
  const m = state.active?.missions || state.active;
  if (!m) {
    state.page = "home";
    return home();
  }
  const choice = (field, values) =>
    `<div class="fleet">${values.map(([v, l]) => `<button class="plane choice ${state.report[field] === v ? "selected" : ""}" data-choice="${field}" data-value="${v}"><b>${l}</b></button>`).join("")}</div>`;
  return `<section class="hero"><div><div class="eyebrow">Flight Debrief</div><h1>${esc(missionTitle(m))}</h1><p>${esc(route(m))} • Tell FlightOps what happened.</p></div></section><div class="card"><h3>Outcome</h3>${choice(
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
  ])}<label class="label" for="notes">Notable event / pilot notes</label><textarea id="notes" placeholder="Optional operational notes">${esc(state.report.notes)}</textarea><br><button class="action primary" data-action="complete" ${state.submitting ? "disabled" : ""}>${state.submitting ? "Submitting…" : "Submit Flight Report"}</button></div>`;
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
          brief,
          hangar,
          pilot,
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
    state.submitting = true;
    render();
    const r = state.report,
      id = state.active?.id;
    const payload = {
      p_active_mission_id: id,
      p_outcome: r.outcome,
      p_landing: r.landing,
      p_aircraft_condition: r.condition,
      p_objective_status: r.objective,
      p_notes: r.notes,
    };
    const result = await rpc("complete_active_mission", [
      payload,
      {
        active_mission_id: id,
        outcome: r.outcome,
        landing: r.landing,
        aircraft_condition: r.condition,
        objective_status: r.objective,
        notes: r.notes,
      },
    ]);
    const d = result.data;
    toast(
      `Flight recorded${d ? `: +${num(d.credits || d.credits_earned)} Cr, +${num(d.xp || d.xp_earned)} XP` : ""}.`,
    );
    state.submitting = false;
    state.report = {
      outcome: "successful",
      landing: "good",
      condition: "no_issues",
      objective: "completed",
      notes: "",
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
