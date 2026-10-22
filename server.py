#!/usr/bin/env python3
"""
=============================================================================
  VEVAHA MATRIMONY — Admin Upload Backend  (server.py)
=============================================================================
  SETUP:
    1. Run offline_members_setup.sql once in Supabase SQL Editor
    2. pip install flask openpyxl Pillow requests flask-cors
    3. python server.py
    4. Open http://localhost:5000/admin-upload.html

  WHAT THIS DOES:
    POST /api/upload-database-file  → admin-upload.html calls this
    GET  /api/active-members        → active-members-dash.html loads cards
    GET  /api/active-members/:id    → full profile modal (no address)
    GET  /api/active-members/check-ids → dedup check

  RULES:
    • address / phone / whatsapp  NEVER returned to frontend
    • phone / whatsapp used only for call & whatsapp redirect URLs
    • No badges (Gold Member etc.) — offline members only
    • Images watermarked before upload to Supabase Storage bucket: active-members
=============================================================================
"""

import json, os, random, re, string, zipfile
from datetime import datetime, date, time as dtime
from io import BytesIO
from pathlib import Path

import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from openpyxl import load_workbook
from PIL import Image, ImageDraw, ImageFont

import uuid

# ─────────────────────────────────────────────────────────────────────────────
#  SUPABASE CONFIG
# ─────────────────────────────────────────────────────────────────────────────
TEMP_DIR = os.path.join(os.getcwd(), "temp_uploads")
os.makedirs(TEMP_DIR, exist_ok=True)

SUPABASE_URL     = "https://kpmbiatjlfdbuerzxpch.supabase.co"
SUPABASE_KEY     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwbWJpYXRqbGZkYnVlcnp4cGNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjIwMzA0MSwiZXhwIjoyMDg3Nzc5MDQxfQ.U_6BmOJsRjWjCryFjrj9YEq107VEesJnclTYwrSSQJ0"
STORAGE_BUCKET   = "active-members"
TABLE_NAME       = "offline_members"

SB_HEADERS = {
    "apikey":        SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=representation",
}

# ─────────────────────────────────────────────────────────────────────────────
#  WATERMARK CONFIG
# ─────────────────────────────────────────────────────────────────────────────
WM_TEXT       = "vevahamatrimony"
WM_OPACITY    = int(255 * 0.70)
WM_ANGLE      = 45
WM_COLOR      = (255, 255, 255)
WM_FONT_RATIO = 0.06

# ─────────────────────────────────────────────────────────────────────────────
#  COLUMN MAP — 0-based, matches your Excel exactly
# ─────────────────────────────────────────────────────────────────────────────
COL = {
    "profile": 0, "gender": 1, "name": 2, "dob": 3,
    "birth_time": 4, "birth_place": 5, "age": 6, "height": 7,
    "education": 8, "job": 9, "income": 10, "father": 11,
    "mother": 12, "siblings": 13, "property": 14, "caste": 15,
    "gotra": 16, "rasi": 17, "star": 18, "address": 19,
    "phone": 20, "whatsapp": 21, "expectations": 22,
    "others": 23, "jathagam": 24, "add_ref": 25,
}

SITE_FOLDER = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder=SITE_FOLDER)
CORS(app) # Enable CORS for all routes
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 1024   # 1 GB limit as requested

# ─────────────────────────────────────────────────────────────────────────────
#  SUPABASE HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def ensure_bucket():
    """Create the active-members bucket if it doesn't exist."""
    r = requests.get(f"{SUPABASE_URL}/storage/v1/bucket/{STORAGE_BUCKET}",
                     headers=SB_HEADERS)
    if r.status_code == 200:
        print(f"[Storage] Bucket '{STORAGE_BUCKET}' already exists.")
        return
    payload = {"id": STORAGE_BUCKET, "name": STORAGE_BUCKET,
                "public": True, "fileSizeLimit": 52428800} # 50MB per file limit in storage
    r2 = requests.post(f"{SUPABASE_URL}/storage/v1/bucket",
                       headers=SB_HEADERS, json=payload)
    if r2.status_code in (200, 201):
        print(f"[Storage] ✓ Bucket '{STORAGE_BUCKET}' created.")
    else:
        print(f"[Storage] Bucket create: {r2.status_code} {r2.text[:200]}")


