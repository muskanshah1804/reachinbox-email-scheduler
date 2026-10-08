import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API = "http://localhost:4000";

type Email = {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string;
  status: string;
};

function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [tab, setTab] = useState<"scheduled" | "sent">("scheduled");
  const [emails, setEmails] = useState<Email[]>([]);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCompose, setShowCompose] = useState(false);

  // =========================
  // GOOGLE AUTH
  // =========================

  useEffect(() => {
    fetch(`${API}/auth/me`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setUser(data.user);
        }
      })
      .catch((err) => {
        console.error("Auth check failed:", err);
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  const loginWithGoogle = () => {
    window.location.href = `${API}/auth/google`;
  };

  const logout = async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout failed:", err);
    }

    setUser(null);
  };

  // =========================
  // LOAD STATS
  // =========================

  async function loadStats() {
    try {
      const [scheduledRes, sentRes] = await Promise.all([
        fetch(`${API}/api/emails/scheduled`),
        fetch(`${API}/api/emails/sent`),
      ]);

      const scheduled = await scheduledRes.json();
      const sent = await sentRes.json();

      setScheduledCount(
        Array.isArray(scheduled) ? scheduled.length : 0
      );

      setSentCount(
        Array.isArray(sent) ? sent.length : 0
      );
    } catch {
      console.log("Stats loading failed");
    }
  }

  // =========================
  // LOAD EMAILS
  // =========================

  async function loadEmails() {
    try {
      setLoading(true);
      setError("");

      const url = search.trim()
        ? `${API}/api/emails/search?q=${encodeURIComponent(search)}`
        : `${API}/api/emails/${tab}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to load emails");
      }

      const data = await response.json();

      let result = Array.isArray(data) ? data : [];

      if (search.trim()) {
        result = result.filter((email: Email) =>
          tab === "scheduled"
            ? email.status === "SCHEDULED"
            : email.status === "SENT"
        );
      }

      setEmails(result);
    } catch {
      setError("Unable to connect to the backend.");
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmails();
    loadStats();
  }, [tab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadEmails();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  function refresh() {
    loadEmails();
    loadStats();
  }
  if (authLoading) {
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">✉</div>

        <h1>ReachInbox</h1>

        <p>
          Email scheduling and outreach infrastructure
        </p>

        <div className="login-loading">
          Checking your account...
        </div>
      </div>
    </div>
  );
}

if (!user) {
  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-logo">
          ✉
        </div>

        <h1>ReachInbox</h1>

        <p>
          Email scheduling and outreach infrastructure
        </p>

        <button
          className="google-login-btn login-button"
          onClick={loginWithGoogle}
        >
          Continue with Google
        </button>

        <span className="login-note">
          Sign in securely to access your workspace
        </span>

      </div>
    </div>
  );
}

  return (
    <div className="app">

      {/* ================= HEADER ================= */}

      <header className="header">
        <div className="header-inner">

          <div className="brand">

            <div className="logo">
              ✉
            </div>

            <div>
              <h2>ReachInbox</h2>
              <span>Email Infrastructure</span>
            </div>

          </div>

          {/* GOOGLE USER AREA */}

          <div className="user-area">

            {authLoading ? (

              <div className="user-info">
                <strong>Loading...</strong>
                <span>Checking account</span>
              </div>

            ) : user ? (

              <>
                <div className="avatar">

                  {user.photo ? (

                    <img
                      src={user.photo}
                      alt="Profile"
                      className="profile-photo"
                    />

                  ) : (

                    user.name?.charAt(0)?.toUpperCase() || "U"

                  )}

                </div>

               <div className="user-info">
  <strong>{user.name}</strong>
  <span>{user.email}</span>
</div>

<button
  className="slack-button"
  onClick={() => {
    window.location.href =
      "http://localhost:4000/auth/slack/connect";
  }}
>
  Connect Slack
</button>

<button
  className="logout"
  onClick={logout}
  title="Logout"
>
  ↪
</button>
              </>

            ) : (

              <button
                className="google-login-btn"
                onClick={loginWithGoogle}
              >
                Continue with Google
              </button>

            )}

          </div>

        </div>
      </header>

      {/* ================= MAIN ================= */}

      <main>

        {/* HERO */}

        <section className="hero">

          <div>

            <div className="eyebrow">

              <span className="live-dot"></span>

              EMAIL AUTOMATION

            </div>

            <h1>Email Outreach</h1>

            <p>
              Schedule campaigns, manage recipients and monitor your
              email delivery from one powerful workspace.
            </p>

          </div>

          <button
            className="primary-btn"
            onClick={() => setShowCompose(true)}
          >
            ＋ Compose New Email
          </button>

        </section>

        {/* STATS */}

        <section className="stats">

          <div className="stat-card">

            <div className="stat-icon purple">
              ◷
            </div>

            <div className="stat-content">

              <span>Scheduled</span>

              <strong>
                {scheduledCount}
              </strong>

              <small>
                Queued campaigns
              </small>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon green">
              ✓
            </div>

            <div className="stat-content">

              <span>Sent</span>

              <strong>
                {sentCount}
              </strong>

              <small>
                Successfully processed
              </small>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon blue">
              ●
            </div>

            <div className="stat-content">

              <span>Queue</span>

              <strong className="live-text">
                LIVE
              </strong>

              <small>
                BullMQ worker active
              </small>

            </div>

          </div>

        </section>

        {/* EMAIL PANEL */}

        <section className="panel">

          <div className="panel-header">

            <div className="tabs">

              <button
                className={
                  tab === "scheduled"
                    ? "tab active"
                    : "tab"
                }
                onClick={() => setTab("scheduled")}
              >
                Scheduled Emails

                <b>
                  {scheduledCount}
                </b>
              </button>

              <button
                className={
                  tab === "sent"
                    ? "tab active"
                    : "tab"
                }
                onClick={() => setTab("sent")}
              >
                Sent Emails

                <b>
                  {sentCount}
                </b>
              </button>

            </div>

            <button
              className="refresh"
              onClick={refresh}
            >
              ↻
            </button>

          </div>

          {/* SEARCH */}

          <div className="search-box">

            <span>
              ⌕
            </span>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search recipient, sender, subject or message..."
            />

            {search && (
              <button
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}

          </div>

          {/* CONTENT */}

          {loading ? (

            <div className="empty-state">

              <div className="spinner"></div>

              <h3>
                Loading emails
              </h3>

              <p>
                Fetching the latest queue information...
              </p>

            </div>

          ) : error ? (

            <div className="empty-state">

              <div className="empty-icon">
                !
              </div>

              <h3>
                Something went wrong
              </h3>

              <p>
                {error}
              </p>

              <button
                className="secondary-btn"
                onClick={refresh}
              >
                Try Again
              </button>

            </div>

          ) : emails.length === 0 ? (

            <div className="empty-state">

              <div className="empty-icon">
                ✉
              </div>

              <h3>

                {search
                  ? "No matching emails"
                  : `No ${tab} emails`}

              </h3>

              <p>

                {search
                  ? "Try another recipient or subject."
                  : "Create your first email campaign to get started."}

              </p>

              {!search && (

                <button
                  className="secondary-btn"
                  onClick={() => setShowCompose(true)}
                >
                  ＋ Create Campaign
                </button>

              )}

            </div>

          ) : (

            <div className="table-container">

              <table>

                <thead>

                  <tr>

                    <th>
                      RECIPIENT
                    </th>

                    <th>
                      SUBJECT
                    </th>

                    <th>

                      {tab === "scheduled"
                        ? "SCHEDULED TIME"
                        : "SENT TIME"}

                    </th>

                    <th>
                      STATUS
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {emails.map((email) => (

                    <tr key={email.id}>

                      <td>

                        <div className="recipient">

                          <div className="recipient-avatar">

                            {email.recipient
                              .charAt(0)
                              .toUpperCase()}

                          </div>

                          <span>
                            {email.recipient}
                          </span>

                        </div>

                      </td>

                      <td>

                        <div className="subject">

                          <strong>
                            {email.subject}
                          </strong>

                          <small>
                            From: {email.sender}
                          </small>

                        </div>

                      </td>

                      <td>

                        {new Date(
                          tab === "scheduled"
                            ? email.scheduledAt
                            : email.sentAt ||
                              email.scheduledAt
                        ).toLocaleString()}

                      </td>

                      <td>

                        <span
                          className={`status ${email.status.toLowerCase()}`}
                        >

                          <i></i>

                          {email.status}

                        </span>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>

        {/* FOOTER FEATURES */}

        <div className="features">

          <span>
            ✓ Multi-recipient campaigns
          </span>

          <span>
            ✓ BullMQ scheduling
          </span>

          <span>
            ✓ Redis rate limiting
          </span>

          <span>
            ✓ Slack notifications
          </span>

          <span>
            ✓ Elasticsearch search
          </span>

        </div>

      </main>

      {/* ================= COMPOSE MODAL ================= */}

      {showCompose && (

        <ComposeModal
          close={() => setShowCompose(false)}
          success={() => {
            setShowCompose(false);
            refresh();
          }}
        />

      )}

    </div>
  );
}


/* =========================================================
   COMPOSE MODAL
========================================================= */

function ComposeModal({
  close,
  success,
}: {
  close: () => void;
  success: () => void;
}) {

  const [sender, setSender] =
    useState("demo@ethereal.email");

  const [subject, setSubject] =
    useState("Hello from ReachInbox");

  const [body, setBody] =
    useState(
      "This is a test email from ReachInbox."
    );

  const [recipients, setRecipients] =
    useState("");

  const [startTime, setStartTime] =
    useState(
      new Date(Date.now() + 60000)
        .toISOString()
        .slice(0, 16)
    );

  const [delay, setDelay] =
    useState(2000);

  const [limit, setLimit] =
    useState(100);

  const [csvMessage, setCsvMessage] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  // =========================
  // EXTRACT EMAILS
  // =========================

  function extractEmails(text: string) {

    const matches =
      text.match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
      ) || [];

    return [
      ...new Set(
        matches.map((x) =>
          x.toLowerCase()
        )
      ),
    ];
  }

  // =========================
  // CSV UPLOAD
  // =========================

  async function uploadCSV(
    e: React.ChangeEvent<HTMLInputElement>
  ) {

    const file =
      e.target.files?.[0];

    if (!file) return;

    setCsvMessage(
      "Checking CSV file..."
    );

    try {

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          `${API}/api/csv/preview`,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        setCsvMessage(
          data.error ||
            "CSV validation failed."
        );

        return;
      }

      const validEmails =
        data.recipients.map(
          (item: { email: string }) =>
            item.email
        );

      setRecipients(
        validEmails.join(", ")
      );

      setCsvMessage(
        `✓ ${data.valid} valid emails, ${data.invalid} invalid emails`
      );

    } catch {

      setCsvMessage(
        "Unable to check CSV."
      );

    }
  }

  // =========================
  // SCHEDULE
  // =========================

  async function schedule() {

    const emailList =
      extractEmails(recipients);

    if (emailList.length === 0) {

      setCsvMessage(
        "Please add at least one valid recipient."
      );

      return;
    }

    if (
      !sender.trim() ||
      !subject.trim() ||
      !body.trim()
    ) {

      setCsvMessage(
        "Sender, subject and message are required."
      );

      return;
    }

    try {

      setSaving(true);
      setCsvMessage("");

      const response =
        await fetch(
          `${API}/api/emails/schedule`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              sender,
              recipients: emailList,
              subject,
              body,

              scheduledAt:
                new Date(
                  startTime
                ).toISOString(),

              delayMs:
                Number(delay),

              hourlyLimit:
                Number(limit),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        setCsvMessage(
          data.error ||
            "Unable to schedule campaign."
        );

        return;
      }

      success();

    } catch {

      setCsvMessage(
        "Backend is not reachable."
      );

    } finally {

      setSaving(false);

    }
  }

  return (

    <div
      className="modal-overlay"
      onMouseDown={(e) => {

        if (
          e.target ===
          e.currentTarget
        ) {
          close();
        }

      }}
    >

      <div className="modal">

        <div className="modal-header">

          <div>

            <div className="modal-logo">
              ✉
            </div>

            <div>

              <h2>
                Compose Campaign
              </h2>

              <p>
                Create and schedule your email campaign.
              </p>

            </div>

          </div>

          <button
            className="close"
            onClick={close}
          >
            ×
          </button>

        </div>

        {/* SENDER */}

        <label>

          Sender

          <input
            value={sender}
            onChange={(e) =>
              setSender(e.target.value)
            }
            placeholder="sender@example.com"
          />

        </label>

        {/* SUBJECT */}

        <label>

          Subject

          <input
            value={subject}
            onChange={(e) =>
              setSubject(e.target.value)
            }
            placeholder="Campaign subject"
          />

        </label>

        {/* MESSAGE */}

        <label>

          Message

          <textarea
            rows={5}
            value={body}
            onChange={(e) =>
              setBody(e.target.value)
            }
            placeholder="Write your email..."
          />

        </label>

        {/* CSV */}

        <div className="upload">

          <div className="upload-symbol">
            ↑
          </div>

          <div className="upload-info">

            <strong>
              Import recipients
            </strong>

            <span>
              Upload CSV or TXT file
            </span>

          </div>

          <label className="choose-file">

            Choose File

            <input
              type="file"
              accept=".csv,.txt"
              onChange={uploadCSV}
            />

          </label>

        </div>

        {/* RECIPIENTS */}

        <label>

          Recipients

          <textarea
            rows={3}
            value={recipients}
            onChange={(e) =>
              setRecipients(
                e.target.value
              )
            }
            placeholder="john@example.com, jane@example.com"
          />

        </label>

        {csvMessage && (

          <div className="csv-message">
            {csvMessage}
          </div>

        )}

        {/* OPTIONS */}

        <div className="form-grid">

          <label>

            Start Time

            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) =>
                setStartTime(
                  e.target.value
                )
              }
            />

          </label>

          <label>

            Delay (ms)

            <input
              type="number"
              min="0"
              value={delay}
              onChange={(e) =>
                setDelay(
                  Number(
                    e.target.value
                  )
                )
              }
            />

          </label>

          <label>

            Hourly Limit

            <input
              type="number"
              min="1"
              value={limit}
              onChange={(e) =>
                setLimit(
                  Number(
                    e.target.value
                  )
                )
              }
            />

          </label>

        </div>

        {/* BUTTONS */}

        <div className="modal-actions">

          <button
            className="cancel-btn"
            onClick={close}
          >
            Cancel
          </button>

          <button
            className="primary-btn"
            onClick={schedule}
            disabled={saving}
          >
            {saving
              ? "Scheduling..."
              : "Schedule Campaign →"}
          </button>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   START REACT APPLICATION
========================================================= */

createRoot(
  document.getElementById("root")!
).render(
  <App />
);
