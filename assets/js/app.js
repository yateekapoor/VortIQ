/*
 * VortIQ prototype UI.
 * This file contains browser-only demonstrations. Replace the simulation
 * functions with authenticated API calls when connecting a real backend.
 */

const APP_CONFIG = {
  simulationIntervalSeconds: 8,
  sectors: {
    alpha: {
      name: "ALPHA-07",
      perimeter: "18.4 km perimeter",
      cameras: ["A-01 · North Ridge", "A-03 · Controlled Approach", "A-05 · Fence East", "A-08 · Canal Crossing"]
    },
    bravo: {
      name: "BRAVO-12",
      perimeter: "13.1 km perimeter",
      cameras: ["B-01 · West Ridge", "B-03 · Service Road", "B-05 · Fence West", "B-08 · River Crossing"]
    },
    delta: {
      name: "DELTA-03",
      perimeter: "9.6 km perimeter",
      cameras: ["D-01 · Southern Ridge", "D-03 · Access Track", "D-05 · South Fence", "D-08 · Drainage Crossing"]
    }
  },
  demoAccounts: {
    "operator.demo": { name: "A. Kumar", role: "Border operator", initials: "AK" },
    "supervisor.demo": { name: "Mira Shah", role: "Shift supervisor", initials: "MS" },
    "observer.demo": { name: "Sentinel Demo", role: "Read-only observer", initials: "SD" }
  },
  jobScenarios: [
    {
      clip: "CLIP-092.gif",
      title: "Vehicle movement detected",
      detail: "A-03 · controlled approach · vehicle track V-071",
      result: "Vehicle in Zone 2 · high priority",
      recipients: "Security personnel"
    },
    {
      clip: "CLIP-093.gif",
      title: "Motion sequence logged",
      detail: "A-08 · canal crossing · no sustained object track",
      result: "Motion logged · no escalation",
      recipients: "Auto-logged"
    },
    {
      clip: "CLIP-091.gif",
      title: "Restricted-line event detected",
      detail: "A-05 · fence east · persistent person track P-284",
      result: "Person in Zone 3 · critical priority",
      recipients: "Border forces · Security"
    }
  ]
};

const state = {
  account: APP_CONFIG.demoAccounts["operator.demo"],
  selectedClip: null,
  selectedLabel: "",
  selectedObjectUrl: null,
  activeAnalysis: null,
  nextJobSeconds: APP_CONFIG.simulationIntervalSeconds,
  jobIndex: 0,
  simulationTimer: null
};

const elements = {
  loginScreen: document.querySelector("#login-screen"),
  appShell: document.querySelector("#app-shell"),
  loginForm: document.querySelector("#login-form"),
  loginButton: document.querySelector("#login-button"),
  username: document.querySelector("#username"),
  password: document.querySelector("#password"),
  faceInitials: document.querySelector("#face-initials"),
  faceStatus: document.querySelector("#face-status"),
  operatorInitials: document.querySelector("#operator-initials"),
  operatorName: document.querySelector("#operator-name"),
  themeToggle: document.querySelector("#theme-toggle"),
  clock: document.querySelector("#utc-clock"),
  protectedSector: document.querySelector("#protected-sector"),
  sectorHeading: document.querySelector("#sector-heading"),
  sectorDetail: document.querySelector("#sector-detail"),
  sectorCameras: [
    document.querySelector("#sector-camera-1"),
    document.querySelector("#sector-camera-2"),
    document.querySelector("#sector-camera-3"),
    document.querySelector("#sector-camera-4")
  ],
  monitorCamera: document.querySelector("#monitor-camera"),
  clipInput: document.querySelector("#clip-input"),
  chooseFile: document.querySelector("#choose-file"),
  uploadDrop: document.querySelector("#upload-drop"),
  selectedFile: document.querySelector("#selected-file"),
  clipPreview: document.querySelector("#clip-preview"),
  analyseButton: document.querySelector("#analyse-button"),
  analysisResult: document.querySelector("#analysis-result"),
  resultTitle: document.querySelector("#result-title"),
  resultSummary: document.querySelector("#result-summary"),
  resultObject: document.querySelector("#result-object"),
  resultConfidence: document.querySelector("#result-confidence"),
  resultRisk: document.querySelector("#result-risk"),
  resultRecipients: document.querySelector("#result-recipients"),
  sendAlert: document.querySelector("#send-alert"),
  jobTitle: document.querySelector("#job-title"),
  jobDetail: document.querySelector("#job-detail"),
  jobProgress: document.querySelector("#job-progress"),
  eventResult: document.querySelector("#event-result"),
  countdown: document.querySelector("#countdown"),
  runJob: document.querySelector("#run-job"),
  simulateAlert: document.querySelector("#simulate-alert"),
  incidentList: document.querySelector("#incident-list"),
  reviewDialog: document.querySelector("#review-dialog"),
  dialogTitle: document.querySelector("#dialog-title"),
  dialogDetail: document.querySelector("#dialog-detail"),
  toast: document.querySelector("#toast")
};

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("is-hidden");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    elements.toast.classList.add("is-hidden");
  }, 3600);
}

