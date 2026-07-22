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

const COUNTRY_ISO_CODES = {
  "European Union": "EU",
  Austria: "AT",
  Belgium: "BE",
  Bulgaria: "BG",
  Croatia: "HR",
  Cyprus: "CY",
  "Czech Rep.": "CZ",
  Denmark: "DK",
  Estonia: "EE",
  Finland: "FI",
  France: "FR",
  Germany: "DE",
  Greece: "GR",
  Hungary: "HU",
  Ireland: "IE",
  Italy: "IT",
  Latvia: "LV",
  Lithuania: "LT",
  Luxembourg: "LU",
  Netherlands: "NL",
  Norway: "NO",
  Poland: "PL",
  Portugal: "PT",
  Romania: "RO",
  Slovakia: "SK",
  Slovenia: "SI",
  Spain: "ES",
  Sweden: "SE",
  "United Kingdom": "GB",
};

// Regional-indicator flag emoji render as plain two-letter text on Windows (no
// flag glyphs in the default system font), so we use real flag images instead
// of embedding emoji in the <option> text (which can't hold images anyway).
const FLAG_CDN = "https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/4x3/";

// Data files that live at the repo root (outside this template/ folder that Netlify
// publishes) are fetched straight from GitHub instead of a relative path.
const REPO_RAW = "https://raw.githubusercontent.com/Transport-Environment/ACEA_Dashboard/main/";

function updateCountryFlag(country) {
  const flagImg = document.getElementById("country-flag");
  const isoCode = COUNTRY_ISO_CODES[country];
  if (!flagImg || !isoCode) return;
  flagImg.src = `${FLAG_CDN}${isoCode.toLowerCase()}.svg`;
  flagImg.alt = `${country} flag`;
}

// Each entry gets `.options` (the fetched Flourish template + our overrides) and
// `.visual` (the live Flourish.Live instance) attached once initLiveCharts() runs.
const LIVE_CHARTS = [
  { id: "29683026", container: "#chart-bev-registrations" },
  { id: "29683258", container: "#chart-fuel-share" },
  { id: "29683832", container: "#chart-fuel-type" },
  { id: "29683569", container: "#chart-absolute-registrations" },
  { id: "29685761", container: "#chart-plugin-share" },
  { id: "29760251", container: "#chart-quarterly-powertrain" },
];

// Loads the landing page title/text from a plain-text file so it can be edited
// (updated figures, wording) without touching HTML. See landing_text.txt (repo
// root) for the file's format rules.
async function loadLandingCopy() {
  const container = document.getElementById("landing-copy");
  if (!container) return;

  const raw = await fetch(`${REPO_RAW}landing_text.txt`).then((r) => r.text());
  const text = raw.split("\n").filter((line) => !line.trim().startsWith("#")).join("\n");
  const blocks = text.trim().split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) return;

  const [titleBlock, ...paragraphBlocks] = blocks;
  const titleHtml = titleBlock.replace(/\*(.+?)\*/, '<span class="hero-title-italic">$1</span>');
  const paragraphsHtml = paragraphBlocks
    .map((p, i) => `<p${i === paragraphBlocks.length - 1 ? ' class="updated-note"' : ""}>${p}</p>`)
    .join("\n");

  container.innerHTML = `<h1>${titleHtml}</h1>\n${paragraphsHtml}`;
}

let growthRows = [];
let fleetRows = [];

async function loadCountryDataSources() {
  const [growthText, fleetText] = await Promise.all([
    fetch(`${REPO_RAW}country_growth.csv`).then((r) => r.text()),
    fetch(`${REPO_RAW}EAFO_FLEET_NEW.csv`).then((r) => r.text()),
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
      // The account's company theme injects a header accent bar + footer logo on every
      // chart rendered via the Live API (not shown on Flourish's own public showcase page).
      // We show a single T&E logo for the whole section ourselves, so disable both here.
      chart.options.state = {
        ...chart.options.state,
        layout: { ...chart.options.state.layout, header_logo_enabled: false, footer_logo_enabled: false },
      };
      chart.visual = new Flourish.Live(chart.options);
      hideChartOwnControl(chart.container);
    })
  );
}

// Each chart still renders its own row-filter dropdown (stale once we drive
// row_filter ourselves via the shared selector above), so hide it. The chart
// renders into a same-origin iframe (served through our own /flourish proxy),
// so we can reach into it and inject CSS.
function hideChartOwnControl(container) {
  const iframe = document.querySelector(`${container} iframe`);
  if (!iframe) return;

  const inject = () => {
    try {
      const doc = iframe.contentDocument;
      if (!doc || !doc.head || doc.getElementById("hide-fl-controls")) return;
      const style = doc.createElement("style");
      style.id = "hide-fl-controls";
      style.textContent = ".fl-control { display: none !important; }";
      doc.head.appendChild(style);
    } catch (err) {
      // same-origin access failed; leave the chart's own control visible
    }
  };

  iframe.addEventListener("load", inject);
  inject();
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
  updateCountryFlag(initialCountry);

  if (requestedCountry) {
    document.getElementById("country-eu").scrollIntoView({ behavior: "smooth" });
  }

  select.addEventListener("change", () => {
    applyLiveCountryFilter(select.value);
    populateCountryStats(select.value);
    updateCountryFlag(select.value);
  });
}

window.addEventListener("load", () => {
  hideLoader();
  loadLandingCopy();
  initCountrySelector();
});
