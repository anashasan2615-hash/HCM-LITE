# HCM Lite &mdash; Modern Human Capital Management System

**HCM Lite** is a production-grade, lightweight, zero-dependency Human Capital Management and HR Web Application engineered specifically for the Saylani IT Training Hackathon (Beginner Track).

Built purely with **HTML5, Vanilla CSS3, and ES6+ JavaScript**, HCM Lite features a modern SaaS dashboard design inspired by industry leaders. It requires **no frameworks, no build tools, no backend, and no npm packages**. All organizational and workforce data is stored in the browser's `localStorage` and begins completely empty upon first launch.

---

## 🌟 Key Highlights & Features

1. **Split-Screen Authentication & Dynamic Setup:**
   - Detects fresh workspaces automatically (`isFirstRun()`). If unconfigured, launches the **First-Run Setup** to register the organization and master administrator.
   - Once configured, provides a clean **Sign In** interface with role-based routing (`admin` vs. `employee`).
   - Secure route guards (`requireRole`) enforce strict access control across all inner pages.

2. **Full Employee Lifecycle & Access Management:**
   - Onboard employees with automated login generation.
   - Generates a **"Credentials Created"** card featuring employee email, temporary password, and a 1-click **Copy to Clipboard** button.
   - Real-time search by name, email, or designation, plus a department filter.
   - Confirmation modal with **cascade deletion**: removes all related attendance records and leave applications permanently.
   - Security rule: Administrator cannot delete their own account.

3. **Intelligent Attendance System:**
   - One check-in per day per employee; check-out is strictly validated to occur only after check-in.
   - Non-working day enforcement: check-in is enabled only on designated company working days.
   - Punctuality algorithm: Check-in after `officeStart + graceMinutes` automatically flags the arrival as **Late**.
   - Half-day calculation: On check-out, if total logged hours are `< 5.0 hours`, status automatically updates to **Half Day** while preserving late arrival flags.
   - **Absence is COMPUTED, never stored:** Working days with no record (excluding non-working days, dates prior to `joinDate`, future dates, active today, and approved leaves) compute dynamically as Absent.
   - **Camera Check-In:** Webcam verification with graceful fallback if camera or permission is unavailable.
   - **Export to CSV:** Download full historical attendance logs in one click.

4. **Policy-Compliant Leave Management:**
   - Interactive leave application with real-time **Working Days calculation** (automatically skips company weekends and off-days).
   - Validation against backwards dates (`from <= to`), date overlaps with existing requests, and quota limits (`approved + pending + requested <= yearlyQuota`).
   - Leave balance visualizer: Annual Quota, Approved (Used), Pending Review, and Remaining Days.
   - Administrative review modal with decision notes (Approve / Reject).

5. **Official Corporate Payroll & Payslip Voucher:**
   - Accurate formula implementation:
     $$\text{Per Day Rate} = \frac{\text{Monthly Gross Salary}}{\text{Working Days in Month}}$$
     $$\text{Deductions} = \text{Per Day Rate} \times (\text{Absent Days} + 0.5 \times \text{Half Days})$$
     $$\text{Net Salary} = \max(0, \text{Gross Salary} - \text{Deductions})$$
   - Number-to-Words generator (e.g., *"One Hundred Twenty Thousand Pakistani Rupees Only"*).
   - Dedicated `@media print` styling: cleans out sidebars, navigation, and controls for an official A4 payroll slip printout or PDF export.

