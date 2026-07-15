const REGIONS = [
  { key: "East Asia Pacific", color: "var(--series-1)" },
  { key: "South Asia", color: "var(--series-2)" },
  { key: "Sub-Saharan Africa", color: "var(--series-3)" },
  { key: "Europe and Central Asia", color: "var(--series-4)" },
  { key: "Latin America and Caribbean", color: "var(--series-5)" },
  { key: "Middle East and North Africa", color: "var(--series-6)" },
  { key: "North America", color: "var(--series-7)" },
];

const ROLES = ["Analyst", "Journalist", "Marketing", "Sales"];

function hideLoader() {
  const loader = document.getElementById("loader-wrapper");
  if (!loader) return;
  loader.classList.add("fade-out");
  setTimeout(() => { loader.style.display = "none"; }, 600);
}

function formatCompact(n) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
}

function renderHero(data) {
  const first = data[0];
  const last = data[data.length - 1];

  const worldFirst = d3.sum(REGIONS, r => first[r.key]);
  const worldLast = d3.sum(REGIONS, r => last[r.key]);
  const growth = worldLast / worldFirst;

  document.getElementById("hero-value").textContent = formatCompact(worldLast);
  document.getElementById("hero-sub").textContent =
    `${growth.toFixed(1)}x the ${first.Year} total across these seven regions.`;

  const growthByRegion = REGIONS.map(r => ({
    key: r.key,
    growth: last[r.key] / first[r.key],
  })).sort((a, b) => d3.descending(a.growth, b.growth));
  const top = growthByRegion[0];

  document.getElementById("hero-value-2").textContent = top.key;
  document.getElementById("hero-sub-2").textContent =
    `Population grew ${top.growth.toFixed(1)}x from ${first.Year} to ${last.Year}.`;
}

function renderTable(data) {
  const last = data[data.length - 1];
  const worldLast = d3.sum(REGIONS, r => last[r.key]);

  const rows = REGIONS.map(r => ({
    key: r.key,
    color: r.color,
    value: last[r.key],
    share: last[r.key] / worldLast,
  })).sort((a, b) => d3.descending(a.value, b.value));

  const container = d3.select("#table-container");
  const table = container.append("table").attr("class", "data-table");
  const thead = table.append("thead").append("tr");
  thead.append("th").text("Region");
  thead.append("th").text("Population");
  thead.append("th").text("Share");

  const tbody = table.append("tbody");
  const tr = tbody.selectAll("tr").data(rows).join("tr");
  const th = tr.append("td");
  th.append("span").attr("class", "swatch").style("background-color", d => d.color);
  th.append("span").text(d => d.key);
  tr.append("td").attr("class", "num").text(d => formatCompact(d.value));
  tr.append("td").attr("class", "num").text(d => d3.format(".1%")(d.share));
}

function renderJobsTable(rows) {
  const container = d3.select("#jobs-table-container");
  const table = container.append("table").attr("class", "data-table");
  const thead = table.append("thead").append("tr");
  thead.append("th").text("Country");
  thead.append("th").text("Sector");
  ROLES.forEach(r => thead.append("th").text(r).attr("class", "num"));

  const tbody = table.append("tbody");
  const tr = tbody.selectAll("tr").data(rows).join("tr");
  tr.append("td").text(d => d.Country);
  tr.append("td").text(d => d.Label);
  ROLES.forEach(r => {
    tr.append("td").attr("class", "num").text(d => d[r]);
  });
}

function main(popData, jobsData) {
  renderHero(popData);
  renderTable(popData);
  renderJobsTable(jobsData);
  hideLoader();
}

Promise.all([
  d3.csv("population.csv", d3.autoType),
  d3.csv("job_roles.csv", d3.autoType),
]).then(([popData, jobsData]) => main(popData, jobsData));
