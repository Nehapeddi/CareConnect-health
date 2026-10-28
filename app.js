const state = {
  doctors: [],
  specialty: "All",
  token: localStorage.getItem("care_token"),
  user: JSON.parse(localStorage.getItem("care_user") || "null"),
  selectedDoctor: null,
  selectedTime: null,
  videoStream: null
};

// Empty because frontend and backend are deployed on the same Netlify domain.
// Example: https://your-site.netlify.app/api/doctors
const API_BASE = "";

const $ = id => document.getElementById(id);

const api = async (url, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.message || `Request failed with status ${res.status}`
    );
  }

  return data;
};

const toast = msg => {
  const toastEl = $("toast");

  if (!toastEl) {
    console.log(msg);
    return;
  }

  toastEl.textContent = msg;
  toastEl.classList.add("show");

  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2600);
};

window.careToast = toast;

const initials = name =>
  (name || "Guest User")
    .split(" ")
    .map(x => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const requireLogin = () => {
  if (state.token) return true;

  const modal = $("authModal");

  if (modal) {
    modal.classList.add("show");
  }

  return false;
};

const features = [
  ["📅", "Appointment Scheduling", "Book visits and manage reminders", "appointments"],
  ["🎥", "Telemedicine & Video", "Join an online doctor consultation", "video"],
  ["💊", "Medicines & Refills", "Descriptions, prescriptions and refill requests", "medicines"],
  ["📚", "Patient Education", "Practical health learning resources", "education"],
  ["🧠", "Symptom Checker", "Educational symptom triage", "symptoms"],
  ["🧪", "Clinical Decision Support", "Safety-first educational guidance tools", "symptoms"],
  ["✓", "Task & Workflow", "Track follow-ups and care tasks", "tasks"],
  ["💳", "Billing & Payments", "Demo digital payment management", "billing"],
  ["▦", "Patient Dashboard", "See your care activity at a glance", "dashboard"],
  ["🏥", "Hospital Finder", "Browse a demo care directory", "hospitals"],
  ["🛡️", "Insurance Companion", "Coverage and claim guidance", "insurance"],
  ["🌿", "Virtual Wellness Coach", "Hydration, sleep, movement and mood", "wellness"],
  ["🚨", "Emergency Alert", "Quick access to emergency support", "emergency"],
  ["🤝", "Health Communities", "Join general support communities", "communities"],
  ["🧪", "Lab Reports", "View and organize test reports", "labreports"],
  ["⚙️", "Settings", "Manage notifications and appearance", "settings"]
];

function go(page) {
  const el = $(`${page}Page`);

  if (!el) return;

  document
    .querySelectorAll(".page")
    .forEach(p => p.classList.remove("active"));

  el.classList.add("active");

  document
    .querySelectorAll(".nav-item")
    .forEach(n =>
      n.classList.toggle("active", n.dataset.page === page)
    );

  const loaders = {
    appointments: loadAppointments,
    dashboard: loadDashboard,
    medicines: loadMedicines,
    video: loadVideoDoctors,
    education: loadEducation,
    tasks: loadTasks,
    billing: loadBilling,
    hospitals: loadHospitals,
    insurance: loadInsurance,
    wellness: loadWellness,
    emergency: loadEmergency,
    communities: loadCommunities,
    labreports: loadLabReports,
    settings: loadSettings,
    messages: loadMessages,
    profile: updateProfile
  };

  if (loaders[page]) {
    loaders[page]();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

document.addEventListener("click", e => {
  const nav = e.target.closest("[data-page]");

  if (nav) {
    go(nav.dataset.page);
  }

  const feature = e.target.closest("[data-feature]");

  if (feature) {
    go(feature.dataset.feature);
  }
});

if ($("featureGrid")) {
  $("featureGrid").innerHTML = features
    .map(
      ([icon, title, desc, key]) => `
        <button class="feature-card" data-feature="${key}">
          <div class="feature-icon">${icon}</div>
          <b>${title}</b>
          <span>${desc}</span>
        </button>
      `
    )
    .join("");
}

async function loadDoctors() {
  try {
    state.doctors = await api("/api/doctors");

    renderSpecialties();
    renderPopular();
    renderFilters();
    renderDoctorList();
    fillMessageDoctors();
  } catch (e) {
    toast(e.message);
  }
}

function renderSpecialties() {
  const specs = [
    "Cardiology",
    "Dermatology",
    "Pediatrics",
    "Neurology",
    "Orthopedics",
    "Ophthalmology",
    "Psychiatry",
    "Gynecology"
  ];

  const icons = ["❤", "✦", "🧸", "◉", "◈", "◌", "☼", "✚"];

  if ($("specialtyRow")) {
    $("specialtyRow").innerHTML = specs
      .map(
        (s, i) => `
          <button class="specialty" data-spec="${s}">
            <div class="specialty-icon">${icons[i]}</div>
            <span>${s}</span>
          </button>
        `
      )
      .join("");
  }

  document.querySelectorAll(".specialty").forEach(button => {
    button.onclick = () => {
      state.specialty = button.dataset.spec;
      go("find");
      renderFilters();
      renderDoctorList();
    };
  });
}

function doctorCard(d) {
  return `
    <article class="doctor-card" data-id="${d.id}">
      <div class="doc-image-wrap">
        <img
          class="doc-photo"
          src="${d.image}"
          alt="${d.name} — ${d.specialty}, white coat and stethoscope"
        >
        <span class="verified">✓</span>
      </div>

      <div class="doctor-card-body">
        <h3>${d.name}</h3>
        <p>${d.specialty}</p>

        <div class="doctor-meta">
          <span class="rating">★ ${d.rating}</span>
          <span>${d.experience}</span>
        </div>

        <div class="card-bottom">
          <b>₹${d.fee}</b>
          <button class="book-chip">Book</button>
        </div>
      </div>
    </article>
  `;
}

function renderPopular() {
  if (!$("popularDoctors")) return;

  $("popularDoctors").innerHTML = state.doctors
    .slice(0, 6)
    .map(doctorCard)
    .join("");

  document.querySelectorAll(".doctor-card").forEach(card => {
    card.onclick = () => openDoctor(card.dataset.id);
  });
}

function renderFilters() {
  if (!$("filterRow")) return;

  const specs = [
    "All",
    ...new Set(state.doctors.map(d => d.specialty))
  ];

  $("filterRow").innerHTML = specs
    .map(
      s => `
        <button
          class="filter ${state.specialty === s ? "active" : ""}"
          data-filter="${s}"
        >
          ${s}
        </button>
      `
    )
    .join("");

  document.querySelectorAll(".filter").forEach(button => {
    button.onclick = () => {
      state.specialty = button.dataset.filter;
      renderFilters();
      renderDoctorList();
    };
  });
}

function renderDoctorList() {
  if (!$("doctorSearch") || !$("doctorList")) return;

  const q = ($("doctorSearch").value || "")
    .toLowerCase()
    .trim();

  const list = state.doctors.filter(
    d =>
      (state.specialty === "All" ||
        d.specialty === state.specialty) &&
      `${d.name} ${d.specialty}`
        .toLowerCase()
        .includes(q)
  );

  if ($("resultCount")) {
    $("resultCount").textContent =
      `${list.length} doctor${list.length === 1 ? "" : "s"}`;
  }

  $("doctorList").innerHTML = list.length
    ? list
        .map(
          d => `
            <div class="doctor-row" data-row-id="${d.id}">
              <div class="doc-image-wrap small">
                <img class="doc-photo" src="${d.image}" alt="${d.name}">
                <span class="verified">✓</span>
              </div>

              <div class="row-main">
                <h3>${d.name}</h3>
                <p>${d.specialty} • ${d.experience}</p>

                <div class="rating">
                  ★ ${d.rating}
                  <span class="review-count">
                    (${d.reviews} reviews)
                  </span>
                </div>
              </div>

              <div class="row-side">
                <small>₹${d.fee}</small>
                <button class="book-mini" data-id="${d.id}">
                  Book Now
                </button>
              </div>
            </div>
          `
        )
        .join("")
    : `
      <div class="empty-state">
        <div>🩺</div>
        <h3>No doctors found</h3>
        <p>Try another name or specialty.</p>
      </div>
    `;

  document.querySelectorAll(".book-mini").forEach(button => {
    button.onclick = e => {
      e.stopPropagation();
      openDoctor(button.dataset.id);
    };
  });

  document.querySelectorAll(".doctor-row").forEach(row => {
    row.onclick = () => openDoctor(row.dataset.rowId);
  });
}

if ($("doctorSearch")) {
  $("doctorSearch").oninput = renderDoctorList;
}

if ($("clearSearch")) {
  $("clearSearch").onclick = () => {
    $("doctorSearch").value = "";
    renderDoctorList();
  };
}

function openDoctor(id) {
  const d = state.doctors.find(x => x.id === id);

  if (!d || !$("doctorModalContent")) return;

  state.selectedDoctor = d;
  state.selectedTime = null;

  $("doctorModalContent").innerHTML = `
    <div class="doctor-detail">

      <div class="detail-hero">
        <img src="${d.image}" alt="${d.name}">
        <span class="verified large">✓</span>
      </div>

      <h2>${d.name}</h2>

      <p class="muted">
        ${d.specialty} • ${d.experience}
      </p>

      <span class="pill">
        🩺 White coat + stethoscope
      </span>

      <div class="detail-grid">
        <div>
          <b>★ ${d.rating}</b>
          <span>Rating</span>
        </div>

        <div>
          <b>${d.reviews}</b>
          <span>Reviews</span>
        </div>

        <div>
          <b>₹${d.fee}</b>
          <span>Consultation</span>
        </div>
      </div>

      <h3>About the doctor</h3>
      <p class="muted">${d.about}</p>

      ${
        d.childCare
          ? `
            <div class="child-focus">
              <b>🧸 Children's care</b>
              <div class="focus-list">
                ${(d.childFocus || [])
                  .map(x => `<span>${x}</span>`)
                  .join("")}
              </div>
            </div>
          `
          : ""
      }

      <h3>Patient type</h3>

      <div class="patient-type">
        <button class="type-btn active" data-type="adult">
          Adult
        </button>

        <button class="type-btn" data-type="child">
          Child
        </button>
      </div>

      <div id="childAgeWrap" class="hidden">
        <label>Child's age</label>

        <select id="childAge" class="date-input">
          <option value="">Select age</option>

          ${Array.from(
            { length: 17 },
            (_, i) =>
              `<option value="${i + 1}">
                ${i + 1} year${i ? "s" : ""}
              </option>`
          ).join("")}
        </select>
      </div>

      <h3>Appointment type</h3>

      <div class="patient-type">
        <button class="type-btn active" data-apptype="Online">
          Online
        </button>

        <button class="type-btn" data-apptype="In-Person">
          In-Person
        </button>
      </div>

      <h3>Choose date</h3>

      <input
        id="appointmentDate"
        class="date-input"
        type="date"
        min="${new Date().toISOString().slice(0, 10)}"
      >

      <h3>Choose time</h3>

      <div class="slot-grid">
        ${d.available
          .map(
            t => `
              <button class="slot" data-time="${t}">
                ${t}
              </button>
            `
          )
          .join("")}
      </div>

      <input
        id="appointmentReason"
        class="date-input"
        placeholder="Reason for visit (optional)"
      >

      <div class="booking-total">
        <span>Total consultation</span>
        <b>₹${d.fee}</b>
      </div>

      <button class="primary full" id="confirmBooking">
        Book Appointment • ₹${d.fee}
      </button>

    </div>
  `;

  $("doctorModal").classList.add("show");

  let patientType = "adult";
  let appointmentType = "Online";

  document
    .querySelectorAll(".type-btn[data-type]")
    .forEach(button => {
      button.onclick = () => {
        document
          .querySelectorAll(".type-btn[data-type]")
          .forEach(x => x.classList.remove("active"));

        button.classList.add("active");

        patientType = button.dataset.type;

        $("childAgeWrap").classList.toggle(
          "hidden",
          patientType !== "child"
        );
      };
    });

  document
    .querySelectorAll(".type-btn[data-apptype]")
    .forEach(button => {
      button.onclick = () => {
        document
          .querySelectorAll(".type-btn[data-apptype]")
          .forEach(x => x.classList.remove("active"));

        button.classList.add("active");

        appointmentType = button.dataset.apptype;
      };
    });

  document.querySelectorAll(".slot").forEach(slot => {
    slot.onclick = () => {
      document
        .querySelectorAll(".slot")
        .forEach(x => x.classList.remove("selected"));

      slot.classList.add("selected");

      state.selectedTime = slot.dataset.time;
    };
  });

  $("confirmBooking").onclick = () =>
    bookAppointment(patientType, appointmentType);
}

async function bookAppointment(
  patientType,
  appointmentType
) {
  if (!requireLogin()) return;

  const date = $("appointmentDate").value;

  if (!date || !state.selectedTime) {
    return toast("Please choose a date and time.");
  }

  const childAge =
    patientType === "child"
      ? $("childAge").value
      : "";

  if (patientType === "child" && !childAge) {
    return toast("Please select the child's age.");
  }

  try {
    await api("/api/appointments", {
      method: "POST",
      body: JSON.stringify({
        doctorId: state.selectedDoctor.id,
        date,
        time: state.selectedTime,
        reason: $("appointmentReason").value,
        patientType,
        childAge,
        appointmentType
      })
    });

    $("doctorModal").classList.remove("show");

    toast("Appointment booked successfully 💜");

    go("appointments");
  } catch (e) {
    toast(e.message);
  }
}

async function loadAppointments() {
  if (!requireLogin()) return;

  try {
    const list = await api("/api/appointments");

    $("appointmentList").innerHTML = list.length
      ? list
          .map(a => {
            const d = new Date(`${a.date}T00:00:00`);

            const child =
              a.patientType === "child"
                ? ` • Child (${a.childAge}y)`
                : "";

            const join =
              a.appointmentType === "Online" &&
              a.status === "Upcoming"
                ? `<button class="join" data-join="${a.doctorId}">
                    Join
                  </button>`
                : "";

            return `
              <div class="appointment">

                <div class="date-box">
                  <b>${d.getDate()}</b>
                  <span>
                    ${d
                      .toLocaleString("en", {
                        month: "short"
                      })
                      .toUpperCase()}
                  </span>
                </div>

                <div class="appointment-main">
                  <h3>${a.doctorName}</h3>

                  <p>
                    ${a.specialty} • ${a.time} •
                    ${a.appointmentType}${child}
                  </p>

                  <span
                    class="status-pill ${
                      a.status === "Cancelled"
                        ? "cancelled"
                        : ""
                    }"
                  >
                    ${a.status}
                  </span>

                  ${
                    a.reminder
                      ? `<small class="muted">
                          🔔 Reminder on
                        </small>`
                      : ""
                  }
                </div>

                ${join}

                ${
                  a.status === "Upcoming"
                    ? `<button
                        class="cancel"
                        data-cancel="${a.id}"
                      >
                        Cancel
                      </button>`
                    : ""
                }

              </div>
            `;
          })
          .join("")
      : `
        <div class="empty-state">
          <div>📅</div>
          <h3>No appointments yet</h3>
          <p>Book a doctor from Doctors.</p>
        </div>
      `;

    document
      .querySelectorAll("[data-cancel]")
      .forEach(button => {
        button.onclick = () =>
          cancelAppointment(button.dataset.cancel);
      });

    document
      .querySelectorAll("[data-join]")
      .forEach(button => {
        button.onclick = () =>
          startVideo(button.dataset.join);
      });
  } catch (e) {
    toast(e.message);
  }
}

async function cancelAppointment(id) {
  try {
    await api(`/api/appointments/${id}/cancel`, {
      method: "PATCH"
    });

    toast("Appointment cancelled.");

    loadAppointments();
  } catch (e) {
    toast(e.message);
  }
}

if ($("enableNotify")) {
  $("enableNotify").onclick = async () => {
    if (!("Notification" in window)) {
      return toast(
        "Browser notifications are not supported here."
      );
    }

    const permission =
      await Notification.requestPermission();

    toast(
      permission === "granted"
        ? "Reminders enabled 🔔"
        : "Notifications were not enabled."
    );
  };
}

async function loadDashboard() {
  if (!requireLogin()) return;

  try {
    const d = await api("/api/dashboard");

    $("dashboardStats").innerHTML = [
      ["Upcoming", d.stats.upcoming, "📅"],
      ["Prescriptions", d.stats.prescriptions, "💊"],
      ["Open tasks", d.stats.openTasks, "✓"],
      ["Demo paid", `₹${d.stats.paid}`, "💳"]
    ]
      .map(
        x => `
          <div class="stat-card">
            <span>${x[2]} ${x[0]}</span>
            <b>${x[1]}</b>
          </div>
        `
      )
      .join("");

    const next = d.appointments.find(
      a => a.status === "Upcoming"
    );

    $("nextAppointment").innerHTML = next
      ? `
        <b>${next.doctorName}</b>
        <p class="muted">
          ${next.date} • ${next.time} •
          ${next.appointmentType}
        </p>
      `
      : `<p class="muted">
          No upcoming appointment.
        </p>`;

    $("dashboardTasks").innerHTML =
      d.tasks
        .filter(t => !t.done)
        .slice(0, 4)
        .map(t => `<p>☐ ${t.title}</p>`)
        .join("") ||
      `<p class="muted">
        No open tasks.
      </p>`;
  } catch (e) {
    toast(e.message);
  }
}

async function loadMedicines() {
  try {
    const list = await api("/api/medicines");

    const render = () => {
      const q = ($("medicineSearch").value || "")
        .toLowerCase();

      $("medicineList").innerHTML = list
        .filter(m =>
          `${m.name} ${m.category}`
            .toLowerCase()
            .includes(q)
        )
        .map(
          m => `
            <article class="medicine-card">
              <span class="tag">${m.category}</span>

              <h3>${m.name}</h3>

              <p>${m.description}</p>

              <div class="caution">
                <b>Safety:</b> ${m.caution}
              </div>
            </article>
          `
        )
        .join("");
    };

    $("medicineSearch").oninput = render;

    render();

    loadPrescriptions();
  } catch (e) {
    toast(e.message);
  }
}

async function loadPrescriptions() {
  if (!requireLogin()) return;

  try {
    const list = await api("/api/prescriptions");

    $("prescriptionList").innerHTML = list.length
      ? list
          .map(
            p => `
              <div
                class="medicine-card"
                style="margin:10px 0"
              >
                <h3>${p.medicine}</h3>

                <p>
                  ${p.dose} • ${p.frequency} •
                  ${p.duration}
                </p>

                <p>${p.instructions}</p>

                <button
                  class="outline refill"
                  data-refill="${p.id}"
                >
                  ${
                    p.refillRequested
                      ? "Refill requested"
                      : "Request refill"
                  }
                </button>
              </div>
            `
          )
          .join("")
      : `
        <div class="empty-state">
          <div>💊</div>
          <h3>No prescriptions yet</h3>
          <p>
            Use the demo button to create a sample
            prescription.
          </p>
        </div>
      `;

    document
      .querySelectorAll("[data-refill]")
      .forEach(button => {
        button.onclick = () =>
          refill(button.dataset.refill);
      });
  } catch (e) {
    toast(e.message);
  }
}

async function refill(id) {
  try {
    await api(`/api/prescriptions/${id}/refill`, {
      method: "POST"
    });

    toast("Refill request saved.");

    loadPrescriptions();
  } catch (e) {
    toast(e.message);
  }
}

if ($("demoPrescription")) {
  $("demoPrescription").onclick = async () => {
    if (!requireLogin()) return;

    try {
      await api("/api/prescriptions/demo", {
        method: "POST",
        body: JSON.stringify({
          medicine: "Paracetamol 500 mg",
          dose: "1 tablet",
          frequency: "As directed",
          duration: "3 days",
          instructions:
            "Demo prescription — follow a clinician's instructions."
        })
      });

      toast("Demo prescription added.");

      loadPrescriptions();
    } catch (e) {
      toast(e.message);
    }
  };
}

async function loadVideoDoctors() {
  if (!$("videoDoctors")) return;

  $("videoDoctors").innerHTML = state.doctors
    .filter(d => d.videoConsultation)
    .slice(0, 12)
    .map(doctorCard)
    .join("");

  document
    .querySelectorAll("#videoDoctors .doctor-card")
    .forEach(card => {
      card.onclick = () =>
        startVideo(card.dataset.id);
    });
}

async function startVideo(doctorId) {
  if (!requireLogin()) return;

  try {
    const data = await api("/api/video/session", {
      method: "POST",
      body: JSON.stringify({
        doctorId
      })
    });

    $("videoDoctorName").textContent = data.doctor;

    $("videoRoomId").textContent =
      `Room ${data.roomId} • ${data.mode}`;

    $("videoModal").classList.add("show");

    try {
      state.videoStream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

      $("localVideo").srcObject =
        state.videoStream;
    } catch {
      toast(
        "Camera/microphone permission was not granted. The demo room is still available."
      );
    }
  } catch (e) {
    toast(e.message);
  }
}

function stopVideo() {
  if (state.videoStream) {
    state.videoStream
      .getTracks()
      .forEach(track => track.stop());

    state.videoStream = null;
  }

  if ($("localVideo")) {
    $("localVideo").srcObject = null;
  }

  if ($("videoModal")) {
    $("videoModal").classList.remove("show");
  }
}

if ($("closeVideo")) {
  $("closeVideo").onclick = stopVideo;
}

if ($("endVideo")) {
  $("endVideo").onclick = stopVideo;
}

if ($("cameraBtn")) {
  $("cameraBtn").onclick = () => {
    if (!state.videoStream) return;

    const track =
      state.videoStream.getVideoTracks()[0];

    track.enabled = !track.enabled;

    $("cameraBtn").textContent =
      track.enabled
        ? "📷 Camera"
        : "🚫 Camera off";
  };
}

if ($("micBtn")) {
  $("micBtn").onclick = () => {
    if (!state.videoStream) return;

    const track =
      state.videoStream.getAudioTracks()[0];

    track.enabled = !track.enabled;

    $("micBtn").textContent =
      track.enabled
        ? "🎙️ Microphone"
        : "🔇 Mic off";
  };
}

async function loadEducation() {
  try {
    const list = await api("/api/education");

    $("educationList").innerHTML = list
      .map(
        x => `
          <article class="article-card">
            <div class="article-icon">📘</div>
            <span class="tag">${x.category}</span>
            <h3>${x.title}</h3>
            <p>${x.text}</p>
          </article>
        `
      )
      .join("");
  } catch (e) {
    toast(e.message);
  }
}

async function loadTasks() {
  if (!requireLogin()) return;

  try {
    const list = await api("/api/tasks");

    $("taskList").innerHTML = list.length
      ? list
          .map(
            t => `
              <div
                class="task-item ${t.done ? "done" : ""}"
              >
                <input
                  type="checkbox"
                  ${t.done ? "checked" : ""}
                  data-task="${t.id}"
                >

                <div class="task-text">
                  <b>${t.title}</b>

                  <small class="muted">
                    ${
                      t.due
                        ? ` • Due ${t.due}`
                        : ""
                    }
                  </small>
                </div>

                <span class="priority">
                  ${t.priority}
                </span>
              </div>
            `
          )
          .join("")
      : `
        <div class="empty-state">
          <div>✓</div>
          <h3>No care tasks</h3>
          <p>Add a follow-up task above.</p>
        </div>
      `;

    document
      .querySelectorAll("[data-task]")
      .forEach(input => {
        input.onchange = () =>
          updateTask(
            input.dataset.task,
            input.checked
          );
      });
  } catch (e) {
    toast(e.message);
  }
}

if ($("addTask")) {
  $("addTask").onclick = async () => {
    if (!requireLogin()) return;

    const title =
      $("taskTitle").value.trim();

    if (!title) {
      return toast("Enter a task title.");
    }

    try {
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          due: $("taskDue").value,
          priority: $("taskPriority").value
        })
      });

      $("taskTitle").value = "";

      toast("Care task added.");

      loadTasks();
    } catch (e) {
      toast(e.message);
    }
  };
}