function updateClock() {
  const time = new Date().toLocaleTimeString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  elements.clock.textContent = `UTC · ${time}`;
}

function setTheme(theme) {
  document.body.dataset.theme = theme;
  elements.themeToggle.textContent = theme === "dark" ? "☀" : "◐";
  localStorage.setItem("vortiq-theme", theme);
}

function initialiseTheme() {
  const savedTheme = localStorage.getItem("vortiq-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(savedTheme || (prefersDark ? "dark" : "light"));
}

function goToView(viewId) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === viewId);
  });
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewTarget === viewId);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function changeProtectedSector(sectorKey) {
  const sector = APP_CONFIG.sectors[sectorKey];
  if (!sector) return;

  elements.sectorHeading.textContent = `SECTOR ${sector.name}`;
  elements.sectorDetail.textContent = sector.perimeter;
  elements.sectorCameras.forEach((camera, index) => {
    camera.textContent = sector.cameras[index];
  });
  elements.monitorCamera.textContent = sector.cameras[2];
  showToast(`Active demonstration area changed to ${sector.name}.`);
}

function selectAccount(button) {
  document.querySelectorAll(".account").forEach((account) => {
    account.classList.toggle("is-selected", account === button);
  });

  state.account = {
    name: button.dataset.name,
    role: button.dataset.role,
    initials: button.dataset.initials
  };
  elements.username.value = button.dataset.user;
  elements.password.value = button.dataset.pass;
  elements.faceInitials.textContent = state.account.initials;
  elements.faceStatus.textContent = "Face template selected · ready to verify";
}

function signIn(event) {
  event.preventDefault();
  if (!elements.username.value.trim() || !elements.password.value.trim()) {
    showToast("Enter a username and password before verifying the demo face template.");
    return;
  }

  elements.loginButton.disabled = true;
  elements.loginButton.textContent = "Verifying face template…";
  elements.faceStatus.textContent = "Simulated liveness check in progress…";

  window.setTimeout(() => {
    elements.operatorInitials.textContent = state.account.initials;
    elements.operatorName.textContent = state.account.name;
    elements.loginScreen.classList.add("is-hidden");
    elements.appShell.classList.remove("is-hidden");
    elements.loginButton.disabled = false;
    elements.loginButton.textContent = "Verify & sign in";
    startAutomaticSimulation();
    showToast(`Demo access granted for ${state.account.name}.`);
  }, 850);
}

function releaseObjectUrl() {
  if (state.selectedObjectUrl) {
    URL.revokeObjectURL(state.selectedObjectUrl);
    state.selectedObjectUrl = null;
  }
}

function previewClip(source, label, type = "image/gif") {
  state.selectedClip = source;
  state.selectedLabel = label;
  elements.selectedFile.textContent = label;
  elements.analyseButton.disabled = false;
  elements.analysisResult.classList.add("is-hidden");

  const isVideo = type.startsWith("video/");
  const media = document.createElement(isVideo ? "video" : "img");
  media.src = source;
  media.alt = `Preview: ${label}`;
  if (isVideo) {
    media.controls = true;
    media.muted = true;
  }
  elements.clipPreview.replaceChildren(media);
}

