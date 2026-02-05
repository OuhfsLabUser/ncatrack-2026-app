# CARE-Mock-System

## Introduction

This software provides a mock database to simulate data input scenarios and improve data validity and quality for child advocacy centers.

## System Requirements

- **Node.js** v18 or later (for both frontend and API)
- **Python** 3.8 or later (for data generation scripts)
- **PostgreSQL** 14 or later (for the database)

> **Supported Environments:** Windows 10/11, macOS 12+ (Monterey or newer)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/TheEthanHaque/CARE-Spring2025.git
cd CARE-Spring2025/
```

### 2. Install Prerequisites

#### Windows
1. **Node.js & npm**: Download and install the LTS version from [nodejs.org](https://nodejs.org/).
2. **Python**: Download and install Python 3.8+ from [python.org](https://www.python.org/downloads/).
3. **PostgreSQL**: Download and install from [postgresql.org](https://www.postgresql.org/download/windows/).

#### macOS
1. **Homebrew** (if not installed):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. **Node.js & npm**:
   ```bash
   brew install node
   ```
3. **Python**:
   ```bash
   brew install python@3.8
   ```
4. **PostgreSQL**:
   ```bash
   brew install postgresql@14
   brew services start postgresql@14
   ```

### 3. Configure PostgreSQL

1. Edit the `pg_hba.conf` file to allow local connections (use `trust` for development):
   ```conf
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            trust
   # IPv6 local connections:
   host    all             all             ::1/128                 trust
   # Local socket connections:
   local   all             all                                     trust
   ```
2. Restart PostgreSQL:
   - **Windows**: Restart the PostgreSQL service via the Services panel.
   - **macOS**: `brew services restart postgresql@14`

### 4. Install Project Dependencies

#### Backend Python Dependencies (Anaconda)

We recommend using **Anaconda** to manage the Python environment.

$11.1 **Configure Windows PATH** (Windows only - If Path is not recognized): To have PowerShell (or CMD) recognize `conda` commands, add your Anaconda root and Scripts folders to your PATH:

   1. Find your Anaconda install path (default: `C:\Users\<YourWindowsUser>\Anaconda3` or `C:\ProgramData\Anaconda3`).
   2. Open the Environment Variables editor:
      - Press Win+R, type `sysdm.cpl`, and hit Enter.
      - In the **System Properties** window, go to **Advanced** → **Environment Variables…**
   3. Under **User variables for `<You>`**, select **Path** and click **Edit…**
   4. Click **New** and add:
      - `C:\Users\<YourWindowsUser>\Anaconda3`
      - `C:\Users\<YourWindowsUser>\Anaconda3\Scripts`
      - *(Optional)* `C:\Users\<YourWindowsUser>\Anaconda3\Library\bin` for additional DLLs
   5. Click **OK** on all dialogs and **restart** PowerShell/CMD.

If you did not have issues with the path simply do steps 7 & 8 to run the project.

   7. `conda env create -n 'care' --file environment.yml`
   8. `conda activate 'care'`

> **Note:** If you prefer a traditional `venv`, feel free to use requirements.txt by creating a python environment and doing `pip install -r requirements.txt`

#### API (Node) Dependencies (Node) Dependencies

```bash
# From project root
cd app/api
npm install
npx prisma generate
cd ../..
```

#### Frontend Dependencies

```bash
# From project root
cd app/frontend
npm install
cd ../..
```

### 5. Database Setup Wizard

Run the provided wizard script to create and seed the database:

```bash
# From project root
python app/wizard.py
```
> **Note:** If `Error during database creation, CREATE DATABASE can not run inside a transation block` log into psql and do `CREATE DATABASE care;`


When prompted:
1. Choose **Complete Install**
2. Enter database details (host, name, user, password)

The wizard will:
- Create the database and user
- Apply permissions
- Create tables
- Seed sample data

## Running the Application

### Start the API Server

```bash
# From project root
cd app/api
node index.js
```

The API will be available at http://localhost:5000.

If you want to run the API without the AOI stuff, do 

(For Powershell)
```bash
$env:ENABLE_AOI_LOGGING = "false"
node index.js
```

### Start the Frontend

```bash
# From project root
cd app/frontend
npm start
```

The React app will run at http://localhost:3000.

## Project Structure

- `app/frontend`: React frontend
- `app/api`: Node.js API server (Prisma)
- `wizard.py`: Database setup wizard
- `requirements.txt`: Python dependencies

## Development Notes

- **API routes**: `app/api/routes`
- **Database schema**: `app/api/prisma/schema.prisma`
- **Frontend entry**: `app/frontend/src/App.js`

## Troubleshooting

- **PostgreSQL Connection**:
  - Ensure service is running
  - Verify `pg_hba.conf` settings
- **API Errors**:
  - Check console for stack traces
  - Confirm correct port (default 5000)
- **Frontend Issues**:
  - Ensure dependencies installed
  - Clear cache: `rm -rf node_modules && npm install`

## Configuration

- Change API port in `app/api/index.js`:
  ```js
  const PORT = process.env.PORT || 5000;
  ```
- Change Frontend port via `.env` in `app/frontend`:
  ```env
  PORT=3000
  ```

## License

This software is provided as-is without warranty. See LICENSE for details.

## Contact

For support, contact the project maintainers.
