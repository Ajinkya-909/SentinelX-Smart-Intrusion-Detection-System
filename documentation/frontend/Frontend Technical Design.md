# SentinelX Frontend Architecture & Implementation Guidelines

This document outlines the complete frontend specification for the SentinelX intrusion detection platform. It serves as the master blueprint for the React application architecture, routing schema, UI/UX design system, and API integration.

## 1. Tech Stack & Libraries

* **Framework:** React (via Vite)
* **Routing:** React Router v6
* **Styling:** Tailwind CSS (Utility-first, heavily customized for the theme)
* **Animations:** Framer Motion (For mechanical, precise transitions and progress states)
* **Data Fetching:** React Query (Essential for job polling, caching, and pagination) + Axios
* **Data Visualization:** ApexCharts or Nivo (Optimized for dark mode and high-data-density charts)
* **Icons:** Lucide React or Tabler Icons

---

## 2. Design System: "Cyber-Tactical" Theme

The application relies on a high-contrast, immersive dark mode to reduce eye strain during extended log analysis while highlighting critical security events.

### Color Palette

* **Backgrounds:** * App Base: `#050505` (Deep True Black)
* Sidebar/Cards: `#121212` (Dark Charcoal)
* Input Fields/Hover States: `#1E1E1E`


* **Primary Accent (The Call to Action):**
* Cyber Amber: `#FFB000` or High-Vis Yellow: `#FFD700` (Use sparingly for active tabs, primary buttons, and critical highlights)


* **Semantic Status Indicators:**
* **Critical/Failed:** `#FF3333` (Neon Crimson)
* **Safe/Completed:** `#00FF66` (Neon Green)
* **Processing/Info:** `#00E5FF` (Electric Cyan)


* **Typography:**
* Headings/UI: A clean sans-serif (e.g., Inter or Roboto)
* Logs/Data Tables: A monospace font (e.g., JetBrains Mono or Fira Code) for alignment and technical readability.



### Animation Directives (Framer Motion)

* **No "Bouncy" UI:** Transitions must be linear or use sharp easing curves (e.g., `ease-out`).
* **Processing States:** Use radar sweeps or sequential text-reveal (cipher) effects rather than generic circular spinners.
* **Data Loading:** Staggered fade-ups (`y: 10`, `opacity: 0` -> `y: 0`, `opacity: 1`) for charts and table rows.

---

## 3. Global State & Middlewares

### Authentication Interceptor

* **Trigger:** Any API response returning `401 Unauthorized`.
* **Action:** Automatically clear local user context (Zustand or React Context) and forcefully redirect the router to `/login`.
* **UI:** Trigger a toast notification: *"Session expired. Please authenticate to continue."*

---

## 4. Route Specification

### A. Public Routes

| Route | Component | Purpose & UI Description | API Integration |
| --- | --- | --- | --- |
| `/` | `LandingPage` | Public introduction. Highlights features like rule-based detection, ML analysis, and offline-first capabilities. | None |
| `/login` | `LoginForm` | Authentication gateway. Simple form with email/password. | `POST /auth/login` |
| `/signup` | `SignUpForm` | New user registration. | `POST /auth/sign-up` |

---

### B. Protected Routes (Wrapped in `DashboardLayout`)

*The `DashboardLayout` includes a persistent left sidebar (Navigation) and top header (User Profile / Breadcrumbs).*

#### 1. Main Dashboard

* **Route:** `/app/dashboard`
* **Purpose:** The immediate landing zone post-login. Provides a high-level summary.
* **UI Components:** * "Welcome back, [Name]" header.
* KPI Cards: "Total Jobs Analyzed", "Recent Critical Threats".
* Recent Activity Table (List of the last 5 jobs with their status badges).


* **API Calls:** * `GET /auth/me` (to populate profile info)
* `GET /jobs?limit=5` (to populate recent activity)



#### 2. Jobs List