async function updateTask(id, done) {
  try {
    await api(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        done
      })
    });

    loadTasks();
  } catch (e) {
    toast(e.message);
  }
}

async function loadBilling() {
  if (!requireLogin()) return;

  try {
    const list = await api("/api/billing");

    $("paymentList").innerHTML = list.length
      ? list
          .map(
            p => `
              <div class="payment-item">
                <span>
                  💳 ${p.method}

                  <small class="muted">
                    • ${new Date(
                      p.createdAt
                    ).toLocaleString()}
                  </small>
                </span>

                <b>₹${p.amount}</b>
              </div>
            `
          )
          .join("")
      : `
        <div class="empty-state">
          <div>💳</div>
          <h3>No payments yet</h3>
          <p>
            Use the demo payment button above.
          </p>
        </div>
      `;
  } catch (e) {
    toast(e.message);
  }
}

if ($("payDemo")) {
  $("payDemo").onclick = async () => {
    if (!requireLogin()) return;

    try {
      const p = await api("/api/billing/pay", {
        method: "POST",
        body: JSON.stringify({
          amount: 500,
          method: $("paymentMethod").value
        })
      });

      toast(p.note);

      loadBilling();
    } catch (e) {
      toast(e.message);
    }
  };
}

async function loadHospitals() {
  try {
    const list = await api("/api/hospitals");

    const render = () => {
      const q = ($("hospitalSearch").value || "")
        .toLowerCase();

      $("hospitalList").innerHTML = list
        .filter(h =>
          `${h.name} ${h.city}`
            .toLowerCase()
            .includes(q)
        )
        .map(
          h => `
            <article class="hospital-card">

              <span class="tag">
                ${
                  h.emergency
                    ? "Emergency available"
                    : "Routine care"
                }
              </span>

              <h3>${h.name}</h3>

              <p>
                📍 ${h.address}
                <br>
                ☎ ${h.phone}
              </p>

              <p>
                <b>Services:</b>
                ${h.specialties.join(", ")}
              </p>

              <div class="hospital-actions">
                <a
                  href="tel:${h.phone.replace(/\D/g, "")}"
                >
                  Call
                </a>

                <button
                  onclick="careToast('Map integration can be added with a maps API key.')"
                >
                  Map
                </button>
              </div>

            </article>
          `
        )
        .join("");
    };

    $("hospitalSearch").oninput = render;

    render();
  } catch (e) {
    toast(e.message);
  }
}

