// Lista (Etiqueta -> IANA timezone)
const TIMEZONES = [
    { label: "Estados Unidos (Nueva York)", tz: "America/New_York" },
    { label: "Estados Unidos (Chicago)", tz: "America/Chicago" },
    { label: "Estados Unidos (Los Ángeles)", tz: "America/Los_Angeles" },
  
    { label: "Canadá (Toronto)", tz: "America/Toronto" },
    { label: "Canadá (Vancouver)", tz: "America/Vancouver" },
  
    { label: "México (CDMX)", tz: "America/Mexico_City" },
    { label: "Argentina (Buenos Aires)", tz: "America/Argentina/Buenos_Aires" },
  
    { label: "Italia (Roma)", tz: "Europe/Rome" },
    { label: "Rusia (Moscú)", tz: "Europe/Moscow" },
  
    { label: "China (Shanghái)", tz: "Asia/Shanghai" },
    { label: "Corea del Sur (Seúl)", tz: "Asia/Seoul" },
  
    { label: "Australia (Sídney)", tz: "Australia/Sydney" },
    { label: "Nueva Zelanda (Auckland)", tz: "Pacific/Auckland" }
  ];
  
  const BOGOTA_TZ = "America/Bogota";
  
  // Estado por reloj (para “tick” suave sin pegarle a la API cada segundo)
  const clocks = {
    bogota: { tz: BOGOTA_TZ, baseEpochMs: null, fetchedAtMs: null, lastIso: null },
    selected: { tz: TIMEZONES[0].tz, baseEpochMs: null, fetchedAtMs: null, lastIso: null }
  };
  
  function $(id) { return document.getElementById(id); }
  
  function setBadge(el, state, text) {
    el.classList.remove("badge-ok", "badge-bad", "badge-warn");
    el.classList.add(state);
    el.textContent = text;
  }
  
  function formatTime(epochMs, timeZone) {
    const dtf = new Intl.DateTimeFormat("es-CO", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    });
    return dtf.format(new Date(epochMs));
  }
  
  async function syncFromApi(clockKey) {
    const clock = clocks[clockKey];
    const tz = clock.tz;
  
    const statusEl = clockKey === "bogota" ? $("statusBogota") : $("statusSelected");
    const isoEl = clockKey === "bogota" ? $("isoBogota") : $("isoSelected");
    const lastSyncEl = clockKey === "bogota" ? $("lastSyncBogota") : $("lastSyncSelected");
    const driftEl = clockKey === "bogota" ? $("driftBogota") : $("driftSelected");
  
    try {
      setBadge(statusEl, "badge-warn", "Sincronizando…");
  
      const url = `/api/time?tz=${encodeURIComponent(tz)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
      const data = await res.json();
      const apiEpochMs = Date.parse(data.iso);     // instante real (UTC) en ms
      const nowMs = Date.now();
  
      clock.baseEpochMs = apiEpochMs;
      clock.fetchedAtMs = nowMs;
      clock.lastIso = data.iso;
  
      isoEl.textContent = data.iso;
      lastSyncEl.textContent = new Date().toLocaleString("es-CO");
  
      // “Diferencia vs tu PC”: si tu PC está bien, debería ser cerca de 0–2s.
      const driftSec = Math.round((apiEpochMs - nowMs) / 1000);
      driftEl.textContent = `${driftSec} s`;
  
      // Indicador OK si la respuesta llegó y el drift no es absurdo
      if (Math.abs(driftSec) <= 5) {
        setBadge(statusEl, "badge-ok", "API OK");
      } else {
        setBadge(statusEl, "badge-warn", "API OK (PC desfasado)");
      }
  
    } catch (err) {
      setBadge(statusEl, "badge-bad", "Error API");
      isoEl.textContent = `Error: ${String(err.message || err)}`;
    }
  }
  
  function renderTick() {
    // Bogotá
    if (clocks.bogota.baseEpochMs && clocks.bogota.fetchedAtMs) {
      const liveEpoch = clocks.bogota.baseEpochMs + (Date.now() - clocks.bogota.fetchedAtMs);
      $("timeBogota").textContent = formatTime(liveEpoch, clocks.bogota.tz);
    }
  
    // Seleccionado
    if (clocks.selected.baseEpochMs && clocks.selected.fetchedAtMs) {
      const liveEpoch = clocks.selected.baseEpochMs + (Date.now() - clocks.selected.fetchedAtMs);
      $("timeSelected").textContent = formatTime(liveEpoch, clocks.selected.tz);
    }
  }
  
  function setupTimezoneSelect() {
    const sel = $("tzSelect");
    sel.innerHTML = "";
  
    for (const item of TIMEZONES) {
      const opt = document.createElement("option");
      opt.value = item.tz;
      opt.textContent = item.label;
      sel.appendChild(opt);
    }
  
    sel.value = clocks.selected.tz;
  
    sel.addEventListener("change", async () => {
      clocks.selected.tz = sel.value;
  
      // Actualiza link API del reloj variable
      const apiLink = $("apiLinkSelected");
      apiLink.href = `/api/time?tz=${encodeURIComponent(clocks.selected.tz)}`;
      apiLink.textContent = apiLink.href.replace(window.location.origin, "");
  
      // Resync inmediato
      await syncFromApi("selected");
    });
  
    // Link inicial
    const apiLink = $("apiLinkSelected");
    apiLink.href = `/api/time?tz=${encodeURIComponent(clocks.selected.tz)}`;
    apiLink.textContent = apiLink.href.replace(window.location.origin, "");
  }
  
  async function main() {
    setupTimezoneSelect();
  
    // Link fijo Bogotá
    $("apiLinkBogota").href = `/api/time?tz=${encodeURIComponent(BOGOTA_TZ)}`;
  
    // 1) Sincroniza una vez
    await syncFromApi("bogota");
    await syncFromApi("selected");
  
    // 2) Tick visual cada 250ms (suave)
    setInterval(renderTick, 250);
  
    // 3) Resync con API cada 15s (para no spamear invocations en Vercel)
    setInterval(() => syncFromApi("bogota"), 15000);
    setInterval(() => syncFromApi("selected"), 15000);
  }
  
  main();