6. **Smart Helper (AI-Themed Workforce Assistant):**
   - Floating chat widget accessible from both administrator and employee dashboards.
   - Pure function `getHelperReply(question, currentUser)` guarantees strict role boundaries:
     - **Admin Scope:** Headcount, who is on leave today, who was late today, roster snapshots, pending leaves, department metrics, company policies.
     - **Employee Scope:** Restricted strictly to own personal records (remaining leaves, today's late check, weekly logged hours, monthly attendance, leave application status, estimated net salary). Attempts to probe peer or organization data are politely blocked.
   - Optional demo LLM key storage in browser settings for extended conversational experimentation.

7. **Visual Polish & Design System:**
   - Curated SaaS palette: Deep Navy (`#1F2A44`), Primary Teal (`#0F9D8A`), Accent Purple (`#5B4FCF`), Warning Amber (`#F0962B`).
   - Complete **Dark Theme** (`[data-theme="dark"]`) persisted across sessions.
   - Typography: Google Font *"Plus Jakarta Sans"*.
   - Responsive design tested from 360px mobile viewports up to 4K desktop screens.
   - Status badges, animated stat counters, and Chart.js analytics.

---

## 📁 Repository & Folder Structure

```
├── index.html               # Entry point (Dynamic First-Run Setup & Login screen)
├── pages/
│   ├── admin.html          # Executive dashboard (metrics, charts, announcements, roster)
│   ├── employees.html      # Staff directory, modal CRUD, credentials generation
│   ├── leaves.html         # Leave requests manager (tabs, approve/reject modal)
│   ├── settings.html       # Shift start, grace period, leave quota, working days
│   ├── employee.html       # Employee self-service (punch, live clock, leave apply)
│   └── payslip.html        # Official printable payroll voucher & PDF generator
├── css/
│   └── style.css           # Single comprehensive design system, components, dark mode, print
├── js/
│   ├── storage.js          # LocalStorage CRUD wrappers and data helpers
│   ├── utils.js            # Date formatting, working days math, payroll calculations
│   ├── auth.js             # First-run setup, authentication, session, route guards
│   ├── ui.js               # Toasts, modals, count-up animations, form validation, theme
│   ├── employees.js        # Employee CRUD, search/filters, credentials modal
│   ├── attendance.js       # Check-in/out, hours computation, camera stream, CSV export
│   ├── leave.js            # Leave submission, working days calc, quota & overlap rules
│   ├── payslip.js          # Payroll calculations and number-to-words engine
│   └── helper.js           # Smart Helper intent parser & role-scoped AI assistant
└── README.md               # Complete project documentation
```

---

## 🗄️ LocalStorage Data Models

All state is serialized in JSON under isolated `hcm_*` keys:

| Key | Description | Structure / Sample Data |
|---|---|---|
| `hcm_company` | Company policies & settings | `{ name, officeStart: "09:00", graceMinutes: 15, yearlyLeaveQuota: 20, workingDays: [1,2,3,4,5] }` |
| `hcm_users` | User accounts (Admin & Staff) | `[{ id, name, email, password, role: "admin"\|"employee", department, designation, salary, joinDate, phone }]` |
| `hcm_attendance` | Actual check-in/out logs | `[{ id, userId, date: "YYYY-MM-DD", checkIn: "HH:MM", checkOut: "HH:MM"\|null, hours, status: "present"\|"late"\|"half_day", late: boolean }]` |
| `hcm_leaves` | Leave applications & review | `[{ id, userId, type: "casual"\|"sick"\|"annual", from, to, days, reason, status: "pending"\|"approved"\|"rejected", comment, appliedOn }]` |
| `hcm_session` | Current logged in user token | `{ userId, role }` |
| `hcm_announcements` | Company broadcasts | `[{ id, title, message, date, authorId }]` |
| `hcm_theme` | Active theme preference | `"light"` or `"dark"` |
| `hcm_demo_llm_key`| User's optional demo API key | `"sk-..."` (Optional, never uploaded) |

*Note: As required by the business specification, **Absent is never stored in `hcm_attendance`**. It is dynamically computed by evaluating past working days against join date and approved leaves.*

---

## 📊 Business Rules Matrix

| Rule | Implementation Logic |
|---|---|
| **One Check-In / Day** | `getAttendanceForDate(userId, today)` checks for existing record; duplicates are blocked. |
| **Check-Out Prerequisite** | Check-out is blocked unless an active check-in record exists for today without prior checkout. |
| **Working Day Constraint** | Check-in is only permitted on days matching `company.workingDays` (default Mon-Fri). |
| **Late Arrival** | Triggered when `checkInTime > officeStart + graceMinutes`. Status = `late`, `late: true`. |
| **Half-Day Trigger** | Upon check-out, if `hours < 5.0`, status is updated to `half_day` (preserving `late` flag if late). |
| **Absence Computation** | Past working days since `joinDate` with neither attendance nor approved leave = `Absent`. |
| **Leave Date Validity** | `from <= to` enforced. Calculates active working days only, skipping company off-days. |
| **Leave Overlap** | Checks against employee's pending and approved requests: `(from <= l.to && to >= l.from)`. |
| **Leave Quota Cap** | Blocked if `approvedDays + pendingDays + requestedDays > yearlyLeaveQuota`. |
| **Payroll Deduction** | $\text{Deduction} = \text{PerDayRate} \times (\text{AbsentDays} + 0.5 \times \text{HalfDays})$. |
| **Data Scope Protection** | Employee inquiries to Smart Helper for company/peer data are intercepted and denied. |

---

## 🚀 How to Run Locally

Because HCM Lite is built strictly with vanilla web standards, **no build process, node_modules, or web servers are required**:

### Option 1: Direct File Opening
Double-click `index.html` in your file explorer to open it directly in any modern browser (Chrome, Edge, Firefox, Safari).

### Option 2: Live Server (VS Code / Antigravity)
1. Open the project folder in VS Code or Antigravity IDE.
2. Right-click `index.html` and click **"Open with Live Server"**.
3. Navigate to `http://127.0.0.1:5500/index.html`.

---

## 🧪 Recommended Demo Flow (Hackathon Walkthrough)

To verify all system features from scratch:

1. **Step 1 &mdash; Initial Launch:**
   - Open `index.html`. Notice that because the app starts empty, the **Initial Workspace Setup** screen is displayed.
   - Enter your company name (e.g. `Acme Technologies`), Admin name (`Izhan Hassan`), work email (`admin@acme.com`), and a master password (e.g. `admin123`).
   - Click **Complete Setup & Launch Dashboard**.

2. **Step 2 &mdash; Onboard Staff:**
   - From the Admin Dashboard, navigate to **Employees**.
   - Click **+ Add Employee**.
   - Add Employee 1: Name: `Sarah Khan`, Email: `sarah@acme.com`, Temp Password: `password123`, Dept: `Engineering`, Salary: `150000`.
   - Observe the **Credentials Generated** card appear with a copy button.
   - Try adding another employee with `sarah@acme.com` to observe the inline **duplicate email validation**.
   - Add Employee 2: Name: `Bilal Ahmed`, Email: `bilal@acme.com`, Temp Password: `password123`, Dept: `Marketing`, Salary: `120000`.

3. **Step 3 &mdash; Test Employee Self-Service & Attendance:**
   - Log out via the sidebar.
   - Sign in as `sarah@acme.com` with password `password123`.
   - Notice the greeting, live digital clock, and state-aware buttons.
   - Click **Check In Now** (or test **Camera Check-In**).
   - Notice that Check-In is now disabled and displays the punch time; Check-Out is now enabled.
   - Test Smart Helper: Click the purple bot launcher and ask *"Was I late today?"* or *"How many leaves left?"*.

4. **Step 4 &mdash; Test Leave Rules:**
   - On Sarah's portal, scroll to **Submit Leave Application**.
   - Select dates spanning across a weekend (e.g. Friday to Monday). Notice the live preview calculates **2 working days**, correctly skipping the weekend.
   - Submit the leave request. Notice the leave balance reflects 2 pending days.
   - Ask the Smart Helper: *"My leave status"*.

5. **Step 5 &mdash; Administrator Approvals & Payslip:**
   - Log out and sign back in as `admin@acme.com`.
   - On the Admin Dashboard, observe the stat counters animate up.
   - Check the **Pending Leave Reviews** widget. Click **Review**, enter an administrative remark, and click **Approve Leave**.
   - Navigate to **Payroll & Slips**.
   - Select `Sarah Khan` and the current month.
   - Review the official voucher: base gross salary, calculated per-day rate, absence deductions, net payable salary, and amount in words.
   - Click **Print / Save as PDF** to preview the clean, media-print formatted voucher.

---

## 🌐 Deployment to GitHub Pages, Netlify, or Vercel

Since all internal asset links, scripts, and navigation links use **pure relative paths** (`css/style.css`, `../css/style.css`, etc.):

- **GitHub Pages:**
  1. Push the repository to GitHub.
  2. Go to **Settings** &rarr; **Pages**.
  3. Under **Branch**, select `main` (root) and click **Save**.
  4. Your app is live at `https://<username>.github.io/<repo-name>/`.

- **Netlify / Vercel:**
  - Drag and drop the project folder directly into the Netlify or Vercel dashboard. No build command or output directory needed.

---

## ⚠️ Known Limitations & Educational Disclaimer

- **Browser-Local Storage:** All company data lives inside the browser's `localStorage`. Data does not synchronize across separate physical devices or different browsers unless exported and imported.
- **Educational Password Storage:** In accordance with the beginner hackathon constraints (no backend, no npm packages, pure vanilla JS), user passwords are stored unhashed for learning purposes. In a commercial production environment, passwords would be hashed using bcrypt or Argon2 on an authenticated backend server.

---

### 🏆 Hackathon Submission Checklist Verified:
- [x] Zero external frameworks (No React, Vue, Tailwind, Bootstrap, or jQuery).
- [x] Pure HTML, CSS, Vanilla ES6+ JavaScript.
- [x] Starts 100% empty with zero seed or dummy records.
- [x] Strict business rule validation (attendance, leaves, payroll).
- [x] Scoped Smart Helper assistant enforcing user data privacy.
- [x] Responsive layout verified at 360px mobile width.
- [x] Dark mode toggle with persistent state.
- [x] Clean print styles for A4 payslip generation.
