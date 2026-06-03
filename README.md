# HSD Oil Cost Certificate System
Automated HSD Oil Cost Certificate Generation System for **Western Railway, Rajkot Division Finance Office**

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0--Stable-blue?style=flat-square&logo=git&logoColor=white" alt="Version" />
  <img src="https://img.shields.io/badge/Build-Passing-brightgreen?style=flat-square&logo=github-actions&logoColor=white" alt="Build" />
  <img src="https://img.shields.io/badge/Stack-React%20%7C%20Express%20%7C%20SQLite-darkblue?style=flat-square" alt="Stack" />
  <img src="https://img.shields.io/badge/Indian--Railways-Western%20Railway-orange?style=flat-square&logo=google-maps&logoColor=white" alt="Ministry of Railways" />
  <img src="https://img.shields.io/badge/Security-OWASP%20Aligned-success?style=flat-square" alt="Security Status" />
  <img src="https://img.shields.io/badge/License-Proprietary%20%2F%20Internal%20Use-red?style=flat-square" alt="License" />
</p>

---

## 🗂️ Table of Contents
1. [Overview](#-overview)
2. [Quick Start Guide](#-quick-start-guide)
3. [Key Features](#-key-features)
4. [Technology Stack](#-technology-stack)
5. [System Architecture](#-system-architecture)
6. [Prerequisites & Version Information](#-prerequisites--version-information)
7. [Installation & Setup Instructions](#-installation--setup-instructions)
    - [Option A: Local Development Setup](#option-a-local-development-setup)
    - [Option B: Containerized Docker Integration](#option-b-containerized-docker-integration)
8. [Configuration Requirements](#-configuration-requirements)
9. [Usage Guide](#-usage-guide)
    - [Step-by-step Execution Workflow](#step-by-step-execution-workflow)
    - [Accounting Allocation Codes](#accounting-allocation-codes)
    - [Audit Reference Scenario](#audit-reference-scenario)
10. [Folder Structure](#-folder-structure)
11. [Screenshots & UI Placeholders](#-screenshots--ui-placeholders)
12. [User Roles & Permissions](#-user-roles--permissions)
13. [API Details](#-api-details)
14. [Database Schema Overview](#-database-schema-overview)
15. [Security Features](#-security-features)
16. [Deployment Instructions](#-deployment-instructions)
17. [Troubleshooting](#-troubleshooting)
18. [Future Enhancements](#-future-enhancements)
19. [Change Log](#-change-log)
20. [Contributing Guidelines](#-contributing-guidelines)
21. [License](#-license)
22. [Contact Information](#-contact-information)

---

## 🚀 Overview
The **HSD Oil Cost Certificate System** is a full-stack automated solution custom-built to modernize auditing, pricing verification, and cost allocation workflows within the **Rajkot Division, Western Railway Finance Office**. 

High Speed Diesel (HSD) is one of the most significant operating expenses across railway divisions. To comply with rigorous financial oversight standards, divisional auditors must cross-verify literal fuel draws against fluctuating pricing metrics issued by supplying oil depots, calculate corresponding tax allocations (Excise, VAT, Overhead), merge supporting fuel vouchers, and produce audited cost certificates. 

Historically, this has been an error-prone, manually compiled process. This system introduces a single cohesive dashboard where Finance Officers can manage a structured price master list, compile individual consuming shed records into isolated billing sessions, programmatically perform split-tax calculations, dynamically stitch underlying PDF vouchers, and generate audit-compliant ZIP archives of fully compiled, certified documents.

---

## ⚡ Quick Start Guide
To spin up a local instance of the application in less than a minute, run the following commands:

```bash
# 1. Clone the repository and navigate into the workspace
git clone <repository-url>
cd hsd-oil-cost-certificate-system

# 2. Setup the environment configuration file
cp .env.example .env

# 3. Install NPM packages
npm install

# 4. Boot up the full-stack system (Vite Development Proxy + Express Server + SQLite)
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---

## ✨ Key Features

- **Automated PDF Compilation Engine**: Programmatically builds professional cost certificates with high-contrast vector borders, aligned tabular calculations, automated word-wrapping, and standardized Western Railway signature panels.
- **Voucher Stitching & Merging Layer**: Integrates client-side and server-side PDF manipulation vectors using `pdf-lib` and `pdfjs-dist` to dynamically prepend or append supplementary receipt documents on-the-fly.
- **Bulk Zip Generation**: Packages multi-shed, multi-record certificates into a structured, chronologically flat or hierarchical ZIP file using `jszip`, reducing auditor desk processing by hours.
- **Dynamic Session-State Management**: Prevents state loss during heavy sessions by serializing incomplete audit workflows into a self-contained local JSON scheme and persisting them to the database.
- **Shed & Price Masters**: Centralized repositories for managing consuming locomotive sheds, designated zonal railway affiliations, and supplying diesel depots (such as HXP, WKR) along with their pricing periods.
- **Power Car Allocation Auto-Splits**: Automates allocation code splitting for passenger power engines, routing expenses to exact budgetary headings (Base, Excise, VAT, and Overheads) on a pro-rata basis.
- **Built-in Analytics Desk**: Provides interactive, visually detailed Recharts diagrams tracking division fuel consumption volumes, accumulated tax expenses, and historical diesel price waves.

---

## 🛠️ Technology Stack

| Layer | Technology | Version | Purpose / Description |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React.js | `^19.0.0` | Client declarative UI, hook-driven state architecture. |
| **Asset Bundler** | Vite | `^6.2.0` | Module bundling and client SPA hot proxying inside dev environment. |
| **Database Engine** | SQLite (Better-SQLite3) | `^12.4.1` | Ultra-fast synchronous storage engine bypassing sluggish REST handshakes. |
| **Backend API** | Express.js | `^4.21.2` | REST endpoints, system services, and statical distribution middleware. |
| **CSS Utility Line** | Tailwind CSS | `^4.1.14` | Styling and modern component density utility classes. |
| **Animation Engine** | Motion (Framer Motion) | `^12.23.24` | Staggered listing loadouts and sleek card modal transitions. |
| **Icon Library** | Lucide React | `^0.546.0` | High-quality, vector-clean system symbols. |
| **PDF Processing** | jsPDF / pdf-lib | `^4.2.0` / `^1.17.1` | Certificate drawing, coordinate mapping, and voucher merging. |
| **Archive Processor** | JSZip | `^3.10.1` | Client-side bulk packaging & pipeline container compression. |

---

## 📐 System Architecture

The following diagram outlines the system's operational architecture:

```
+-----------------------------------------------------------------------------------+
|                                   CLIENT LAYER                                    |
|   +--------------------------+  +--------------------------+  +---------------+   |
|   |   React Single Page App  |  |      Framer Motion       |  |  Recharts JS  |   |
|   |    (Sheds/Price Forms)   |  |     Visual Animations    |  | Analytics Desk|   |
|   +------------+-------------+  +------------+-------------+  +-------+-------+   |
+----------------v-----------------------------v------------------------v-----------+
|                                  APIs & ASSETS                                    |
|   - Client-side PDF Compilation & Voucher Stitching (jsPDF + pdf-lib + JSZip)      |
|   - Fetch & Push pipelines targeting `/api/*` endpoint gates                       |
+----------------------------------------+------------------------------------------+
                                         | (JSON over HTTP)
                                         v
+-----------------------------------------------------------------------------------+
|                                 SERVER CONTAINER                                  |
|   +---------------------------------------------------------------------------+   |
|   |                             Express API Router                            |   |
|   |         - /api/sessions  - /api/analytics  - /api/sheds  - /api/prices        |   |
|   +------------------------------------+--------------------------------------+   |
|                                        | (Synchronous SQLite bindings)            |
|                                        v                                          |
|   +---------------------------------------------------------------------------+   |
|   |                         SQLite Database (railway.db)                      |   |
|   |         - sheds          - prices          - sessions    - records        |   |
|   +---------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------+
```

During development, Vite intercepts and proxies client requests, dynamically compiling source assets while the Express service serves API checkpoints and database transactions. In a production build, ESBuild bundles the Express backend, while Vite compiles static assets to the `/dist` directory, hosting them concurrently over Node.js.

---

## 📋 Prerequisites & Version Information

Ensure your environment complies with the following runtime prerequisites to maintain consistency:

- **Node.js**: v20.11.0 (LTS) or higher is recommended. Minimum compatible version: `v18.0.0`
- **NPM Package Manager**: Minimum compatible version: `v10.0.0`
- **Docker Engine (For Container Setup)**: v24.0.0 or higher
- **Vite CLI Platform**: v6.x (Bundled automatically)
- **Supported Web Browsers**: Edge 110+, Chrome 100+, Safari 16.4+, Firefox 115+. (Note: Chrome-based browsers are specifically optimized for local file manipulations like PDF extraction and base64 parsing).

---

## ⚙️ Setup & Installation Instructions

### Option A: Local Development Setup
1. **Repository Download**:
   Clone the repository locally into a secure folder structure:
   ```bash
   git clone <repository-url>
   cd hsd-oil-cost-certificate-system
   ```

2. **Environment Configuration**:
   Create a designated environment configuration file from the template provided:
   ```bash
   cp .env.example .env
   ```

3. **Install Core Dependencies**:
   Populate the absolute workspace `node_modules` structure:
   ```bash
   npm install
   ```

4. **Launch Live Workspace Instance**:
   Run the dev command which starts the Node process via `tsx` on the local port:
   ```bash
   npm run dev
   ```
   The local terminal will output:
   ```text
   Vite Client Proxy Configured.
   Express API services listening on http://localhost:3000
   ```

5. **Production Bundling Validation**:
   Check if compilation packages operate cleanly for target systems:
   ```bash
   npm run build
   ```

---

### Option B: Containerized Docker Integration
Docker containerization encapsulates the system variables and protects SQLite files within a Docker mount.

1. **Verify Docker and Compose Availability**:
   Ensure your local terminal has daemon variables ready:
   ```bash
   docker --version && docker-compose --version
   ```

2. **Run Construction Orchestration**:
   Execute compose commands to start both the application container and the integrated admin viewer:
   ```bash
   docker-compose up --build -d
   ```

3. **Service Port Assignments**:
   - **Auditor Front Desk Portal**: `http://localhost:3000`
   - **Internal SQL Database Viewer (SQLite Web)**: `http://localhost:8080` (A lightweight browser-based SQL administrative table viewer).

4. **Shutdown Containers**:
   ```bash
   docker-compose down
   ```

---

## ⚙️ Configuration Requirements

The application relies on `.env` settings located in the workspace root directory. Documented entries within the `.env` are:

```env
# Server Port (Defaults internally to 3000, do not modify inside Cloud Run containers)
PORT=3000

# Directory path where SQLite database operations run (Defaults to local railway.db)
DATABASE_PATH=railway.db

# API Key representing Google GenAI framework for supplementary assistant audits (optional)
GEMINI_API_KEY="AI_Studio_provided_Gemini_API_Key"

# Canonical URL hosting the application (automated by Cloud Run environments)
APP_URL="http://localhost:3000"
```

*Note: The platform handles file sizing allowances up to 50MB by configuring express parse endpoints (`express.json({ limit: '50mb' })`). Ensure no cloud load balancer overrides this payload threshold during enterprise setup.*

---

## 📖 Usage Guide

Automating HSD fuel verification follows a structured pipeline across the system's interface:

```
[Manage Stores]               [Define Costs]                 [Create Session]              [Run Verification]
Shed Master Configuration ->   Pricing Period Setup ->      Select Month/Depot ->         Generate Certificate ZIP
```

### Step-by-Step Execution Workflow

#### Phase 1: Establish Locomotive Shed Masters
- Open the application and browse to the **Shed Master Configuration** tab.
- Create consuming sheds by defining their identifier, colloquial names (e.g., `RAJKOT` or `PUNE`), and regional railroad zone markers (e.g., `WR` or `CR`).
- These codes will feed the dynamic selector lists in the cert building portals.

#### Phase 2: Input Supplying Depot Pricing Matrices
- To generate correct price splits, navigate to the **Pricing Master** tab.
- Supply monthly billing criteria for each supplying refinery depot (such as WKR - Wankaner Bypass Depot or HXP - Harapa Depot).
- Provide the exact base, excise duty rate, value-added-tax percentages, and local overhead operational additions for both the **First half cycle (1st to 15th)** and **Second half cycle (16th to End)** of the month.
- To maintain auditing clarity, upload the local pricing notification document directly into the price master record.

#### Phase 3: Initiate Certification Sessions
- Access the homepage or browse records within the **Sessions Manager** tab.
- Click **Create Billing Audit Session**. Provide a memorable name denoting target boundaries, e.g., "Rajkot Division March 2026 AUD-03".
- Select the active **Billing Month**, **Audit Year**, and the supplying refinery terminal validating fuel issues.
- If a centralized supply invoice was generated, compile it in the "Master Invoice upload field" (this can be attached as a universal pricing appendix to each certificate).

#### Phase 4: Compile Consuming Shed Details
- Add individual sheds to the active session list.
- Provide total Goods and Coach diesel litre volumes drawn during the designated audit month.
- If the fuel represents power for passenger coach operations, toggle the **Power Car Allocation Split** parameter on.
- Under individual shed nodes, upload the local depot-signed fuel vouchers or transit receipts.
- The system live-calculates total liters, splits overheads, computes tax rates on base values, and translates numeric metrics to Indian rupees.

#### Phase 5: Exporting Documents
- Clicking **Download Certificates Only** generates clean, individual 1-page HSD Certification documents signed by Western Railway divisional accounting authorities, packaged inside a ZIP file.
- Clicking **Generate Full ZIP** initiates the merging system: for each shed, it generates the main accounting certificate page, appends the uploaded passenger billing voucher, and stitches the pricing authority reference sheets into a multi-page PDF document.

---

### Accounting Allocation Codes

During computation, financial records are categorized and mapped directly to Western Railway budget heads:

| Allocation Type | Ledger Code | Description / Target Account |
| :--- | :--- | :--- |
| **Goods Locomotive Litres** | `10021227` | Direct freight service diesel costs, booked under working expenses. |
| **Coaching Locomotive Litres** | `10021127` | Passenger and special express coaching traction fuel charges. |
| **Power Car Base Cost** | `08066031` | Auxiliary generator power car fuel - Base cost head. |
| **Power Car Excise Duty** | `08066036` | Excise tax allocation on generator diesel loads. |
| **Power Car Value Added Tax** | `08066038` | Local provincial VAT payments for passenger service power. |
| **Power Car Overheads** | `08066099` | Operational transport, storage, and handling overhead shares. |

---

### Audit Reference Scenario

Consider a standard certification case:
- **Consuming Shed**: `RAJKOT` (Railway: `WR`)
- **Billing Period**: `FEB 2026`
- **Supplying Depot**: `WKR`
- **Litre Allocations**: 10,000 Litres (Coach Fuel volume)
- **Active Pricing Period**: `Average` (compiled automatically from 1st-15th and 16th-End masters)

**Pricing Metrics (per Kilolitre):**
- Base price: `Rs. 56,755.00`
- Excise rate: `Rs. 17,800.00`
- VAT rate: `Rs. 14,863.00`
- Overhead additions: `Rs. 1,680.00`
- **Combined Cost (per Kilolitre)**: `Rs. 91,098.00`

**Automatic Calculations executed by System:**
```text
Total Litres Distributed: 10,000 Litres (10.000 KL)
Total Expense Base Price: 10.000 KL * Rs. 56,755.00 = Rs. 5,67,550.00
Total Expense Excise Duty: 10.000 KL * Rs. 17,800.00 = Rs. 1,78,000.00
Total Expense VAT Rate:    10.000 KL * Rs. 14,863.00 = Rs. 1,48,630.00
Total Expense Overheads:   10.000 KL * Rs. 1,680.00  = Rs. 16,800.00

Grand Certified Total cost allocation calculated: Rs. 9,10,980.00
Printed Signature Text: "Rupees Nine Lakh Ten Thousand Nine Hundred Eighty Only."
```

---

## 📂 Folder Structure

```text
hsd-oil-cost-certificate-system/
├── .dockerignore              # Ignore rules for local Docker construction passes
├── .env.example               # Template environment configuration mappings
├── .gitignore                 # Target system exclusion mappings (dist, db, cache)
├── Dockerfile                 # Multi-stage production container build steps
├── docker-compose.yml         # Dev services orchestration (App server, SQLite web explorer)
├── index.html                 # Main single-page HTML markup scaffold
├── metadata.json              # Platform system descriptors and framework permissions
├── package-lock.json          # Dependency tree structural pinning
├── package.json               # Scripts, dependency libraries, and platform entries
├── server.ts                  # Main full-stack Express API Router and SQLite database initialization
├── tsconfig.json              # TypeScript compilation constraints and paths
├── vite.config.ts             # Vite server bindings, Tailwind CSS configuration
├── src/                       # Main client application directory
│   ├── App.tsx                # Central workspace coordinator, tabs, and sessions manager
│   ├── index.css              # Entrypoint file for global Tailwind CSS styles
│   ├── main.tsx               # Client entrypoint mounting React App inside HTML structure
│   ├── types.ts               # Shared interfaces, constants, and allocation records
│   ├── utils.ts               # Indian currency converters, word builders, and PDF engines
│   └── components/            # UI Panels and Modules
│       ├── Analytics.tsx      # Dashboard tracking consumption trends and tax allocations
│       └── Sessions.tsx       # Live certificate generator, session compiler, and file manager
```

---

## 🖼️ Screenshots & UI Placeholders

The application UI is highly consolidated into three primary workspace views:

### 1. Operations & Certification Generator
```text
+-----------------------------------------------------------------------------------------------------+
| HSD Oil Cost Certificate System [ Western Railway - Rajkot Division ]                              |
+-----------------------------------+-----------------------------------------------------------------+
| Tabs: [Generate] [Pricing Master] | [Shed Master] [Session Archive] [Analytics Panel]               |
+-----------------------------------+-----------------------------------------------------------------+
|  Configure Active Session:                                                                          |
|  Name: [ FEB 2026 SEC-01          ]  Month: [ FEB  v ] Year: [ 2026 v ] Supply Depot: [ WKR    v ]  |
|                                                                                                     |
|  Consuming Shed Queue:                                                                              |
|  +--------------------+------------------------+-------------------+---------------+-------------+  |
|  | Depòt Name (Zone)  | goods_litres (Code 27) | coach_litres (27) | Power Car (Y) | Voucher PDF |  |
|  +--------------------+------------------------+-------------------+---------------+-------------+  |
|  | 01. RAJKOT (WR)    | [ 124,500.00         ] | [ 45,210.00     ] | [X] Enabled   | [rcpt_1.pdf]|  |
|  | 02. PUNE (CR)      | [ 56,120.00          ] | [ 12,000.00     ] | [ ] Off       | [Upload voucher]  |
|  +--------------------+------------------------+-------------------+---------------+-------------+  |
|                                                                                                     |
|  [ + Add Consuming Shed ]                               [ Generate Full ZIP ] [ Export Certs Only ] |
+-----------------------------------------------------------------------------------------------------+
```

### 2. Pricing Master Register
```text
+-----------------------------------------------------------------------------------------------------+
| Manage Depot HSD Oil Pricing History                                                                |
+-----------------------------------------------------------------------------------------------------+
| Depot: [HXP  v ] Month: [FEB  v ] Year: [2026 v ]                                                   |
|                                                                                                     |
| Period: 1st to 15th (P1)                             Period: 16th to End (P2)                       |
| - Base Price (KL): [ Rs. 57,309.00  ]                - Base Price (KL): [ Rs. 57,309.00  ]          |
| - Excise Duty:     [ Rs. 17,800.00  ]                - Excise Duty:     [ Rs. 17,800.00  ]          |
| - VAT (%):         [ Rs. 15,066.00  ]                - VAT (%):         [ Rs. 15,066.00  ]          |
| - Overheads:       [ Rs. 2,169.00   ]                - Overheads:       [ Rs. 2,169.00   ]          |
| [Upload Notification PDF]                            [Upload Notification PDF]                      |
|                                                                                                     |
|                                                               [ Save Depot Price Entries ]          |
+-----------------------------------------------------------------------------------------------------+
```

### 3. Analytics Dashboard
```text
+-----------------------------------------------------------------------------------------------------+
| Analytics & Expenditure Verification Desk                                                           |
+-----------------------------------------------------------------------------------------------------+
| Total Volume Checked: 2,341.22 KL                 Grand Disbursed Funds: Rs. 21,34,51,023.00        |
|                                                                                                     |
|   Fuel Consumption Volume by Shed (KL)              Monthly Billing Share by Cost Head (Excise/VAT)  |
|   |   ___                                           |      /===========\                             |
|   |  |   |    ___                                   |     /  Excise     \                            |
|   |  |   |   |   |   ___                            |    |    33.2%      |                           |
|   |  |   |   |   |  |   |                           |    |        Base   |                           |
|   |  |   |   |   |  |   |                           |     \       51.4% /                            |
|   +--|---|---|---|--|---|----->                     |      \===========/                             |
|     RAJKOT  PUNE  AHMEDABAD                                                                         |
+-----------------------------------------------------------------------------------------------------+
```

---

## 👥 User Roles & Permissions
Access to local application components is designed around key roles in the division context:

### 1. Divisional Finance Officer (DFO) / Auditor
- **Access Level**: Full Administration
- **Capabilities**: Clear or create active processing sessions, modify pricing history, upload depot tax notices, adjust master consuming shed registers, override calculated values, and export output bundles.

### 2. Senior Section Officer (SSO) / Account Assistant
- **Access Level**: Standard Read/Write Workspace
- **Capabilities**: Load active monthly workspaces, fill goods/coaching diesel draws, upload local station fuel receipts, review calculation summaries, and generate test PDFs to verify numerical compliance.

### 3. Railway Audit & Divisional Accounts Inspector
- **Access Level**: Read-Only Inspection Portal
- **Capabilities**: View archived monthly sessions, inspect past records via the integrated database viewer, query transaction histories, and view dashboard analytics.

---

## 🔌 API Details

The application hosts a set of clean REST API routes designed to handle data transactions efficiently:

### 1. Operational Sessions Gateway

#### `GET /api/sessions`
- **Description**: Returns all billing audit sessions, sorted by date in descending order. Includes deep parsing of serial states.
- **Response Code**: `200 OK`
- **Output Sample**:
  ```json
  [
    {
      "id": "fe8742ba-4b2a",
      "name": "Rajkot Division Feb 2026",
      "description": "Standard HSD Audit",
      "is_completed": false,
      "created_at": "2026-06-03T12:00:00Z",
      "updated_at": "2026-06-03T12:15:00Z",
      "state": {
        "selectedMonth": "FEB",
        "selectedYear": "2026",
        "selectedSupplyingShed": "WKR",
        "selectedSheds": []
      }
    }
  ]
  ```

#### `POST /api/sessions`
- **Description**: Inserts or updates an audit session state.
- **Headers**: `Content-Type: application/json`
- **Input Sample Payload**:
  ```json
  {
    "id": "fe8742ba-4b2a",
    "name": "Rajkot Division Feb 2026",
    "description": "Standard HSD Audit",
    "is_completed": 0,
    "state": {
      "selectedMonth": "FEB",
      "selectedYear": "2026",
      "selectedSupplyingShed": "WKR",
      "selectedSheds": []
    }
  }
  ```
- **Response Code**: `200 OK`

#### `PATCH /api/sessions/:id/complete`
- **Description**: Finalizes an audit session and locks it against future modifications.
- **Response Code**: `200 OK`

#### `DELETE /api/sessions/:id`
- **Description**: Deletes a session and recursively clears all linked consumption records.
- **Response Code**: `200 OK`

---

### 2. Historical Records & Analytics Gateway

#### `GET /api/analytics`
- **Description**: Aggregates verified HSD consumption records across completed audit sessions to populate analytics charts.
- **Response Code**: `200 OK`

#### `POST /api/analytics/batch`
- **Description**: Automatically batches multiple verified records upon session finalization.
- **Headers**: `Content-Type: application/json`
- **Response Code**: `200 OK`

---

### 3. Shed Master Gateways

#### `GET /api/sheds`
- **Description**: Lists all registered railway sheds.
- **Response Code**: `200 OK`

#### `POST /api/sheds`
- **Description**: Inserts a new consuming shed into the roster.
- **Inputs**: `{ "id": "4", "shed_name": "VADODARA", "railway": "WR" }`
- **Response Code**: `200 OK`

---

### 4. Pricing Master Gateways

#### `GET /api/prices`
- **Description**: Retrieves historical and current pricing models for supplying depots, mapping tax arrays to the target periods.
- **Response Code**: `200 OK`

#### `POST /api/prices`
- **Description**: Saves base fuel pricing and custom overheads for a specific depot and period.
- **Response Code**: `200 OK`

---

## 🗄️ Database Schema Overview

The backend uses a local, multi-relational **SQLite Database Schema** configured to enforce critical data constraints and referential integrity:

```
                  +------------------------+
                  |         SHEDS          |
                  +------------------------+
                  | id (TEXT, PK)          |
                  | shed_name (TEXT, REQ)  |
                  | railway (TEXT, REQ)    |
                  +------------------------+
                              
                  +------------------------+
                  |         PRICES         |
                  +------------------------+
                  | id (TEXT, PK)          |
                  | supplying_shed (TEXT)  |
                  | month (TEXT)           |
                  | year (TEXT)            |
                  | data (TEXT - JSON CLOB)|
                  +------------------------+

         +--------------------+             +-----------------------------+
         |      SESSIONS      |             |     CONSUMPTION_RECORDS     |
         +--------------------+             +-----------------------------+
         | id (TEXT, PK) <----+------------>| id (TEXT, PK)               |
         | name (TEXT, REQ)   | (Cascades)  | session_id (TEXT, FK)       |
         | description (TEXT) |             | shed_name (TEXT)            |
         | is_completed (INT) |             | railway (TEXT)              |
         | created_at (DATE)  |             | supplying_shed (TEXT)       |
         | updated_at (DATE)  |             | month (TEXT), year (TEXT)   |
         | state (TEXT - JSON)|             | during_month / during_year  |
         +--------------------+             | goods_litres (REAL)         |
                                            | coach_litres (REAL)         |
                                            | total_litres (REAL)         |
                                            | amount (REAL)               |
                                            | is_power_car (INT)          |
                                            | pricing_period (TEXT)       |
                                            | created_at (DATE)           |
                                            +-----------------------------+
```

### Table Definitions & Key Constraints
1. **`sheds`**: Holds the master list of all consuming railway depots. `id` acts as a unique primary index, preventing redundant entry of identical facilities.
2. **`prices`**: Stores pricing and tax structures. The structural pricing object (Base, Excise, VAT, Overhead) is serialized and stored as a JSON string within the `data` field to support future pricing revisions.
3. **`sessions`**: Represents active audits. Keeps track of state settings and progress through the `state` text field.
4. **`consumption_records`**: Captures verified ledger entry events. Points back to `sessions.id` via a foreign key with `ON DELETE CASCADE`. If a session is deleted, associated ledger records are automatically cleaned up to prevent database bloat.

---

## 🛡️ Security Features

The application incorporates a robust security model designed to safeguard sensitive data:

- **SQL Injection Prevention**: SQLite operations are routed exclusively through parameterized binding pipelines (`better-sqlite3` prepared statements via `db.prepare(query).run(param1, param2)`). This prevents script injection payloads in input forms.
- **Input Size Hardening**: Limits JSON pay-loads at Express interface boundaries to exactly `50mb`, protecting the system from heavy payload exploits and memory overload.
- **Client-Side File Sanitization**: Dynamic file integrations validate mime-signature constraints (accepting only valid application-type `pdf` variants) before passing the arrays to base64 processing engines.
- **Immutable Completed State**: Completing a session locks it in the SQL repository. The backend rejects attempts to edit or delete completed items unless an administrator intervenes directly.

---

## 🚀 Deployment Instructions

### Production Server Build
Follow these steps to build and package the application for production:

1. **Vite Dynamic Compilation**:
   Compile frontend assets into high-performance, compressed, static chunks:
   ```bash
   npm run build
   ```
   This compiles all React components, merges CSS, and outputs the distribution package inside `/dist`.

2. **Starting the Production Process**:
   To launch the server under production environmental nodes:
   ```bash
   npm run start
   ```
   The backend processes the requests, exposes static distribution folders dynamically, and resolves active user routing queries smoothly.

---

### App Engine & Cloud Run Continuous Deployment
The repository includes a production-ready `Dockerfile` and `.dockerignore` file. This lets you deploy directly to scalable host ecosystems like Google Cloud Run via:

```bash
# Set your active GCP infrastructure parameters
gcloud config set project [YOUR_PROJECT_ID]

# Package and push your container to Artifact Registry
gcloud builds submit --tag gcr.io/[YOUR_PROJECT_ID]/hsd-oil-system

# Deploy the container to a managed Cloud Run instance
gcloud run deploy hsd-oil-system \
  --image gcr.io/[YOUR_PROJECT_ID]/hsd-oil-system \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_PATH="/data/railway.db"
```

---

## 🔍 Troubleshooting

| Symptom / Error | Probable Underlying Root Cause | Corrective Resolution Protocol |
| :--- | :--- | :--- |
| `Error: SQLITE_BUSY: database is locked` | An active thread or transaction has acquired an exclusive lock on `railway.db`. | Ensure the SQLite Web container has terminated outstanding transaction logs. Restart the runtime dev container to reset file handle pointers. |
| `TypeError: Cannot read properties of undefined (reading 'base_price')` | Pricing masters lack configurations for the selected Depot, Month, or Year. | Browse to the **Pricing Master** workspace. Ensure that base, excise, VAT, and overhead entries have been defined for both P1 and P2 cycles under the supplying depot. |
| `DOMException: The operation is insecure.` | An uploaded PDF voucher has restricted permissions or security certificates that block programmatical page extraction. | Open the target PDF in a standard browser or system PDF viewer and re-save/print it to a clean PDF format to remove access controls before uploading. |
| `OutOfMemoryError` or App crashes during ZIP export | The combined size of uploaded PDFs exceeds the storage limit inside active tab memory. | Compress the source PDF documents before uploading. The system handles standard files best when average voucher sizes are maintained below 5MB. |

---

## 🔮 Future Enhancements
Planned additions for upcoming system milestones:

- **AI-Powered Discrepancy Auditing**: Integrate the configured Gemini API to cross-analyze uploaded voucher PDFs against entered manual calculations, automatically highlighting data discrepancies.
- **Active Directory / HRMS Single Sign-On (SSO)**: Connect the system directly to the Indian Railways unified Single-Sign-On system to streamline divisional logins.
- **Automated Pricing Sync**: Configure service fetchers to automatically scrape and import authorized diesel price notifications directly from major oil corporations (IOCL, BPCL, HPCL) daily.
- **Audit Logging**: Implement a tamper-proof dashboard audit log to track edits to historic sessions.

---

## 📝 Change Log

### `v1.0.0 Stable` - June 2026
- Added SQLite support to persist billing sessions, consumption history, and masters.
- Implemented robust `pdf-lib` and `jsPDF` integrations to automate certificate generation and voucher merging.
- Created interactive Recharts-driven financial dashboard analytics.
- Dockerized the workspace and integrated a lightweight database web explorer.

### `v0.5.0 Beta` - April 2026
- Initial design prototype for React Web interface.
- Developed the core calculation engine for Goods, Coaching, and Power Car tax allocations.

---

## 🤝 Contributing Guidelines

1. **Branch Naming Standard**:
   - For features: `feature/short-description`
   - For bug fixes: `bugfix/short-description`
   - For documentation updates: `docs/short-description`

2. **Commit Formatting**:
   Maintain clear descriptions. Ensure messages are written in the imperative mood (e.g., `"Add consumption CSV parser"` or `"Fix base64 overflow check"`).

3. **Pre-Commit Validation Checklist**:
   Before submitting code, ensure it aligns with our styling and compilation rules:
   ```bash
   # Run TypeScript type safety validator
   npm run lint
   
   # Run full application production build
   npm run build
   ```

---

## 📄 License
**Proprietary Commercial License** — Western Railway Divisional Intellectual Ownership. 

This application, its source blueprints, data stores, and calculated schema are strictly compiled for **internal official use only** within the Western Railway, Ministry of Railways, Government of India. Unauthorized copying, distribution, or reproduction of these resources is strictly prohibited.

---

## 📞 Contact Information

For technical support, reporting bugs, or coordinate expansion updates, contact the helpdesk below:

- **Supervision Department**: IT Cell, Rajkot Division Finance Office, Western Railway.
- **System Administration Desk**: `rjtwritcell@gmail.com`
- **Internal Coordination Helpline**: RailNet - `095-54522` / `095-54524` (Rajkot Division Finance Section)
- **Local Address**: Division Railway Manager (DRM) Office, Kothi Compound, Rajkot, Gujarat, India - 360001
- **Application URL**: `https://ais-dev-4a2xxq2o76uecfmnbaiaid-416712913801.asia-southeast1.run.app`

---
<p align="center">
  <b>Developed with devotion for the Indian Railways. Streamlining national transit audits.</b><br>
  © 2026 Western Railway Rajkot Division. All Rights Reserved.
</p>
