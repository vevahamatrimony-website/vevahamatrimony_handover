import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def create_admin_document():
    doc = docx.Document()

    # Standard 1.0 inch margins
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Color Palette
    COLOR_PRIMARY = RGBColor(30, 58, 138)       # #1E3A8A Navy
    COLOR_SECONDARY = RGBColor(190, 24, 93)     # #BE185D Crimson/Rose
    COLOR_DARK = RGBColor(15, 23, 42)           # #0F172A Dark Slate
    COLOR_BODY = RGBColor(51, 65, 85)           # #334155 Slate
    COLOR_MUTED = RGBColor(100, 116, 139)       # #64748B Muted

    HEX_PRIMARY = "1E3A8A"
    HEX_SECONDARY = "BE185D"
    HEX_ALT_ROW = "F8FAFC"
    HEX_LIGHT_GRAY = "E2E8F0"
    HEX_CODE_BG = "F1F5F9"

    # Default typography
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Calibri'
    style_normal.font.size = Pt(10.5)
    style_normal.font.color.rgb = COLOR_BODY
    style_normal.paragraph_format.line_spacing = 1.15
    style_normal.paragraph_format.space_after = Pt(4)

    # XML Helper Functions
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

    # Formatting Builders
    def add_chapter_title(num, title):
        doc.add_page_break()
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(2)
        run_lbl = p.add_run(f"MODULE / SECTION {num}")
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
        run.font.size = Pt(13.5)
        run.font.bold = True
        run.font.color.rgb = COLOR_PRIMARY

    def add_subsection_heading(title):
        h = doc.add_paragraph()
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(4)
        run = h.add_run(title)
        run.font.name = 'Calibri'
        run.font.size = Pt(11.5)
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

    def add_callout(text, title="CRITICAL REQUIREMENT"):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.autofit = False
        tbl.columns[0].width = Inches(6.5)
        cell = tbl.cell(0, 0)
        set_cell_background(cell, "F8FAFC")
        set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
        
        tcPr = cell._tc.get_or_add_tcPr()
        borders = parse_xml(
            f'<w:tcBorders {nsdecls("w")}>\n'
            f'  <w:top w:val="none"/>\n'
            f'  <w:left w:val="single" w:sz="24" w:space="0" w:color="{HEX_SECONDARY}"/>\n'
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
        r_title.font.color.rgb = COLOR_SECONDARY
        r_text = p.add_run(text)
        r_text.font.size = Pt(9.5)
        r_text.font.color.rgb = COLOR_BODY

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
    r_badge = p_pre.add_run("TECHNICAL SPECIFICATION & DEVELOPER IMPLEMENTATION MANUAL")
    r_badge.font.name = 'Calibri'
    r_badge.font.size = Pt(10)
    r_badge.font.bold = True
    r_badge.font.color.rgb = COLOR_SECONDARY

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_after = Pt(8)
    r_title = p_title.add_run("VevahaMatrimony Admin Portal")
    r_title.font.name = 'Calibri'
    r_title.font.size = Pt(28)
    r_title.font.bold = True
    r_title.font.color.rgb = COLOR_PRIMARY

    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(20)
    r_sub = p_sub.add_run("Complete Engineering Guide for Building the Full-Featured Web Admin Dashboard")
    r_sub.font.name = 'Calibri'
    r_sub.font.size = Pt(13)
    r_sub.font.color.rgb = COLOR_MUTED

    p_div = doc.add_paragraph()
    p_div.paragraph_format.space_after = Pt(24)
    r_div = p_div.add_run("―" * 55)
    r_div.font.color.rgb = COLOR_MUTED

    meta_table = [
        ["Document Purpose", "Engineering Specification for Developer Implementation"],
        ["Target System", "VevahaMatrimony Web Application (Node.js Express + Supabase PG)"],
        ["Production URL", "https://vevahamatrimony.com | https://www.vevahamatrimony.com"],
        ["Core Capabilities", "Member CRUD, Offline Account Login Activation, Payment History Dashboard"],
        ["Target Delivery", "Web-based responsive Single Page / Multi-Page Admin Portal"],
        ["Security Standard", "Role-Based Access Control (RBAC), JWT / Service Role Authentication"],
        ["Document Version", "1.0.0 — Final Developer Handover"],
        ["Release Date", "October 2026"]
    ]
    add_custom_table(["Specification Parameter", "Project Details"], meta_table, [2.5, 4.0])

    p_cov_note = doc.add_paragraph()
    p_cov_note.paragraph_format.space_before = Pt(30)
    r_note = p_cov_note.add_run(
        "Notice to Developers: This engineering specification outlines the exact requirements, UI screens, "
        "data schemas, API contracts, and edge cases necessary to build the VevahaMatrimony Administration Portal. "
        "Developers are expected to follow this document to build the portal end-to-end without requiring manual walkthroughs."
    )
    r_note.font.size = Pt(8.5)
    r_note.font.italic = True
    r_note.font.color.rgb = COLOR_MUTED

    # ════════════════════════════════════════════════════════════════════════════
    # TABLE OF CONTENTS
    # ════════════════════════════════════════════════════════════════════════════
    doc.add_page_break()
    p_toc_head = doc.add_paragraph()
    p_toc_head.paragraph_format.space_after = Pt(14)
    r_toc = p_toc_head.add_run("Table of Contents")
    r_toc.font.size = Pt(20)
    r_toc.font.bold = True
    r_toc.font.color.rgb = COLOR_PRIMARY

    toc_items = [
        ("Section 1", "Executive Summary & Project Scope", "High-level goals, key business requirements, and operational context"),
        ("Section 2", "Admin Architecture & Security Model", "Admin authentication, session guard, RBAC, and access control"),
        ("Section 3", "Admin Dashboard & Overview Metrics", "KPI counters, real-time platform statistics, and quick action bar"),
        ("Section 4", "Member Management (Complete CRUD)", "Full profile viewer, search filters, editing biodata, and deletion/ban"),
        ("Section 5", "Offline Member Login Provisioning", "Core Feature: Activating offline members with Email/Mobile login & temp password"),
        ("Section 6", "Payment & Financial Ledger Dashboard", "Razorpay transaction inspector, status filters, manual upgrades, and Excel export"),
        ("Section 7", "KYC & Identity Verification Center", "Moderating Voter ID, DL, Passport, PAN, and DigiLocker documents"),
        ("Section 8", "API Contract & Backend Endpoints", "Complete specification of new Express / Supabase endpoints for admin actions"),
        ("Section 9", "Database Migrations & Helper Functions", "Required SQL schema adjustments and atomic activation stored procedures"),
        ("Section 10", "UI/UX Layout & Component Wireframes", "Visual layout, navigation bar, modals, notifications, and styling guidelines"),
        ("Section 11", "Implementation Plan & Acceptance Checklist", "Phase-by-phase delivery milestones and developer QA sign-off criteria")
    ]
    add_custom_table(["Section", "Module Title", "Summary of Deliverables"], toc_items, [1.1, 2.5, 2.9])

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 1: EXECUTIVE SUMMARY & PROJECT SCOPE
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(1, "Executive Summary & Project Scope")

    add_section_heading("1.1 Purpose of the Admin Portal")
    add_paragraph(
        "VevahaMatrimony is an established matrimonial platform serving South Indian and Tamil families worldwide. "
        "The platform currently operates with an Express.js backend and a Supabase PostgreSQL database. While the customer-facing "
        "website is fully functional, platform administrators currently lack a dedicated visual control center to monitor "
        "and govern daily operations."
    )
    add_paragraph(
        "The primary goal of this development initiative is to build a modern, high-performance, responsive **Administration Portal** "
        "that empowers administrators to manage all member profiles, convert offline imported members into active digital users with login credentials, "
        "audit payment transactions, and oversee government KYC verifications from a unified interface."
    )

    add_section_heading("1.2 The Three Critical Business Pillars")
    add_bullet(
        "Administrators must be able to search, view full profiles (including family, astrology, contact details, documents), "
        "edit any attribute, create new members manually, and block/unblock or delete accounts.",
        "1. Complete Profile Management (CRUD): "
    )
    add_bullet(
        "Hundreds of historical profiles are currently stored in the offline_members table from Excel uploads without digital login capability. "
        "Administrators must be able to click an offline member, assign an email and temporary password, or if no email exists, "
        "automatically provision a mobile-number-based login with a temporary password so the member can log in and use the website.",
        "2. Offline Member Login Activation: "
    )
    add_bullet(
        "Administrators must have complete visibility over all financial transactions processed through Razorpay, "
        "including order IDs, payment IDs, customer identity, membership tier purchased, amount in INR, transaction status, "
        "and the ability to manually assign or extend plan durations for offline bank payments.",
        "3. Financial & Payment Ledger: "
    )

    add_section_heading("1.3 Technology Stack Expectations")
    add_paragraph(
        "The developer may implement the Admin Portal using any modern, professional web stack that integrates cleanly with the "
        "existing Node.js / Express backend and Supabase PostgreSQL instance:"
    )
    add_bullet("Node.js (>=20 LTS) with Express.js router mounted at /api/admin/* (code within current repository).", "Backend Framework: ")
    add_bullet("Supabase PostgreSQL Client (@supabase/supabase-js) using the service_role key to bypass client RLS.", "Database Interface: ")
    add_bullet("Responsive modern web UI. Recommended: Tailwind CSS / Bootstrap 5 / AdminLTE / React / Vue, served as static files or SPA.", "Frontend Architecture: ")
    add_bullet("Export to Excel (.xlsx) using exceljs or xlsx libraries for financial and member reporting.", "Export Capabilities: ")

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 2: ADMIN ARCHITECTURE & SECURITY MODEL
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(2, "Admin Architecture & Security Model")

    add_section_heading("2.1 Admin Portal URL & Access Structure")
    add_paragraph(
        "The Admin Portal must be isolated from public member navigation. The developer will establish the following routing structure:"
    )
    add_bullet("Public login gate for administrators. Requires email/username and password.", "Login Route: /admin/login.html (or /admin/login)")
    add_bullet("Authenticated control center dashboard with navigation bar and sidebar.", "Main Portal: /admin/index.html (or /admin/dashboard)")
    add_bullet("Dedicated management view with tabs for Live Members and Offline Archive.", "Members View: /admin/members.html")
    add_bullet("Dedicated transaction ledger with date filters and revenue summaries.", "Payments View: /admin/payments.html")
    add_bullet("Document review and verification approval workspace.", "KYC Review: /admin/kyc.html")

    add_section_heading("2.2 Authentication & Authorization Guard")
    add_paragraph(
        "The admin system must be guarded by strict server-side authorization. Do NOT rely solely on client-side hiding of buttons:"
    )
    add_bullet(
        "Admin users are flagged in the database with a boolean column is_admin = true (or in a dedicated admin_users table).",
        "Admin Identity: "
    )
    add_bullet(
        "Upon successful login via POST /api/admin/auth/login, the server returns an admin JWT containing { role: 'admin', userId: '...' }. "
        "The client stores this token in sessionStorage (admin_token) or as a secure HttpOnly cookie.",
        "Session Token: "
    )
    add_bullet(
        "A dedicated Express middleware requireAdmin must intercept every request under /api/admin/*. "
        "It validates the JWT, verifies the admin privilege in Supabase, and returns 403 Forbidden if not authorized.",
        "Server Middleware: "
    )
    add_bullet(
        "Client pages must include an admin-guard.js script in the <head> that immediately redirects unauthorized users to /admin/login.html.",
        "Frontend Guard: "
    )

    add_code_block("""
// Recommended Middleware: middleware/adminAuth.js
const { supabaseAdmin } = require('../lib/supabase');

async function requireAdmin(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Unauthorized admin access' });
        }
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) return res.status(401).json({ success: false, error: 'Invalid admin session' });

        // Verify is_admin flag in profiles table
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile || profile.is_admin !== true) {
            return res.status(403).json({ success: false, error: 'Access denied: Administrator privileges required' });
        }

        req.adminUser = user;
        next();
    } catch (err) {
        res.status(500).json({ success: false, error: 'Admin authorization failed' });
    }
}

module.exports = { requireAdmin };
    """)

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 3: ADMIN DASHBOARD & OVERVIEW METRICS
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(3, "Admin Dashboard & Overview Metrics")

    add_section_heading("3.1 Key Performance Indicator (KPI) Cards")
    add_paragraph(
        "When an administrator logs into the portal, the main dashboard screen must present a high-level summary "
        "of real-time platform statistics loaded via GET /api/admin/metrics:"
    )

    kpi_table = [
        ["Total Live Members", "Count of all active records in public.profiles", "Dynamic count from DB"],
        ["Total Offline Archive", "Count of all records in public.offline_members", "Dynamic count from DB"],
        ["Activated Offline Accounts", "Count of offline members migrated to active profiles", "Tracks digital onboarding conversion"],
        ["Paid Subscribers", "Count of members on Silver, Gold, Diamond, or VIP plans", "Active revenue generators"],
        ["Gross Revenue (INR)", "Sum of all amount in public.payments where status = 'paid'", "Displayed in INR (e.g. ₹1,42,500)"],
        ["Pending KYC Reviews", "Count of profiles where is_verified = false and documents uploaded", "Immediate action items"],
        ["Today's New Signups", "Count of profiles created on the current date", "Daily growth velocity"]
    ]
    add_custom_table(["Metric Display Card", "Technical Data Source", "Business Value"], kpi_table, [1.8, 2.5, 2.2])

    add_section_heading("3.2 Quick Action Center")
    add_paragraph("The dashboard header must feature high-priority quick action buttons:")
    add_bullet("Opens modal to manually input a complete member biodata.", "Add New Member: ")
    add_bullet("Navigates to the offline member activation workspace.", "Provision Offline Member: ")
    add_bullet("Jumps directly to the transaction audit table.", "View Payments: ")
    add_bullet("Generates a comprehensive Excel export of all members or recent financial transactions.", "Export Report: ")

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 4: MEMBER MANAGEMENT (COMPLETE CRUD)
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(4, "Member Management (Complete CRUD)")

    add_section_heading("4.1 Dual-Tab Member Directory")
    add_paragraph(
        "The Member Management workspace must provide two clearly separated tabs:"
    )
    add_bullet(
        "Displays digital members registered on the site (table public.profiles). Features plan tier badges, "
        "verification checkmarks, online presence status, and full CRUD controls.",
        "Tab 1: Live Registered Members: "
    )
    add_bullet(
        "Displays records imported from historical spreadsheets (table public.offline_members). Features an active "
        "'Activate Login' button next to each unactivated member.",
        "Tab 2: Offline Member Archive: "
    )

    add_section_heading("4.2 Advanced Search & Filter Bar")
    add_paragraph("The table header must include an instantaneous multi-parameter search bar:")
    add_bullet("Search query matching: Member ID (e.g. VM83920145), Full Name, Phone Number, Email, City.", "Keyword Search: ")
    add_bullet("Filter dropdown: All, Male, Female.", "Gender Filter: ")
    add_bullet("Filter dropdown: All, Free, Silver, Gold, Diamond, VIP.", "Plan Tier Filter: ")
    add_bullet("Filter dropdown: All, Verified (Govt KYC), Pending Verification.", "Verification Filter: ")
    add_bullet("Filter dropdown: All, Active, Suspended / Blocked.", "Status Filter: ")
    add_bullet("Sort by: Date Registered (Newest/Oldest), Member ID, Name, Plan Expiry Date.", "Sorting: ")

    add_section_heading("4.3 Comprehensive Profile Detail Viewer (Read Operation)")
    add_paragraph(
        "Clicking 'View Profile' or a table row must open a comprehensive modal or dedicated detail screen "
        "rendering all 85+ fields organized into logical sections:"
    )
    add_bullet("Member ID, Registered On Behalf Of, Full Name, Gender, DOB, Age, Place of Birth, Time of Birth.", "Basic Identity: ")
    add_bullet("Height, Weight, Body Type, Skin Tone, Physical Disability status.", "Physical Attributes: ")
    add_bullet("Marital Status, Number of Children, Children Living Status, Divorce Decree/Death Certificate links.", "Marital History: ")
    add_bullet("Highest Education, College/Institute, Employment Status, Job Title, Annual Income, Company.", "Education & Career: ")
    add_bullet("House/Street, Locality, City, State, Pin Code, Native Town, Phone Number, Email.", "Contact & Address: ")
    add_bullet("Father Name & Occupation, Mother Name & Occupation, Brothers/Sisters count, Family Values.", "Family Background: ")
    add_bullet("Religion, Caste, Subcaste, Gotra, Rasi, Nakshatram Star, Lagnam, Sevvai/Rahu-Ketu Dosham, Jathagam chart.", "Astrology & Horoscope: ")
    add_bullet("Preferred Age range, Height range, Education, Caste, Location, Eating/Drinking habits.", "Partner Preferences: ")
    add_bullet("High-resolution photo gallery, Aadhaar, Voter ID, Driving License, Passport, PAN cards.", "Uploaded Documents: ")
    add_bullet("Plan Name, Expiration Date, Contact Unlocks Remaining, Daily Messages Remaining.", "Membership Quotas: ")

    add_section_heading("4.4 Full Profile Modification (Update Operation)")
    add_paragraph(
        "Administrators must have full authority to edit any field in the profile to correct typos, update contact info, "
        "or adjust astrological data reported by members:"
    )
    add_bullet("Modal form allowing editing of any personal, family, astrological, or contact field.", "Edit Biodata Form: ")
    add_bullet("Instant toggle switch allowing administrator to manually grant or revoke the green 'KYC Verified' badge.", "Verification Toggle: ")
    add_bullet("Instant toggle switch to suspend/ban an abusive member (sets is_blocked = true, preventing login).", "Account Block Toggle: ")
    add_bullet("Dropdown allowing administrator to manually set a member's plan (e.g. upgrading to Gold for 3 months).", "Plan Override: ")

    add_section_heading("4.5 Member Creation & Deletion (Create & Delete Operations)")
    add_bullet(
        "Admin can click 'Add Member' to open a complete creation form. The server creates an auth user in Supabase, "
        "generates a unique VM######## member ID, and inserts the profile record.",
        "Manual Creation: "
    )
    add_bullet(
        "Admin can delete a profile. The system prompts with a two-step confirmation modal ('Type DELETE to confirm'). "
        "Supports soft deletion (status = 'archived') or complete hard deletion (cascading auth user and profile).",
        "Deletion / Archival: "
    )

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 5: OFFLINE MEMBER LOGIN PROVISIONING
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(5, "Offline Member Login Provisioning")

    add_callout(
        "CRITICAL REQUIREMENT: Offline members uploaded from Excel archives (public.offline_members) currently DO NOT "
        "have credentials in auth.users and therefore cannot log in. The Admin Panel MUST provide an automated, "
        "one-click provisioning workflow allowing administrators to assign login access using Email or Mobile Number.",
        "CORE FEATURE SPECIFICATION"
    )

    add_section_heading("5.1 Problem Statement & Architectural Context")
    add_paragraph(
        "In the existing database, offline members are stored in public.offline_members with a member_id (e.g., VM92010372), "
        "full_name, phone, whatsapp, caste, rasi, and other biodata fields. However, Supabase authentication requires an entry "
        "in the auth.users table linked to a primary record in public.profiles. "
        "Currently, these members cannot access the website, view interest requests, or use messaging."
    )

    add_section_heading("5.2 The 'Activate / Assign Login' Step-by-Step Workflow")
    add_paragraph(
        "The developer must build the following workflow into the Offline Members tab in the Admin Panel:"
    )

    add_subsection_heading("Step 1: Admin Triggers Activation")
    add_paragraph(
        "In the Offline Members table, each row features a prominent button: **'Activate Login / Assign Account'** "
        "(or 'Manage Credentials' if already activated)."
    )

    add_subsection_heading("Step 2: Modal Inspection & Input Dialog")
    add_paragraph(
        "Clicking the button opens an activation modal pre-filled with the member's existing information:"
    )
    add_bullet("Member ID (read-only, e.g. VM92010372)", "Member ID: ")
    add_bullet("Full Name (read-only, e.g. K. Rajesh)", "Candidate Name: ")
    add_bullet("Phone Number (pre-filled from offline_members.phone)", "Mobile Number: ")
    add_bullet("Input field pre-filled if available in offline record; otherwise empty.", "Email Address: ")
    add_bullet(
        "Auto-generated strong temporary password (e.g. Vevaha@2026 or a random 8-character string). "
        "Features a 'Regenerate' button and an 'Edit' field so the admin can customize it.",
        "Temporary Password: "
    )
    add_bullet("Dropdown to assign an initial plan (default: 'free', or optional promotional 'silver').", "Initial Membership Plan: ")

    add_subsection_heading("Step 3: Handling Missing Email (Mobile-First Fallback Logic)")
    add_paragraph(
        "A critical real-world reality of matrimonial records in India is that many parents or offline candidates "
        "provide only a mobile phone number and do not have an active email address. The system MUST support login for these users:"
    )
    add_bullet(
        "If an email address is provided by the admin, the account is created with that email.",
        "Case A — Email Available: "
    )
    add_bullet(
        "If NO email is provided, the backend automatically generates a deterministic synthetic email based on their verified phone number: "
        "e.g. mobile9876543210@vevahamatrimony.local (or ${cleanPhone}@vevaha.internal). "
        "The frontend login page will allow the user to type their 10-digit mobile number OR their email address into the username field! "
        "When the user types a 10-digit mobile number, the login endpoint automatically translates it to their account email or authenticates them directly.",
        "Case B — Mobile Number Only (No Email): "
    )

    add_subsection_heading("Step 4: Server-Side Atomic Migration")
    add_paragraph(
        "When the admin clicks 'Confirm & Activate Account', the client dispatches a POST request to: "
        "/api/admin/offline/provision-login. The backend executes the following atomic operations using supabaseAdmin:"
    )
    add_bullet(
        "Calls supabaseAdmin.auth.admin.createUser({ email, password: tempPassword, email_confirm: true }). "
        "This creates the authenticated user and generates a UUID.",
        "1. Create Auth User: "
    )
    add_bullet(
        "Inserts a new record into public.profiles with id = newAuthUser.id and member_id = offlineMember.member_id. "
        "Copies over all biodata (full_name, gender, DOB, height, education, occupation, caste, rasi, star, phone, photos).",
        "2. Populate Profile: "
    )
    add_bullet(
        "Updates public.offline_members record setting status = 'activated' and auth_user_id = newAuthUser.id.",
        "3. Mark Offline Record: "
    )

    add_subsection_heading("Step 5: Generated Credential Notification Card")
    add_paragraph(
        "Upon successful activation, the modal transitions into a **'Login Credentials Ready'** summary card with one-click copy buttons:"
    )
    add_code_block("""
+---------------------------------------------------------------------------------------+
|                             ACCOUNT ACTIVATED SUCCESSFULLY                            |
+---------------------------------------------------------------------------------------+
|  Member ID:          VM92010372                                                       |
|  Candidate:          K. Rajesh                                                        |
|  Login Username:     9876543210 (or rajesh@gmail.com)                                |
|  Temporary Password: Vevaha@2026                                                      |
|  Login URL:          https://vevahamatrimony.com/login.html                           |
+---------------------------------------------------------------------------------------+
|  [Copy Credentials]   [Send WhatsApp Template]   [Send Email Notification]   [Close]  |
+---------------------------------------------------------------------------------------+
    """)

    add_paragraph(
        "The 'Send WhatsApp Template' button generates a pre-formatted wa.me URL allowing the admin to send "
        "the welcome credentials directly to the candidate's phone in one click!"
    )

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 6: PAYMENT & FINANCIAL LEDGER DASHBOARD
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(6, "Payment & Financial Ledger Dashboard")

    add_section_heading("6.1 Financial Audit & Transaction Table")
    add_paragraph(
        "The Payments workspace provides administrators with a comprehensive financial ledger of every transaction "
        "attempted or completed on the platform (stored in public.payments):"
    )

    pay_ledger_cols = [
        ["Payment ID", "UUID / Razorpay payment ID (pay_xxxx)", "Unique transaction reference."],
        ["Order ID", "Razorpay order reference (order_xxxx)", "Corresponds to checkout session."],
        ["Member Info", "Member ID (VM########) & Full Name", "Clickable link opening member drawer."],
        ["Plan Tier", "Silver / Gold / Diamond / VIP", "Badge styled with tier color."],
        ["Gross Amount", "Amount in INR (e.g. ₹2,359.00)", "Converted from database paise (amount / 100)."],
        ["Payment Status", "paid, created, failed, refunded", "Green (paid), Yellow (created), Red (failed)."],
        ["Payment Method", "UPI, Netbanking, Credit Card, Debit Card", "Reported by Razorpay webhook."],
        ["Transaction Date", "Formatted date & time (DD/MM/YYYY hh:mm A)", "Timestamp of transaction."]
    ]
    add_custom_table(["Ledger Column", "Field Data", "Description"], pay_ledger_cols, [1.5, 2.5, 2.5])

    add_section_heading("6.2 Financial Filters & Aggregate Summaries")
    add_paragraph("Above the ledger, the developer must display summary metric cards:")
    add_bullet("Total gross revenue collected across all paid transactions.", "Total Lifetime Revenue: ")
    add_bullet("Gross revenue collected within the currently selected month.", "Monthly Revenue (MTD): ")
    add_bullet("Count of successful paid orders vs abandoned/failed orders.", "Success Rate & Count: ")
    add_bullet("Filter by: All Time, Today, This Week, This Month, Custom Date Range.", "Date Range Picker: ")
    add_bullet("Filter by: Silver (₹1,179), Gold (₹2,359), Diamond (₹4,719), VIP (₹58,999).", "Plan Tier Filter: ")

    add_section_heading("6.3 Manual Plan Assignment (Offline Payment Handling)")
    add_paragraph(
        "Many customers in India prefer to pay via direct Google Pay / PhonePe UPI transfer to the owner's phone or "
        "direct bank deposit. The Admin Panel MUST include a **'Record Manual Payment / Grant Plan'** button:"
    )
    add_bullet("Admin selects member by Member ID or Name.", "1. Member Lookup: ")
    add_bullet("Admin chooses plan (Silver, Gold, Diamond, or VIP).", "2. Plan Selection: ")
    add_bullet("Admin inputs payment note (e.g., 'GPay UPI ref #839201948 received by office').", "3. Payment Reference: ")
    add_bullet(
        "Server updates profiles.plan_name, calculates plan_expiry_date (1/3/6/12 months from now), and inserts a record "
        "into public.payments with method = 'manual_admin' and status = 'paid'.",
        "4. Database Update: "
    )

    add_section_heading("6.4 Export to Excel (.xlsx / CSV)")
    add_paragraph(
        "The developer must implement a one-click 'Export Transactions to Excel' button. "
        "The server streams a cleanly formatted workbook containing all filtered transactions with tax breakdowns "
        "(Base Amount + 18% GST) suitable for accounting and tax filing."
    )

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 7: KYC & IDENTITY VERIFICATION CENTER
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(7, "KYC & Identity Verification Center")

    add_section_heading("7.1 Moderation Queue")
    add_paragraph(
        "Trust is the cornerstone of VevahaMatrimony. The KYC Verification Center allows administrators to review "
        "members who have submitted identity documents (Voter ID, Driving License, Passport, PAN, or DigiLocker Aadhaar):"
    )
    add_bullet("List of candidates whose verification requires manual confirmation or whose automated Surepass score was marginal.", "Pending Queue: ")
    add_bullet("Side-by-side comparison of candidate full name & DOB vs name returned by the government authority.", "Data Matching: ")
    add_bullet("In-browser document viewer allowing inspection of uploaded PDF/JPG documents with zoom controls.", "Document Viewer: ")
    add_bullet("Clicking 'Approve' sets is_verified = true on profiles, displaying the green verification badge on their public profile.", "One-Click Approve: ")
    add_bullet("Clicking 'Reject' allows admin to input a rejection note (e.g., 'Document blurry, please re-upload') sent to user.", "Reject with Reason: ")

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 8: API CONTRACT & BACKEND ENDPOINTS
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(8, "API Contract & Backend Endpoints")

    add_section_heading("8.1 Endpoint Catalog for Developer Implementation")
    add_paragraph(
        "The developer must implement the following RESTful API endpoints in a new route module routes/admin.js "
        "mounted at /api/admin in server.js:"
    )

    admin_endpoints = [
        ["POST", "/api/admin/auth/login", "Public", "Authenticates admin credentials; returns admin JWT."],
        ["GET", "/api/admin/metrics", "Admin JWT", "Returns aggregate counters (total members, revenue, pending KYC)."],
        ["GET", "/api/admin/members", "Admin JWT", "Paginated directory of live members with multi-parameter filters."],
        ["GET", "/api/admin/members/:id", "Admin JWT", "Retrieves complete 85-field profile detail including document paths."],
        ["POST", "/api/admin/members", "Admin JWT", "Manually registers a new member with full biodata."],
        ["PUT", "/api/admin/members/:id", "Admin JWT", "Updates any profile field, plan, or verification badge."],
        ["DELETE", "/api/admin/members/:id", "Admin JWT", "Permanently deletes or archives a member profile."],
        ["GET", "/api/admin/offline-members", "Admin JWT", "Paginated list of offline members with activation status."],
        ["POST", "/api/admin/offline/provision-login", "Admin JWT", "CORE: Creates auth account and migrates offline member to active profile."],
        ["GET", "/api/admin/payments", "Admin JWT", "Paginated transaction ledger with date/plan/status filters."],
        ["POST", "/api/admin/payments/manual-grant", "Admin JWT", "Manually assigns paid tier for offline cash/UPI payments."],
        ["GET", "/api/admin/payments/export", "Admin JWT", "Generates and downloads Excel workbook (.xlsx) of transactions."],
        ["POST", "/api/admin/kyc/:id/approve", "Admin JWT", "Sets is_verified = true and logs admin approval."],
        ["POST", "/api/admin/kyc/:id/reject", "Admin JWT", "Sets is_verified = false and dispatches rejection notice."]
    ]
    add_custom_table(["Method", "Endpoint Path", "Security", "Functional Purpose"], admin_endpoints, [1.0, 2.5, 1.1, 1.9])

    add_section_heading("8.2 Core Endpoint Payload Specifications")

    add_subsection_heading("Endpoint: POST /api/admin/offline/provision-login")
    add_paragraph("Payload to activate an offline member with email or mobile fallback:")
    add_code_block("""
// Request Payload:
{
  "offline_member_id": "VM92010372",
  "email": "rajesh@gmail.com",           // Optional: If empty, mobile number is used
  "mobile_number": "9876543210",         // Required: 10-digit phone
  "temp_password": "Vevaha@2026",        // Temporary password
  "initial_plan": "free",                 // free, silver, gold, diamond, vip
  "send_notification": true              // If true, trigger SMS / Email
}

// Successful Response (200 OK):
{
  "success": true,
  "message": "Offline member successfully activated with digital credentials",
  "data": {
    "member_id": "VM92010372",
    "auth_user_id": "a82f10b4-5231-4a11-8912-32bca98101ef",
    "login_identifier": "9876543210",
    "account_email": "rajesh@gmail.com",  // or mobile9876543210@vevahamatrimony.local
    "temp_password": "Vevaha@2026",
    "plan_name": "free",
    "activated_at": "2026-10-29T10:30:00.000Z"
  }
}
    """)

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 9: DATABASE MIGRATIONS & HELPER FUNCTIONS
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(9, "Database Migrations & Helper Functions")

    add_section_heading("9.1 Required SQL Migration Script")
    add_paragraph(
        "To support admin authentication and offline account linking, the developer must execute the following SQL "
        "statements in the Supabase SQL Editor:"
    )
    add_code_block("""
-- 1. Add admin flag to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for fast admin lookup
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);

-- 2. Add auth_user_id and activation tracking to offline_members table
ALTER TABLE public.offline_members
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS temp_password_note TEXT;

-- Index for searching activated vs unactivated offline members
CREATE INDEX IF NOT EXISTS idx_offline_auth_user_id ON public.offline_members(auth_user_id);

-- 3. Designate the first administrator account (replace with your admin email)
UPDATE public.profiles
SET is_admin = true
WHERE email_address = 'support@vevahamatrimony.com';
    """)

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 10: UI/UX LAYOUT & COMPONENT WIREFRAMES
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(10, "UI/UX Layout & Component Wireframes")

    add_section_heading("10.1 Desktop Portal Layout Wireframe")
    add_paragraph(
        "The developer should create a clean, responsive admin layout featuring a collapsible dark slate sidebar "
        "and a light canvas workspace:"
    )
    add_code_block("""
+---------------------------------------------------------------------------------------+
|  [VEVAHA LOGO]  ADMIN PORTAL           [Search Member ID...]        [Admin Profile v]  |
+-------------------+-------------------------------------------------------------------+
|  [Dashboard]      |  DASHBOARD OVERVIEW                                               |
|  [Live Members]   |  +--------------+  +--------------+  +--------------+  +--------+ |
|  [Offline Archive]|  | Total Members|  | Offline Docs |  | Total Revenue|  | Pending| |
|  [Payments & Rev] |  |    1,420     |  |     850      |  |  ₹1,84,500   |  |   12   | |
|  [KYC Review]     |  +--------------+  +--------------+  +--------------+  +--------+ |
|  [Settings]       |                                                                   |
|                   |  RECENT MEMBER REGISTRATIONS & ACTIVATIONS                        |
|  -----------------|  +------------+---------------+----------+--------+-------------+|
|  [Logout]         |  | Member ID  | Candidate     | Phone    | Plan   | Actions     ||
|                   |  +------------+---------------+----------+--------+-------------+|
|                   |  | VM92010372 | K. Rajesh     | 98765... | Gold   | [View] [Edit||
|                   |  | VM83920145 | P. Janani     | 94432... | Free   | [View] [Edit||
|                   |  | VM74019284 | M. Karthik    | 88701... | Silver | [View] [Edit||
|                   |  +------------+---------------+----------+--------+-------------+|
+-------------------+-------------------------------------------------------------------+
    """)

    add_section_heading("10.2 Styling Guidelines")
    add_bullet("Modern sans-serif typography: Inter, Poppins, or Segoe UI.", "Font Family: ")
    add_bullet("Sidebar: #0F172A (Dark Slate); Cards: #FFFFFF; Background: #F8FAFC.", "Color Palette: ")
    add_bullet("Paid: Green (#10B981); Free: Gray (#64748B); Blocked: Red (#EF4444); Pending: Amber (#F59E0B).", "Status Badges: ")
    add_bullet("Every destructive action (blocking user, deleting profile) must trigger a confirmation dialog.", "Destructive Actions: ")

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 11: IMPLEMENTATION PLAN & ACCEPTANCE CHECKLIST
    # ════════════════════════════════════════════════════════════════════════════
    add_chapter_title(11, "Implementation Plan & Acceptance Checklist")

    add_section_heading("11.1 Five-Phase Developer Implementation Plan")
    plan_table = [
        ["Phase 1: Setup & Admin Auth", "3 - 5 Days", "Database migration (is_admin flag), admin login page, JWT authorization middleware, dashboard layout shell."],
        ["Phase 2: Member CRUD", "4 - 6 Days", "Unified member directory, live vs offline tabs, search/filters, full profile drawer/modal, editing form, block/delete."],
        ["Phase 3: Offline Login Activation", "3 - 5 Days", "CORE FEATURE: Activation modal, email input, mobile-first fallback generator, atomic profile migration, credentials card."],
        ["Phase 4: Payment Dashboard", "3 - 4 Days", "Razorpay payments ledger, revenue metric cards, date filters, manual plan grant modal, Excel export streaming."],
        ["Phase 5: KYC Center & Polish", "2 - 3 Days", "KYC moderation queue, document viewer, approve/reject triggers, mobile responsive testing, deployment to server."]
    ]
    add_custom_table(["Development Milestone", "Estimated Time", "Key Deliverables"], plan_table, [1.8, 1.2, 3.5])

    add_section_heading("11.2 Master Acceptance Criteria Checklist")
    add_paragraph("The developer's work will be validated against this 20-point sign-off checklist:")

    checklist_items = [
        ["Admin Auth", "Unauthorized users cannot access any /admin page or /api/admin endpoint", "[  ] Verified"],
        ["Admin Auth", "Admin session automatically times out after inactivity", "[  ] Verified"],
        ["Member CRUD", "Admin can view all registered members with accurate plan badges", "[  ] Verified"],
        ["Member CRUD", "Clicking member opens complete biodata, family, horoscope & documents", "[  ] Verified"],
        ["Member CRUD", "Admin can edit any member field and changes save immediately to Supabase", "[  ] Verified"],
        ["Member CRUD", "Admin can toggle verification checkmark (is_verified) on any profile", "[  ] Verified"],
        ["Member CRUD", "Admin can suspend/block an abusive account with immediate effect", "[  ] Verified"],
        ["Member CRUD", "Admin can create a new member manually from the admin panel", "[  ] Verified"],
        ["Offline Login", "Offline members table displays all imported spreadsheet records", "[  ] Verified"],
        ["Offline Login", "Clicking 'Activate Login' opens credentials provisioning modal", "[  ] Verified"],
        ["Offline Login", "Admin can set email and temporary password for offline member", "[  ] Verified"],
        ["Offline Login", "If member has NO email, system provisions login using Mobile Number", "[  ] Verified"],
        ["Offline Login", "Provisioning creates auth user, migrates to profiles, keeps same VM ID", "[  ] Verified"],
        ["Offline Login", "Newly provisioned member can immediately log in on website login page", "[  ] Verified"],
        ["Offline Login", "Credentials summary card generates copyable details and WhatsApp link", "[  ] Verified"],
        ["Payments", "Payments table lists all transactions from Razorpay with accurate amounts", "[  ] Verified"],
        ["Payments", "Admin can filter payments by Date Range, Plan Tier, and Status", "[  ] Verified"],
        ["Payments", "Admin can manually grant or extend a plan for offline bank/cash payment", "[  ] Verified"],
        ["Payments", "Export to Excel downloads clean .xlsx sheet with GST breakdown", "[  ] Verified"],
        ["KYC Center", "Admin can inspect uploaded identity docs and approve/reject with notes", "[  ] Verified"]
    ]
    add_custom_table(checklist_items[0], checklist_items[1:], [1.5, 3.8, 1.2])

    output_filename = "Vevaha_Matrimony_Admin_Panel_Specification.docx"
    doc.save(output_filename)
    print(f"Successfully generated admin specification document: {output_filename}")
    return output_filename

if __name__ == '__main__':
    create_admin_document()
