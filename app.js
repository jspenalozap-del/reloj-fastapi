const tzSelect = document.getElementById("tz");
const clockEl = document.getElementById("clock");
const isoEl = document.getElementById("iso");

async function fetchTime() {
  const tz = tzSelect.value;
  const url = `/api/time?tz=${encodeURIComponent(tz)}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    clockEl.textContent = "ERROR";
    isoEl.textContent = JSON.stringify(data);
    return;
  }

  const d = new Date(data.iso);
  clockEl.textContent = d.toLocaleTimeString("es-CO");
  isoEl.textContent = data.iso;
}

tzSelect.addEventListener("change", fetchTime);

// primera carga
fetchTime();

// refresca cada 5 segundos (para no reventar invocaciones)
setInterval(fetchTime, 5000);