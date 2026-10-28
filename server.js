const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

/*
  ============================================================
  CARECONNECT SERVER
  Works locally with Node/Express
  and can also be wrapped as a Netlify Function.
  ============================================================
*/

const PORT = Number(process.env.PORT || 5001);

const JWT_SECRET =
  process.env.JWT_SECRET || "careconnect_demo_secret_change_me";

const DATA_DIR = path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");

/*
  ============================================================
  BASIC MIDDLEWARE
  ============================================================
*/

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

/*
  Serve frontend files when running locally.
  Netlify will serve the public folder separately.
*/
app.use(express.static(PUBLIC_DIR));

/*
  ============================================================
  DATA HELPERS
  ============================================================
*/

function read(file) {
  const filePath = path.join(DATA_DIR, file);

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "[]", "utf8");
    }

    const content = fs.readFileSync(filePath, "utf8");

    return JSON.parse(content || "[]");
  } catch (error) {
    console.error(`Error reading ${file}:`, error.message);
    return [];
  }
}

function write(file, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const filePath = path.join(DATA_DIR, file);

    fs.writeFileSync(
      filePath,
      JSON.stringify(data, null, 2),
      "utf8"
    );

    return true;
  } catch (error) {
    console.error(`Error writing ${file}:`, error.message);
    return false;
  }
}

/*
  ============================================================
  UTILITY FUNCTIONS
  ============================================================
*/

function makeToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";

  const token = header.startsWith("Bearer ")
    ? header.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: "Login required."
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Session expired. Please login again."
    });
  }
}

const uid = (prefix) => {
  return (
    prefix +
    "_" +
    Date.now() +
    "_" +
    Math.random().toString(36).slice(2, 7)
  );
};

/*
  ============================================================
  HEALTH CHECK
  ============================================================
*/

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "CareConnect API is running.",
    environment: process.env.NETLIFY
      ? "Netlify"
      : "Local"
  });
});

/*
  ============================================================
  AUTHENTICATION
  ============================================================
*/

/*
  REGISTER
*/
app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required."
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters."
      });
    }

    const users = read("users.json");

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    if (
      users.some(
        (user) => user.email === normalizedEmail
      )
    ) {
      return res.status(409).json({
        message: "Email is already registered."
      });
    }

    const user = {
      id: uid("u"),
      name: String(name).trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      createdAt: new Date().toISOString()
    };

    users.push(user);

    write("users.json", users);

    return res.status(201).json({
      token: makeToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Registration failed."
    });
  }
});

/*
  LOGIN
*/
app.post("/api/auth/login", async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    const user = read("users.json").find(
      (u) => u.email === normalizedEmail
    );

    if (
      !user ||
      !(await bcrypt.compare(
        password || "",
        user.password
      ))
    ) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    return res.json({
      token: makeToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed."
    });
  }
});

/*
  ============================================================
  DOCTORS
  ============================================================
*/

app.get("/api/doctors", (req, res) => {
  let doctors = read("doctors.json");

  const q = String(req.query.q || "")
    .trim()
    .toLowerCase();

  const specialty = String(
    req.query.specialty || ""
  )
    .trim()
    .toLowerCase();

  if (q) {
    doctors = doctors.filter((doctor) =>
      `${doctor.name} ${doctor.specialty}`
        .toLowerCase()
        .includes(q)
    );
  }

  if (specialty && specialty !== "all") {
    doctors = doctors.filter(
      (doctor) =>
        String(doctor.specialty || "")
          .toLowerCase() === specialty
    );
  }

  res.json(doctors);
});

app.get("/api/doctors/:id", (req, res) => {
  const doctor = read("doctors.json").find(
    (item) => item.id === req.params.id
  );

  if (!doctor) {
    return res.status(404).json({
      message: "Doctor not found."
    });
  }

  res.json(doctor);
});

/*
  ============================================================
  APPOINTMENTS
  ============================================================
*/

app.get("/api/appointments", auth, (req, res) => {
  const list = read("appointments.json")
    .filter(
      (appointment) =>
        appointment.userId === req.user.id
    )
    .sort(
      (a, b) =>
        new Date(
          `${a.date} ${a.time}`
        ) -
        new Date(
          `${b.date} ${b.time}`
        )
    );

  res.json(list);
});