function selectUploadedFile(file) {
  if (!file) return;
  releaseObjectUrl();
  state.selectedObjectUrl = URL.createObjectURL(file);
  previewClip(state.selectedObjectUrl, file.name, file.type || "video/*");
}

function selectDemoClip(button) {
  releaseObjectUrl();
  previewClip(button.dataset.clip, button.dataset.label, "image/gif");
}

function resultForClip() {
  const identity = `${state.selectedLabel} ${state.selectedClip}`.toLowerCase();
  if (identity.includes("fence") || identity.includes("091")) {
    return {
      title: "Restricted-line movement detected",
      summary: "A person track persisted inside the Fence East region and crossed the simulated Zone 3 rule.",
      object: "Person · P-284",
      confidence: "96%",
      risk: "Critical · 92",
      recipients: "Border forces · Security",
      camera: "A-05 · Fence East",
      riskClass: "critical"
    };
  }
  if (identity.includes("vehicle") || identity.includes("approach") || identity.includes("092")) {
    return {
      title: "Vehicle movement detected",
      summary: "A vehicle track persisted in the controlled approach corridor and triggered the Zone 2 directional-movement rule.",
      object: "Vehicle · V-071",
      confidence: "93%",
      risk: "High · 71",
      recipients: "Security personnel",
      camera: "A-03 · Controlled approach",
      riskClass: "high"
    };
  }
  return {
    title: "Motion sequence detected",
    summary: "MOG2 motion remained visible near the canal crossing. No high-confidence breach rule was met.",
    object: "Motion region · M-202",
    confidence: "74%",
    risk: "Medium · 39",
    recipients: "Auto-logged",
    camera: "A-08 · Canal Crossing",
    riskClass: "medium"
  };
}

function runAnalysis() {
  if (!state.selectedClip) return;
  elements.analyseButton.disabled = true;
  elements.analyseButton.textContent = "Analysing clip…";
  elements.analysisResult.classList.add("is-hidden");

  window.setTimeout(() => {
    const result = resultForClip();
    state.activeAnalysis = result;
    elements.resultTitle.textContent = result.title;
    elements.resultSummary.textContent = result.summary;
    elements.resultObject.textContent = result.object;
    elements.resultConfidence.textContent = result.confidence;
    elements.resultRisk.textContent = result.risk;
    elements.resultRecipients.textContent = result.recipients;
    elements.analysisResult.classList.remove("is-hidden");
    elements.analyseButton.disabled = false;
    elements.analyseButton.textContent = "Run analysis again";
    showToast("Prototype analysis complete. The central detection result is ready for review.");
  }, 1300);
}

