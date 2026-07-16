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

async function populateCountryStats() {
  const countryNameEl = document.getElementById("country-name");
  const growthBox = document.querySelector(".stat-box-growth");
  const fleetBox = document.querySelector(".stat-box-fleet");
  if (!countryNameEl || !growthBox || !fleetBox) return;

  const country = countryNameEl.textContent.trim();

  try {
    const [growthText, fleetText] = await Promise.all([
      fetch("../country_growth.csv").then((r) => r.text()),
      fetch("../EAFO_FLEET_NEW.csv").then((r) => r.text()),
    ]);

    const growthRow = parseDelimitedCSV(growthText, ",").find((r) => r.Region === country);
    const fleetRow = parseDelimitedCSV(fleetText, ";").find((r) => r.Country === country);

    if (growthRow) {
      growthBox.querySelector(".stat-line.bev .stat-value").textContent = formatPercent(growthRow.BEV_growth);
      growthBox.querySelector(".stat-line.ice .stat-value").textContent = formatPercent(growthRow.ICE_growth);
    }

    if (fleetRow) {
      fleetBox.querySelector(".stat-line.bev .stat-value").textContent = formatCount(fleetRow["BEV Fleet 2025 cars"]);
      fleetBox.querySelector(".stat-line.ice .stat-value").textContent = formatCount(fleetRow["Total fleet"]);
    }
  } catch (err) {
    console.error("Failed to load country stats", err);
  }
}

window.addEventListener("load", () => {
  hideLoader();
  populateCountryStats();
});
