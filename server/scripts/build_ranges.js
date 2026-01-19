const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

function normalizeHeader(h) {
  return String(h || "")
    .replace(/\(.*?\)/g, "")        // remove (g/dL) etc
    .replace(/[^a-zA-Z0-9]/g, "")   // remove spaces/symbols
    .toLowerCase();
}

function percentile(arr, p) {
  const a = arr.filter(n => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return null;
  const idx = (p / 100) * (a.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return a[lo];
  return a[lo] + (a[hi] - a[lo]) * (idx - lo);
}

// ✅ Put your Kaggle CSV inside datasets with this name:
const csvPath = path.join(__dirname, "../../datasets/cbc_health_severity_dataset.csv");
const outPath = path.join(__dirname, "../../datasets/lab_reference_ranges.json");

const csv = fs.readFileSync(csvPath, "utf8");
const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });

const rows = parsed.data;
const headers = parsed.meta.fields || [];

const ranges = {};

for (const header of headers) {
  const key = normalizeHeader(header);
  if (!key) continue;

  // skip non-medical fields
  if (key === "patientid" || key === "severity") continue;

  const values = rows
    .map(r => parseFloat(r[header]))
    .filter(v => Number.isFinite(v));

  // only create range if numeric column
  if (!values.length) continue;

  ranges[key] = {
    low: percentile(values, 5),
    high: percentile(values, 95)
  };
}

fs.writeFileSync(outPath, JSON.stringify(ranges, null, 2));
console.log("✅ Created:", outPath);