function addIncident(result) {
  const now = new Date().toLocaleTimeString("en-GB", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${now}</td>
    <td><b>${result.title}</b><small>${result.object} · clip reference retained</small></td>
    <td>${result.camera}</td>
    <td><span class="risk ${result.riskClass}">${result.risk}</span></td>
    <td>${result.recipients}</td>
    <td><span class="status waiting">Awaiting review</span></td>
    <td><button class="button button-quiet review-button">Review</button></td>
  `;
  elements.incidentList.prepend(row);
}

function sendAlert() {
  if (!state.activeAnalysis) {
    showToast("Run clip analysis before sending a simulated alert.");
    return;
  }
  addIncident(state.activeAnalysis);
  showToast(`Simulated alert recorded for ${state.activeAnalysis.recipients}.`);
}

function updateEventResult(scenario) {
  const [heading, ...rest] = scenario.result.split(" · ");
  elements.eventResult.innerHTML = `
    <span>EVENT RESULT</span>
    <b>${heading}</b>
    <p>${rest.join(" · ")} · ${scenario.recipients}</p>
  `;
  elements.eventResult.classList.toggle("is-alert", scenario.result.includes("critical"));
}

function runBackendJob() {
  const scenario = APP_CONFIG.jobScenarios[state.jobIndex % APP_CONFIG.jobScenarios.length];
  state.jobIndex += 1;
  state.nextJobSeconds = APP_CONFIG.simulationIntervalSeconds;
  elements.jobTitle.textContent = `Processing ${scenario.clip}`;
  elements.jobDetail.textContent = "Reading saved clip · motion gate · object detection · tracking · event rules";
  elements.jobProgress.style.width = "28%";
  elements.runJob.disabled = true;

  window.setTimeout(() => {
    elements.jobProgress.style.width = "100%";
    elements.jobTitle.textContent = scenario.title;
    elements.jobDetail.textContent = scenario.detail;
    updateEventResult(scenario);
    elements.runJob.disabled = false;
    showToast(`Automatic simulation: ${scenario.result}.`);
  }, 950);
}

function startAutomaticSimulation() {
  if (state.simulationTimer) return;
  state.simulationTimer = window.setInterval(() => {
    state.nextJobSeconds -= 1;
    elements.countdown.textContent = `${state.nextJobSeconds} sec`;
    if (state.nextJobSeconds <= 0) {
      runBackendJob();
    }
  }, 1000);
}

function openReviewDialog(title, detail) {
  elements.dialogTitle.textContent = title;
  elements.dialogDetail.textContent = detail;
  elements.reviewDialog.showModal();
}

function bindEvents() {
  document.querySelectorAll("[data-view-target]").forEach((button) => {
    button.addEventListener("click", () => goToView(button.dataset.viewTarget));
  });
  document.querySelector("[data-view-link]").addEventListener("click", () => goToView("overview"));

  document.querySelectorAll(".account").forEach((button) => {
    button.addEventListener("click", () => selectAccount(button));
  });
  elements.loginForm.addEventListener("submit", signIn);

  elements.themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  });
  elements.protectedSector.addEventListener("change", () => {
    changeProtectedSector(elements.protectedSector.value);
  });

  elements.chooseFile.addEventListener("click", () => elements.clipInput.click());
  elements.clipInput.addEventListener("change", () => selectUploadedFile(elements.clipInput.files[0]));
  document.querySelectorAll(".demo-clip").forEach((button) => {
    button.addEventListener("click", () => selectDemoClip(button));
  });
  ["dragenter", "dragover"].forEach((eventName) => {
    elements.uploadDrop.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.uploadDrop.classList.add("is-dragover");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    elements.uploadDrop.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.uploadDrop.classList.remove("is-dragover");
    });
  });
  elements.uploadDrop.addEventListener("drop", (event) => selectUploadedFile(event.dataTransfer.files[0]));
  elements.analyseButton.addEventListener("click", runAnalysis);
  elements.sendAlert.addEventListener("click", sendAlert);

  elements.runJob.addEventListener("click", runBackendJob);
  elements.simulateAlert.addEventListener("click", () => {
    const scenario = APP_CONFIG.jobScenarios[2];
    openReviewDialog(scenario.title, `${scenario.detail}. ${scenario.result}.`);
  });
  elements.incidentList.addEventListener("click", (event) => {
    if (!event.target.classList.contains("review-button")) return;
    const row = event.target.closest("tr");
    openReviewDialog(row.cells[1].innerText, `${row.cells[2].innerText} · ${row.cells[3].innerText} · ${row.cells[4].innerText}`);
  });
  document.querySelector("#close-dialog").addEventListener("click", () => elements.reviewDialog.close());
  document.querySelector("#clear-event").addEventListener("click", () => {
    elements.reviewDialog.close();
    showToast("Simulated operator decision recorded: cleared as non-threat.");
  });
  document.querySelector("#escalate-event").addEventListener("click", () => {
    elements.reviewDialog.close();
    showToast("Simulated escalation recorded for the C2 and field-response adapter.");
  });
}

initialiseTheme();
updateClock();
window.setInterval(updateClock, 1000);
bindEvents();
