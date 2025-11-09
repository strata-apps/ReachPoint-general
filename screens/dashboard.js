// screens/dashboard.js
export default function Dashboard(root) {
  root.innerHTML = `
    <!-- Page Header -->
    <section class="page-head">
      <h1 class="page-title">Dashboard</h1>
      <div class="subtle">Welcome back — here’s your overview.</div>
    </section>

    <div class="dashboard-container">
      <div class="dashboard-canvas"></div>

      <div class="dashboard-stage">

        <!-- Mini Navigation -->
        <nav class="mini-nav" id="miniNav">
          ${mini("Call Campaigns")}
          ${mini("Email Campaigns")}
          ${mini("Tasks")}
          ${mini("Insights")}
        </nav>

        <section id="dashMount"></section>
      </div>
    </div>
  `;

  // Set default tab
  setActive("Call Campaigns");
  renderCallCampaigns();

  // Mini nav click handling
  root.querySelector("#miniNav").addEventListener("click", (e) => {
    const btn = e.target.closest(".mini-btn");
    if (!btn) return;
    const label = btn.dataset.label;

    setActive(label);

    if (label === "Call Campaigns") renderCallCampaigns();
    if (label === "Email Campaigns") renderEmailCampaigns();
    if (label === "Tasks") renderTasks();
    if (label === "Insights") renderInsights();
  });

  /* ---------------- Helpers ---------------- */
  function mini(label) {
    return `<a href="#" class="mini-btn" data-label="${label}">${label}</a>`;
  }

  function setActive(label) {
    root.querySelectorAll(".mini-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.label === label);
    });
  }

  /* ---------------- Sections ---------------- */
  function renderCallCampaigns() {
    const m = root.querySelector("#dashMount");
    m.innerHTML = `
      <div class="cards">
        <div class="card">
          <div class="kicker">Campaigns</div>
          <div class="big">4</div>
          <div class="label">Active call campaigns</div>
        </div>

        <div class="card">
          <div class="kicker">Calls Completed</div>
          <div class="big">642</div>
          <div class="label">This cycle</div>
        </div>

        <div class="card wide">
          <div class="kicker">Recent Updates</div>
          <div class="big">What's new</div>
          <p class="label">Two outreach campaigns were updated and 120 numbers were added.</p>
        </div>
      </div>
    `;
  }

  function renderEmailCampaigns() {
    const m = root.querySelector("#dashMount");
    m.innerHTML = `
      <div class="cards">
        <div class="card">
          <div class="kicker">Drafts</div>
          <div class="big">2</div>
          <div class="label">Ready to schedule</div>
        </div>

        <div class="card">
          <div class="kicker">Open Rate</div>
          <div class="big">42%</div>
          <div class="label">Last campaign</div>
        </div>

        <div class="card wide">
          <div class="kicker">Templates</div>
          <p class="label">Design newsletters here.</p>
        </div>
      </div>
    `;
  }

  function renderTasks() {
    const m = root.querySelector("#dashMount");
    m.innerHTML = `
      <div class="cards">
        <div class="card">
          <div class="kicker">Upcoming</div>
          <div class="big">5</div>
          <div class="label">Tasks due this week</div>
        </div>

        <div class="card">
          <div class="kicker">Completed</div>
          <div class="big">14</div>
          <div class="label">Done this month</div>
        </div>

        <div class="card wide">
          <div class="kicker">Task Overview</div>
          <p class="label">Task management and automation live here.</p>
        </div>
      </div>
    `;
  }

  function renderInsights() {
    const m = root.querySelector("#dashMount");
    m.innerHTML = `
      <div class="cards">
        <div class="card">
          <div class="kicker">Trend</div>
          <div class="big">Up</div>
          <div class="label">Week over week</div>
        </div>

        <div class="card">
          <div class="kicker">Engagement</div>
          <div class="big">Moderate</div>
          <div class="label">Calls + Emails</div>
        </div>

        <div class="card wide">
          <div class="kicker">Insights</div>
          <p class="label">Your analytics will appear here.</p>
        </div>
      </div>
    `;
  }
}