async function loadInsurance() {
  try {
    const list = await api("/api/insurance");

    $("insuranceList").innerHTML = list
      .map(
        x => `
          <article class="insurance-card">

            <span class="tag">
              Insurance example
            </span>

            <h3>${x.name}</h3>

            <p>${x.coverage}</p>

            <p>
              <b>Claim workflow</b>
            </p>

            <ol>
              ${x.claimSteps
                .map(s => `<li>${s}</li>`)
                .join("")}
            </ol>

            <p>
              <b>Support:</b>
              ${x.hotline}
            </p>

          </article>
        `
      )
      .join("");
  } catch (e) {
    toast(e.message);
  }
}

async function loadWellness() {
  try {
    const d = await api("/api/wellness");

    const arr = [
      [
        "💧",
        "Hydration",
        d.hydration.goal + " " + d.hydration.unit,
        d.hydration.message
      ],
      [
        "😴",
        "Sleep",
        d.sleep.goal + " " + d.sleep.unit,
        d.sleep.message
      ],
      [
        "🚶",
        "Movement",
        d.movement.goal + " " + d.movement.unit,
        d.movement.message
      ]
    ];

    $("wellnessList").innerHTML = arr
      .map(
        x => `
          <article class="wellness-card">
            <div>${x[0]}</div>
            <h3>${x[1]}</h3>
            <div class="goal">${x[2]}</div>
            <p class="muted">${x[3]}</p>
          </article>
        `
      )
      .join("");
  } catch (e) {
    toast(e.message);
  }
}