def upload_image_to_supabase(img_bytes: bytes, filename: str) -> str:
    """Upload image bytes to Supabase Storage, return public URL."""
    upload_headers = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "image/jpeg",
        "x-upsert":      "true",
    }
    path = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{filename}"
    r = requests.post(path, headers=upload_headers, data=img_bytes)
    if r.status_code in (200, 201):
        return (f"{SUPABASE_URL}/storage/v1/object/public/"
                f"{STORAGE_BUCKET}/{filename}")
    print(f"[Storage] Upload failed for {filename}: {r.status_code} {r.text[:150]}")
    return ""


def get_existing_member_ids() -> set:
    """Fetch all existing member_ids from offline_members table."""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?select=member_id",
        headers=SB_HEADERS
    )
    if r.status_code == 200:
        return {row["member_id"] for row in r.json()}
    print(f"[DB] Could not fetch IDs: {r.status_code} {r.text[:150]}")
    return set()


def insert_members_batch(members: list) -> dict:
    """Bulk insert members into offline_members table."""
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}",
        headers=SB_HEADERS,
        json=members
    )
    return {"status": r.status_code, "body": r.text[:300]}


# ─────────────────────────────────────────────────────────────────────────────
#  ID GENERATION — prefix + 8 digits, guaranteed one '0'
# ─────────────────────────────────────────────────────────────────────────────
def generate_unique_id(existing_ids: set, prefix: str = "VM") -> str:
    while True:
        seven = random.choices(string.digits, k=7)
        pos   = random.randint(0, 7)
        eight = seven[:pos] + ["0"] + seven[pos:]
        new_id = prefix + "".join(eight)
        if new_id not in existing_ids:
            existing_ids.add(new_id)
            return new_id


# ─────────────────────────────────────────────────────────────────────────────
#  IMAGE EXTRACTION from Excel IMAGE() formula cells
# ─────────────────────────────────────────────────────────────────────────────
def build_vm_to_image_map(xlsx_bytes: bytes) -> dict:
    z = zipfile.ZipFile(BytesIO(xlsx_bytes))
    names = z.namelist()
    if "xl/richData/_rels/richValueRel.xml.rels" not in names:
        z.close()
        return {}
    rels  = z.read("xl/richData/_rels/richValueRel.xml.rels").decode("utf-8")
    rid_to_img = dict(re.findall(
        r'Id="(rId\d+)"[^>]*Target="\.\./media/([^"]+)"', rels))
    rvrel = re.findall(r'r:id="(rId\d+)"',
                       z.read("xl/richData/richValueRel.xml").decode("utf-8"))
    rv_indices = re.findall(r'<rv s="0"><v>(\d+)</v>',
                            z.read("xl/richData/rdrichvalue.xml").decode("utf-8"))
    rvb = [int(x) for x in re.findall(
           r'<xlrd:rvb i="(\d+)"',
           z.read("xl/metadata.xml").decode("utf-8"))]
    vm = {}
    for pos, rv_idx in enumerate(rvb):
        try:
            rid  = rvrel[int(rv_indices[rv_idx])]
            img  = rid_to_img.get(rid)
            path = f"xl/media/{img}"
            if img and path in names:
                vm[pos + 1] = z.read(path)
        except (IndexError, KeyError):
            pass
    z.close()
    return vm


def build_cell_to_vm_map(xlsx_bytes: bytes) -> dict:
    z   = zipfile.ZipFile(BytesIO(xlsx_bytes))
    xml = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
    z.close()
    cell_map = {}
    for ref, vm_idx in re.findall(r'<c r="([^"]+)"[^>]*vm="(\d+)"', xml):
        col_str = re.match(r"([A-Z]+)", ref).group(1)
        row_num = int(re.match(r"[A-Z]+(\d+)", ref).group(1))
        col_num = sum((ord(c) - 64) * (26 ** i)
                      for i, c in enumerate(reversed(col_str)))
        cell_map[(row_num, col_num)] = int(vm_idx)
    return cell_map