app.post("/api/appointments", auth, (req, res) => {
  const {
    doctorId,
    date,
    time,
    reason,
    patientType,
    childAge,
    appointmentType
  } = req.body;

  const doctor = read("doctors.json").find(
    (d) => d.id === doctorId
  );

  if (!doctor || !date || !time) {
    return res.status(400).json({
      message:
        "Doctor, date and time are required."
    });
  }

  if (
    patientType === "child" &&
    doctor.specialty !== "Pediatrics"
  ) {
    return res.status(400).json({
      message:
        "Child appointments are available with pediatric doctors in this demo."
    });
  }

  const appointments = read(
    "appointments.json"
  );

  const alreadyBooked = appointments.some(
    (appointment) =>
      appointment.doctorId === doctorId &&
      appointment.date === date &&
      appointment.time === time &&
      appointment.status !== "Cancelled"
  );

  if (alreadyBooked) {
    return res.status(409).json({
      message:
        "That time slot is already booked."
    });
  }

  const appointment = {
    id: uid("a"),
    userId: req.user.id,
    doctorId,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    date,
    time,
    reason: reason || "",
    patientType:
      patientType === "child"
        ? "child"
        : "adult",
    childAge:
      patientType === "child"
        ? String(childAge || "")
        : "",
    appointmentType:
      appointmentType === "In-Person"
        ? "In-Person"
        : "Online",
    fee: doctor.fee,
    status: "Upcoming",
    reminder: true,
    createdAt: new Date().toISOString()
  };

  appointments.push(appointment);

  write(
    "appointments.json",
    appointments
  );

  res.status(201).json(appointment);
});

app.patch(
  "/api/appointments/:id/cancel",
  auth,
  (req, res) => {
    const list = read("appointments.json");

    const appointment = list.find(
      (item) =>
        item.id === req.params.id &&
        item.userId === req.user.id
    );

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found."
      });
    }

    appointment.status = "Cancelled";

    write("appointments.json", list);

    res.json(appointment);
  }
);

app.patch(
  "/api/appointments/:id/reminder",
  auth,
  (req, res) => {
    const list = read("appointments.json");

    const appointment = list.find(
      (item) =>
        item.id === req.params.id &&
        item.userId === req.user.id
    );

    if (!appointment) {
      return res.status(404).json({
        message: "Appointment not found."
      });
    }

    appointment.reminder =
      req.body.enabled !== false;

    write("appointments.json", list);

    res.json(appointment);
  }
);

/*
  ============================================================
  MESSAGES
  ============================================================
*/

app.get("/api/messages", auth, (req, res) => {
  const messages = read("messages.json").filter(
    (message) =>
      message.userId === req.user.id
  );

  res.json(messages);
});

app.post("/api/messages", auth, (req, res) => {
  const {
    doctorId,
    text
  } = req.body;

  if (!String(text || "").trim()) {
    return res.status(400).json({
      message: "Message cannot be empty."
    });
  }

  const doctors = read("doctors.json");

  const doctor = doctors.find(
    (item) => item.id === doctorId
  );

  const messages = read("messages.json");

  const message = {
    id: uid("m"),
    userId: req.user.id,
    doctorId: doctorId || "d1",
    doctorName: doctor
      ? doctor.name
      : "Care Team",
    text: String(text).trim(),
    from: "patient",
    createdAt: new Date().toISOString()
  };

  messages.push(message);

  write("messages.json", messages);

  res.status(201).json(message);
});

/*
  ============================================================
  LAB REPORTS
  ============================================================
*/

app.get("/api/labreports", auth, (req, res) => {
  const allReports = read(
    "labreports.json"
  );

  const userReports = allReports.filter(
    (report) =>
      report.userId === req.user.id
  );

  const demoReports = allReports.filter(
    (report) =>
      report.userId === "demo"
  );

  res.json(
    userReports.length
      ? userReports
      : demoReports
  );
});

/*
  ============================================================
  SETTINGS
  ============================================================
*/

app.get("/api/settings", auth, (req, res) => {
  const list = read("settings.json");

  let settings = list.find(
    (item) =>
      item.userId === req.user.id
  );

  if (!settings) {
    settings = {
      userId: req.user.id,
      appointmentReminders: true,
      medicineReminders: true,
      communityUpdates: false,
      softLavenderTheme: true
    };

    list.push(settings);

    write("settings.json", list);
  }

  res.json(settings);
});

