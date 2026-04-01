// LifeLine Triage - simple hackathon MVP
// No backend: keep a list in memory and render a table.

// Core logic stays the same: scoring rules + emergency override.

const SYMPTOM_POINTS = {
  "Chest Pain": 50,
  "Breathing Difficulty": 50,
  "Injury": 30,
  "Fever": 20,
  "Headache": 10,
};

const form = document.getElementById("patientForm");
const queueBody = document.getElementById("queueBody");
const topAlert = document.getElementById("topAlert");
const clearBtn = document.getElementById("clearBtn");

const ageInput = document.getElementById("age");
const genderSelect = document.getElementById("gender");
const durationValueInput = document.getElementById("durationValue");
const durationUnitSelect = document.getElementById("durationUnit");
const emergencyCheckbox = document.getElementById("emergencyCase");

let patients = [];

function durationToMinutes(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  if (unit === "days") return n * 60 * 24;
  if (unit === "hours") return n * 60;
  return n;
}

function getSelectedSymptoms() {
  return Array.from(document.querySelectorAll('input[name="symptoms"]:checked')).map(
    (el) => el.value
  );
}

// Rule-based scoring (simple + readable)
function calculateScore({ age, symptoms, severity, durationMinutes }) {
  let score = 0;

  // symptom points (sum)
  for (const s of symptoms) {
    score += SYMPTOM_POINTS[s] || 0;
  }

  // age rule
  if (age > 60) score += 20;

  // severity rule
  score += severity * 5;

  // duration rule
  if (durationMinutes > 60) score += 10;

  return score;
}

function getPriority(score) {
  if (score >= 80) return { label: "Critical", color: "red" };
  if (score >= 40) return { label: "Moderate", color: "yellow" };
  return { label: "Low", color: "green" };
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showEmergencyAlert(show) {
  topAlert.hidden = !show;
}

function setEmergencyMode(isEmergency) {
  // When Emergency Case is checked, disable Age and Duration (as requested).
  ageInput.disabled = isEmergency;
  durationValueInput.disabled = isEmergency;
  durationUnitSelect.disabled = isEmergency;

  if (isEmergency) {
    ageInput.value = "";
    durationValueInput.value = "";
    durationUnitSelect.value = "minutes";
    showEmergencyAlert(true);
  } else {
    showEmergencyAlert(false);
  }
}

function renderQueue() {
  // EMERGENCY always at the top, then sort by score
  const sorted = [...patients].sort((a, b) => {
    if (a.isEmergency && !b.isEmergency) return -1;
    if (!a.isEmergency && b.isEmergency) return 1;
    return b.score - a.score;
  });

  queueBody.innerHTML = "";

  if (sorted.length === 0) {
    queueBody.innerHTML = `
      <tr id="emptyRow">
        <td colspan="6" class="muted">No patients yet. Add a patient from the form.</td>
      </tr>
    `;
    return;
  }

  sorted.forEach((p, idx) => {
    const tr = document.createElement("tr");

    if (p.isEmergency) {
      tr.className = "priority-emergency";
    } else {
      tr.className = `priority-${p.priority.color}`;
    }

    const symptomsText = p.symptoms.length ? p.symptoms.join(", ") : "-";

    const priorityText = p.isEmergency ? "EMERGENCY" : p.priority.label;
    const warning = p.isEmergency ? '<div class="small">Immediate Attention Required</div>' : "";

    tr.innerHTML = `
      <td>${idx + 1}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${p.gender ? escapeHtml(p.gender) : "-"}</td>
      <td>${escapeHtml(symptomsText)}</td>
      <td>${p.score}</td>
      <td>${priorityText}${warning}</td>
    `;

    queueBody.appendChild(tr);
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const gender = genderSelect.value;
  const symptoms = getSelectedSymptoms();
  const severityRaw = document.getElementById("severity").value;
  const severity = severityRaw === "" ? NaN : Number(severityRaw);
  const emergencyChecked = emergencyCheckbox.checked;

  // Minimal validation
  if (!name) return;

  // Emergency override has the highest precedence and does NOT depend on other fields.
  let score;
  let priority;
  let isEmergency;

  if (emergencyChecked) {
    score = 999;
    priority = { label: "EMERGENCY", color: "emergency" };
    isEmergency = true;
  } else {
    const age = Number(ageInput.value);
    const durationValue = durationValueInput.value;
    const durationUnit = durationUnitSelect.value;
    const durationMinutes = durationToMinutes(durationValue, durationUnit);

    if (!Number.isFinite(age)) return;
    if (durationMinutes === null) return;
    if (!symptoms.length) return;
    if (!Number.isFinite(severity) || severity < 1 || severity > 10) return;

    score = calculateScore({ age, symptoms, severity, durationMinutes });
    priority = getPriority(score);
    isEmergency = false;
  }

  patients.push({
    name,
    gender: gender || "",
    age: emergencyChecked ? null : Number(ageInput.value),
    symptoms,
    durationMinutes: emergencyChecked ? null : durationToMinutes(durationValueInput.value, durationUnitSelect.value),
    severity: Number.isFinite(severity) ? severity : null,
    score,
    priority,
    isEmergency,
  });

  renderQueue();
  showEmergencyAlert(isEmergency);

  form.reset();
  document.getElementById("severity").value = 5;
  setEmergencyMode(false);
});

clearBtn.addEventListener("click", () => {
  patients = [];
  showEmergencyAlert(false);
  renderQueue();
});

emergencyCheckbox.addEventListener("change", () => {
  setEmergencyMode(emergencyCheckbox.checked);
});

// Initial render
setEmergencyMode(false);
renderQueue();