# ─────────────────────────────────────────────────────────────────────────────
#  WATERMARKING
# ─────────────────────────────────────────────────────────────────────────────
def apply_watermark(img_bytes: bytes) -> bytes:
    base = Image.open(BytesIO(img_bytes)).convert("RGBA")
    W, H = base.size
    font_size = max(20, int(W * WM_FONT_RATIO))
    font = None
    for fp in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
               "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
               "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
               "C:/Windows/Fonts/arialbd.ttf"]: # Added Windows path for arial bold
        try:
            font = ImageFont.truetype(fp, font_size); break
        except OSError:
            continue
    if not font:
        font = ImageFont.load_default()
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw  = ImageDraw.Draw(layer)
    bbox  = draw.textbbox((0, 0), WM_TEXT, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    for y in range(-H, H + int(th * 3.5), int(th * 3.5)):
        for x in range(-W, W + int(tw * 1.8), int(tw * 1.8)):
            draw.text((x, y), WM_TEXT, font=font,
                      fill=(*WM_COLOR, WM_OPACITY))
    layer  = layer.rotate(WM_ANGLE, resample=Image.BICUBIC, expand=False)
    result = Image.alpha_composite(base, layer).convert("RGB")
    buf = BytesIO()
    result.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
#  VALUE CLEANER
# ─────────────────────────────────────────────────────────────────────────────
def clean(val) -> str:
    if val is None:
        return ""
    if isinstance(val, datetime):
        return val.strftime("%d-%m-%Y")
    if isinstance(val, date):
        return val.strftime("%d-%m-%Y")
    if isinstance(val, dtime):
        return val.strftime("%H:%M")
    s = str(val).strip()
    bad = {"#VALUE!", "#REF!", "#N/A", "#NAME?", "#DIV/0!", "#NULL!", "#NUM!"}
    return "" if s in bad else s


def safe(row, idx) -> str:
    return clean(row[idx]) if idx < len(row) else ""


# ─────────────────────────────────────────────────────────────────────────────
#  STATIC FILE SERVING — serves your whole website
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(SITE_FOLDER, "index.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(SITE_FOLDER, filename)


# ─────────────────────────────────────────────────────────────────────────────
#  API 1 — POST /api/upload-database-file
#  Called by admin-upload.html — no changes needed to your HTML
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/api/upload-database-file", methods=["POST"])
def upload_database_file():
    try:
        if "databaseFile" not in request.files:
            return jsonify({"success": False, "error": "No file received."}), 400

        file = request.files["databaseFile"]
        if Path(file.filename).suffix.lower() not in (".xlsx", ".xls"):
            return jsonify({"success": False,
                            "error": "Please upload .xlsx or .xls file"}), 400

        xlsx_bytes = file.read()

        # ── Prefix from multiseries config ───────────────────────────────────
        try:
            series = json.loads(request.form.get("multiseries", "{}"))
        except Exception:
            series = {}
        prefix = "VM"
        if series.get("enabled") and series.get("prefix"):
            raw = re.sub(r"[^A-Z]", "", series["prefix"].upper())[:3]
            if raw:
                prefix = raw

        # ── Read data rows first so we can sync by content ───────────────────
        wb   = load_workbook(BytesIO(xlsx_bytes), read_only=True, data_only=True)
        active_sheet_name = wb.active.title
        all_rows = list(wb.active.iter_rows(values_only=True))
        wb.close()
        
        # ── Read worksheet and extract images using precise Rich Data Chain ──
        cell_images = {}
        try:
            z = zipfile.ZipFile(BytesIO(xlsx_bytes))
            names = z.namelist()
            
            # Find the exact sheetX.xml for the active sheet
            target_sheet_xml = None
            if "xl/workbook.xml" in names and "xl/_rels/workbook.xml.rels" in names:
                wb_xml = z.read("xl/workbook.xml").decode("utf-8")
                wb_rels = z.read("xl/_rels/workbook.xml.rels").decode("utf-8")
                match = re.search(fr'<sheet[^>]*name="{re.escape(active_sheet_name)}"[^>]*r:id="([^"]+)"', wb_xml)
                if match:
                    rid = match.group(1)
                    rel_match = re.search(fr'Id="{rid}"[^>]*Target="([^"]+)"', wb_rels)
                    if rel_match:
                        target = rel_match.group(1)
                        if target.startswith("/"): target = target[1:]
                        if not target.startswith("worksheets/"): target = f"worksheets/{target}"
                        target_sheet_xml = f"xl/{target}"
            
            if not target_sheet_xml:
                target_sheet_xml = "xl/worksheets/sheet1.xml" # fallback
                
            print(f"[Upload] Active sheet '{active_sheet_name}' mapped to '{target_sheet_xml}'")
            
            if "xl/richData/rdrichvalue.xml" in names:
                print(f"[Upload] Syncing images via Rich Data Chain...")
                rid_to_path = {}
                if "xl/richData/_rels/richValueRel.xml.rels" in names:
                    rels_xml = z.read("xl/richData/_rels/richValueRel.xml.rels").decode("utf-8")
                    for rid, path in re.findall(r'Id="(rId\d+)"[^>]*Target="\.\./media/([^"]+)"', rels_xml):
                        rid_to_path[rid] = f"xl/media/{path}"
                val_to_rid = []
                if "xl/richData/richValueRel.xml" in names:
                    rv_rel_xml = z.read("xl/richData/richValueRel.xml").decode("utf-8")
                    val_to_rid = re.findall(r'r:id="(rId\d+)"', rv_rel_xml)
                vm_to_val = []
                if "xl/richData/rdrichvalue.xml" in names:
                    rv_xml = z.read("xl/richData/rdrichvalue.xml").decode("utf-8")
                    vm_to_val = [int(v) for v in re.findall(r'<rv[^>]*><v>(\d+)</v>', rv_xml)]

                if target_sheet_xml in names:
                    sheet_xml = z.read(target_sheet_xml).decode("utf-8")
                    # We match images to their ABSOLUTE row/col in the XML
                    for ref, vm_idx_str in re.findall(r'<c r="([^"]+)"[^>]*vm="(\d+)"', sheet_xml):
                        try:
                            vm_idx = int(vm_idx_str) - 1
                            val_idx = vm_to_val[vm_idx]
                            rid = val_to_rid[val_idx]
                            path = rid_to_path.get(rid)
                            if path and path in names:
                                col_str = re.match(r"([A-Z]+)", ref).group(1)
                                row_num = int(re.match(r"[A-Z]+(\d+)", ref).group(1))
                                col_num = sum((ord(c) - 64) * (26 ** i) for i, c in enumerate(reversed(col_str)))
                                cell_images[(row_num, col_num)] = z.read(path)
                        except Exception: continue
            z.close()
        except Exception as e:
            print(f"[Upload] Rich Data Error: {e}")

        # ── Load existing IDs from Supabase ──────────────────────────────────
        existing_ids = get_existing_member_ids()
        print(f"[Upload] {len(existing_ids)} existing IDs loaded")

        # Create session directory for temporary images
        session_id = str(uuid.uuid4())
        session_dir = os.path.join(TEMP_DIR, session_id)
        os.makedirs(session_dir, exist_ok=True)

        # ── Process rows ─────────────────────────────────────────────────────
        new_members  = []
        male_count   = female_count = 0
        no_img_rows  = []
        
        # Start from the second row (index 1) to skip header
        for row_idx, row_data in enumerate(all_rows[1:], start=2):
            if not row_data or len(row_data) <= COL["name"]: continue
            name_val = clean(row_data[COL["name"]])
            if not name_val: continue

            member_id = generate_unique_id(existing_ids, prefix)
            existing_ids.add(member_id)

            # ── Temporarily save images ────────────────────────────────────────────────
            def get_temp_img(row_number: int, col_idx: int, suffix: str) -> str:
                target_col = col_idx + 1
                img_bytes = cell_images.get((row_number, target_col))
                if img_bytes:
                    try:
                        filename = f"{member_id}_{suffix}.jpg"
                        filepath = os.path.join(session_dir, filename)
                        with open(filepath, "wb") as f:
                            f.write(img_bytes)
                        return f"temp_uploads/{session_id}/{filename}"
                    except Exception as e:
                        print(f"[WARN] Row {row_number} {suffix}: {e}")
                return ""

            profile_url  = get_temp_img(row_idx, COL["profile"],  "profile")
            jathagam_url = get_temp_img(row_idx, COL["jathagam"], "jathagam")

            if not profile_url and not jathagam_url:
                no_img_rows.append(row_idx)

            gender_raw = clean(row_data[COL["gender"]]).lower()
            if "female" in gender_raw or "பெண்" in gender_raw:
                gender_clean = "Female"; female_count += 1
            else:
                gender_clean = "Male"; male_count += 1

            new_members.append({
                "row_idx": row_idx,
                "member_id": member_id,
                "gender": gender_clean,
                "full_name": name_val,
                "dob": safe(row_data, COL["dob"]),
                "birth_time": safe(row_data, COL["birth_time"]),
                "birth_place": safe(row_data, COL["birth_place"]),
                "age": safe(row_data, COL["age"]),
                "height": safe(row_data, COL["height"]),
                "education": safe(row_data, COL["education"]),
                "job": safe(row_data, COL["job"]),
                "monthly_income": safe(row_data, COL["income"]),
                "father": safe(row_data, COL["father"]),
                "mother": safe(row_data, COL["mother"]),
                "siblings": safe(row_data, COL["siblings"]),
                "property_details": safe(row_data, COL["property"]),
                "caste": safe(row_data, COL["caste"]),
                "gotra": safe(row_data, COL["gotra"]),
                "rasi": safe(row_data, COL["rasi"]),
                "star": safe(row_data, COL["star"]),
                "address": safe(row_data, COL["address"]),
                "phone": re.sub(r"\D", "", safe(row_data, COL["phone"])),
                "whatsapp": re.sub(r"\D", "", safe(row_data, COL["whatsapp"])),
                "expectations": safe(row_data, COL["expectations"]),
                "others": safe(row_data, COL["others"]),
                "add_ref": safe(row_data, COL["add_ref"]),
                "profile_picture_url": profile_url,
                "jathagam_url": jathagam_url,
                "status": "active",
                "added_on": datetime.now().strftime("%Y-%m-%d"),
            })

            if len(new_members) % 25 == 0:
                print(f"[Upload Preview] Parsed {len(new_members)} members…")

        return jsonify({
            "status": "preview",
            "session_id": session_id,
            "members": new_members,
            "total_processed": len(new_members),
            "male_count": male_count,
            "female_count": female_count,
            "no_img_rows": no_img_rows
        }), 200

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/temp_uploads/<path:filepath>')
def serve_temp_image(filepath):
    return send_from_directory(TEMP_DIR, filepath)

@app.route('/api/confirm-upload', methods=['POST'])
def confirm_upload():
    try:
        data = request.json
        members = data.get("members", [])
        session_id = data.get("session_id", "")
        
        print(f"[Confirm] Processing {len(members)} verified members...")
        
        # ── Upload images and apply watermark ───────────────────────────
        for m in members:
            def process_image(img_path_or_b64, suffix):
                if not img_path_or_b64: return ""
                
                try:
                    img_bytes = None
                    if img_path_or_b64.startswith("data:image"):
                        # Base64 override from frontend
                        header, encoded = img_path_or_b64.split(",", 1)
                        img_bytes = base64.b64decode(encoded)
                    elif img_path_or_b64.startswith("temp_uploads/"):
                        # Read from local temp directory
                        local_path = os.path.join(os.getcwd(), img_path_or_b64)
                        if os.path.exists(local_path):
                            with open(local_path, "rb") as f:
                                img_bytes = f.read()
                    
                    if img_bytes:
                        wm = apply_watermark(img_bytes)
                        return upload_image_to_supabase(wm, f"{m['member_id']}_{suffix}.jpg")
                except Exception as e:
                    print(f"[Confirm] Error processing {suffix} for {m['member_id']}: {e}")
                return ""

            m["profile_picture_url"] = process_image(m.get("profile_picture_url", ""), "profile")
            m["jathagam_url"] = process_image(m.get("jathagam_url", ""), "jathagam")

            # Remove temp keys not needed for DB
            m.pop("row_idx", None)

        # ── Batch insert to Supabase ──────────────────────────────────────────
        result = {}
        if members:
            chunk_size = 50
            for i in range(0, len(members), chunk_size):
                chunk = members[i:i + chunk_size]
                res = insert_members_batch(chunk)
                if i == 0:
                    result = res
                print(f"[DB] Inserted chunk {i//chunk_size + 1}, status: {res['status']}")

        success = result.get("status") in (200, 201, 207)
        if success:
            return jsonify({
                "success": True,
                "message": "File processed successfully!",
                "total_processed": len(members),
                "male_count": sum(1 for m in members if m["gender"] == "Male"),
                "female_count": sum(1 for m in members if m["gender"] == "Female"),
            }), 200
        else:
            return jsonify({"success": False, "error": f"DB Insert failed: {result}"}), 500

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
#  API 2 — GET /api/active-members
#  active-members-dash.html calls this to load the card grid
#  address / phone / whatsapp raw numbers are NEVER returned
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/api/active-members", methods=["GET"])
def get_active_members():
    try:
        gender = request.args.get("gender", "").strip()
        caste  = request.args.get("caste",  "").strip()
        search = request.args.get("q",      "").strip().lower()
        page   = max(1, int(request.args.get("page", 1)))
        limit  = min(50, int(request.args.get("limit", 20)))
        offset = (page - 1) * limit

        # --- NEW: Filter by gender if provided ---
        target_gender = gender if gender else None
        
        # If no gender provided, we don't filter (fallback)
        # But for active members dashboard, we might want to filter eventually.
        # Columns to select — address, phone, whatsapp intentionally excluded
        select_cols = (
            "member_id,gender,full_name,dob,birth_time,birth_place,"
            "age,height,education,job,monthly_income,father,mother,"
            "siblings,property_details,caste,gotra,rasi,star,"
            "expectations,others,add_ref,"
            "profile_picture_url,jathagam_url,status,added_on"
        )

        params = {
            "select": select_cols,
            "status": "eq.active",
            "order":  "created_at.desc",
            "limit":  str(limit),
            "offset": str(offset),
        }
        if target_gender:
            params["gender"] = f"ilike.{target_gender}%"
        if caste:
            params["caste"]  = f"ilike.%{caste}%"

        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}",
            headers={**SB_HEADERS, "Prefer": "count=exact"},
            params=params
        )

        if r.status_code != 200:
            return jsonify({"success": False,
                            "error": f"DB error {r.status_code}"}), 500

        offline_members = r.json()
        
        # --- NEW: Fetch managed profiles from the main 'profiles' table ---
        # Profiles table has different column names!
        profile_cols = (
            "id,member_id,full_name,gender,date_of_birth,height,education,"
            "job_roles,annual_income,city,state,caste,rasi,star,"
            "profile_picture_url,horoscope_path,created_at"
        )
        managed_params = {
            "select": profile_cols,
            "profile_status": "eq.verified",
            "is_managed": "eq.true",
            "limit": str(limit)
        }
        if target_gender: managed_params["gender"] = f"ilike.{target_gender}%"
        if caste: managed_params["caste"] = f"ilike.%{caste}%"

        r_managed = requests.get(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers=SB_HEADERS,
            params=managed_params
        )
        
        managed_profiles = []
        if r_managed.status_code == 200:
            managed_profiles = r_managed.json()

        # Combine both
        all_members = offline_members + managed_profiles

        # Client-side search filter (name / education / rasi / star)
        if search:
            all_members = [m for m in all_members if any(
                search in (m.get(f) or "").lower()
                for f in ["full_name", "education", "job", "caste",
                           "rasi", "star", "birth_place"]
            )]

        # Build safe card objects — all are treated as 'managed'
        safe_members = []
        for m in all_members:
            safe_members.append({
                "member_id":           m.get("member_id"),
                "gender":              m.get("gender"),
                "full_name":           m.get("full_name"),
                "age":                 m.get("age"),
                "height":              m.get("height"),
                "education":           m.get("education"),
                "job":                 m.get("job") or m.get("job_roles"),
                "monthly_income":      m.get("monthly_income") or m.get("annual_income"),
                "caste":               m.get("caste"),
                "gotra":               m.get("gotra"),
                "rasi":                m.get("rasi"),
                "star":                m.get("star"),
                "dob":                 m.get("dob") or m.get("date_of_birth"),
                "birth_time":          m.get("birth_time"),
                "birth_place":         m.get("birth_place") or m.get("city"),
                "father":              m.get("father"),
                "mother":              m.get("mother"),
                "siblings":            m.get("siblings"),
                "property_details":    m.get("property_details"),
                "expectations":        m.get("expectations"),
                "others":              m.get("others"),
                "profile_picture_url": m.get("profile_picture_url") or "",
                "jathagam_url":        m.get("jathagam_url") or m.get("horoscope_path") or "",
                "added_on":            m.get("added_on") or m.get("created_at"),
                "managed":             True # Flag for UI
            })

        total_header = r.headers.get("content-range", "")
        try:
            total_offline = int(total_header.split("/")[-1])
        except Exception:
            total_offline = len(offline_members)

        return jsonify({
            "success": True,
            "members": safe_members,
            "total":   total_offline + len(managed_profiles),
            "page":    page,
            "limit":   limit,
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
#  API 3 — GET /api/active-members/<member_id>
#  Full profile modal — returns all detail fields, still no address
#  BUT returns call_url and whatsapp_url built server-side
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/api/active-members/<member_id>", methods=["GET"])
def get_member_profile(member_id):
    try:
        # Fetch ALL fields including phone/whatsapp (to build redirect URLs)
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}",
            headers=SB_HEADERS,
            params={"member_id": f"eq.{member_id}", "limit": "1"}
        )
        if r.status_code != 200 or not r.json():
            return jsonify({"success": False, "error": "Member not found"}), 404

        m = r.json()[0]

        # Build redirect URLs server-side
        phone    = re.sub(r"\D", "", m.get("phone", "") or "")
        wa       = re.sub(r"\D", "", m.get("whatsapp", "") or "")
        if wa and not wa.startswith("91"):
            wa = "91" + wa
        call_url = f"tel:{phone}" if phone else ""
        wa_url   = f"https://wa.me/{wa}" if wa else ""

        return jsonify({
            "success":             True,
            "member_id":           m.get("member_id"),
            "gender":              m.get("gender"),
            "full_name":           m.get("full_name"),
            "dob":                 m.get("dob"),
            "birth_time":          m.get("birth_time"),
            "birth_place":         m.get("birth_place"),
            "age":                 m.get("age"),
            "height":              m.get("height"),
            "education":           m.get("education"),
            "job":                 m.get("job"),
            "monthly_income":      m.get("monthly_income"),
            "father":              m.get("father"),
            "mother":              m.get("mother"),
            "siblings":            m.get("siblings"),
            "property_details":    m.get("property_details"),
            "caste":               m.get("caste"),
            "gotra":               m.get("gotra"),
            "rasi":                m.get("rasi"),
            "star":                m.get("star"),
            "expectations":        m.get("expectations"),
            "others":              m.get("others"),
            "profile_picture_url": m.get("profile_picture_url") or "",
            "jathagam_url":        m.get("jathagam_url") or "",
            "added_on":            m.get("added_on"),
            "call_url":            call_url,    # tel:XXXXXXXXXX
            "whatsapp_url":        wa_url,      # https://wa.me/91XXXXXXXXXX
        })

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
#  API 4 — Undo / Redo / Delete (admin-upload.html uses these)
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/api/undo-upload", methods=["POST"])
def undo_upload():
    return _remove_members(request.get_json())