document.querySelectorAll("[data-mood]").forEach(button => {
  button.onclick = () => {
    if ($("moodMessage")) {
      $("moodMessage").textContent =
        `Thanks for checking in — you marked today as ${button.dataset.mood}. Consider a small supportive action that feels manageable.`;
    }
  };
});

async function loadEmergency() {
  try {
    const d = await api("/api/emergency");

    $("emergencyMessage").textContent =
      d.message;

    $("emergencyActions").innerHTML = d.actions
      .map(
        x => `
          <article class="article-card">
            <div class="article-icon">🆘</div>
            <h3>${x}</h3>
            <p class="muted">
              Follow local emergency guidance and seek
              professional help when needed.
            </p>
          </article>
        `
      )
      .join("");
  } catch (e) {
    toast(e.message);
  }
}

async function loadCommunities() {
  try {
    const list = await api("/api/communities");

    $("communityList").innerHTML = list
      .map(
        c => `
          <article class="community-card">

            <div class="article-icon">🤝</div>

            <h3>${c.name}</h3>

            <p>${c.description}</p>

            <p>
              <b>${c.members.toLocaleString()}</b>
              members
            </p>

            <button
              class="primary join-community"
              data-community="${c.id}"
            >
              Join community
            </button>

          </article>
        `
      )
      .join("");

    document
      .querySelectorAll(".join-community")
      .forEach(button => {
        button.onclick = () =>
          joinCommunity(button.dataset.community);
      });
  } catch (e) {
    toast(e.message);
  }
}

