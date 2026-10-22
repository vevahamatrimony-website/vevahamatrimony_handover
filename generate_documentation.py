import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def create_document():
    doc = docx.Document()

    # Page Margins: Standard 1 inch
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Styles & Colors
    # Primary: #1E3A8A (Navy Blue)
    # Secondary: #BE185D (Matrimonial Rose/Crimson)
    # Slate/Body: #334155
    # Code BG: #F1F5F9
    # Table Header BG: #1E3A8A
    # Table Alt Row: #F8FAFC

    COLOR_PRIMARY = RGBColor(30, 58, 138)       # #1E3A8A
    COLOR_SECONDARY = RGBColor(190, 24, 93)     # #BE185D
    COLOR_DARK = RGBColor(15, 23, 42)           # #0F172A
    COLOR_BODY = RGBColor(51, 65, 85)           # #334155
    COLOR_MUTED = RGBColor(100, 116, 139)       # #64748B

    HEX_PRIMARY = "1E3A8A"
    HEX_SECONDARY = "BE185D"
    HEX_ALT_ROW = "F8FAFC"
    HEX_LIGHT_GRAY = "E2E8F0"
    HEX_CODE_BG = "F1F5F9"

    # Default Style font
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Calibri'
    style_normal.font.size = Pt(10.5)
    style_normal.font.color.rgb = COLOR_BODY
    style_normal.paragraph_format.line_spacing = 1.15
    style_normal.paragraph_format.space_after = Pt(4)

    # Helper: Set Cell Background & Padding
    def set_cell_background(cell, hex_color):
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
        cell._tc.get_or_add_tcPr().append(shading)

    def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = OxmlElement('w:tcMar')
        for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
            node = OxmlElement(f'w:{m}')
            node.set(qn('w:w'), str(val))
            node.set(qn('w:type'), 'dxa')
            tcMar.append(node)
        tcPr.append(tcMar)

    def set_table_borders(table, color="CBD5E1", sz="4", val="single"):
        tblPr = table._tbl.tblPr
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>\n'
            f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
            f'  <w:left w:val="none"/>\n'
            f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
            f'  <w:right w:val="none"/>\n'
            f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>\n'
            f'  <w:insideV w:val="none"/>\n'
            f'</w:tblBorders>'
        )
        tblPr.append(borders)

    # Formatting Helpers
    def add_chapter_title(num, title):
        doc.add_page_break()
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(2)
        run_lbl = p.add_run(f"CHAPTER {num}")
        run_lbl.font.size = Pt(10)
        run_lbl.font.bold = True
        run_lbl.font.color.rgb = COLOR_SECONDARY

        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(2)
        h.paragraph_format.space_after = Pt(14)
        run_title = h.add_run(title)
        run_title.font.name = 'Calibri'
        run_title.font.size = Pt(20)
        run_title.font.bold = True
        run_title.font.color.rgb = COLOR_PRIMARY

        # Thin divider line under chapter heading
        p_line = doc.add_paragraph()
        p_line.paragraph_format.space_before = Pt(0)
        p_line.paragraph_format.space_after = Pt(12)
        run_line = p_line.add_run("―" * 55)
        run_line.font.color.rgb = COLOR_MUTED
        run_line.font.size = Pt(8)

    def add_section_heading(title):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(6)
        run = h.add_run(title)
        run.font.name = 'Calibri'
        run.font.size = Pt(14)
        run.font.bold = True
        run.font.color.rgb = COLOR_PRIMARY

    def add_subsection_heading(title):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(4)
        run = h.add_run(title)
        run.font.name = 'Calibri'
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = COLOR_DARK

    def add_paragraph(text, bold_prefix=None):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(5)
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.font.bold = True
            r_bold.font.color.rgb = COLOR_DARK
        r_text = p.add_run(text)
        r_text.font.color.rgb = COLOR_BODY
        return p

    def add_bullet(text, bold_prefix=None, level=0):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.left_indent = Inches(0.25 * (level + 1))
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.font.bold = True
            r_bold.font.color.rgb = COLOR_DARK
        r_text = p.add_run(text)
        r_text.font.color.rgb = COLOR_BODY
        return p

    def add_callout(text, title="NOTE"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        tbl.columns[0].width = Inches(6.5)
        cell = tbl.cell(0, 0)
        set_cell_background(cell, "F8FAFC")
        set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
        
        # Left thick border
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(
            f'<w:tcBorders {nsdecls("w")}>\n'
            f'  <w:top w:val="none"/>\n'
            f'  <w:left w:val="single" w:sz="24" w:space="0" w:color="{HEX_PRIMARY}"/>\n'
            f'  <w:bottom w:val="none"/>\n'
            f'  <w:right w:val="none"/>\n'
            f'</w:tcBorders>'
        )
        tcPr.append(borders)
        
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(2)
        r_title = p.add_run(f"[{title}] ")
        r_title.font.bold = True
        r_title.font.size = Pt(9.5)
        r_title.font.color.rgb = COLOR_PRIMARY
        r_text = p.add_run(text)
        r_text.font.size = Pt(9.5)
        r_text.font.color.rgb = COLOR_BODY

        # empty spacing paragraph after callout
        p_space = doc.add_paragraph()
        p_space.paragraph_format.space_after = Pt(4)

    def add_code_block(code_text):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        tbl.columns[0].width = Inches(6.5)
        cell = tbl.cell(0, 0)
        set_cell_background(cell, HEX_CODE_BG)
        set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
        
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(
            f'<w:tcBorders {nsdecls("w")}>\n'
            f'  <w:top w:val="single" w:sz="4" w:space="0" w:color="{HEX_LIGHT_GRAY}"/>\n'
            f'  <w:left w:val="single" w:sz="4" w:space="0" w:color="{HEX_LIGHT_GRAY}"/>\n'
            f'  <w:bottom w:val="single" w:sz="4" w:space="0" w:color="{HEX_LIGHT_GRAY}"/>\n'
            f'  <w:right w:val="single" w:sz="4" w:space="0" w:color="{HEX_LIGHT_GRAY}"/>\n'
            f'</w:tcBorders>'
        )
        tcPr.append(borders)
        
        lines = code_text.strip().split('\n')
        for i, line in enumerate(lines):
            p = cell.paragraphs[0] if i == 0 else cell.add_paragraph()
            p.paragraph_format.space_after = Pt(1)
            p.paragraph_format.line_spacing = 1.05
            r = p.add_run(line)
            r.font.name = 'Consolas'
            r.font.size = Pt(8.5)
            r.font.color.rgb = RGBColor(30, 41, 59)

        p_space = doc.add_paragraph()
        p_space.paragraph_format.space_after = Pt(4)

    def add_custom_table(headers, rows, col_widths=None):
        tbl = doc.add_table(rows=len(rows) + 1, cols=len(headers))
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        set_table_borders(tbl)

        # Header Row
        hdr_cells = tbl.rows[0].cells
        for col_idx, h in enumerate(headers):
            hdr_cells[col_idx].text = ""
            p = hdr_cells[col_idx].paragraphs[0]
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(4)
            r = p.add_run(h)
            r.font.bold = True
            r.font.name = 'Calibri'
            r.font.size = Pt(9.5)
            r.font.color.rgb = RGBColor(255, 255, 255)
            set_cell_background(hdr_cells[col_idx], HEX_PRIMARY)
            set_cell_margins(hdr_cells[col_idx], top=80, bottom=80, left=120, right=120)
            if col_widths and col_idx < len(col_widths):
                hdr_cells[col_idx].width = Inches(col_widths[col_idx])

        # Data Rows
        for row_idx, row_data in enumerate(rows):
            row_cells = tbl.rows[row_idx + 1].cells
            bg_color = HEX_ALT_ROW if row_idx % 2 == 1 else "FFFFFF"
            for col_idx, cell_value in enumerate(row_data):
                row_cells[col_idx].text = ""
                p = row_cells[col_idx].paragraphs[0]
                p.paragraph_format.space_before = Pt(3)
                p.paragraph_format.space_after = Pt(3)
                r = p.add_run(str(cell_value))
                r.font.name = 'Calibri'
                r.font.size = Pt(9)
                r.font.color.rgb = COLOR_BODY
                set_cell_background(row_cells[col_idx], bg_color)
                set_cell_margins(row_cells[col_idx], top=60, bottom=60, left=100, right=100)
                if col_widths and col_idx < len(col_widths):
                    row_cells[col_idx].width = Inches(col_widths[col_idx])

        p_space = doc.add_paragraph()
        p_space.paragraph_format.space_after = Pt(6)

    # ════════════════════════════════════════════════════════════════════════════
    # COVER PAGE
    # ════════════════════════════════════════════════════════════════════════════
    p_pre = doc.add_paragraph()
    p_pre.paragraph_format.space_before = Pt(36)
    p_pre.paragraph_format.space_after = Pt(12)
    r_badge = p_pre.add_run("ENTERPRISE SOFTWARE HANDOVER & TECHNICAL SPECIFICATION")
    r_badge.font.name = 'Calibri'
    r_badge.font.size = Pt(10)
    r_badge.font.bold = True
    r_badge.font.color.rgb = COLOR_SECONDARY

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_after = Pt(8)
    r_title = p_title.add_run("VevahaMatrimony Platform")
    r_title.font.name = 'Calibri'
    r_title.font.size = Pt(30)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_PRIMARY

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(24)
    r_sub = p_sub.add_run("Complete Developer Architecture, API Reference, Database Schema, and Maintenance Manual")
    r_sub.font.name = 'Calibri'
    r_sub.font.size = Pt(13)
    r_sub.font.color.rgb = COLOR_MUTED

    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_after = Pt(28)
    r_div = p_div.add_run("―" * 55)
    r_div.font.color.rgb = COLOR_MUTED

    meta_table = [
        ["Document Version", "1.0.0 (Production Master Release)"],
        ["Target Environment", "Node.js 20+ LTS / Express / Supabase / Ubuntu 22.04 LTS (PM2)"],
        ["Application Domain", "https://vevahamatrimony.com | https://www.vevahamatrimony.com"],
        ["Repository Handover", "https://github.com/vevahamatrimony-website/vevahamatrimony_handover.git"],
        ["Primary Database", "Supabase PostgreSQL Managed Instance (Row Level Security & PL/pgSQL)"],
        ["Third-Party APIs", "Surepass KYC / DigiLocker, Razorpay Payments, Google Gemini AI, OpenRouter"],
        ["Prepared By", "Senior Solutions Architecture & Engineering Handover Team"],
        ["Release Date", "October 2026"],
        ["Classification", "Confidential / Developer & Technical Engineering Handover Only"]
    ]
    add_custom_table(["Metadata Property", "Specification Details"], meta_table, [2.5, 4.0])

    p_cov_note = doc.add_paragraph()
    p_cov_note.paragraph_format.space_before = Pt(36)
    r_note = p_cov_note.add_run(
        "Notice: This technical manual contains exhaustive architectural documentation, verified database schemas, "
        "endpoint payloads, security policies, and maintenance workflows for VevahaMatrimony. It is compiled directly "
        "from the verified production codebase to enable seamless developer onboarding, maintenance, and ongoing feature development."
    )
    r_note.font.size = Pt(8.5)
    r_note.font.italic = True
    r_note.font.color.rgb = COLOR_MUTED

    # ════════════════════════════════════════════════════════════════════════════
    # TABLE OF CONTENTS PLACEHOLDER
    # ════════════════════════════════════════════════════════════════════════════
    doc.add_page_break()
    p_toc_head = doc.add_paragraph()
    p_toc_head.paragraph_format.space_after = Pt(14)
    r_toc = p_toc_head.add_run("Table of Contents")
    r_toc.font.size = Pt(20)
    r_toc.font.bold = True
    r_toc.font.color.rgb = COLOR_PRIMARY

    toc_items = [
        ("Chapter 1", "Project Overview", "Executive summary, business problem, scope, architecture philosophy"),
        ("Chapter 2", "Technology Stack", "Full breakdown of runtime, frameworks, databases, and dependencies"),
        ("Chapter 3", "System Architecture", "Multi-tier architectural design, data flows, and subsystem integrations"),
        ("Chapter 4", "Project Directory Structure", "Complete annotated file map and module descriptions"),
        ("Chapter 5", "Features and Functional Requirements", "Deep dive into 16 core platform modules with step-by-step logic"),
        ("Chapter 6", "User Roles and Permissions", "Role definition matrix, tier capabilities, and access control"),
        ("Chapter 7", "Database Documentation", "Complete PostgreSQL schema (8 tables, 120+ columns, triggers, RLS)"),
        ("Chapter 8", "API and Backend Documentation", "Exhaustive API catalog (45+ REST endpoints with payloads & responses)"),
        ("Chapter 9", "Frontend and UI Documentation", "Component hierarchy, styling design system, translation engine"),
        ("Chapter 10", "Authentication and Security", "Dual OTP verification, JWT middleware, data protection, privacy guards"),
        ("Chapter 11", "Installation and Local Setup", "Step-by-step local workstation installation and runtime bootstrap"),
        ("Chapter 12", "Environment Variables and Configuration", "Production environment catalog with purpose and setup instructions"),
        ("Chapter 13", "End-to-End Workflows", "Sequence flows for Registration, Search, Connecting, Payment & Calling"),
        ("Chapter 14", "Error Handling and Troubleshooting", "Diagnostic matrix, root cause analyses, and tested resolutions"),
        ("Chapter 15", "Testing and Quality Assurance", "Manual verification suite, test endpoints, recommended CI automation"),
        ("Chapter 16", "Deployment and Production Setup", "Hostinger VPS architecture, PM2 process management, SSL, Nginx"),
        ("Chapter 17", "Developer Maintenance Guide", "How to add APIs, modify schemas, update pricing, and extend features"),
        ("Chapter 18", "Current Status, Limitations, and Future Roadmap", "Verified status, technical debt, and 3-phase strategic roadmap"),
        ("Chapter 19", "Technical Reference and Glossary", "Core function reference, Vedic astrology glossary, and CLI cheat sheet"),
        ("Chapter 20", "Developer Handover Checklist", "30-point interactive verification checklist for repository onboarding")
    ]
    add_custom_table(["Chapter", "Title", "Coverage Overview"], toc_items, [1.1, 2.4, 3.0])

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 1: PROJECT OVERVIEW
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(1, "Project Overview")
    
    add_section_heading("1.1 Project Identity & Executive Summary")
    add_paragraph(
        "VevahaMatrimony is a specialized, production-ready matrimonial and matchmaking software platform "
        "tailored for the South Indian and Tamil-speaking demographic worldwide. Operating commercially at "
        "vevahamatrimony.com, the platform combines sacred cultural and astrological traditions—such as 10-Porutham "
        "Vedic horoscope compatibility, Rasi, Nakshatram, and Dosham analysis—with cutting-edge digital verification "
        "and communication technologies. These include multi-document government KYC verification (Surepass DigiLocker, "
        "Passport, Voter ID, Driving License, PAN), real-time WebRTC audio and video calling, privacy-guarded direct messaging, "
        "automated photo watermarking, and tier-based membership monetization."
    )
    
    add_section_heading("1.2 Problem Statement & Objectives")
    add_paragraph(
        "Traditional matrimonial platforms in India face four chronic problems that degrade user trust and safety:"
    )
    add_bullet("Prevalence of fake, unverified, or misattributed profiles leading to financial scams and emotional fraud.", "1. Identity Fraud: ");
    add_bullet("Lack of deep astrological accuracy, requiring manual consultations with local astrologers.", "2. Horoscope Disconnect: ");
    add_bullet("Uncontrolled scraping, saving, and unauthorized distribution of sensitive photos (especially for women).", "3. Photo Misuse: ");
    add_bullet("Overwhelming spam and contact harvesting by unauthorized third parties and commercial agents.", "4. Contact Harvesting: ");
    add_paragraph(
        "VevahaMatrimony solves these problems programmatically through an integrated trust pipeline: every user undergoes "
        "automated identity verification through government-backed APIs, photos are dynamically watermarked with member ID "
        "stamps, contact information is strictly locked behind verified mutual acceptance and membership tier quotas, "
        "and astrological compatibility is computed instantly using a verified Vedic engine."
    )

    add_section_heading("1.3 Target Users & Primary Personas")
    add_bullet("Individual brides and grooms looking for verified partners matching their cultural, educational, and professional preferences.", "Self-Registered Candidates: ")
    add_bullet("Parents, siblings, and guardians registering and managing profiles on behalf of candidates.", "Family Representatives: ")
    add_bullet("Non-Resident Indians seeking authentic cultural matches with verified roots in Tamil Nadu and South India.", "Global Diaspora: ")
    add_bullet("Candidates seeking second marriages who require divorce decree or death certificate verification.", "Remarriage Candidates: ")
    add_bullet("Platform operators managing member verification, database synchronization, and support.", "System Administrators: ")

    add_section_heading("1.4 Key Features & Business Value")
    feat_summary = [
        ["Government KYC Pipeline", "Surepass API suite verifying Voter ID, Driving License, Passport, PAN, and DigiLocker Aadhaar."],
        ["Vedic Astrology Engine", "Automated 10 Porutham calculation, Sevvai/Rahu-Ketu Dosham detection, Rasi Kattam chart rendering."],
        ["Tiered Monetization", "Free, Silver (₹1,179), Gold (₹2,359), Diamond (₹4,719), and VIP (₹58,999) tiers via Razorpay."],
        ["WebRTC Calling", "Encrypted peer-to-peer audio and video calling directly in the browser with incoming ringing listener."],
        ["Guarded Messaging", "Direct chatting with automated regex filters preventing premature phone/social media sharing."],
        ["Multilingual Engine", "Zero-dependency global translation across 12 Indian & international languages with cookie persistence."],
        ["Dual AI Assistants", "Gemini-powered general matrimony assistant and Vedic horoscope counselor with offline fallbacks."],
        ["Excel DB Synchronizer", "Admin upload tool for importing and managing offline matrimonial archives and member listings."]
    ]
    add_custom_table(["Core Platform Feature", "Architectural Capability"], feat_summary, [2.2, 4.3])

    add_section_heading("1.5 Current Implementation Status & Production Health")
    add_paragraph(
        "The application is actively deployed in production on an Ubuntu VPS managed via PM2 (Process Manager 2) under "
        "Node.js 20+ LTS. The production database is hosted on Supabase (PostgreSQL with Row Level Security). All public "
        "and private endpoints are routed through an Express.js backend with SSL termination and Nginx reverse proxying. "
        "Static web pages and frontend assets are served directly from the consolidated production root."
    )

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 2: TECHNOLOGY STACK
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(2, "Technology Stack")

    add_section_heading("2.1 Architectural Technology Stack")
    add_paragraph(
        "VevahaMatrimony is deliberately built on an ultra-lean, high-performance vanilla architecture. By avoiding "
        "heavy frontend SPA frameworks like React, Vue, or Angular, the application achieves instantaneous page loads "
        "(sub-100ms TTFB), runs without client compilation pipelines (no Webpack or Vite build steps required), and "
        "maintains maximum flexibility for direct DOM and server-side updates."
    )

    tech_table = [
        ["Frontend UI", "HTML5, Vanilla CSS3, Modern JavaScript (ES6+)", "Lightweight structure, responsive flex/grid layouts, no framework overhead."],
        ["Client Styling", "Custom Design System (CSS Custom Properties)", "Centralized color variables, card components, modals, and responsive breakpoints."],
        ["Translation", "Google Translate API + Custom DOM Orchestrator", "Multilingual translation (12 languages) with cross-page cookie persistence."],
        ["Backend Runtime", "Node.js (>=20.0.0 LTS)", "High-throughput asynchronous event-driven JavaScript server runtime."],
        ["Web Framework", "Express.js (v4.18.3)", "Modular routing architecture, middleware chain, RESTful API design."],
        ["Database", "Supabase PostgreSQL (Managed Postgres 15+)", "Relational storage, JSONB columns, foreign keys, triggers, and Row Level Security."],
        ["Auth Engine", "Supabase Auth + Custom JWT Middleware", "Secure user sign-up, session token management, and password hashing via Bcrypt."],
        ["KYC & Identity", "Surepass API Suite (Production)", "Voter ID, Driving License, Passport, PAN Comprehensive, DigiLocker Aadhaar."],
        ["Payment Gateway", "Razorpay Node.js SDK (v2.9.2)", "Checkout integration, HMAC-SHA256 signature verification, webhook processing."],
        ["P2P Media Calls", "WebRTC PeerConnection API", "Browser-native encrypted peer-to-peer audio and video communication."],
        ["AI & Astrological NLP", "Google Gemini REST API (gemini-2.5-flash)", "Bilingual conversational chatbot with keyword rule fallbacks."],
        ["Astrology Engine", "Custom Client/Server Vedic Calculator", "10 Porutham calculation, Dosham detection, SVG Rasi chart generation."],
        ["Spreadsheet Sync", "XLSX (v0.18.5) & ExcelJS (v4.4.0)", "Streaming parsing and generation of large Excel member databases."],
        ["Process Manager", "PM2 (Production Process Manager)", "Zero-downtime reloads, daemon process management, log rotation, auto-restart."]
    ]
    add_custom_table(["Subsystem", "Technology / Framework", "Primary Purpose in Architecture"], tech_table, [1.5, 2.5, 2.5])

    add_section_heading("2.2 Backend Package Dependencies (package.json)")
    add_paragraph(
        "The production backend relies on a strictly curated set of battle-tested npm dependencies verified in package.json:"
    )
    deps_table = [
        ["@supabase/supabase-js", "^2.39.0", "Official client library for Supabase database queries, Auth, and Storage bucket interactions."],
        ["express", "^4.18.3", "Core HTTP server routing, JSON body parsing, and request/response dispatching."],
        ["cors", "^2.8.5", "Cross-Origin Resource Sharing middleware enabling secure API communication from authorized origins."],
        ["helmet", "^7.1.0", "HTTP security headers protection (configured to accommodate necessary inline scripts and postMessage)."],
        ["morgan", "^1.10.0", "HTTP request logger middleware providing comprehensive Apache-style combined access logs."],
        ["express-rate-limit", "^7.2.0", "IP-based brute-force prevention (1,000 req/15min globally, 50 req/15min for auth routes)."],
        ["dotenv", "^16.4.1", "Loads environment configuration variables from the root .env file into process.env."],
        ["bcryptjs", "^2.4.3", "Cryptographic password hashing library for supplementary credential verification."],
        ["multer", "^1.4.5-lts.1", "Multipart/form-data handler configured for in-memory buffer streaming of file uploads."],
        ["nodemailer", "^8.0.1", "Enterprise email delivery client supporting SMTP relay for automated verification OTP dispatch."],
        ["razorpay", "^2.9.2", "Official SDK for Razorpay Order creation, payment capture, and signature verification."],
        ["xlsx", "^0.18.5", "High-performance spreadsheet parser used for ingesting historical matrimonial member databases."],
        ["exceljs", "^4.4.0", "Advanced workbook manipulation library used for formatted spreadsheet exports."],
        ["uuid", "^9.0.1", "RFC4122 compliant universally unique identifier generator for session and call tokens."],
        ["unzipper", "^0.12.3", "Streaming zip decompression library for processing bulk media asset archives."]
    ]
    add_custom_table(["Dependency Name", "Version", "Technical Function"], deps_table, [1.8, 1.0, 3.7])

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 3: SYSTEM ARCHITECTURE
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(3, "System Architecture")

    add_section_heading("3.1 High-Level Architecture Model")
    add_paragraph(
        "VevahaMatrimony implements a classic decoupled multi-tier web application architecture. "
        "The client browser executes plain HTML5/CSS3/JS, communicating with the Express.js API gateway "
        "over secure HTTPS. The Express gateway enforces rate limits, validates authentication headers, "
        "and interfaces with the PostgreSQL persistence layer (Supabase) and external SaaS microservices."
    )

    arch_diagram = """
+---------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                     |
|  [HTML5 Views] <---> [Vanilla JS Modules] <---> [Google Translate] <---> [WebRTC P2P]  |
+------------------------------------------+--------------------------------------------+
                                           | HTTPS / JSON
                                           v
+---------------------------------------------------------------------------------------+
|                             NODE.JS / EXPRESS API GATEWAY                             |
|  [Rate Limiter] -> [Helmet/CORS] -> [JWT Auth Middleware] -> [Plan Quota Guard]       |
|                                          |                                            |
|   +-------------------+------------------+-------------------+--------------------+   |
|   |                   |                  |                   |                    |   |
|   v                   v                  v                   v                    v   |
| [Auth Routes]   [Profile/Match]    [Verification]       [Calls & Signal]      [Payment] |
+---+-------------------+------------------+-------------------+--------------------+---+
    |                   |                  |                   |                    |
    v                   v                  v                   v                    v
[Supabase Auth]   [Supabase PG]     [Surepass KYC]       [Peer P2P]         [Razorpay]
(JWT Validation)  (8 Tables, RLS)   (DigiLocker/Gov)    (Audio/Video)       (Orders/Hook)
    """
    add_code_block(arch_diagram)

    add_section_heading("3.2 Request-Response Lifecycle")
    add_paragraph(
        "Every incoming HTTP request traverses a strict, verified middleware sequence in server.js:"
    )
    add_bullet("All incoming IPv4/IPv6 connections are processed with DNS resolution defaulting to IPv4 first.", "1. Network Layer: ")
    add_bullet("Helmet sets standard security headers; CORS validates the requesting origin against allowed production domains.", "2. Security Handshake: ")
    add_bullet("Global limiter checks the client IP (max 1,000 requests/15 mins for API endpoints; static assets bypass).", "3. Rate Limiting: ")
    add_bullet("An active watchdog timer enforces a 30s timeout for standard requests and 60s for file upload endpoints.", "4. Timeout Guard: ")
    add_bullet("The request reaches the specific Express route router where requireAuth verifies the Bearer JWT token.", "5. Authentication: ")
    add_bullet("For protected operations (unlocking contacts, sending messages), limits.js verifies the user's plan allowance.", "6. Quota Verification: ")
    add_bullet("The controller executes queries against Supabase using supabaseAdmin (service_role) or supabase (anon).", "7. Data Persistence: ")
    add_bullet("A structured JSON response is returned; global error handlers intercept any unhandled rejections.", "8. Response Dispatch: ")

    add_section_heading("3.3 Authentication & Session Architecture")
    add_paragraph(
        "Authentication uses a hybrid architecture: Supabase manages user credentials, password encryption, and "
        "JWT generation. Upon successful login, the client receives an access token and refresh token stored in "
        "localStorage (vm_token). Subsequent requests transmit this token via the standard header: "
    )
    add_code_block("Authorization: Bearer <SUPABASE_JWT_ACCESS_TOKEN>")
    add_paragraph(
        "On the backend, middleware/auth.js intercepts the header and calls supabaseAdmin.auth.getUser(token). "
        "This guarantees cryptographically verified user identity without maintaining stateful session tables in memory, "
        "allowing horizontal scaling across multiple Node.js worker instances."
    )

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 4: PROJECT DIRECTORY STRUCTURE
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(4, "Project Directory Structure")

    add_section_heading("4.1 Complete Annotated Workspace Tree")
    tree_text = """
d:\\vevahamatrimony-website\\
├── .env.example                     # Environment template with dummy variables
├── .gitignore                       # Git exclusions (.env, node_modules, temp_uploads)
├── .replit                          # Cloud runner configuration metadata
├── package.json                     # Project manifest, scripts, and production dependencies
├── package-lock.json                # Deterministic dependency lockfile
├── server.js                        # Master Express application entry point & HTTP server
├── server.py                        # Legacy Flask prototype server (historical reference)
├── style.css                        # Global master stylesheet and CSS custom properties
├── script.js                        # Homepage interactivity and public view orchestration
│
├── db/                              # Database schemas and migration scripts
│   ├── schema.sql                   # Master PostgreSQL schema (profiles, messages, requests, etc.)
│   └── migration_marital_columns.sql# Alter migration for divorce decree & remarriage fields
│
├── lib/                             # Shared utility libraries and service clients
│   └── supabase.js                  # Supabase client singletons (supabase and supabaseAdmin)
│
├── middleware/                      # Express middleware interceptors
│   ├── auth.js                      # JWT Bearer token validation middleware (requireAuth, optionalAuth)
│   ├── limits.js                    # Membership plan usage and contact view quota enforcement
│   └── multer.js                    # Multipart file upload storage configuration
│
├── routes/                          # Modular API route controllers
│   ├── admin-upload.js              # Bulk Excel database upload and sync endpoints
│   ├── auth.js                      # User registration, login, OTP dispatch, password reset
│   ├── calls.js                     # Audio/video call session tracking and database logging
│   ├── contact.js                   # Support contact message submission via SMTP
│   ├── matches.js                   # Recommended, preferred, and general matchmaking search
│   ├── membership.js                # Plan status, feature matrix, and quota checking
│   ├── messages.js                  # 1-on-1 member chat, privacy filtering, unread counts
│   ├── payment.js                   # Razorpay order generation, signature verification, webhooks
│   ├── profile.js                   # Profile CRUD, stats, online presence, contact unlocking
│   ├── requests.js                  # Interest requests (send, accept, decline, cancel, connections)
│   ├── signal.js                    # WebRTC signaling polling store for peer connection handshake
│   ├── upload.js                    # File upload handler for photos, horoscopes, and identity docs
│   └── verification.js              # Surepass KYC (Voter ID, DL, Passport, PAN, DigiLocker, eSign)
│
├── images/                          # Static image assets, banners, dummy portraits, badges
│   ├── vevaha-logo.png              # Primary corporate branding logo
│   └── ...                          # Hero backgrounds, testimonials, placeholders
│
├── temp_uploads/                    # Local storage for member photos and horoscopes (preserved)
│
├── [Root HTML Pages]                # 32 User-facing HTML views (Public, Member, Legal, Admin)
│   ├── index.html                   # Public landing page with search, testimonials, featured profiles
│   ├── login.html                   # Member login portal
│   ├── register.html                # Comprehensive multi-step registration & KYC verification
│   ├── home.html                    # Authenticated member home dashboard
│   ├── profile.html                 # Member profile viewing page
│   ├── edit-profile.html            # Profile editing and biodata management
│   ├── matches.html                 # Smart matching and partner search interface
│   ├── requests.html                # Interest management dashboard (Sent, Received, Declined)
│   ├── messages.html                # Direct chat and messaging interface
│   ├── connections.html             # Mutual connections and unlocked contact directory
│   ├── membership.html              # Membership plan comparison and upgrade portal
│   ├── billing.html                 # Razorpay checkout and invoice review
│   ├── voice-call.html              # WebRTC audio calling interface
│   ├── video-call.html              # WebRTC video calling interface
│   ├── admin-upload.html            # Administrator Excel database management console
│   └── ...                          # Terms, privacy, help center, FAQ, safety tips
│
└── [Root JavaScript Modules]        # Reusable client-side components and domain engines
    ├── language.js                  # Client-side multilingual translation coordinator
    ├── translate-widget.js          # Custom language selection dropdown UI component
    ├── member-card-component.js     # Reusable profile card renderer with action triggers
    ├── full-profile-modal.js        # Comprehensive profile details modal popup
    ├── porutham-calculator.js       # 10 Porutham Vedic astrology computation algorithm
    ├── horoscopeEngine.js           # Rasi Kattam and Navamsam chart rendering engine
    ├── webrtc-call.js               # WebRTC client-side calling controller
    ├── chat-system.js               # Client-side messaging controller and UI updater
    ├── ai-chat.js                   # Gemini AI matrimony conversational assistant
    └── horoscopic-ai-chat.js        # Gemini AI astrological advice and dosham evaluator
    """
    add_code_block(tree_text)

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 5: FEATURES AND FUNCTIONAL REQUIREMENTS
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(5, "Features and Functional Requirements")

    add_section_heading("5.1 Module Breakdown & Workflow Catalog")
    add_paragraph(
        "This chapter details the 16 core functional modules implemented in the VevahaMatrimony codebase. "
        "Each section traces the user action, frontend interaction, backend execution, database tables, and validation rules."
    )

    # Feature 1
    add_subsection_heading("5.1.1 Multi-Step Matrimonial Registration & Profile Builder")
    add_bullet("Prospective brides, grooms, and family representatives.", "Target Users: ")
    add_bullet("Accessible via /register.html.", "Access Point: ")
    add_bullet(
        "Step 1: Account setup (email, mobile, password, registration on behalf of).\n"
        "Step 2: Basic & physical info (full name, DOB, height, weight, body type, disability).\n"
        "Step 3: Marital status (Never Married, Divorced, Widowed; conditional divorce decree upload).\n"
        "Step 4: Education, occupation, annual income, native place, address.\n"
        "Step 5: Religion, caste, subcaste, gotra, rasi, star, lagnam, dosham.\n"
        "Step 6: Partner preferences (age range, height range, education, caste, location).\n"
        "Step 7: Photo upload and mandatory Government KYC document verification.\n"
        "Step 8: Email OTP verification and account creation.",
        "Workflow: "
    )
    add_bullet("register.html, routes/auth.js (/api/auth/register), routes/upload.js (/api/upload/*).", "Key Components: ")
    add_bullet("public.profiles, auth.users.", "Database Tables: ")

    # Feature 2
    add_subsection_heading("5.1.2 Multi-Government KYC Identity Verification Pipeline")
    add_bullet("All registering users seeking verified profile badges.", "Target Users: ")
    add_bullet("Integrated into Step 7 of registration and standalone at /verify-documents.html.", "Access Point: ")
    add_bullet(
        "User selects document type (Voter ID, Driving License, Passport, PAN, or DigiLocker Aadhaar). "
        "Frontend dispatches asynchronous verification request to /api/verification/verify or initializes DigiLocker session. "
        "Backend invokes Surepass KYC production API. On match, full name, DOB, and document number are validated against user entries. "
        "On success, is_verified is set to true and verification badge is activated.",
        "Workflow: "
    )
    add_bullet("routes/verification.js, test-kyc.html, mock-digilocker.html, mock-esign.html.", "Key Components: ")
    add_bullet("public.profiles (aadhaar_number, pan_number, voter_id_number, is_verified).", "Database Tables: ")

    # Feature 3
    add_subsection_heading("5.1.3 Vedic Astrology Chart & 10-Porutham Compatibility Engine")
    add_bullet("Members evaluating matrimonial horoscope compatibility.", "Target Users: ")
    add_bullet("Integrated into profile views, matches.html, and horoscopic-chatbot.html.", "Access Point: ")
    add_bullet(
        "Computes the traditional 10 Poruthams based on bride and groom Rasi and Nakshatram: "
        "1. Dina Porutham (Health & Prosperity), 2. Gana Porutham (Temperament), 3. Mahendra Porutham (Lineage), "
        "4. Stree Dheergam (Longevity), 5. Yoni Porutham (Physical Affinity), 6. Rasi Porutham (Family Growth), "
        "7. Rasiyadhipathi (Friendship of Lords), 8. Vasiya Porutham (Mutual Attraction), 9. Rajju Porutham (Mangalya Stability), "
        "10. Vedha Porutham (Absence of Affliction). Also evaluates Sevvai/Chevvai Dosham and Rahu-Ketu placement.",
        "Astrological Rules: "
    )
    add_bullet("porutham-calculator.js, horoscopeEngine.js, horoscopeFillForm.js.", "Key Components: ")

    # Feature 4
    add_subsection_heading("5.1.4 Smart Matchmaking & Search Filter System")
    add_bullet("Logged-in members browsing candidate profiles.", "Target Users: ")
    add_bullet("Accessible via /matches.html, /advanced-search.html, and /browse-members.html.", "Access Point: ")
    add_bullet(
        "Offers three distinct matching views: "
        "(1) Recommended Matches: Algorithmic compatibility scoring based on age, education, and astrological alignment. "
        "(2) Preferred Matches: Direct SQL filtering matching user's stored partner preferences. "
        "(3) Custom Search: Dynamic multi-parameter filtering (age, height, religion, caste, occupation, location, income).",
        "Workflow: "
    )
    add_bullet("routes/matches.js (/api/matches/recommended, /preferred, /search), matches.js.", "Key Components: ")

    # Feature 5
    add_subsection_heading("5.1.5 Interest Requests & Connection Lifecycle")
    add_bullet("Members expressing interest in potential partners.", "Target Users: ")
    add_bullet("Accessible via profile action buttons and /requests.html.", "Access Point: ")
    add_bullet(
        "Sender clicks 'Send Interest'. Backend checks uniqueness in public.requests table. "
        "Record inserted with status 'pending'. Receiver sees request in /requests.html with options to 'Accept' or 'Decline'. "
        "Accepting updates status to 'accepted', unlocking mutual messaging capabilities and adding both to /connections.html.",
        "Workflow: "
    )
    add_bullet("routes/requests.js (/api/requests/send, /accept, /decline, /cancel), requests.js.", "Key Components: ")
    add_bullet("public.requests, public.profiles.", "Database Tables: ")

    # Feature 6
    add_subsection_heading("5.1.6 Privacy-Guarded Direct Messaging")
    add_bullet("Connected members communicating in-app.", "Target Users: ")
    add_bullet("Accessible via /messages.html.", "Access Point: ")
    add_bullet(
        "Real-time chat interface. Before inserting message into public.messages, backend passes text through privacy regex: "
        "phone numbers (\\+91|91)?[6-9]\\d{9}, email addresses, and social handles (WhatsApp, Instagram) are detected. "
        "Daily messaging quota is checked against user's membership plan in middleware/limits.js.",
        "Workflow: "
    )
    add_bullet("routes/messages.js (/api/messages/*), chat-system.js, middleware/limits.js.", "Key Components: ")
    add_bullet("public.messages, public.plan_usage.", "Database Tables: ")

    # Feature 7
    add_subsection_heading("5.1.7 WebRTC Peer-to-Peer Voice & Video Calling")
    add_bullet("Connected members conducting live calls.", "Target Users: ")
    add_bullet("Accessible via /voice-call.html and /video-call.html.", "Access Point: ")
    add_bullet(
        "Caller initiates call via /api/calls/initiate (verifies plan tier allows calling). "
        "Signaling offers, answers, and ICE candidates are exchanged via /api/calls/signal or /api/signal. "
        "Receiver browser detects incoming call via global background polling (/api/calls/incoming) in incoming-call-listener.js. "
        "On accept, WebRTC RTCPeerConnection establishes peer-to-peer media stream. Call duration is logged in public.calls.",
        "Workflow: "
    )
    add_bullet("webrtc-call.js, call-manager.js, incoming-call-listener.js, routes/calls.js.", "Key Components: ")
    add_bullet("public.calls.", "Database Tables: ")

    # Feature 8
    add_subsection_heading("5.1.8 Tiered Membership & Razorpay Monetization")
    add_bullet("Free members upgrading to unlock contact views and calling.", "Target Users: ")
    add_bullet("Accessible via /membership.html and /billing.html.", "Access Point: ")
    add_bullet(
        "User selects plan (Silver, Gold, Diamond, or VIP). Frontend calls /api/payment/create-order. "
        "Backend creates order with Razorpay in paise. Razorpay checkout modal opens. Upon payment completion, "
        "frontend sends payment_id, order_id, and signature to /api/payment/verify. Backend validates HMAC-SHA256 signature, "
        "updates profiles.plan_name, calculates plan_expiry_date, and records transaction in public.payments.",
        "Workflow: "
    )
    add_bullet("routes/payment.js, routes/membership.js, membership.html, billing.html.", "Key Components: ")
    add_bullet("public.payments, public.profiles, public.plan_usage.", "Database Tables: ")

    # Feature 9
    add_subsection_heading("5.1.9 Contact Unlocking & Audit Ledger")
    add_bullet("Paid members viewing verified phone numbers and addresses.", "Target Users: ")
    add_bullet("Accessible on full profile views via 'View Contact' button.", "Access Point: ")
    add_bullet(
        "When user clicks 'View Contact', backend checks if contact was already unlocked in public.contact_views. "
        "If not unlocked, limits.js checks remaining contact quota for user's plan. If quota available, "
        "contact_views record is inserted, remaining quota decremented, and real contact details returned.",
        "Workflow: "
    )
    add_bullet("routes/profile.js (/api/profile/unlock-contact), middleware/limits.js.", "Key Components: ")
    add_bullet("public.contact_views, public.profiles.", "Database Tables: ")

    # Feature 10
    add_subsection_heading("5.1.10 Dual AI Assistants: Matrimony & Horoscopic Chatbots")
    add_bullet("All site visitors and registered users seeking guidance.", "Target Users: ")
    add_bullet("Floating chat widget on all pages and /horoscopic-chatbot.html.", "Access Point: ")
    add_bullet(
        "Vevaha AI provides instant answers regarding registration, plans, safety tips, and contact information. "
        "Horoscopic AI analyzes birth details and Vedic compatibility. Both chatbots connect to Google Gemini REST API "
        "(gemini-2.5-flash) and feature comprehensive fallback dictionaries responding in English and Tamil if API is offline.",
        "Workflow: "
    )
    add_bullet("ai-chat.js, horoscopic-ai-chat.js, vevaha-ai-widget.js.", "Key Components: ")

    # Feature 11
    add_subsection_heading("5.1.11 Multilingual Translation Engine (12 Languages)")
    add_bullet("All website visitors.", "Target Users: ")
    add_bullet("Global language selector in header on every page.", "Access Point: ")
    add_bullet(
        "Supports English, Tamil, Telugu, Hindi, Malayalam, Kannada, Bengali, Marathi, Gujarati, Punjabi, French, German. "
        "Orchestrates Google Translate Element without disruptive UI headers. Stores selected language in googtrans cookie "
        "and localStorage (selectedLanguage). Dynamically synchronizes language across page navigation and SPA modals.",
        "Workflow: "
    )
    add_bullet("language.js, translate-widget.js.", "Key Components: ")

    # Feature 12
    add_subsection_heading("5.1.12 Admin Excel Database Importer & Member Sync")
    add_bullet("System administrators importing legacy or offline member records.", "Target Users: ")
    add_bullet("Accessible via /admin-upload.html.", "Access Point: ")
    add_bullet(
        "Administrator uploads an Excel file (.xlsx). Backend parses sheets using xlsx library in routes/admin-upload.js. "
        "Extracts member biodata, translates column variations (Tamil & English headers), creates corresponding auth user, "
        "and inserts rows into public.offline_members or public.profiles. Supports undo and redo operations.",
        "Workflow: "
    )
    add_bullet("routes/admin-upload.js, admin-upload.html, Old datas matrimony_backup_before_142_end.xlsx.", "Key Components: ")
    add_bullet("public.offline_members, public.profiles.", "Database Tables: ")

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 6: USER ROLES AND PERMISSIONS
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(6, "User Roles and Permissions")

    add_section_heading("6.1 Role Definitions & Tier Capabilities")
    add_paragraph(
        "VevahaMatrimony enforces a role-based and tier-based access control (RBAC) model. "
        "Capabilities are evaluated dynamically at both the UI layer (conditional button rendering) "
        "and the API gateway layer (middleware/auth.js and middleware/limits.js)."
    )

    role_table = [
        ["Guest / Visitor", "None", "Browse homepage, view public profile previews, read informational pages, use AI chatbot.", "Cannot view full contact details, cannot send requests, cannot message or call."],
        ["Free Member", "Registered (free)", "Create biodata, upload photos/horoscope, verify KYC documents, search matches, send interest requests.", "0 contact unlocks, 0 direct messages/day, cannot initiate voice/video calls."],
        ["Silver Member", "Paid (silver)", "All Free features + 15 verified contact unlocks, 15 direct messages per day, verified badge.", "Limited to 15 contact views total, 1-month validity."],
        ["Gold Member", "Paid (gold)", "All Silver features + 30 verified contact unlocks, 10 messages per day, voice calling enabled, 3-month validity.", "Limited to 30 contact views total."],
        ["Diamond Member", "Paid (diamond)", "All Gold features + 50 contact unlocks, unlimited daily messages, video & voice calling, 6-month validity.", "Limited to 50 contact views total."],
        ["VIP Member", "Paid (vip)", "All Diamond features + unlimited contact views, unlimited messages, personalized relationship manager, 12-month validity.", "Top-tier unlimited access."],
        ["Administrator", "service_role", "Direct database access, bulk Excel uploads, user verification overrides, system monitoring.", "Restricted to authorized system operators."]
    ]
    add_custom_table(["Role / Tier Name", "Database Plan Identifier", "Granted Capabilities", "Restrictions"], role_table, [1.2, 1.1, 2.5, 1.7])

    add_section_heading("6.2 Feature Permission Matrix")
    matrix_table = [
        ["Feature / Capability", "Free", "Silver", "Gold", "Diamond", "VIP"],
        ["Public Profile Search", "Yes", "Yes", "Yes", "Yes", "Yes"],
        ["10-Porutham Horoscope Match", "Yes", "Yes", "Yes", "Yes", "Yes"],
        ["Send Interest Request", "Yes", "Yes", "Yes", "Yes", "Yes"],
        ["Verified Contact Unlocks", "0", "15", "30", "50", "Unlimited"],
        ["Direct Messaging Quota", "0 / day", "15 / day", "10 / day", "Unlimited", "Unlimited"],
        ["WebRTC Voice Calling", "No", "No", "Yes", "Yes", "Yes"],
        ["WebRTC Video Calling", "No", "No", "No", "Yes", "Yes"],
        ["Priority Customer Support", "Standard", "Standard", "Priority", "Priority", "Dedicated Concierge"],
        ["Plan Duration", "Lifetime", "1 Month", "3 Months", "6 Months", "12 Months"],
        ["Price (INR, 18% GST incl.)", "Free", "₹1,179", "₹2,359", "₹4,719", "₹58,999"]
    ]
    add_custom_table(matrix_table[0], matrix_table[1:], [2.2, 0.8, 0.8, 0.8, 0.9, 1.0])

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 7: DATABASE DOCUMENTATION
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(7, "Database Documentation")

    add_section_heading("7.1 Database Architecture & Supabase Configuration")
    add_paragraph(
        "VevahaMatrimony is backed by a managed PostgreSQL 15+ database provisioned through Supabase. "
        "The schema utilizes PostgreSQL native UUIDs, PL/pgSQL stored procedures, automatic timestamp triggers, "
        "JSONB document structures, and comprehensive Row Level Security (RLS) policies. "
        "Database scripts are located in db/schema.sql and auxiliary SQL files in the project root."
    )

    add_section_heading("7.2 Complete Table Catalog")

    # Table 1: profiles
    add_subsection_heading("7.2.1 Table: public.profiles (Master Matrimonial Members)")
    add_paragraph("Stores complete matrimonial profiles for all registered users, linked 1-to-1 with auth.users.")
    prof_cols = [
        ["id", "UUID (PK)", "REFERENCES auth.users(id) ON DELETE CASCADE", "User identity primary key."],
        ["member_id", "TEXT (UNIQUE)", "DEFAULT generate_member_id()", "Human-readable member ID (e.g. VM83920145)."],
        ["full_name", "TEXT", "NOT NULL", "Candidate legal full name."],
        ["gender", "TEXT", "CHECK (Male/Female/Other)", "Candidate gender."],
        ["date_of_birth", "DATE", "NULLable", "Birth date for age & astrological calculations."],
        ["time_of_birth", "TIME", "NULLable", "Birth time for horoscope chart generation."],
        ["place_of_birth", "TEXT", "NULLable", "Birth town/city for planetary lagnam."],
        ["mobile_number", "TEXT", "NULLable", "Contact mobile phone number (masked until unlocked)."],
        ["email_address", "TEXT", "NULLable", "Contact email address."],
        ["marital_status", "TEXT", "DEFAULT 'Never Married'", "Never Married, Divorced, Widowed, Awaiting Divorce."],
        ["education", "TEXT", "NULLable", "Highest degree or qualification."],
        ["employment_status", "TEXT", "NULLable", "Employed, Business, Self-Employed, Not Working."],
        ["annual_income", "TEXT", "NULLable", "Annual income bracket."],
        ["religion", "TEXT", "DEFAULT 'Hindu'", "Religious background."],
        ["caste", "TEXT", "NULLable", "Primary caste community."],
        ["rasi", "TEXT", "NULLable", "Zodiac moon sign for Porutham."],
        ["star", "TEXT", "NULLable", "Nakshatram (27 stars) for Porutham."],
        ["dosham", "TEXT", "NULLable", "Astrological dosham details (Sevvai, Rahu-Ketu, None)."],
        ["profile_photo_path", "TEXT", "NULLable", "Storage path in profile-pictures bucket."],
        ["plan_name", "TEXT", "DEFAULT 'free'", "Active membership plan (free, silver, gold, diamond, vip)."],
        ["plan_expiry_date", "TIMESTAMPTZ", "NULLable", "Expiration timestamp of paid tier."],
        ["is_verified", "BOOLEAN", "DEFAULT false", "True if government KYC verification passed."],
        ["is_blocked", "BOOLEAN", "DEFAULT false", "True if banned or restricted by admin."],
        ["profile_visibility", "TEXT", "DEFAULT 'public'", "public, hidden, or connections_only."],
        ["created_at", "TIMESTAMPTZ", "DEFAULT now()", "Profile creation timestamp."]
    ]
    add_custom_table(["Column Name", "Data Type", "Constraints / Default", "Description"], prof_cols, [1.5, 1.2, 1.8, 2.0])

    # Table 2: offline_members
    add_subsection_heading("7.2.2 Table: public.offline_members (Excel Imported Archive)")
    add_paragraph("Stores offline/historical matrimonial member biodatas imported from Excel archives.")
    off_cols = [
        ["id", "BIGSERIAL (PK)", "PRIMARY KEY", "Internal auto-increment sequence."],
        ["member_id", "TEXT (UNIQUE)", "NOT NULL", "Unique member code from Excel database."],
        ["full_name", "TEXT", "NOT NULL", "Member full name."],
        ["gender", "TEXT", "NULLable", "Male or Female."],
        ["dob", "TEXT", "NULLable", "Date of birth string from Excel."],
        ["age", "TEXT", "NULLable", "Calculated or reported age."],
        ["caste", "TEXT", "NULLable", "Caste and subcaste information."],
        ["rasi", "TEXT", "NULLable", "Zodiac moon sign."],
        ["star", "TEXT", "NULLable", "Nakshatram star."],
        ["phone", "TEXT", "NULLable", "Phone number for admin/call redirection."],
        ["whatsapp", "TEXT", "NULLable", "WhatsApp number for concierge redirection."],
        ["profile_picture_url", "TEXT", "NULLable", "Photo storage URL or static path."],
        ["status", "TEXT", "DEFAULT 'active'", "Profile status (active, archived)."]
    ]
    add_custom_table(["Column Name", "Data Type", "Constraints", "Description"], off_cols, [1.5, 1.2, 1.8, 2.0])

    # Table 3: messages
    add_subsection_heading("7.2.3 Table: public.messages (1-on-1 Member Chats)")
    msg_cols = [
        ["id", "UUID (PK)", "DEFAULT gen_random_uuid()", "Unique message identifier."],
        ["sender_id", "UUID (FK)", "REFERENCES profiles(id) ON DELETE CASCADE", "Sender user ID."],
        ["receiver_id", "UUID (FK)", "REFERENCES profiles(id) ON DELETE CASCADE", "Receiver user ID."],
        ["content", "TEXT", "NOT NULL", "Message text content."],
        ["is_read", "BOOLEAN", "DEFAULT false", "Read receipt status."],
        ["created_at", "TIMESTAMPTZ", "DEFAULT now()", "Timestamp sent."]
    ]
    add_custom_table(["Column Name", "Data Type", "Constraints", "Description"], msg_cols, [1.5, 1.2, 2.0, 1.8])

    # Table 4: requests
    add_subsection_heading("7.2.4 Table: public.requests (Interest Connections)")
    req_cols = [
        ["id", "UUID (PK)", "DEFAULT gen_random_uuid()", "Unique request identifier."],
        ["sender_id", "UUID (FK)", "REFERENCES profiles(id) ON DELETE CASCADE", "Sender user ID."],
        ["receiver_id", "UUID (FK)", "REFERENCES profiles(id) ON DELETE CASCADE", "Target user ID."],
        ["status", "TEXT", "DEFAULT 'pending'", "pending, accepted, rejected, cancelled."],
        ["created_at", "TIMESTAMPTZ", "DEFAULT now()", "Date interest sent."],
        ["updated_at", "TIMESTAMPTZ", "DEFAULT now()", "Date interest accepted/declined."]
    ]
    add_custom_table(["Column Name", "Data Type", "Constraints", "Description"], req_cols, [1.5, 1.2, 2.0, 1.8])

    # Table 5: payments
    add_subsection_heading("7.2.5 Table: public.payments (Transaction History)")
    pay_cols = [
        ["id", "UUID (PK)", "DEFAULT gen_random_uuid()", "Unique payment record ID."],
        ["user_id", "UUID (FK)", "REFERENCES profiles(id) ON DELETE CASCADE", "Paying user ID."],
        ["razorpay_order_id", "TEXT", "NULLable", "Razorpay Order identifier (order_xxxx)."],
        ["razorpay_payment_id", "TEXT", "NULLable", "Razorpay Payment transaction ID (pay_xxxx)."],
        ["razorpay_signature", "TEXT", "NULLable", "Cryptographic signature verifying payment authenticity."],
        ["plan_name", "TEXT", "NOT NULL", "Purchased tier (silver, gold, diamond, vip)."],
        ["amount", "INTEGER", "NOT NULL", "Transaction amount in paise (e.g. 117900 for ₹1,179)."],
        ["currency", "TEXT", "DEFAULT 'INR'", "Currency ISO code."],
        ["status", "TEXT", "DEFAULT 'created'", "created, paid, failed, refunded."],
        ["created_at", "TIMESTAMPTZ", "DEFAULT now()", "Payment timestamp."]
    ]
    add_custom_table(["Column Name", "Data Type", "Constraints", "Description"], pay_cols, [1.6, 1.2, 1.9, 1.8])

    # Table 6: calls
    add_subsection_heading("7.2.6 Table: public.calls (WebRTC Call Tracking)")
    call_cols = [
        ["id", "BIGINT (PK)", "GENERATED ALWAYS AS IDENTITY", "Primary sequence key."],
        ["call_id", "TEXT (UNIQUE)", "NOT NULL", "UUID session identifier for WebRTC handshake."],
        ["caller_id", "UUID (FK)", "REFERENCES auth.users(id) ON DELETE CASCADE", "Initiating user."],
        ["receiver_id", "UUID (FK)", "REFERENCES auth.users(id) ON DELETE CASCADE", "Recipient user."],
        ["call_type", "TEXT", "CHECK (audio, video)", "Call media type."],
        ["status", "TEXT", "DEFAULT 'ringing'", "ringing, connected, ended, rejected, missed."],
        ["duration_seconds", "INTEGER", "NULLable", "Calculated call duration."],
        ["started_at", "TIMESTAMP", "DEFAULT now()", "Call initiation time."],
        ["ended_at", "TIMESTAMP", "NULLable", "Call termination time."]
    ]
    add_custom_table(["Column Name", "Data Type", "Constraints", "Description"], call_cols, [1.5, 1.3, 1.9, 1.8])

    # Table 7: contact_views
    add_subsection_heading("7.2.7 Table: public.contact_views (Contact Unlock Ledger)")
    cv_cols = [
        ["id", "UUID (PK)", "DEFAULT gen_random_uuid()", "Unique unlock ID."],
        ["viewer_id", "UUID (FK)", "REFERENCES auth.users(id) ON DELETE CASCADE", "Member who viewed the contact."],
        ["viewed_id", "TEXT", "NOT NULL", "Target user ID or offline member ID."],
        ["created_at", "TIMESTAMPTZ", "DEFAULT now()", "Timestamp of unlock."],
        ["CONSTRAINT", "UNIQUE", "UNIQUE (viewer_id, viewed_id)", "Prevents double deduction of quota for same profile."]
    ]
    add_custom_table(["Column Name", "Data Type", "Constraints", "Description"], cv_cols, [1.5, 1.2, 1.9, 1.9])

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 8: API AND BACKEND DOCUMENTATION
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(8, "API and Backend Documentation")

    add_section_heading("8.1 Complete REST API Endpoint Directory")
    add_paragraph(
        "The Express.js backend exposes 45+ modular REST endpoints mounted in server.js. "
        "All requests expect and return application/json, except file uploads which accept multipart/form-data."
    )

    api_catalog = [
        # Auth
        ["POST", "/api/auth/send-otp", "Public", "Dispatches 6-digit email OTP via SMTP."],
        ["POST", "/api/auth/verify-otp", "Public", "Verifies email OTP against in-memory cache."],
        ["POST", "/api/auth/register", "Public", "Registers new user in Supabase Auth & creates profiles row."],
        ["POST", "/api/auth/login", "Public", "Authenticates user via email/mobile & password, returns JWT."],
        ["POST", "/api/auth/logout", "Bearer JWT", "Invalidates user session."],
        ["POST", "/api/auth/forgot-password", "Public", "Sends password reset instructions to email."],
        ["POST", "/api/auth/reset-password", "Bearer JWT", "Updates user password in Supabase Auth."],
        # Verification
        ["POST", "/api/verification/verify", "Public", "Verifies Voter ID, Driving License, Passport, or PAN via Surepass."],
        ["POST", "/api/verification/digilocker/initialize", "Public", "Initiates DigiLocker Aadhaar consent flow with Surepass."],
        ["GET", "/api/verification/digilocker/callback", "Public", "Redirect target from DigiLocker receiving client token."],
        ["POST", "/api/verification/esign/initialize", "Public", "Initializes Surepass eSign document signing flow."],
        # Profile
        ["GET", "/api/profile/me", "Bearer JWT", "Fetches logged-in user profile with documents."],
        ["PUT", "/api/profile/me", "Bearer JWT", "Updates user biodata, family, horoscope, partner preferences."],
        ["GET", "/api/profile/stats", "Bearer JWT", "Returns views count, requests count, connection count."],
        ["GET", "/api/profile/public", "Public", "Returns non-blocked, public profiles for landing page."],
        ["GET", "/api/profile/:member_id", "Bearer JWT", "Returns full details for a member, respecting photo privacy."],
        ["POST", "/api/profile/unlock-contact", "Bearer JWT", "Deducts 1 contact quota view & reveals phone number."],
        ["POST", "/api/profile/presence", "Bearer JWT", "Heartbeat endpoint updating user online status."],
        ["DELETE", "/api/profile/me", "Bearer JWT", "Permanently deletes user profile and auth account."],
        # Matches
        ["GET", "/api/matches/recommended", "Bearer JWT", "Returns algorithmic recommendations based on compatibility."],
        ["GET", "/api/matches/preferred", "Bearer JWT", "Returns candidate matches satisfying partner preferences."],
        ["GET", "/api/matches", "Bearer JWT", "Paginated directory of candidate profiles with basic filters."],
        ["GET", "/api/matches/search", "Bearer JWT", "Multi-parameter advanced search across live & offline members."],
        # Requests
        ["POST", "/api/requests/send", "Bearer JWT", "Sends interest request to target member ID."],
        ["POST", "/api/requests/accept", "Bearer JWT", "Accepts incoming pending request, establishing connection."],
        ["POST", "/api/requests/decline", "Bearer JWT", "Declines incoming pending interest request."],
        ["POST", "/api/requests/cancel", "Bearer JWT", "Cancels an outgoing pending interest request."],
        ["GET", "/api/requests/pending", "Bearer JWT", "Returns list of received pending requests."],
        ["GET", "/api/requests/sent", "Bearer JWT", "Returns list of outgoing requests sent by user."],
        ["GET", "/api/requests/connections", "Bearer JWT", "Returns list of mutually accepted connections."],
        # Messages
        ["GET", "/api/messages", "Bearer JWT", "Lists all active conversation threads with latest messages."],
        ["GET", "/api/messages/:member_id", "Bearer JWT", "Retrieves message history between user and target member."],
        ["POST", "/api/messages/send", "Bearer JWT", "Sends message (enforcing plan limit & phone number regex)."],
        # Calls
        ["POST", "/api/calls/initiate", "Bearer JWT", "Validates plan calling quota & initiates ringing session."],
        ["POST", "/api/calls/signal", "Bearer JWT", "Exchanges WebRTC SDP offer/answer and ICE candidates."],
        ["POST", "/api/calls/answer", "Bearer JWT", "Receiver accepts call; status transitions to connected."],
        ["POST", "/api/calls/reject", "Bearer JWT", "Receiver declines call; status transitions to rejected."],
        ["POST", "/api/calls/end", "Bearer JWT", "Terminates call & calculates duration_seconds in database."],
        ["GET", "/api/calls/incoming", "Bearer JWT", "Polls for incoming ringing calls for logged-in user."],
        # Payment & Membership
        ["POST", "/api/payment/create-order", "Bearer JWT", "Creates Razorpay order for Silver/Gold/Diamond/VIP plan."],
        ["POST", "/api/payment/verify", "Bearer JWT", "Verifies Razorpay HMAC signature & upgrades user plan."],
        ["GET", "/api/membership/status", "Bearer JWT", "Returns plan name, expiry date, contact & message limits."],
        # Uploads
        ["POST", "/api/upload/photo", "Bearer JWT", "Streams photo to profile-pictures bucket with watermark."],
        ["POST", "/api/upload/document", "Bearer JWT", "Stores KYC identity document in private documents bucket."],
        ["POST", "/api/upload/horoscope", "Bearer JWT", "Stores jathagam chart image/PDF in horoscopes bucket."],
        # Admin
        ["POST", "/api/upload-database-file", "Admin / Internal", "Uploads Excel workbook (.xlsx) and parses members into DB."],
        # AI
        ["POST", "/ai/chat", "Public", "Bilingual Gemini AI matrimony assistant conversation handler."],
        ["POST", "/horoscopic-ai/chat", "Public", "Gemini AI Vedic astrology compatibility and dosham analyzer."]
    ]
    add_custom_table(["Method", "Endpoint Path", "Access Level", "Functional Description"], api_catalog, [1.0, 2.3, 1.2, 2.0])

    add_section_heading("8.2 Key Request & Response Payloads")
    add_paragraph("Example: Payment Order Creation (POST /api/payment/create-order)")
    add_code_block("""
// Request Body:
{
  "plan": "gold"
}

// Successful Response (200 OK):
{
  "success": true,
  "order_id": "order_OG72hKzLmNxPqR",
  "amount": 235900,
  "currency": "INR",
  "key_id": "rzp_live_xxxxxxxxxxxx",
  "plan": "gold",
  "plan_details": {
    "name": "Gold",
    "contacts": 30,
    "validity_months": 3
  }
}
    """)

    add_paragraph("Example: KYC Document Verification (POST /api/verification/verify)")
    add_code_block("""
// Request Body:
{
  "email": "user@example.com",
  "docType": "passport",
  "docNumber": "MAD066633120126",
  "dob": "2004-09-26"
}

// Successful Response (200 OK):
{
  "success": true,
  "verified": true,
  "data": {
    "full_name": "KAVIN RAJ S",
    "dob": "2004-09-26",
    "file_number": "MAD066633120126",
    "document_type": "passport",
    "verified_at": "2026-10-22T06:15:00.000Z"
  }
}
    """)

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 9: FRONTEND AND UI DOCUMENTATION
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(9, "Frontend and UI Documentation")

    add_section_heading("9.1 Component Hierarchy & Layout Orchestration")
    add_paragraph(
        "The frontend is organized around reusable DOM injection components that maintain consistent "
        "navigation and modal interaction across all 32 HTML views without requiring a JavaScript framework."
    )
    add_bullet("Automatically injects the public branding header, navigation links, and login/register CTAs.", "load-public-navbar.js: ")
    add_bullet("Injects the authenticated member navigation bar with badge counters for messages and requests.", "load-private-navbar.js: ")
    add_bullet("Injects the desktop sidebar menu with quick navigation to Matches, Requests, Messages, and Settings.", "load-sidebar.js: ")
    add_bullet("Injects the mobile bottom navigation dock (Home, Matches, Messages, Profile) for smartphone viewports.", "mobile-bottom-nav.js: ")
    add_bullet("Unified card renderer displaying member photo, Member ID, age, height, caste, job, and action buttons.", "member-card-component.js: ")
    add_bullet("Global modal popup rendering complete candidate biodata, horoscope chart, and contact unlock action.", "full-profile-modal.js: ")
    add_bullet("Live floating popup modal allowing instantaneous member ID or keyword searching across the platform.", "global-search.js: ")
    add_bullet("Persistent bottom-corner floating widget providing instant Gemini-powered bilingual assistance.", "vevaha-ai-widget.js: ")

    add_section_heading("9.2 Design System & Master CSS Palette")
    add_paragraph(
        "All visual presentation is centralized in style.css, leveraging CSS Custom Properties (Variables):"
    )
    css_vars = """
:root {
  --primary: #BE185D;         /* Deep Crimson / Matrimonial Rose */
  --primary-hover: #9D174D;   /* Dark Crimson */
  --secondary: #1E3A8A;       /* Slate / Navy Blue */
  --accent: #D97706;          /* Gold Accent */
  --background: #F8FAFC;      /* Soft Light Gray Canvas */
  --surface: #FFFFFF;         /* White Card Surface */
  --text-primary: #0F172A;    /* Dark Charcoal Heading Text */
  --text-secondary: #475569;  /* Muted Slate Body Text */
  --border: #E2E8F0;          /* Subtle Border Divider */
  --success: #10B981;         /* Emerald Verification Green */
  --danger: #EF4444;          /* Crimson Alert / Decline Red */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}
    """
    add_code_block(css_vars)

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 10: AUTHENTICATION AND SECURITY
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(10, "Authentication and Security")

    add_section_heading("10.1 Defense-in-Depth Security Architecture")
    add_paragraph(
        "VevahaMatrimony implements multiple security layers designed to protect sensitive personal and contact information:"
    )
    add_bullet(
        "New registrations require email verification via a 6-digit cryptographic OTP generated on the server and "
        "stored in an expiring in-memory cache (15-minute validity). Mobile verification incorporates retry throttling.",
        "Dual Verification Handshake: "
    )
    add_bullet(
        "User passwords stored in Supabase are hashed using modern salted bcrypt encryption. Server-side session tokens "
        "are signed JWTs verified using the Supabase Service Key.",
        "Password & Token Protection: "
    )
    add_bullet(
        "All API endpoints under /api/* are monitored by express-rate-limit. The global limiter enforces a maximum "
        "of 1,000 requests per 15-minute window per IP. Auth endpoints (/api/auth/*) enforce a strict threshold "
        "of 50 attempts per 15 minutes to block brute-force password guessing.",
        "Rate Limiting & Anti-Brute-Force: "
    )
    add_bullet(
        "In-app direct messaging contains an active regex inspection engine that detects phone numbers, email addresses, "
        "and external social handles, blocking unverified off-platform contact sharing.",
        "Privacy & Word Filtering: "
    )
    add_bullet(
        "Uploaded member portraits are processed to prevent raw downloading. Photos can be marked hidden by the user "
        "(hide_photo = true), in which case only approved mutual connections can view them.",
        "Photo Watermarking & Privacy: "
    )
    add_bullet(
        "PostgreSQL tables utilize Row Level Security (RLS). Normal users querying through the public API can only "
        "read non-blocked, public profiles. Messages and requests can only be queried by the authenticated sender or receiver.",
        "Database Row Level Security: "
    )

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 11: INSTALLATION AND LOCAL SETUP
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(11, "Installation and Local Setup")

    add_section_heading("11.1 Prerequisites & System Requirements")
    add_bullet("Node.js: Version 20.0.0 LTS or higher (verified on v24.16.0).")
    add_bullet("npm: Version 10.0.0 or higher.")
    add_bullet("Git: Installed and added to system PATH.")
    add_bullet("Database: Active Supabase project (Free or Pro tier).")
    add_bullet("Operating System: Windows 10/11, macOS, or Linux (Ubuntu 20.04/22.04 LTS).")

    add_section_heading("11.2 Step-by-Step Installation Procedure")
    add_paragraph("Execute the following terminal commands in sequence:")
    add_code_block("""
# 1. Clone the repository
git clone https://github.com/vevahamatrimony-website/vevahamatrimony_handover.git
cd vevahamatrimony_handover

# 2. Install production dependencies
npm install

# 3. Create your local environment configuration file
copy .env.example .env     # On Windows PowerShell
cp .env.example .env       # On Linux / macOS

# 4. Configure .env with your Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# 5. Initialize Database Tables in Supabase SQL Editor:
# Copy contents of db/schema.sql and execute in your Supabase Dashboard -> SQL Editor

# 6. Start the local development server
npm run dev                # Starts nodemon with hot-reloading on port 3000
# Alternatively:
node server.js             # Starts standard Node.js server
    """)

    add_paragraph(
        "Once started, verify the server by opening your browser to: http://localhost:3000/health. "
        "You should receive a JSON response with status 'OK' and supabase_url '✅ configured'."
    )

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 12: ENVIRONMENT VARIABLES AND CONFIGURATION
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(12, "Environment Variables and Configuration")

    add_section_heading("12.1 Environment Configuration Catalog")
    add_paragraph(
        "All sensitive application secrets, API tokens, and operational parameters are managed exclusively "
        "via environment variables. The .env file must NEVER be committed to Git (it is strictly excluded in .gitignore)."
    )

    env_table = [
        ["PORT", "Optional (Default: 3000)", "Server HTTP listening port.", "3000"],
        ["NODE_ENV", "Required", "Runtime mode (development / production).", "production"],
        ["FRONTEND_URL", "Required", "Canonical production URL for CORS and redirects.", "https://www.vevahamatrimony.com"],
        ["SUPABASE_URL", "Required", "HTTPS endpoint for Supabase PostgreSQL and Storage.", "https://your-project.supabase.co"],
        ["SUPABASE_ANON_KEY", "Required", "Public anonymous key for client RLS operations.", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."],
        ["SUPABASE_SERVICE_ROLE_KEY", "Required", "Superadmin secret bypassing RLS for server actions.", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."],
        ["RAZORPAY_KEY_ID", "Required for Billing", "Razorpay Public Key for client checkout modal.", "rzp_live_xxxxxxxxxxxx"],
        ["RAZORPAY_KEY_SECRET", "Required for Billing", "Razorpay Secret Key for HMAC signature validation.", "your-razorpay-secret-key"],
        ["SUREPASS_API_TOKEN", "Required for KYC", "Bearer JWT token from console.surepass.app.", "your-surepass-jwt-token"],
        ["SUREPASS_BASE_URL", "Optional", "Base URL for Surepass API (defaults to production).", "https://kyc-api.surepass.app"],
        ["SUREPASS_PASSPORT_URL", "Optional", "Base URL for Surepass Passport OCR & DigiLocker.", "https://kyc.surepass.app"],
        ["SMTP_HOST", "Optional", "SMTP relay server hostname for email OTP dispatch.", "smtp.gmail.com"],
        ["SMTP_PORT", "Optional", "SMTP relay port (587 for TLS, 465 for SSL).", "587"],
        ["SMTP_USER", "Optional", "Authorized sending email address.", "support@vevahamatrimony.com"],
        ["SMTP_PASS", "Optional", "Google Workspace App Password (16 characters).", "xxxx xxxx xxxx xxxx"],
        ["GEMINI_API_KEY", "Optional", "Google AI Gemini API key for bilingual chatbots.", "AIzaSyxxxxxxxxxxxxxxxxx"],
        ["OPENROUTER_API_KEY", "Optional", "OpenRouter API token for AI compatibility insights.", "sk-or-v1-xxxxxxxxxxxx"]
    ]
    add_custom_table(["Variable Identifier", "Requirement", "Technical Purpose", "Safe Example"], env_table, [1.8, 1.3, 2.1, 1.3])

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 13: END-TO-END WORKFLOWS
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(13, "End-to-End Workflows")

    add_section_heading("13.1 User Registration & KYC Verification Workflow")
    add_code_block("""
[User Browser]                 [Express Server]                [Surepass KYC API]          [Supabase DB]
      |                               |                                |                         |
      |-- 1. Fill Register Form ----->|                                |                         |
      |-- 2. Select KYC Doc & Number->|                                |                         |
      |                               |-- 3. POST /api/v1/ocr/passport->|                         |
      |                               |<- 4. Return Name & Status -----|                         |
      |                               |                                |                         |
      |-- 5. Request Email OTP ------>|-- 6. Send SMTP Email --------->|                         |
      |-- 6. Submit OTP Code -------->|-- 7. Verify In-Memory Cache ---|                         |
      |                               |                                |                         |
      |                               |-- 8. Create Auth User ---------------------------------->|
      |                               |-- 9. Insert Profile (is_verified=true) ----------------->|
      |<- 10. Return JWT & MemberID --|                                                          |
    """)

    add_section_heading("13.2 Upgrading Plan & Razorpay Payment Workflow")
    add_code_block("""
[User Browser]                 [Express Server]                [Razorpay Gateway]          [Supabase DB]
      |                               |                                |                         |
      |-- 1. Select Plan (Gold) ----->|                                |                         |
      |                               |-- 2. Create Order (₹2,359) --->|                         |
      |                               |<- 3. Return Order ID (order_xx)|                         |
      |<- 4. Open Checkout Modal -----|                                |                         |
      |                               |                                |                         |
      |-- 5. Pay via UPI/Card ------->|                                |-- Process Payment       |
      |<- 6. Return Payment ID -------|                                |                         |
      |                               |                                |                         |
      |-- 7. Send Signature --------->|                                |                         |
      |                               |-- 8. Verify HMAC-SHA256 -------|                         |
      |                               |-- 9. Update profiles.plan_name='gold' ------------------->|
      |                               |-- 10. Insert payments (status='paid') ------------------>|
      |<- 11. Return Success & Active-|                                                          |
    """)

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 14: ERROR HANDLING AND TROUBLESHOOTING
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(14, "Error Handling and Troubleshooting")

    add_section_heading("14.1 Diagnostic Resolution Matrix")
    diag_table = [
        ["Surepass 400 'Token Corrupted'", "routes/verification.js", "SUREPASS_API_TOKEN contains non-ASCII characters or trailing whitespace.", "Log into console.surepass.app -> Credentials -> copy fresh token -> paste cleanly into .env -> restart server."],
        ["Razorpay Signature Verification Fails", "routes/payment.js", "RAZORPAY_KEY_SECRET in .env does not match Key ID generated in Razorpay Dashboard.", "Confirm test vs live mode in Razorpay Dashboard; ensure exact secret is pasted without spaces."],
        ["Supabase RLS Access Denied (403)", "lib/supabase.js", "Operation attempted using supabase (anon) instead of supabaseAdmin (service_role).", "Use supabaseAdmin for backend data mutations and admin overrides to bypass client RLS."],
        ["EADDRINUSE (Port 3000 Busy)", "server.js", "A dangling Node or Python process is still holding port 3000.", "Run: Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force on Windows, or kill -9 on Linux."],
        ["WebRTC Calling Fails to Connect", "webrtc-call.js", "STUN/TURN server unreachable or ICE candidates blocked by symmetric NAT.", "Ensure public Google STUN servers (stun:stun.l.google.com:19302) are configured in RTCPeerConnection."],
        ["Email OTP Timeout / Failed", "routes/auth.js", "SMTP port 587 blocked by hosting provider or invalid Google App Password.", "Ensure 2-Step Verification is enabled on Google account and generate a 16-character App Password."]
    ]
    add_custom_table(["Observed Error / Symptom", "Affected Subsystem", "Root Cause Analysis", "Verified Corrective Action"], diag_table, [1.5, 1.2, 1.8, 2.0])

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 15: TESTING AND QUALITY ASSURANCE
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(15, "Testing and Quality Assurance")

    add_section_heading("15.1 Current Verification Capabilities")
    add_paragraph(
        "The project includes specialized testing endpoints and harness pages built directly into the codebase:"
    )
    add_bullet("Returns server operational state, version, timestamp, and Supabase connectivity status.", "GET /health: ")
    add_bullet("Returns Gemini AI engine operational state and fallback active status.", "GET /ai/health: ")
    add_bullet("Dedicated sandbox UI for testing all Surepass document verification types with custom payloads.", "test-kyc.html: ")
    add_bullet("Simulated Aadhaar verification sandbox testing the DigiLocker redirection lifecycle.", "mock-digilocker.html: ")
    add_bullet("Simulated electronic signature signing flow testing callback handling.", "mock-esign.html: ")

    add_section_heading("15.2 Recommended Automated Testing Suite")
    add_paragraph(
        "For ongoing development, incoming engineers should implement automated integration tests using Jest and Supertest:"
    )
    add_code_block("""
// Recommended test structure:
// tests/auth.test.js
const request = require('supertest');
const app = require('../server');

describe('Auth API Integration', () => {
  it('GET /health should return 200 OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('OK');
  });

  it('POST /api/auth/send-otp without email should return 400', async () => {
    const res = await request(app).post('/api/auth/send-otp').send({});
    expect(res.statusCode).toEqual(400);
  });
});
    """)

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 16: DEPLOYMENT AND PRODUCTION SETUP
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(16, "Deployment and Production Setup")

    add_section_heading("16.1 Production Hosting Architecture (Hostinger VPS)")
    add_paragraph(
        "VevahaMatrimony is deployed on a Linux VPS (Ubuntu 22.04 LTS) hosted on Hostinger. "
        "The production topology comprises Nginx as a reverse proxy, SSL/TLS certificates issued via Let's Encrypt, "
        "and PM2 as the Node.js process supervisor."
    )

    add_section_heading("16.2 PM2 Process Management Commands")
    add_code_block("""
# Start application under PM2
pm2 start server.js --name "vevahamatrimony"

# Monitor CPU, memory, and performance in real time
pm2 status
pm2 monit

# View live streaming application logs
pm2 logs vevahamatrimony --lines 100

# Zero-downtime reload after code deployment
pm2 reload vevahamatrimony

# Persist PM2 daemon across system reboots
pm2 save
pm2 startup
    """)

    add_section_heading("16.3 Production Nginx Reverse Proxy Configuration")
    add_code_block("""
server {
    server_name vevahamatrimony.com www.vevahamatrimony.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    listen 443 ssl;
    # SSL certificates managed via Certbot / Hostinger SSL
}
    """)

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 17: DEVELOPER MAINTENANCE GUIDE
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(17, "Developer Maintenance Guide")

    add_section_heading("17.1 How to Add a New API Endpoint")
    add_paragraph(
        "Follow this standardized pattern when creating new backend capabilities:"
    )
    add_bullet("Locate the appropriate domain controller in routes/ (e.g. routes/profile.js or create routes/new-feature.js).", "1. Route File: ")
    add_bullet("Import requireAuth from ../middleware/auth if the endpoint requires an authenticated member.", "2. Authentication: ")
    add_bullet("Execute database queries using supabaseAdmin for system operations or supabase for user operations.", "3. Database Query: ")
    add_bullet("Return clean JSON responses with explicit HTTP status codes (200, 400, 401, 403, 404, 500).", "4. Response Formatting: ")
    add_bullet("If creating a new file, mount it in server.js using app.use('/api/new-feature', require('./routes/new-feature')).", "5. Server Mounting: ")

    add_code_block("""
// Standard Controller Template:
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { supabaseAdmin } = require('../lib/supabase');

router.post('/my-endpoint', requireAuth, async (req, res) => {
    try {
        const { param1 } = req.body;
        if (!param1) return res.status(400).json({ success: false, error: 'param1 is required' });

        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({ custom_field: param1 })
            .eq('id', req.userId)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error('API Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
    """)

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 18: CURRENT STATUS, LIMITATIONS, AND FUTURE ROADMAP
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(18, "Current Status, Limitations, and Future Roadmap")

    add_section_heading("18.1 Implementation Status Overview")
    add_paragraph(
        "All core systems required for commercial matrimonial operations are fully implemented and running in production. "
        "The table below clearly separates production-verified capabilities from operational limitations:"
    )
    status_table = [
        ["User Registration & Biodata", "Production Complete", "Multi-step form, photo uploads, marital proof handling."],
        ["Surepass Government KYC", "Production Complete", "Live integration for Voter ID, Driving License, Passport, PAN."],
        ["Vedic Horoscope Engine", "Production Complete", "10 Porutham calculation, Sevvai/Rahu-Ketu dosham analysis."],
        ["Razorpay Payments", "Production Complete", "Live order creation, signature validation, tier provisioning."],
        ["WebRTC Calling", "Production Functional", "Peer-to-peer audio/video calling with HTTP polling signaling."],
        ["Multilingual Engine", "Production Complete", "12-language translation with cross-page cookie persistence."],
        ["In-App Messaging", "Production Functional", "1-on-1 chatting with privacy regex filtering."],
        ["Mobile App (iOS/Android)", "Planned (Phase 2)", "Currently mobile-optimized via responsive web UI."],
        ["Automated SMS Gateway", "Planned (Phase 1)", "Mobile OTP currently falls back to simulated/email OTP relay."]
    ]
    add_custom_table(["Subsystem / Feature", "Implementation Status", "Operational Notes"], status_table, [1.8, 1.6, 3.1])

    add_section_heading("18.2 Three-Phase Development Roadmap")
    add_bullet(
        "Transition WebRTC signaling from HTTP polling to native WebSockets (Socket.io) for sub-second call setup; "
        "integrate Fast2SMS or Twilio for real-time mobile SMS delivery.",
        "Phase 1: Real-Time Communication Upgrade: "
    )
    add_bullet(
        "Develop cross-platform native mobile applications for Android and iOS using Flutter or React Native, "
        "sharing the existing REST API backend.",
        "Phase 2: Native Mobile Application: "
    )
    add_bullet(
        "Train fine-tuned cultural AI matchmaking models taking family values, lifestyle compatibility, and "
        "astrological strengths into holistic weighted scoring.",
        "Phase 3: AI-Enhanced Matchmaking: "
    )

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 19: TECHNICAL REFERENCE AND GLOSSARY
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(19, "Technical Reference and Glossary")

    add_section_heading("19.1 Vedic Astrology Matrimonial Glossary")
    astro_glossary = [
        ["Porutham", "Compatibility test between bride and groom based on planetary positions at birth."],
        ["10 Poruthams", "Dina, Gana, Mahendra, Stree Dheergam, Yoni, Rasi, Rasiyadhipathi, Vasiya, Rajju, Vedha."],
        ["Rajju Porutham", "Most critical Porutham signifying longevity of marital life and husband's well-being."],
        ["Rasi", "Moon sign (Zodiac house) where the Moon was positioned at birth (12 Rasis: Mesham to Meenam)."],
        ["Nakshatram", "Birth star (27 Nakshatrams from Ashwini to Revati), primary anchor for compatibility."],
        ["Lagnam", "Ascendant sign rising on the eastern horizon at the exact time of birth."],
        ["Sevvai Dosham", "Mars affliction occurring when Mars is in houses 2, 4, 7, 8, or 12 from Lagna/Moon."],
        ["Rahu-Ketu Dosham", "Nodal affliction requiring mutual balance between partners' charts."],
        ["Rasi Kattam", "South Indian 12-house square astrological chart representing planetary placements."]
    ]
    add_custom_table(["Astrological Term", "Technical Definition & Significance"], astro_glossary, [1.8, 4.7])

    add_section_heading("19.2 Developer CLI Cheat Sheet")
    add_code_block("""
# Git Operations
git status                          # Check modified and staged files
git pull origin main                # Fetch latest updates from remote repository
git push origin main                # Push verified commits to production repository

# Node.js Application
node server.js                      # Start production backend directly
npm run dev                         # Start with Nodemon file watcher

# Process Management (Linux Server)
pm2 list                            # Check running server processes
pm2 logs vevahamatrimony            # Tail server error and output logs
pm2 reload vevahamatrimony          # Perform zero-downtime rolling restart
    """)

    # ════════════════════════════════════════════════════════════════════════════
    # CHAPTER 20: DEVELOPER HANDOVER CHECKLIST
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(20, "Developer Handover Checklist")

    add_section_heading("20.1 30-Point Master Engineering Handover Checklist")
    add_paragraph(
        "Incoming engineers must verify and sign off on each item before assuming operational ownership:"
    )

    chk_table = [
        ["Category", "Verification Checkpoint", "Status"],
        ["Source Code", "GitHub repository cloned successfully with clean git status", "[  ] Verified"],
        ["Source Code", "Verified master branch matches production release 13c6563 / a6d7b30", "[  ] Verified"],
        ["Environment", "Node.js v20+ LTS verified via node -v", "[  ] Verified"],
        ["Environment", ".env file created from .env.example with zero syntax errors", "[  ] Verified"],
        ["Dependencies", "npm install runs without missing peer dependencies or fatal errors", "[  ] Verified"],
        ["Database", "Supabase PostgreSQL instance accessible via SUPABASE_URL", "[  ] Verified"],
        ["Database", "Master schema executed (profiles, messages, requests, payments)", "[  ] Verified"],
        ["Database", "Storage buckets verified (profile-pictures, documents, horoscopes)", "[  ] Verified"],
        ["Database", "Row Level Security (RLS) policies validated on all 8 tables", "[  ] Verified"],
        ["Security", ".env strictly excluded from Git tracking via .gitignore", "[  ] Verified"],
        ["Security", "Hardcoded API keys verified completely absent from repository code", "[  ] Verified"],
        ["KYC Integration", "Surepass API token active and verified via test-kyc.html", "[  ] Verified"],
        ["KYC Integration", "Voter ID, Driving License, Passport endpoints tested", "[  ] Verified"],
        ["KYC Integration", "DigiLocker Aadhaar consent URL and callback flow verified", "[  ] Verified"],
        ["Payment Gateway", "Razorpay Key ID and Secret configured in .env", "[  ] Verified"],
        ["Payment Gateway", "Order creation tested on /api/payment/create-order", "[  ] Verified"],
        ["Payment Gateway", "HMAC-SHA256 signature verification validated", "[  ] Verified"],
        ["Astrology Engine", "10-Porutham calculation verified across 27 Nakshatrams", "[  ] Verified"],
        ["Astrology Engine", "Rasi Kattam chart generator renders properly in browser", "[  ] Verified"],
        ["Translation", "Google Translate engine verified across all 12 target languages", "[  ] Verified"],
        ["Translation", "Language cookie googtrans persists across page navigation", "[  ] Verified"],
        ["AI Chatbots", "Gemini API key configured and tested on /ai/health", "[  ] Verified"],
        ["AI Chatbots", "Fallback bilingual responses operational when offline", "[  ] Verified"],
        ["WebRTC Calling", "Voice and video calling verified between two test browser sessions", "[  ] Verified"],
        ["WebRTC Calling", "Incoming call listener responds to ringing status", "[  ] Verified"],
        ["Production Server", "Hostinger VPS accessible via SSH with authorized keys", "[  ] Verified"],
        ["Production Server", "PM2 process vevahamatrimony running without restarts", "[  ] Verified"],
        ["Production Server", "Nginx reverse proxy passing traffic with valid HTTPS SSL", "[  ] Verified"],
        ["Production Server", "Static assets and HTML files serving with sub-100ms TTFB", "[  ] Verified"],
        ["Sign-off", "Technical handover completed and verified by incoming lead engineer", "[  ] Signed Off"]
    ]
    add_custom_table(chk_table[0], chk_table[1:], [1.5, 3.8, 1.2])

    output_filename = "Vevaha_Matrimony_Developer_Documentation.docx"
    doc.save(output_filename)
    print(f"Successfully generated master documentation: {output_filename}")
    return output_filename

if __name__ == '__main__':
    create_document()
