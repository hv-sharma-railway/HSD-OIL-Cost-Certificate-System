# HSD Oil Cost Certificate System

A comprehensive full-stack application designed for the **Rajkot Division, Western Railway**, to automate the generation and management of High-Speed Diesel (HSD) Oil Cost Certificates.

**Created by:** IT Cell, Rajkot Division, Western Railway

---

## 🚀 Overview

This system streamlines the process of auditing and certifying HSD oil expenditures across various consuming sheds. It handles complex financial calculations, manages pricing data, and generates professional, audit-ready PDF certificates bundled with their respective vouchers.

## ✨ Key Features

- **Automated PDF Generation**: Generates standardized certificates with justified text and professional layouts.
- **Bulk Processing**: Add multiple consuming sheds to a queue and generate a single ZIP archive containing all documents.
- **Voucher Integration**: Attach and merge existing PDF vouchers directly into the generated cost certificates.
- **Pricing Management**: Maintain a database of HSD oil prices (Base Price, Excise, VAT, Overhead) for different periods and supplying sheds.
- **Persistent Storage**: Uses SQLite to store shed masters and pricing history.
- **Dockerized Deployment**: Includes a complete containerization setup with a built-in database browser.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, Lucide React.
- **Backend**: Node.js, Express, better-sqlite3.
- **PDF Engine**: jsPDF, jspdf-autotable, pdf-lib.
- **Database**: SQLite.
- **Containerization**: Docker, Docker Compose.

---

## ⚙️ Setup Instructions

### Prerequisites

- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **Docker & Docker Compose** (Optional, for containerized setup)

### Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

4. **Build for production**:
   ```bash
   npm run build
   npm run start
   ```

### Docker Setup (Recommended)

The easiest way to run the application with all its services is using Docker Compose.

1. **Build and start the containers**:
   ```bash
   docker-compose up --build
   ```

2. **Access the services**:
   - **Web Application**: `http://localhost:3000`
   - **Database Browser (SQLite Web)**: `http://localhost:8080`

---

## 📖 How to Use

### 1. Manage Prices
- Navigate to the **Pricing Master** tab.
- Add the HSD oil rates for the specific month, year, and supplying shed.
- Upload the supporting pricing PDF for the 1st-15th and 16th-End periods.

### 2. Generate Certificates
- Navigate to the **Generate** tab.
- Select the **Month**, **Year**, and **Supplying Shed**.
- Search and add **Consuming Sheds** from the master list.
- For each added shed:
  - Enter the **Coach Litres** and **Goods Litres**.
  - Toggle **Power Car** if applicable.
  - Upload the **Voucher PDF**.
- Click **Generate Full ZIP** to download a package containing merged PDFs (Certificate + Voucher + Pricing).
- Click **Download Certificates Only** for just the generated certificate documents.

### 3. Manage Sheds
- Navigate to the **Shed Master** tab to add or remove consuming sheds from the system.

---

## 🗄️ Database Management

When running via Docker, the **SQLite Web** interface is exposed on port `8080`. This tool allows you to:
- Browse all tables (`sheds`, `prices`).
- Export data to CSV/JSON.
- Run custom SQL queries for advanced reporting.
- Inspect uploaded PDF data (stored as base64).

---

## 📜 License

Internal use only for Western Railway, Rajkot Division.

**IT Cell, Rajkot Division, Western Railway**