async function joinCommunity(id) {
  if (!requireLogin()) return;

  try {
    const c = await api(
      `/api/communities/${id}/join`,
      {
        method: "POST"
      }
    );

    toast(`Joined ${c.name} 🤝`);

    loadCommunities();
  } catch (e) {
    toast(e.message);
  }
}

async function checkSymptoms() {
  const text =
    $("symptomsInput").value.trim();

  if (!text) {
    return toast("Enter your symptoms first.");
  }

  try {
    const r = await api("/api/symptom-checker", {
      method: "POST",
      body: JSON.stringify({
        symptoms: text
      })
    });

    const emergency =
      r.level === "Emergency";

    $("symptomResult").innerHTML = `
      <div
        class="panel"
        style="
          margin-top:15px;
          border-color:${
            emergency
              ? "#efb0b7"
              : "#ddd5f5"
          };
        "
      >

        <span class="tag">
          ${r.level}
        </span>

        <h3>${r.title}</h3>

        <p>${r.advice}</p>

        <p>
          <b>Relevant areas:</b>
          ${r.specialties.join(", ")}
        </p>

        <small class="muted">
          ${r.disclaimer}
        </small>

      </div>
    `;
  } catch (e) {
    toast(e.message);
  }
}

if ($("checkSymptoms")) {
  $("checkSymptoms").onclick =
    checkSymptoms;
}

