function hideLoader() {
  const loader = document.getElementById("loader-wrapper");
  if (!loader) return;
  loader.classList.add("fade-out");
  setTimeout(() => { loader.style.display = "none"; }, 600);
}

function parseDelimitedCSV(text, delimiter) {
  const lines = text.trim().split(/\r?\n/).filter((line) => line.length > 0);
  const headers = lines[0].split(delimiter).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter);
    const row = {};
    headers.forEach((header, i) => { row[header] = (cells[i] || "").trim(); });
    return row;
  });
}

function formatCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("en-US").format(n) : "—";
}

function formatPercent(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n}%` : "—";
}

const COUNTRIES = [
  "European Union", "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Rep.",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Greece", "Hungary", "Ireland",
  "Italy", "Latvia", "Lithuania", "Luxembourg", "Netherlands", "Norway", "Poland",
  "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden", "United Kingdom",
];

// Each entry gets `.options` (the fetched Flourish template + our overrides) and
// `.visual` (the live Flourish.Live instance) attached once initLiveCharts() runs.
const LIVE_CHARTS = [
  { id: "29683026", container: "#chart-bev-registrations" },
  { id: "29683258", container: "#chart-fuel-share" },
  { id: "29683832", container: "#chart-fuel-type" },
  { id: "29683569", container: "#chart-absolute-registrations" },
  { id: "29685761", container: "#chart-plugin-share" },
];

let growthRows = [];
let fleetRows = [];

async function loadCountryDataSources() {
  const [growthText, fleetText] = await Promise.all([
    fetch("../country_growth.csv").then((r) => r.text()),
    fetch("../EAFO_FLEET_NEW.csv").then((r) => r.text()),
  ]);
  growthRows = parseDelimitedCSV(growthText, ",");
  fleetRows = parseDelimitedCSV(fleetText, ";");
}

function populateCountryStats(country) {
  const growthBox = document.querySelector(".stat-box-growth");
  const fleetBox = document.querySelector(".stat-box-fleet");
  if (!growthBox || !fleetBox) return;

  const growthRow = growthRows.find((r) => r.Region === country);
  const fleetRow = fleetRows.find((r) => r.Country === country);

  growthBox.querySelector(".stat-line.bev .stat-value").textContent = growthRow ? formatPercent(growthRow.BEV_growth) : "—";
  growthBox.querySelector(".stat-line.ice .stat-value").textContent = growthRow ? formatPercent(growthRow.ICE_growth) : "—";
  fleetBox.querySelector(".stat-line.bev .stat-value").textContent = fleetRow ? formatCount(fleetRow["BEV Fleet 2025 cars"]) : "—";
  fleetBox.querySelector(".stat-line.ice .stat-value").textContent = fleetRow ? formatCount(fleetRow["Total fleet"]) : "—";
}

// Fetches each chart's already-published template+data from Flourish's public
// metadata endpoint, then renders it via the Live API (proxied through /flourish
// so the API key stays server-side) instead of the simple public embed.
async function initLiveCharts() {
  await Promise.all(
    LIVE_CHARTS.map(async (chart) => {
      const template = await fetch(
        `https://public.flourish.studio/visualisation/${chart.id}/visualisation-object.json`
      ).then((r) => r.json());

      chart.options = { ...template, api_url: "/flourish", container: chart.container };
      chart.visual = new Flourish.Live(chart.options);
    })
  );
}

function applyLiveCountryFilter(country) {
  LIVE_CHARTS.forEach((chart) => {
    if (!chart.visual) return;
    chart.options.state = { ...chart.options.state, row_filter: [country] };
    chart.visual.update(chart.options);
  });
}

function countryFromHash() {
  const match = window.location.hash.match(/country=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function initCountrySelector() {
  const select = document.getElementById("country-select");
  if (!select) return;

  select.innerHTML = COUNTRIES.map((c) => `<option value="${c}">${c}</option>`).join("");

  await Promise.all([initLiveCharts(), loadCountryDataSources()]);

  const requestedCountry = countryFromHash();
  const initialCountry = COUNTRIES.includes(requestedCountry) ? requestedCountry : "European Union";
  select.value = initialCountry;

  applyLiveCountryFilter(initialCountry);
  populateCountryStats(initialCountry);

  if (requestedCountry) {
    document.getElementById("country-eu").scrollIntoView({ behavior: "smooth" });
  }

  select.addEventListener("change", () => {
    applyLiveCountryFilter(select.value);
    populateCountryStats(select.value);
  });
}

window.addEventListener("load", () => {
  hideLoader();
  initCountrySelector();
});