app.patch(
  "/api/settings",
  auth,
  (req, res) => {
    const list = read("settings.json");

    let settings = list.find(
      (item) =>
        item.userId === req.user.id
    );

    if (!settings) {
      settings = {
        userId: req.user.id
      };

      list.push(settings);
    }

    settings.appointmentReminders =
      req.body.appointmentReminders !== false;

    settings.medicineReminders =
      req.body.medicineReminders !== false;

    settings.communityUpdates =
      req.body.communityUpdates === true;

    settings.softLavenderTheme =
      req.body.softLavenderTheme !== false;

    settings.updatedAt =
      new Date().toISOString();

    write("settings.json", list);

    res.json(settings);
  }
);

/*
  ============================================================
  MEDICINES / EDUCATION / HOSPITALS / INSURANCE
  ============================================================
*/

app.get("/api/medicines", (req, res) => {
  res.json(read("medicines.json"));
});

app.get("/api/education", (req, res) => {
  res.json(read("education.json"));
});

app.get("/api/hospitals", (req, res) => {
  res.json(read("hospitals.json"));
});

app.get("/api/insurance", (req, res) => {
  res.json(read("insurance.json"));
});

app.get("/api/communities", (req, res) => {
  res.json(read("communities.json"));
});

/*
  ============================================================
  PRESCRIPTIONS
  ============================================================
*/

app.get(
  "/api/prescriptions",
  auth,
  (req, res) => {
    const list = read(
      "prescriptions.json"
    ).filter(
      (prescription) =>
        prescription.userId ===
        req.user.id
    );

    res.json(list);
  }
);

app.post(
  "/api/prescriptions/:id/refill",
  auth,
  (req, res) => {
    const list = read(
      "prescriptions.json"
    );

    const prescription = list.find(
      (item) =>
        item.id === req.params.id &&
        item.userId === req.user.id
    );

    if (!prescription) {
      return res.status(404).json({
        message:
          "Prescription not found."
      });
    }

    prescription.refillRequested = true;

    prescription.refillRequestedAt =
      new Date().toISOString();

    write(
      "prescriptions.json",
      list
    );

    res.json(prescription);
  }
);

app.post(
  "/api/prescriptions/demo",
  auth,
  (req, res) => {
    const list = read(
      "prescriptions.json"
    );

    const prescription = {
      id: uid("rx"),
      userId: req.user.id,
      doctorName:
        req.body.doctorName ||
        "CareConnect Demo Doctor",
      medicine:
        req.body.medicine ||
        "Paracetamol 500 mg",
      dose:
        req.body.dose ||
        "As directed",
      frequency:
        req.body.frequency ||
        "As prescribed",
      duration:
        req.body.duration ||
        "As prescribed",
      instructions:
        req.body.instructions ||
        "Follow your clinician's instructions.",
      refillRequested: false,
      createdAt: new Date().toISOString()
    };

    list.push(prescription);

    write(
      "prescriptions.json",
      list
    );

    res.status(201).json(
      prescription
    );
  }
);

/*
  ============================================================
  TASKS / WORKFLOW
  ============================================================
*/

app.get("/api/tasks", auth, (req, res) => {
  const tasks = read("tasks.json").filter(
    (task) =>
      task.userId === req.user.id
  );

  res.json(tasks);
});

app.post("/api/tasks", auth, (req, res) => {
  if (
    !String(req.body.title || "").trim()
  ) {
    return res.status(400).json({
      message:
        "Task title is required."
    });
  }

  const list = read("tasks.json");

  const task = {
    id: uid("task"),
    userId: req.user.id,
    title: String(
      req.body.title
    ).trim(),
    due: req.body.due || "",
    priority:
      req.body.priority || "Medium",
    done: false,
    createdAt: new Date().toISOString()
  };

  list.push(task);

  write("tasks.json", list);

  res.status(201).json(task);
});

app.patch(
  "/api/tasks/:id",
  auth,
  (req, res) => {
    const list = read("tasks.json");

    const task = list.find(
      (item) =>
        item.id === req.params.id &&
        item.userId === req.user.id
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found."
      });
    }

    task.done = Boolean(
      req.body.done
    );

    write("tasks.json", list);

    res.json(task);
  }
);