async function loadLabReports() {
  if (!requireLogin()) return;

  try {
    const list = await api("/api/labreports");

    $("labCount").textContent = list.length;

    $("labReviewed").textContent =
      list.filter(r =>
        r.status === "Reviewed"
      ).length;

    $("labLatest").textContent =
      list[0]?.date || "—";

    $("labReportList").innerHTML =
      list.length
        ? list
            .map(
              r => `
                <article class="lab-report-card">

                  <div class="report-top">
                    <span class="report-icon">
                      🧪
                    </span>

                    <span
                      class="tag ${
                        r.status === "Reviewed"
                          ? "reviewed"
                          : ""
                      }"
                    >
                      ${r.status}
                    </span>
                  </div>

                  <h3>${r.name}</h3>

                  <p class="muted">
                    ${r.lab} • ${r.date}
                  </p>

                  <p>${r.summary}</p>

                  <div class="report-meta">
                    <span>
                      👨‍⚕️ ${r.doctor}
                    </span>

                    <span>
                      📄 ${r.file}
                    </span>
                  </div>

                  <button
                    class="outline full"
                    data-report="${r.id}"
                  >
                    View report
                  </button>

                </article>
              `
            )
            .join("")
        : `
          <div class="empty-state">
            <div>🧪</div>
            <h3>No lab reports yet</h3>
            <p>
              Add a report after your next test.
            </p>
          </div>
        `;

    document
      .querySelectorAll("[data-report]")
      .forEach(button => {
        button.onclick = () => {
          const r = list.find(
            x => x.id === button.dataset.report
          );

          if (r) {
            toast(
              `${r.name}: demo report opened.`
            );
          }
        };
      });
  } catch (e) {
    toast(e.message);
  }
}