* **Route:** `/app/jobs`
* **Purpose:** The central hub to view all historical and current log analysis jobs.
* **UI Components:**
* Data Table or Grid of Cards displaying: `fileName`, `status`, `severity`, and `createdAt`.
* Pagination controls (Next/Previous).
* Global "New Analysis" button routing to `/app/jobs/upload`.


* **API Calls:** * `GET /jobs?limit={limit}&offset={offset}`
* **Interaction:** Clicking a row/card pushes the router to `/app/jobs/:id`.

#### 3. Upload & Initialization

* **Route:** `/app/jobs/upload`
* **Purpose:** Intake for raw system logs.
* **UI Components:**
* Drag-and-drop file zone with `.txt`, `.log`, `.csv` constraints.
* Progress indicator for the actual file upload process.


* **API Calls:** * `POST /jobs/upload` (Multipart form-data)
* **Interaction:** On successful `201 Created`, immediately redirect to `/app/jobs/{job_id}`.

#### 4. The Dynamic Job Controller (Status & Details)

* **Route:** `/app/jobs/:id`
* **Purpose:** The single source of truth for a specific job. The UI heavily mutates based on the backend `status`.
* **API Calls:**
* `GET /jobs/:id` (Fetch full job data)
* `GET /jobs/:id/status` (If processing, poll this every 3000ms)


* **Dynamic UI States:**
* **State A: `status === 'PROCESSING'**`
* UI: A large horizontal stepper (Uploaded → Normalizing → Analyzing → Insights).
* Action: The UI polls the status endpoint. No interaction allowed except returning to `/app/jobs`.


* **State B: `status === 'FAILED'**`
* UI: The stepper turns red. Display the `error_message` returned from the API in a prominent danger card.
* Action: Render a "Retry Analysis" button calling `POST /jobs/:id/retry`. Render a "Delete Job" button calling `DELETE /jobs/:id`.


* **State C: `status === 'COMPLETED'**`
* UI: Stepper turns green. Render a complete Job Metadata card (File size, duration, severity outcome).
* Actions:
1. "Download Raw Log" -> Calls `GET /jobs/:id/file`
2. "Delete Job" -> Calls `DELETE /jobs/:id`
3. "Reanalyze" -> Calls `POST /jobs/:id/reanalyze` (if rules updated)
4. **Primary Action:** A glowing Amber button labeled "Access Security Report" -> Routes to `/app/jobs/:id/report`.







#### 5. The Threat Intelligence Report (Insights Dashboard)

* **Route:** `/app/jobs/:id/report`
* **Purpose:** The "Cool" Dashboard. Dense data visualization for a completed job.
* **UI Layout:** A tabbed interface or vertically scrollable sections to prevent cognitive overload.
* **Section 1: Executive Summary**
* UI: High-level text summaries generated by the LLM. Donut charts showing distribution of threat types.
* API: `GET /jobs/:id/insights`


* **Section 2: Threat Timeline**
* UI: An interactive line graph (ApexCharts/Nivo) mapping attack volume against time. Hovering over spikes shows exact timestamps.


* **Section 3: Analyzer Findings**
* UI: A highly filterable, sortable data table detailing specific rule trips (e.g., BRUTE_FORCE_01, SQL_INJECTION). Include columns for `rule_id`, `threat_level`, and `timestamp`.
* API: `GET /jobs/:id/findings`





---

## 5. Development Checklist

1. **Initialize Vite/Tailwind:** Set up the custom `tailwind.config.js` with the Cyber-Tactical palette.
2. **Axios Configuration:** Create a centralized `api.ts` utility to handle the base URL (`/api/v1`), credentials (`withCredentials: true` for the JWT cookie), and the 401 interceptor.
3. **Component Library:** Build reusable base components first (e.g., `CyberButton`, `StatusBadge`, `LogTable`, `RadarLoader`).
4. **React Query:** Implement queries with careful attention to the `refetchInterval` option for the job polling mechanism. Only poll when `status === 'PROCESSING'`.