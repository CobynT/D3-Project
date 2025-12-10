// main.js

// Chart layout
const width = 960;
const height = 520;
const margin = { top: 70, right: 40, bottom: 60, left: 80 };

const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const chart = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// Tooltip
const tooltip = d3.select("#tooltip");

// Controls
const metricSelect = d3.select("#metric-select");
const gpSlider = d3.select("#gp-min");
const gpLabel = d3.select("#gp-min-label");

// Colors per metric
const metricColors = {
  pts: "#f39c12", // orange-gold
  reb: "#27ae60", // green
  ast: "#8e44ad"  // purple
};

// Metric config
const metrics = {
  pts: { field: "pts", label: "Average Points Per Game" },
  reb: { field: "reb", label: "Average Rebounds Per Game" },
  ast: { field: "ast", label: "Average Assists Per Game" }
};

// Scales
const x = d3.scaleBand().range([0, innerWidth]).padding(0.15);
const y = d3.scaleLinear().range([innerHeight, 0]);

// Axis groups
const xAxisGroup = chart.append("g")
  .attr("transform", `translate(0,${innerHeight})`)
  .attr("class", "x-axis");

const yAxisGroup = chart.append("g")
  .attr("class", "y-axis");

// Title
const title = svg.append("text")
  .attr("x", width / 2)
  .attr("y", margin.top / 2)
  .attr("text-anchor", "middle")
  .style("font-size", "20px")
  .style("font-weight", "600")
  .style("fill", "#f4f4f4");

// X label
chart.append("text")
  .attr("x", innerWidth / 2)
  .attr("y", innerHeight + 40)
  .attr("text-anchor", "middle")
  .style("font-size", "13px")
  .style("fill", "#f4f4f4")
  .text("Age");

// Y label
const yLabel = chart.append("text")
  .attr("transform", "rotate(-90)")
  .attr("x", -innerHeight / 2)
  .attr("y", -55)
  .attr("text-anchor", "middle")
  .style("font-size", "13px")
  .style("fill", "#f4f4f4");

// State
let allData = [];
let currentMetricKey = "pts";
let currentMinGp = +gpSlider.node().value;

// Load data
d3.csv("nba_players.csv").then(function (data) {
  // Parse fields we care about
  allData = raw.map(d => ({
    age: +d.age,
    gp: +d.gp,
    pts: +d.pts,
    reb: +d.reb,
    ast: +d.ast
  })).filter(d =>
    Number.isFinite(d.age) &&
    Number.isFinite(d.gp) &&
    d.age >= 18 &&
    d.age <= 45
  );

  // Initial render
  updateChart();

  // Listeners
  metricSelect.on("change", () => {
    currentMetricKey = metricSelect.node().value;
    updateChart();
  });

  gpSlider.on("input", () => {
    currentMinGp = +gpSlider.node().value;
    gpLabel.text(currentMinGp);
    updateChart();
  });
});

// Helper: compute aggregated data by age for current metric & gp filter
function getAggregatedData() {
  const metric = metrics[currentMetricKey];

  const filtered = allData.filter(d => d.gp >= currentMinGp);

  const grouped = d3.rollup(
    filtered,
    v => d3.mean(v, d => d[metric.field]),
    d => d.age
  );

  const aggregated = Array.from(grouped, ([age, value]) => ({
    age: +age,
    value
  })).sort((a, b) => d3.ascending(a.age, b.age));

  return aggregated;
}

// Update chart based on current state
function updateChart() {
  const metric = metrics[currentMetricKey];
  const color = metricColors[currentMetricKey];
  const aggregated = getAggregatedData();

  if (aggregated.length === 0) {
    console.warn("No data after filtering; try lowering minimum games played.");
  }

  // Update scales
  x.domain(aggregated.map(d => d.age));
  y.domain([0, d3.max(aggregated, d => d.value) || 0]).nice();

  // Update axes
  xAxisGroup
    .call(d3.axisBottom(x).tickSizeOuter(0))
    .selectAll("text")
    .style("fill", "#f4f4f4")
    .style("font-size", "10px");

  yAxisGroup
    .call(d3.axisLeft(y).tickSizeOuter(0))
    .selectAll("text")
    .style("fill", "#f4f4f4")
    .style("font-size", "10px");

  yAxisGroup.selectAll("path, line").style("stroke", "#888");
  xAxisGroup.selectAll("path, line").style("stroke", "#888");

  // Update title & y label
  const gpInfo = currentMinGp > 0 ? ` (GP ≥ ${currentMinGp})` : "";
  title.text(`${metric.label} by Age${gpInfo}`);
  yLabel.text(metric.label);

  // Data join for bars
  const bars = chart.selectAll(".bar")
    .data(aggregated, d => d.age);

  // EXIT
  bars.exit()
    .transition()
    .duration(300)
    .attr("y", innerHeight)
    .attr("height", 0)
    .remove();

  // ENTER + UPDATE
  bars.enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.age))
    .attr("width", x.bandwidth())
    .attr("y", innerHeight)
    .attr("height", 0)
    .merge(bars)
    .on("mousemove", (event, d) => {
      tooltip
        .style("opacity", 1)
        .html(
          `Age: <b>${d.age}</b><br>` +
          `${metric.label}: <b>${d.value.toFixed(2)}</b><br>` +
          `Min GP filter: <b>${currentMinGp}+</b>`
        )
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    })
    .transition()
    .duration(500)
    .attr("x", d => x(d.age))
    .attr("y", d => y(d.value))
    .attr("height", d => innerHeight - y(d.value))
    .attr("fill", color);
}