if ($("labUploadHint")) {
  $("labUploadHint").onclick = () =>
    toast(
      "Demo upload area: connect cloud storage or a secure medical-record service for real files."
    );
}

async function loadSettings() {
  if (!requireLogin()) return;

  try {
    const s = await api("/api/settings");

    $("settingAppointments").checked =
      s.appointmentReminders !== false;

    $("settingMedicines").checked =
      s.medicineReminders !== false;

    $("settingCommunity").checked =
      s.communityUpdates === true;

    $("settingTheme").checked =
      s.softLavenderTheme !== false;
  } catch (e) {
    toast(e.message);
  }
}

if ($("saveSettings")) {
  $("saveSettings").onclick = async () => {
    if (!requireLogin()) return;

    try {
      const s = await api("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({
          appointmentReminders:
            $("settingAppointments").checked,

          medicineReminders:
            $("settingMedicines").checked,

          communityUpdates:
            $("settingCommunity").checked,

          softLavenderTheme:
            $("settingTheme").checked
        })
      });

      document.body.classList.toggle(
        "plain-theme",
        !s.softLavenderTheme
      );

      toast("Settings saved successfully.");
    } catch (e) {
      toast(e.message);
    }
  };
}

async function loadMessages() {
  if (!requireLogin()) return;

  try {
    const list = await api("/api/messages");

    $("messageList").innerHTML = list.length
      ? list
          .map(
            m => `
              <div class="message-item">

                <img
                  src="${
                    state.doctors.find(
                      d => d.id === m.doctorId
                    )?.image ||
                    "/images/doctors/doctor-01.svg"
                  }"
                  alt=""
                >

                <div>
                  <h3>${m.doctorName}</h3>
                  <p>${m.text}</p>
                </div>

              </div>
            `
          )
          .join("")
      : `
        <div class="empty-state">
          <div>💬</div>
          <h3>No messages yet</h3>
          <p>
            Start a conversation with your care team.
          </p>
        </div>
      `;
  } catch (e) {
    toast(e.message);
  }
}