/*
  ============================================================
  BILLING / PAYMENTS
  ============================================================
*/

app.get("/api/billing", auth, (req, res) => {
  const payments = read(
    "payments.json"
  ).filter(
    (payment) =>
      payment.userId === req.user.id
  );

  res.json(payments);
});

app.post(
  "/api/billing/pay",
  auth,
  (req, res) => {
    const amount = Number(
      req.body.amount || 0
    );

    if (amount <= 0) {
      return res.status(400).json({
        message:
          "Enter a valid amount."
      });
    }

    const list = read(
      "payments.json"
    );

    const payment = {
      id: uid("pay"),
      userId: req.user.id,
      amount,
      method:
        req.body.method ||
        "Demo Card",
      status: "Paid",
      createdAt:
        new Date().toISOString(),
      note:
        "Demo payment — no real money was charged."
    };

    list.push(payment);

    write(
      "payments.json",
      list
    );

    res.status(201).json(
      payment
    );
  }
);

/*
  ============================================================
  WELLNESS
  ============================================================
*/

app.get("/api/wellness", (req, res) => {
  res.json({
    hydration: {
      goal: 8,
      unit: "glasses",
      message:
        "Sip water regularly through the day."
    },

    sleep: {
      goal: 8,
      unit: "hours",
      message:
        "Aim for a consistent sleep schedule."
    },

    movement: {
      goal: 30,
      unit: "minutes",
      message:
        "Add comfortable movement to your daily routine."
    },

    moodPrompts: [
      "How are you feeling today?",
      "What is one thing you are grateful for?",
      "Take a 2-minute breathing break."
    ]
  });
});

/*
  ============================================================
  SYMPTOM CHECKER
  ============================================================
*/

app.post(
  "/api/symptom-checker",
  (req, res) => {
    const text = String(
      req.body.symptoms || ""
    ).toLowerCase();

    if (!text.trim()) {
      return res.status(400).json({
        message:
          "Please enter symptoms."
      });
    }

    let result = {
      level: "Routine",
      title:
        "Consider a routine consultation",
      advice:
        "Track the symptom, note when it started and consider discussing persistent symptoms with a healthcare professional.",
      specialties: [
        "General Care"
      ]
    };

    /*
      Emergency keywords
    */
    if (
      /chest pain|pressure.*chest|severe breath|cannot breathe|unconscious|seizure|heavy bleeding|stroke|face droop/.test(
        text
      )
    ) {
      result = {
        level: "Emergency",
        title:
          "Seek urgent emergency care",
        advice:
          "This symptom pattern can be associated with an emergency. Contact local emergency services or go to the nearest emergency department now.",
        specialties: [
          "Emergency care"
        ]
      };
    }

    /*
      Common illness symptoms
    */
    else if (
      /fever|cough|sore throat|cold|vomit|diarr/.test(
        text
      )
    ) {
      result = {
        level: "Soon",
        title:
          "Consider a medical consultation",
        advice:
          "Hydration and monitoring may help while arranging care. Seek urgent help if symptoms become severe or you have difficulty breathing.",
        specialties: [
          "Pediatrics",
          "General Care",
          "Internal Medicine"
        ]
      };
    }

    /*
      Skin symptoms
    */
    else if (
      /rash|itch|acne|hair/.test(
        text
      )
    ) {
      result = {
        level: "Routine",
        title:
          "A skin consultation may help",
        advice:
          "A dermatologist can assess persistent or worsening skin symptoms.",
        specialties: [
          "Dermatology"
        ]
      };
    }

    /*
      Neurological symptoms
    */
    else if (
      /headache|migraine|numb|weakness|dizzy/.test(
        text
      )
    ) {
      result = {
        level: "Soon",
        title:
          "Consider a clinician assessment",
        advice:
          "A clinician can assess the pattern and associated symptoms. Sudden severe headache or new weakness requires urgent care.",
        specialties: [
          "Neurology"
        ]
      };
    }

    res.json({
      ...result,

      disclaimer:
        "This tool is an educational triage aid, not a diagnosis or substitute for a clinician."
    });
  }
);