@app.route("/api/delete-upload", methods=["POST"])
def delete_upload():
    return _remove_members(request.get_json())

def _remove_members(data):
    try:
        ids = [m["id"] for m in (data or {}).get("membersToRemove", [])
               if isinstance(m, dict) and m.get("id")]
        if not ids:
            return jsonify({"success": True, "removedCount": 0})
        removed = 0
        for mid in ids:
            r = requests.delete(
                f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?member_id=eq.{mid}",
                headers=SB_HEADERS
            )
            if r.status_code in (200, 204):
                removed += 1
        return jsonify({"success": True, "removedCount": removed})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/redo-upload", methods=["POST"])
def redo_upload():
    try:
        data    = request.get_json() or {}
        to_add  = data.get("membersToAdd", [])
        if not to_add:
            return jsonify({"success": True, "addedCount": 0})
        result  = insert_members_batch(to_add)
        return jsonify({"success": result["status"] in (200, 201, 207),
                        "addedCount": len(to_add)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ─────────────────────────────────────────────────────────────────────────────
#  STARTUP
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "="*60)
    print("  VEVAHA MATRIMONY — Server starting…")
    print("="*60)
    ensure_bucket()
    print(f"\n  * Open: http://localhost:5000/admin-upload.html")
    print(f"  * Open: http://localhost:5000/active-members-dash.html")
    print("="*60 + "\n")
    app.run(debug=False, host="0.0.0.0", port=5000)