function fillMessageDoctors() {
  if (!$("messageDoctor")) return;

  $("messageDoctor").innerHTML =
    state.doctors
      .map(
        d => `
          <option value="${d.id}">
            ${d.name} — ${d.specialty}
          </option>
        `
      )
      .join("");
}

if ($("sendMessage")) {
  $("sendMessage").onclick = async () => {
    if (!requireLogin()) return;

    try {
      await api("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          doctorId: $("messageDoctor").value,
          text: $("messageText").value
        })
      });

      $("messageText").value = "";

      toast("Message sent.");

      loadMessages();
    } catch (e) {
      toast(e.message);
    }
  };
}

function updateProfile() {
  if (!state.user) return;

  const firstName =
    state.user.name.split(" ")[0];

  if ($("welcomeName")) {
    $("welcomeName").textContent =
      `Hi, ${firstName} 👋`;
  }

  if ($("profileName")) {
    $("profileName").textContent =
      state.user.name;
  }

  if ($("profileEmail")) {
    $("profileEmail").textContent =
      state.user.email;
  }

  if ($("profileAvatar")) {
    $("profileAvatar").textContent =
      initials(state.user.name);
  }

  if ($("profileBtn")) {
    $("profileBtn").textContent =
      initials(state.user.name);
  }
}

if ($("kidsCareBtn")) {
  $("kidsCareBtn").onclick = () => {
    state.specialty = "Pediatrics";
    go("find");
    renderFilters();
    renderDoctorList();
  };
}

if ($("cdsKids")) {
  $("cdsKids").onclick = () => {
    state.specialty = "Pediatrics";
    go("find");
    renderFilters();
    renderDoctorList();
  };
}

if ($("profileBtn")) {
  $("profileBtn").onclick = () =>
    state.token
      ? go("profile")
      : $("authModal").classList.add("show");
}

if ($("notifyBtn")) {
  $("notifyBtn").onclick = () =>
    go("appointments");
}

if ($("searchTop")) {
  $("searchTop").onclick = () =>
    go("find");
}

if ($("closeDoctor")) {
  $("closeDoctor").onclick = () =>
    $("doctorModal").classList.remove("show");
}

if ($("closeAuth")) {
  $("closeAuth").onclick = () =>
    $("authModal").classList.remove("show");
}

if ($("doctorModal")) {
  $("doctorModal").onclick = e => {
    if (e.target.id === "doctorModal") {
      $("doctorModal").classList.remove("show");
    }
  };
}

if ($("authModal")) {
  $("authModal").onclick = e => {
    if (e.target.id === "authModal") {
      $("authModal").classList.remove("show");
    }
  };
}

if ($("logoutBtn")) {
  $("logoutBtn").onclick = () => {
    localStorage.removeItem("care_token");
    localStorage.removeItem("care_user");

    state.token = null;
    state.user = null;

    toast("Logged out.");

    go("home");
  };
}

let registerMode = false;

if ($("toggleAuth")) {
  $("toggleAuth").onclick = () => {
    registerMode = !registerMode;

    $("authTitle").textContent =
      registerMode
        ? "Create account"
        : "Welcome back";

    $("authSubmit").textContent =
      registerMode
        ? "Register"
        : "Login";

    $("toggleAuth").textContent =
      registerMode
        ? "Already have an account? Login"
        : "Create a new account";

    $("registerNameWrap").classList.toggle(
      "hidden",
      !registerMode
    );

    $("authError").textContent = "";
  };
}

if ($("authSubmit")) {
  $("authSubmit").onclick = async () => {
    try {
      const body = registerMode
        ? {
            name: $("registerName").value,
            email: $("authEmail").value,
            password: $("authPassword").value
          }
        : {
            email: $("authEmail").value,
            password: $("authPassword").value
          };

      const data = await api(
        registerMode
          ? "/api/auth/register"
          : "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify(body)
        }
      );

      state.token = data.token;
      state.user = data.user;

      localStorage.setItem(
        "care_token",
        state.token
      );

      localStorage.setItem(
        "care_user",
        JSON.stringify(state.user)
      );

      $("authModal").classList.remove("show");

      updateProfile();

      toast(
        registerMode
          ? "Account created!"
          : "Welcome back!"
      );

      go("home");
    } catch (e) {
      $("authError").textContent = e.message;
    }
  };
}

// Start application
loadDoctors();

if (state.user) {
  updateProfile();

  setTimeout(() => {
    loadSettings();
  }, 0);
}