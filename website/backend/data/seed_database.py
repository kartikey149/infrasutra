import sqlite3
import hashlib
from pathlib import Path

DB_PATH = Path(__file__).parent / "sih_database.db"

def seed_db():
    print(f"[DB] Initializing active SQLite database at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Drop and recreate tables to ensure clean schema with project_id
    cursor.execute("DROP TABLE IF EXISTS notifications")
    cursor.execute("DROP TABLE IF EXISTS project_assignments")
    cursor.execute("DROP TABLE IF EXISTS pending_updates")
    cursor.execute("DROP TABLE IF EXISTS schedule_activities")
    cursor.execute("DROP TABLE IF EXISTS projects")
    cursor.execute("DROP TABLE IF EXISTS users")

    # 1. Projects Table (Extended with full project management fields)
    cursor.execute("""
    CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        budget TEXT NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        supervisor TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        varianceDays INTEGER DEFAULT 0,
        description TEXT,
        tasksCount INTEGER DEFAULT 0,
        projectManager TEXT DEFAULT '',
        safetyOfficer TEXT DEFAULT '',
        contractor TEXT DEFAULT '',
        department TEXT DEFAULT '',
        priority TEXT DEFAULT 'High',
        contractType TEXT DEFAULT 'EPC',
        workersOnSite INTEGER DEFAULT 0,
        clientName TEXT DEFAULT 'Oil India Limited',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Schedule Activities Table (with project_id foreign key & historical learnings)
    cursor.execute("""
    CREATE TABLE schedule_activities (
        activity_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        wbs_level INTEGER,
        wbs_path TEXT,
        activity_name TEXT NOT NULL,
        discipline TEXT NOT NULL,
        planned_start TEXT NOT NULL,
        planned_end TEXT NOT NULL,
        planned_duration_days INTEGER,
        actual_start TEXT,
        actual_end TEXT,
        status TEXT NOT NULL DEFAULT 'Not Started',
        percent_complete INTEGER DEFAULT 0,
        location_zone TEXT NOT NULL,
        challenges_summary TEXT DEFAULT '',
        key_focus_areas TEXT DEFAULT '',
        historical_reference TEXT DEFAULT '',
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )
    """)

    # 3. Pending Updates Table (with project_id and edit tracking)
    cursor.execute("""
    CREATE TABLE pending_updates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        raw_input TEXT NOT NULL,
        extracted_discipline TEXT,
        extracted_task TEXT,
        event_type TEXT,
        extracted_timestamp TEXT,
        location_zone TEXT,
        matched_activity_id TEXT,
        matched_activity_name TEXT,
        confidence REAL,
        source_type TEXT DEFAULT 'text',
        status TEXT DEFAULT 'pending', -- pending, approved, rejected, edited
        created_at TEXT,
        reviewed_at TEXT,
        rejection_reason TEXT,
        submitted_by TEXT DEFAULT 'Site Supervisor',
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )
    """)

    # 4. Users Table (Manager/Planner & Supervisor)
    cursor.execute("""
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL, -- planner, supervisor (or manager)
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 5. Project Assignments Table (Many-to-Many: User <-> Project <-> Role)
    cursor.execute("""
    CREATE TABLE project_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        project_id TEXT NOT NULL,
        role TEXT NOT NULL, -- 'supervisor' or 'planner'
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        UNIQUE(user_id, project_id)
    )
    """)

    # 6. In-App Notifications Table
    cursor.execute("""
    CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        project_id TEXT,
        message TEXT NOT NULL,
        notification_type TEXT NOT NULL, -- 'assignment', 'reassignment', 'system'
        is_read BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
    """)

    # Insert 4 Benchmark Projects (Projects A, B, C, D)
    projects = [
        (
            'PRJ-01',
            'Sector 4 Crude Oil Pipeline Expansion',
            'Dibrugarh Sector 4, Assam',
            '₹45.2 Cr',
            '2026-01-10',
            '2026-11-30',
            'Ramesh Kumar (Supervisor 1)',
            'Delayed',
            68,
            -16,
            'Cross-country crude oil pipeline trenching, NDT welding, hydrostatic testing, and sectional valve manifold integration.',
            12,
            'Arvind Sharma (Planner 1)',
            'Sunil Baruah (HSE Officer)',
            'Punj Lloyd Energy Ltd.',
            'Pipeline & Process Engineering',
            'Critical',
            'EPC (Lump Sum)',
            185,
            'Oil India Limited'
        ),
        (
            'PRJ-02',
            'Assam Gas Processing Plant Unit-2',
            'Duliajan Gas Terminal, Assam',
            '₹120.5 Cr',
            '2026-02-01',
            '2026-12-15',
            'Kartik Kesarwani (Supervisor 2)',
            'On Track',
            82,
            0,
            'High-pressure gas dehydration unit, compressor station skids, DCS automated instrumentation, and fire protection networks.',
            12,
            'Arvind Sharma (Planner 1)',
            'Rajesh Tiwari (HSE Lead)',
            'Larsen & Toubro Hydrocarbon',
            'Gas Processing & Petrochemicals',
            'High',
            'EPC (Cost Plus)',
            310,
            'Oil India Limited'
        ),
        (
            'PRJ-03',
            'Numaligarh Refined Products Dispatch Terminal',
            'Golaghat District, Assam',
            '₹92.0 Cr',
            '2026-03-01',
            '2027-01-20',
            'Kartik Kesarwani (Supervisor 2)',
            'On Track',
            45,
            0,
            'Automated multi-product gantry loading arms, vapour recovery absorption column, custody metering skids, and ESD logic.',
            12,
            'Arvind Sharma (Planner 1)',
            'Manas Pratim Das (HSE Inspector)',
            'Bridge & Roof Co. (India) Ltd.',
            'Marketing & Terminal Operations',
            'High',
            'EPC (Lump Sum)',
            140,
            'Oil India Limited'
        ),
        (
            'PRJ-04',
            'Brahmaputra River Crossing HDD Pipeline',
            'Jorhat South Bank, Assam',
            '₹85.0 Cr',
            '2026-04-15',
            '2027-03-31',
            'Manoj Deka (Site Supervisor)',
            'On Track',
            30,
            0,
            'Horizontal Directional Drilling (HDD) beneath Brahmaputra river bed, heavy wall 28-inch API 5L X70 steel pipe pull-back.',
            12,
            'Dr. Priya Borthakur (Planner 2)',
            'Alok Nath (HSE Specialist)',
            'Dredging & Horizontal Drillers Corp',
            'River Crossings & Special Projects',
            'Critical',
            'Turnkey EPC',
            115,
            'Oil India Limited'
        )
    ]

    cursor.executemany("""
    INSERT INTO projects (
        id, name, location, budget, startDate, endDate, supervisor, status, 
        progress, varianceDays, description, tasksCount,
        projectManager, safetyOfficer, contractor, department,
        priority, contractType, workersOnSite, clientName
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, projects)

    # Insert Tailored Schedule Activities for Project 1: Sector 4 Crude Oil Pipeline Expansion
    prj1_activities = [
        (
            "PIP-1001", "PRJ-01", 6, "PRJ-01 > Piping > Sector-4A > Spool Erection Line 24-XX", 
            "Erect Line 24-XX", "Piping", "2026-01-15", "2026-02-10", 26, "2026-01-18", "2026-02-15", "Completed", 100, "Sector-4A",
            "Past Project OIL-PL-2022: Unaligned pipe spools caused field bevel re-machining, delaying installation by 9 days.",
            "Verify laser alignment before bolt torquing; inspect Teflon spiral wound gasket placement.",
            "OIL Duliajan-Digboi Pipeline 2022"
        ),
        (
            "CIV-1002", "PRJ-01", 5, "PRJ-01 > Civil > Sector-4B > Mainline Trenching & Backfilling", 
            "Mainline Trenching & Backfilling", "Civil", "2026-02-11", "2026-03-15", 32, "2026-02-14", None, "In Progress", 65, "Sector-4B",
            "Past Project OIL-NE-2023: Monsoon soil saturation caused trench wall cave-ins in Sector-4B clay soil.",
            "Maintain 1:1 benching slope in soft soil; keep standby dewatering pumps every 200m.",
            "Brahmaputra South Feeder Line 2023"
        ),
        (
            "PIP-1003", "PRJ-01", 6, "PRJ-01 > Piping > Sector-4B > Automatic Pipe Welding & NDT", 
            "Automatic Pipe Welding & NDT", "Piping", "2026-03-01", "2026-04-10", 40, "2026-03-05", None, "In Progress", 40, "Sector-4B",
            "Past Project OIL-PL-2021: Humidity during dawn hours caused internal weld porosity, failing Radiography NDT.",
            "Pre-heat pipe joint to 150°C; maintain wind shielding tents; ensure continuous NDT spot-checks.",
            "Naharkatiya Expansion Trunkline 2021"
        ),
        (
            "STR-1004", "PRJ-01", 5, "PRJ-01 > Structural Steel > Zone-4 > Pipe Rack Support Fabrication", 
            "Pipe Rack Support Fabrication", "Structural Steel", "2026-02-20", "2026-03-25", 33, "2026-02-22", "2026-03-28", "Completed", 100, "Zone-4",
            "Past Project OIL-ST-2020: Primer coating peeled off under high humidity before top-coat application.",
            "Ensure Sa 2.5 blast cleaning profile; check epoxy DFT thickness > 150 microns.",
            "Numaligarh Manifold Tie-In 2020"
        ),
        (
            "CIV-1005", "PRJ-01", 5, "PRJ-01 > Civil > Zone-4 > Valve Pit Foundation Concrete", 
            "Valve Pit Foundation Concrete", "Civil", "2026-03-20", "2026-04-20", 31, "2026-03-25", None, "In Progress", 50, "Zone-4",
            "Past Project OIL-CV-2023: High water table resulted in pit flooding during base slab shuttering.",
            "Continuous well-point dewatering; add integral waterproofing compound (crystallizing admixture).",
            "Moran Crude Terminal 2023"
        ),
        (
            "PIP-1006", "PRJ-01", 6, "PRJ-01 > Piping > Sector-4C > Sectional Hydrostatic Pressure Test", 
            "Sectional Hydrostatic Pressure Test", "Piping", "2026-04-25", "2026-05-15", 20, None, None, "Not Started", 0, "Sector-4C",
            "Past Project OIL-HY-2022: Thermal fluctuations caused 4 bar pressure drop, requiring 3 re-tests.",
            "Stabilize test water temperature for 24h before 24-hr holding period; use calibrated deadweight gauge.",
            "Jorhat Feeder Spurline 2022"
        ),
        (
            "MEC-1007", "PRJ-01", 6, "PRJ-01 > Mechanical > Station-1 > Booster Pump Alignment", 
            "Booster Pump Alignment", "Mechanical", "2026-05-01", "2026-05-25", 24, None, None, "Not Started", 0, "Station-1",
            "Past Project OIL-MC-2021: Pipe strain pulled pump casing out of tolerance after spool bolt-up.",
            "Zero-load alignment with dial indicators; verify spring supports are pinned before alignment.",
            "Dikom Pumping Station 2021"
        ),
        (
            "ELE-1008", "PRJ-01", 5, "PRJ-01 > Electrical > Station-1 > Cathodic Protection Transformer Installation", 
            "Cathodic Protection Transformer Installation", "Electrical", "2026-05-15", "2026-06-10", 26, None, None, "Not Started", 0, "Station-1",
            "Past Project OIL-CP-2023: Anode bed resistance was too high (> 2 ohms) due to dry backfill layer.",
            "Coke breeze backfill saturation check; confirm deep-well groundbed resistance < 1.5 ohms.",
            "Tinsukia Crude Loop 2023"
        ),
        (
            "INS-1009", "PRJ-01", 6, "PRJ-01 > Instrumentation > Station-1 > Pressure Transmitter Tubing", 
            "Pressure Transmitter Tubing", "Instrumentation", "2026-06-05", "2026-06-28", 23, None, None, "Not Started", 0, "Station-1",
            "Past Project OIL-IN-2022: Vibration-induced ferrule cracking at high-pressure pulsation zones.",
            "Use double-ferrule 316 SS fittings; clamp tubing every 600mm; perform nitrogen bubble leak test.",
            "Shalmari Gathering Station 2022"
        ),
        (
            "FPR-1010", "PRJ-01", 5, "PRJ-01 > Fire Protection > Zone-4 > Fire Hydrant Ring Header Laying", 
            "Fire Hydrant Ring Header Laying", "Fire Protection", "2026-06-20", "2026-07-15", 25, None, None, "Not Started", 0, "Zone-4",
            "Past Project OIL-FP-2021: Buried ductile iron pipe damaged during simultaneous cable trenching.",
            "Mark buried pipeline with warning foil tape 300mm above crown; verify 10 bar ring pressure test.",
            "Duliajan Central Tank Farm 2021"
        ),
        (
            "PIP-1011", "PRJ-01", 6, "PRJ-01 > Piping > Station-1 > Scraper Trap & Pig Launcher Erection", 
            "Scraper Trap & Pig Launcher Erection", "Piping", "2026-07-10", "2026-08-05", 26, None, None, "Not Started", 0, "Station-1",
            "Past Project OIL-PL-2020: Quick-opening closure door interlock misaligned, failing hydrotest.",
            "Check mechanical key interlock; inspect O-ring elastomer compatibility with sour crude.",
            "Kusijan Terminal 2020"
        ),
        (
            "CIV-1012", "PRJ-01", 5, "PRJ-01 > Civil > Sector-4A > Site Restoration & Security Fencing", 
            "Site Restoration & Security Fencing", "Civil", "2026-08-15", "2026-09-30", 46, None, None, "Not Started", 0, "Sector-4A",
            "Past Project OIL-CV-2022: Local farmer right-of-way disputes delayed perimeter handover.",
            "Joint RoW survey with revenue officials; restore topsoil humus layer to original grade.",
            "Tengakhat Pipeline Route 2022"
        )
    ]

    # Insert Tailored Schedule Activities for Project 2: Assam Gas Processing Plant Unit-2
    prj2_activities = [
        (
            "CIV-2001", "PRJ-02", 5, "PRJ-02 > Civil > Unit-2 > Gas Turbine Generator Foundation Pouring", 
            "Gas Turbine Generator Foundation Pouring", "Civil", "2026-02-05", "2026-03-10", 33, "2026-02-06", "2026-03-08", "Completed", 100, "Unit-2",
            "Past Project OIL-GT-2021: Thermal hydration cracking occurred in 2.5m thick mass concrete plinth.",
            "Use low-heat Portland Pozzolana cement; install thermocouple monitoring; continuous wet curing 14 days.",
            "Duliajan Gas Plant Unit-1 (2021)"
        ),
        (
            "MEC-2002", "PRJ-02", 6, "PRJ-02 > Mechanical > Unit-2 > Heat Exchanger Bundle Insertion", 
            "Heat Exchanger Bundle Insertion", "Mechanical", "2026-03-01", "2026-03-25", 24, "2026-03-02", "2026-03-22", "Completed", 100, "Unit-2",
            "Past Project OIL-HE-2022: Baffle plate galling damaged shell internal cladding during winch pulling.",
            "Apply Teflon guide shoes; ensure continuous hydraulic bundle extractor level alignment.",
            "Numaligarh Hydrocracker 2022"
        ),
        (
            "MEC-2003", "PRJ-02", 6, "PRJ-02 > Mechanical > Compressor-Area > Centrifugal Gas Compressor Skid Placement", 
            "Centrifugal Gas Compressor Skid Placement", "Mechanical", "2026-03-15", "2026-04-12", 28, "2026-03-18", None, "In Progress", 85, "Compressor-Area",
            "Past Project OIL-GC-2023: Foundation sole-plate epoxy grout had air pockets under motor base.",
            "Pour non-shrink epoxy grout from one side only; head box height > 150mm; check 100% sound tapping.",
            "Baghjan Compression Station 2023"
        ),
        (
            "INS-2004", "PRJ-02", 6, "PRJ-02 > Instrumentation > Control-Room > DCS Panel Wiring and Termination", 
            "DCS Panel Wiring and Termination", "Instrumentation", "2026-03-25", "2026-04-20", 26, "2026-03-26", None, "In Progress", 70, "Control-Room",
            "Past Project OIL-DCS-2022: Signal noise on 4-20mA HART loops caused false compressor ESD trips.",
            "Ensure single-point grounding of cable screens; separate instrument cables from 415V power by 300mm.",
            "Duliajan Central DCS Upgrade 2022"
        ),
        (
            "ELE-2005", "PRJ-02", 5, "PRJ-02 > Electrical > Substation-B > 33kV Switchgear High-Voltage Testing", 
            "33kV Switchgear High-Voltage Testing", "Electrical", "2026-04-01", "2026-04-28", 27, "2026-04-02", None, "In Progress", 60, "Substation-B",
            "Past Project OIL-HV-2023: VLF dielectric puncture occurred on SF6 circuit breaker bushing.",
            "Clean bushings with isopropyl alcohol; verify SF6 gas moisture < 15 ppmv before applying 54kV test.",
            "Assam Gas Substation Project 2023"
        ),
        (
            "PIP-2006", "PRJ-02", 6, "PRJ-02 > Piping > Unit-2 > Cryogenic Process Piping Welding", 
            "Cryogenic Process Piping Welding", "Piping", "2026-04-10", "2026-05-15", 35, "2026-04-12", None, "In Progress", 45, "Unit-2",
            "Past Project OIL-CR-2022: Delta-ferrite content below 3% resulted in hot cracking in 316L SS welds.",
            "Measure ferrite number (FN 4-8) with Ferritoscope; maintain interpass temperature < 100°C.",
            "LPG Extraction Unit Duliajan 2022"
        ),
        (
            "INS-2007", "PRJ-02", 6, "PRJ-02 > Instrumentation > Unit-2 > Impulse Tubing Installation & Calibration", 
            "Impulse Tubing Installation & Calibration", "Instrumentation", "2026-04-20", "2026-05-18", 28, None, None, "Not Started", 0, "Unit-2",
            "Past Project OIL-IN-2021: Liquid condensation pocket in gas transmitter line caused 0.8 bar measurement error.",
            "Maintain 1:12 slope downward toward condensate pots; blow through with dry nitrogen.",
            "Naharkatiya Gas Compressor 2021"
        ),
        (
            "STR-2008", "PRJ-02", 5, "PRJ-02 > Structural Steel > Flare-Area > Flare Stack Derrick Structure Erection", 
            "Flare Stack Derrick Structure Erection", "Structural Steel", "2026-05-01", "2026-05-30", 29, None, None, "Not Started", 0, "Flare-Area",
            "Past Project OIL-FL-2023: High wind gusts (> 35 knots) caused crane boom suspension delay during top section lift.",
            "Monitor anemometer at 60m height; check guy wire pre-tension with dynamometer.",
            "Baghjan High-Pressure Flare 2023"
        ),
        (
            "FPR-2009", "PRJ-02", 5, "PRJ-02 > Fire Protection > Unit-2 > Deluge Foam Skid & Sprinkler Testing", 
            "Deluge Foam Skid & Sprinkler Testing", "Fire Protection", "2026-05-20", "2026-06-15", 26, None, None, "Not Started", 0, "Unit-2",
            "Past Project OIL-FS-2022: Foam proportioner orifice blocked by dried foam concentrate residue.",
            "Flushing test with fresh water first; check 3% AFFF concentrate expansion ratio and drainage time.",
            "Duliajan Tank Farm Safety Upgrade 2022"
        ),
        (
            "PIP-2010", "PRJ-02", 6, "PRJ-02 > Piping > Compressor-Area > High-Pressure Flare Header Tie-in", 
            "High-Pressure Flare Header Tie-in", "Piping", "2026-06-01", "2026-06-25", 24, None, None, "Not Started", 0, "Compressor-Area",
            "Past Project OIL-TI-2021: Hydrocarbon gas ingress during live plant hot-tap connection.",
            "Double block and bleed isolation; nitrogen purging until O2 < 0.5% and LEL 0%; explosive meter continuous log.",
            "Moran Gas Processing Tie-in 2021"
        ),
        (
            "ELE-2011", "PRJ-02", 5, "PRJ-02 > Electrical > Unit-2 > Hazardous Area Lighting & Earthing Grid", 
            "Hazardous Area Lighting & Earthing Grid", "Electrical", "2026-06-15", "2026-07-10", 25, None, None, "Not Started", 0, "Unit-2",
            "Past Project OIL-EX-2022: Ex-d flameproof junction box spigot joint scratched, violating Zone 1 rating.",
            "Check Ex-d certificate; grease flamepaths with non-setting silicone; measure earth loop impedance < 1 ohm.",
            "Duliajan Unit-1 Expansion 2022"
        ),
        (
            "MEC-2012", "PRJ-02", 6, "PRJ-02 > Mechanical > Unit-2 > Pre-Commissioning Lube Oil Flushing", 
            "Pre-Commissioning Lube Oil Flushing", "Mechanical", "2026-07-05", "2026-08-01", 27, None, None, "Not Started", 0, "Unit-2",
            "Past Project OIL-LO-2023: Microscopic pipe mill scale contaminated compressor bearing pads.",
            "Flush at 65°C using thermal cycling; verify 100 mesh screen catch zero particles under microscope.",
            "Baghjan Unit-2 Gas Turbine 2023"
        )
    ]

    # Activities for Project 3: Numaligarh Refined Products Dispatch Terminal
    prj3_activities = [
        (
            "CIV-3001", "PRJ-03", 5, "PRJ-03 > Civil > Gantry-A > Gantry Foundation Raft Casting",
            "Gantry Foundation Raft Casting", "Civil", "2026-03-05", "2026-04-10", 36, "2026-03-08", None, "In Progress", 60, "Gantry-A",
            "Past Project OIL-GN-2022: High sulfur groundwater attack degraded standard OPC concrete.",
            "Use Sulfate Resisting Portland Cement (SRPC); apply two coats of bituminous membrane protection.",
            "Numaligarh Dispatch Ph-1 2022"
        ),
        (
            "MEC-3002", "PRJ-03", 6, "PRJ-03 > Mechanical > Loading-Bay > Multi-Product Gantry Arms Erection",
            "Multi-Product Gantry Arms Erection", "Mechanical", "2026-04-01", "2026-05-15", 44, None, None, "Not Started", 0, "Loading-Bay",
            "Past Project OIL-GA-2021: Swivel joint misalignment caused vapor seal leakage during initial trial.",
            "Verify counter-weight balance; nitrogen leak check swivel joints at 6 bar before product filling.",
            "Siliguri Terminal Expansion 2021"
        ),
        (
            "INS-3003", "PRJ-03", 6, "PRJ-03 > Instrumentation > Control-Room > Batch Controller & Flow Meter Calibration",
            "Batch Controller & Flow Meter Calibration", "Instrumentation", "2026-05-01", "2026-06-10", 40, None, None, "Not Started", 0, "Control-Room",
            "Past Project OIL-MC-2022: Mass flow meter zero drift occurred due to pipe stress on sensor body.",
            "Ensure zero mechanical stress on Coriolis flow meter flanges; calibrate using master meter prover.",
            "Guwahati Depot Automation 2022"
        ),
        (
            "FPR-3004", "PRJ-03", 5, "PRJ-03 > Fire Protection > Gantry-A > High-Expansion Foam Generator Installation",
            "High-Expansion Foam Generator Installation", "Fire Protection", "2026-06-01", "2026-07-05", 34, None, None, "Not Started", 0, "Gantry-A",
            "Past Project OIL-FP-2023: Strainer clogging delayed foam induction rate below OISD-117 norms.",
            "Clean Y-type strainers; verify water turbine speed meets manufacturer curves at 7 bar header pressure.",
            "Barauni Terminal Safety 2023"
        )
    ]

    # Activities for Project 4: Brahmaputra River Crossing HDD Pipeline
    prj4_activities = [
        (
            "CIV-4001", "PRJ-04", 5, "PRJ-04 > Civil > South-Bank > HDD Rig Pad Preparation & Anchoring",
            "HDD Rig Pad Preparation & Anchoring", "Civil", "2026-04-20", "2026-05-25", 35, "2026-04-22", None, "In Progress", 30, "South-Bank",
            "Past Project OIL-HDD-2021: Soil shear failure under 400-ton rig pull-back anchor during high river discharge.",
            "Install 12m driven steel pile anchors; verify anchor hold capacity > 600 metric tons.",
            "Brahmaputra HDD Crossing Ph-1 2021"
        ),
        (
            "PIP-4002", "PRJ-04", 6, "PRJ-04 > Piping > North-Bank > 28-inch API 5L X70 Pipe Stringing & Welding",
            "28-inch API 5L X70 Pipe Stringing & Welding", "Piping", "2026-05-10", "2026-06-30", 51, None, None, "Not Started", 0, "North-Bank",
            "Past Project OIL-HDD-2022: Weld heat-affected zone (HAZ) hardness exceeded 250 HV10, risking sour cracking.",
            "Perform automated SAW welding with preheat at 175°C; 100% Phased Array Ultrasonic Testing (PAUT).",
            "Dhansiri River Crossing 2022"
        ),
        (
            "MEC-4003", "PRJ-04", 6, "PRJ-04 > Mechanical > South-Bank > Pilot Hole Directional Drilling 1800m",
            "Pilot Hole Directional Drilling 1800m", "Mechanical", "2026-06-15", "2026-08-15", 61, None, None, "Not Started", 0, "South-Bank",
            "Past Project OIL-HDD-2020: Inadvertent hydro-fracture mud release into river bed due to excessive annular pressure.",
            "Use Gyro-steering system; continuously monitor annular pressure with PWD sub; maintain bentonite viscosity > 55s.",
            "Subansiri Crossing 2020"
        ),
        (
            "PIP-4004", "PRJ-04", 6, "PRJ-04 > Piping > River-Bed > Final Pipe Pull-Back & Hydrotest 210 Bar",
            "Final Pipe Pull-Back & Hydrotest 210 Bar", "Piping", "2026-08-20", "2026-10-10", 51, None, None, "Not Started", 0, "River-Bed",
            "Past Project OIL-HDD-2023: Buoyancy control water filling failure doubled pull-back tonnage, stretching pipe section.",
            "Maintain internal water ballast pump to achieve neutral buoyancy; pull continuously without stoppage.",
            "Jia Bharali River Crossing 2023"
        )
    ]

    all_activities = prj1_activities + prj2_activities + prj3_activities + prj4_activities
    cursor.executemany("""
    INSERT INTO schedule_activities (
        activity_id, project_id, wbs_level, wbs_path, activity_name, discipline, 
        planned_start, planned_end, planned_duration_days, actual_start, actual_end, 
        status, percent_complete, location_zone, challenges_summary, key_focus_areas, historical_reference
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, all_activities)

    # Insert Sample Pending & Recent Updates for projects
    pending_updates = [
        (
            "PRJ-01",
            "Zone-4 mein Pipe Rack Support Fabrication ka kaam poora complete ho gaya aaj shaam",
            "Structural Steel",
            "Pipe Rack Support Fabrication",
            "Actual Finish",
            "2026-03-28T18:00:00",
            "Zone-4",
            "STR-1004",
            "Pipe Rack Support Fabrication",
            0.94,
            "voice",
            "approved",
            "2026-03-28T18:05:00",
            "2026-03-28T18:30:00",
            None,
            "Ramesh Kumar (Supervisor)"
        ),
        (
            "PRJ-01",
            "Sector-4B mein Mainline Trenching ka excavation speed up ho gaya aur 65% progress ho gayi",
            "Civil",
            "Mainline Trenching & Backfilling",
            "Actual Start",
            "2026-04-02T11:30:00",
            "Sector-4B",
            "CIV-1002",
            "Mainline Trenching & Backfilling",
            0.88,
            "telegram_text",
            "pending",
            "2026-04-02T11:35:00",
            None,
            None,
            "Ramesh Kumar (Supervisor)"
        ),
        (
            "PRJ-02",
            "Unit-2 mein Heat Exchanger bundle insertion successful complete ho gaya 16:30 baje",
            "Mechanical",
            "Heat Exchanger Bundle Insertion",
            "Actual Finish",
            "2026-03-22T16:30:00",
            "Unit-2",
            "MEC-2002",
            "Heat Exchanger Bundle Insertion",
            0.96,
            "voice",
            "approved",
            "2026-03-22T16:35:00",
            "2026-03-22T17:00:00",
            None,
            "Kartik Kesarwani (Supervisor)"
        ),
        (
            "PRJ-02",
            "Control-Room mein DCS panel wiring cables termination 70% complete ho chuka hai",
            "Instrumentation",
            "DCS Panel Wiring and Termination",
            "Actual Start",
            "2026-04-03T14:15:00",
            "Control-Room",
            "INS-2004",
            "DCS Panel Wiring and Termination",
            0.91,
            "web_text",
            "pending",
            "2026-04-03T14:20:00",
            None,
            None,
            "Kartik Kesarwani (Supervisor)"
        )
    ]

    cursor.executemany("""
    INSERT INTO pending_updates (
        project_id, raw_input, extracted_discipline, extracted_task, event_type, 
        extracted_timestamp, location_zone, matched_activity_id, matched_activity_name, 
        confidence, source_type, status, created_at, reviewed_at, rejection_reason, submitted_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, pending_updates)

    # Insert Explicit Test Users (Supervisors and Planners)
    pw_hash = hashlib.sha256('12345678'.encode()).hexdigest()
    users = [
        (1, "Ramesh Kumar (Supervisor 1)", "supervisor1@oilindia.in", pw_hash, "supervisor"),
        (2, "Kartik Kesarwani (Supervisor 2)", "supervisor2@oilindia.in", pw_hash, "supervisor"),
        (3, "Arvind Sharma (Planner 1)", "planner1@oilindia.in", pw_hash, "planner"),
        (4, "Dr. Priya Borthakur (Planner 2)", "planner2@oilindia.in", pw_hash, "planner"),
        (5, "Sunil Baruah (Supervisor 3 - Unassigned)", "supervisor3@oilindia.in", pw_hash, "supervisor"),
        (6, "Site Field Supervisor", "supervisor@oilindia.in", pw_hash, "supervisor"),
        (7, "Senior Project Planner", "manager@oilindia.in", pw_hash, "planner"),
        (8, "System Administrator", "kartikkesarwani149@gmail.com", pw_hash, "planner")
    ]

    cursor.executemany("""
    INSERT INTO users (id, name, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
    """, users)

    # Insert Explicit Project Assignments (Database-enforced isolation)
    # Scenario 1: Supervisor 1 -> Project A (PRJ-01)
    # Scenario 2: Supervisor 2 -> Project B (PRJ-02) and Project C (PRJ-03)
    # Scenario 3: Planner 1 -> Project A, Project B, Project C (PRJ-01, PRJ-02, PRJ-03)
    # Scenario 4: Planner 2 -> Project D (PRJ-04)
    # Scenario 6: Supervisor 3 (User 5) -> No assignments (empty project list)
    assignments = [
        # Supervisor 1 (User 1 & User 6 alias) -> PRJ-01
        (1, "PRJ-01", "supervisor"),
        (6, "PRJ-01", "supervisor"),

        # Supervisor 2 (User 2) -> PRJ-02, PRJ-03
        (2, "PRJ-02", "supervisor"),
        (2, "PRJ-03", "supervisor"),

        # Planner 1 (User 3 & User 7 alias) -> PRJ-01, PRJ-02, PRJ-03
        (3, "PRJ-01", "planner"),
        (3, "PRJ-02", "planner"),
        (3, "PRJ-03", "planner"),
        (7, "PRJ-01", "planner"),
        (7, "PRJ-02", "planner"),
        (7, "PRJ-03", "planner"),

        # Planner 2 (User 4) -> PRJ-04
        (4, "PRJ-04", "planner"),

        # Admin (User 8) -> PRJ-01, PRJ-02, PRJ-03, PRJ-04
        (8, "PRJ-01", "planner"),
        (8, "PRJ-02", "planner"),
        (8, "PRJ-03", "planner"),
        (8, "PRJ-04", "planner"),
    ]

    cursor.executemany("""
    INSERT INTO project_assignments (user_id, project_id, role)
    VALUES (?, ?, ?)
    """, assignments)

    # Insert Sample In-App Notifications for Assigned Supervisors
    sample_notifications = [
        (1, "PRJ-01", "You have been assigned as Field Supervisor to Project 'Sector 4 Crude Oil Pipeline Expansion' (PRJ-01).", "assignment", 0),
        (2, "PRJ-02", "You have been assigned as Field Supervisor to Project 'Assam Gas Processing Plant Unit-2' (PRJ-02).", "assignment", 0),
        (2, "PRJ-03", "You have been assigned as Field Supervisor to Project 'Numaligarh Refined Products Dispatch Terminal' (PRJ-03).", "assignment", 1),
    ]

    cursor.executemany("""
    INSERT INTO notifications (user_id, project_id, message, notification_type, is_read)
    VALUES (?, ?, ?, ?, ?)
    """, sample_notifications)

    conn.commit()
    conn.close()
    print("[SUCCESS] Successfully seeded database with 4 projects, isolated assignments, and notifications!")

if __name__ == "__main__":
    seed_db()