/*
  ============================================================
  EMERGENCY
  ============================================================
*/

app.get(
  "/api/emergency",
  (req, res) => {
    res.json({
      emergencyNumber: "112",
      ambulance: "108",

      message:
        "For a life-threatening emergency in India, call 112 or seek the nearest emergency department.",

      actions: [
        "Call emergency services",
        "Do not drive yourself if severely unwell",
        "Bring current medicines and important medical information if possible"
      ]
    });
  }
);

/*
  ============================================================
  VIDEO CONSULTATION
  ============================================================
*/

app.post(
  "/api/video/session",
  auth,
  (req, res) => {
    const doctor = read(
      "doctors.json"
    ).find(
      (item) =>
        item.id === req.body.doctorId
    );

    if (!doctor) {
      return res.status(404).json({
        message:
          "Doctor not found."
      });
    }

    const roomId =
      "CARE-" +
      Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase();

    res.json({
      roomId,
      doctor: doctor.name,
      mode:
        "Demo video consultation",

      note:
        "This local demo opens your camera preview. A production deployment would connect both participants with WebRTC/signaling."
    });
  }
);

/*
  ============================================================
  COMMUNITIES
  ============================================================
*/

app.post(
  "/api/communities/:id/join",
  auth,
  (req, res) => {
    const list = read(
      "communities.json"
    );

    const community = list.find(
      (item) =>
        item.id === req.params.id
    );

    if (!community) {
      return res.status(404).json({
        message:
          "Community not found."
      });
    }

    community.members =
      Number(
        community.members || 0
      ) + 1;

    write(
      "communities.json",
      list
    );

    res.json(community);
  }
);

/*
  ============================================================
  DASHBOARD
  ============================================================
*/

app.get(
  "/api/dashboard",
  auth,
  (req, res) => {
    const appointments = read(
      "appointments.json"
    ).filter(
      (item) =>
        item.userId === req.user.id
    );

    const prescriptions = read(
      "prescriptions.json"
    ).filter(
      (item) =>
        item.userId === req.user.id
    );

    const tasks = read(
      "tasks.json"
    ).filter(
      (item) =>
        item.userId === req.user.id
    );

    const payments = read(
      "payments.json"
    ).filter(
      (item) =>
        item.userId === req.user.id
    );

    res.json({
      appointments,
      prescriptions,
      tasks,
      payments,

      stats: {
        upcoming:
          appointments.filter(
            (appointment) =>
              appointment.status ===
              "Upcoming"
          ).length,

        prescriptions:
          prescriptions.length,

        openTasks:
          tasks.filter(
            (task) => !task.done
          ).length,

        paid:
          payments.reduce(
            (sum, payment) =>
              sum +
              Number(
                payment.amount || 0
              ),
            0
          )
      }
    });
  }
);

/*
  ============================================================
  API 404 HANDLER
  ============================================================
*/

app.use("/api", (req, res) => {
  res.status(404).json({
    message:
      "CareConnect API endpoint not found."
  });
});

/*
  ============================================================
  FRONTEND FALLBACK
  ============================================================

  This allows client-side navigation to work when running
  CareConnect locally with Express.

  Using a regular expression here keeps it compatible with
  Express versions where app.get("*") can cause route errors.
  ============================================================
*/

app.get(/.*/, (req, res) => {
  const indexFile = path.join(
    PUBLIC_DIR,
    "index.html"
  );

  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }

  res.status(404).send(
    "CareConnect frontend not found."
  );
});

/*
  ============================================================
  ERROR HANDLER
  ============================================================
*/

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      "Server error:",
      error
    );

    res.status(500).json({
      message:
        "Internal server error."
    });
  }
);

/*
  ============================================================
  LOCAL SERVER
  ============================================================

  When running:
      npm start

  the server will start on:
      http://localhost:5000
  ============================================================
*/

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `CareConnect server running on https://careconne.netlify.app/`
    );
  });
}

/*
  ============================================================
  EXPORT EXPRESS APP
  ============================================================

  IMPORTANT FOR NETLIFY

  Netlify Functions will import this Express app and wrap it
  with serverless-http.

  This means server.js itself does NOT need to call app.listen()
  when running on Netlify.
  ============================================================
*/

module.exports = app;