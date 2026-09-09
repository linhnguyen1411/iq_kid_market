"""
Module xử lý chuyển đổi hai chiều giữa Scratch Studio và MIT Scratch 3.0 (.sb3 package).
- Xuất file .sb3 chuẩn nén PKZIP chứa project.json và các asset SVG cần thiết.
- Nhập file .sb3 (từ MIT Scratch hoặc Scratch Studio) và chuyển đổi sang Blockly XML + Sprite state.
"""

import io
import json
import zipfile
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional, Tuple

# Vector SVG mặc định cho Nền Sân Khấu (Stage Backdrop)
STAGE_BACKDROP_ID = "cd21514d0531e18de4e5858cf715262b"
STAGE_BACKDROP_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360">
  <rect width="480" height="360" fill="#ffffff"/>
</svg>"""

# Vector SVG chú Mèo Scratch (Sprite1 Costume)
CAT_COSTUME_ID = "0fb9be3e8397c77fa99c0521c625e379"
CAT_COSTUME_SVG = """<svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M20 60 C10 65 5 45 15 40 C20 38 25 48 20 60 Z" fill="#FFAB19" stroke="#000" stroke-width="2.5"/>
  <ellipse cx="48" cy="62" rx="24" ry="18" fill="#FFAB19" stroke="#000" stroke-width="2.5"/>
  <ellipse cx="48" cy="64" rx="14" ry="11" fill="#FFFFFF"/>
  <ellipse cx="34" cy="78" rx="8" ry="5" fill="#FFFFFF" stroke="#000" stroke-width="2.5" />
  <ellipse cx="58" cy="78" rx="8" ry="5" fill="#FFFFFF" stroke="#000" stroke-width="2.5" />
  <polygon points="42,22 32,8 54,16" fill="#FFAB19" stroke="#000" stroke-width="2.5" />
  <polygon points="44,20 37,12 50,17" fill="#FF8C1A" />
  <polygon points="68,22 80,8 76,20" fill="#FFAB19" stroke="#000" stroke-width="2.5" />
  <polygon points="69,20 76,12 73,19" fill="#FF8C1A" />
  <ellipse cx="56" cy="32" rx="24" ry="20" fill="#FFAB19" stroke="#000" stroke-width="2.5" />
  <circle cx="48" cy="28" r="5" fill="#FFFFFF" stroke="#000" stroke-width="1.5" />
  <circle cx="50" cy="28" r="2.5" fill="#000000" />
  <circle cx="66" cy="28" r="5" fill="#FFFFFF" stroke="#000" stroke-width="1.5" />
  <circle cx="68" cy="28" r="2.5" fill="#000000" />
  <polygon points="58,35 55,38 61,38" fill="#FF8C1A" stroke="#000" stroke-width="1" />
  <path d="M54 40 Q58 44 62 40" stroke="#000" stroke-width="1.8" fill="none" />
</svg>"""

# Bảng ánh xạ giữa Scratch Studio Block Types và MIT Scratch 3.0 Opcodes
BLOCK_TYPE_TO_OPCODE = {
    "scratch_when_flag_clicked": "event_whenflagclicked",
    "scratch_when_sprite_clicked": "event_whenthisspriteclicked",
    "scratch_when_key_pressed": "event_whenkeypressed",
    "scratch_broadcast_message": "event_broadcast",
    "scratch_when_receive_message": "event_whenbroadcastreceived",
    "scratch_move_steps": "motion_movesteps",
    "scratch_turn_right": "motion_turnright",
    "scratch_turn_left": "motion_turnleft",
    "scratch_goto_xy": "motion_gotoxy",
    "scratch_point_direction": "motion_pointindirection",
    "scratch_change_x_by": "motion_changexby",
    "scratch_change_y_by": "motion_changeyby",
    "scratch_bounce_on_edge": "motion_ifonedgebounce",
    "scratch_say_for_secs": "looks_sayforsecs",
    "scratch_say": "looks_say",
    "scratch_change_size_by": "looks_changesizeby",
    "scratch_set_size_to": "looks_setsizeto",
    "scratch_show": "looks_show",
    "scratch_hide": "looks_hide",
    "scratch_play_sound_meow": "sound_playuntildone",
    "scratch_play_drum": "music_playDrumForBeats",
    "scratch_wait_secs": "control_wait",
    "scratch_repeat": "control_repeat",
    "scratch_forever": "control_forever",
    "scratch_if": "control_if",
    "scratch_if_else": "control_if_else",
    "scratch_touching_edge": "sensing_touchingobject",
    "scratch_touching_mouse": "sensing_touchingobject",
    "scratch_set_variable_to": "data_setvariableto",
    "scratch_change_variable_by": "data_changevariableby",
    "scratch_random_number": "operator_random",
}

OPCODE_TO_BLOCK_TYPE = {v: k for k, v in BLOCK_TYPE_TO_OPCODE.items()}
OPCODE_TO_BLOCK_TYPE["sound_play"] = "scratch_play_sound_meow"


def export_sb3_bytes(title: str, project_data: Any) -> bytes:
    """
    Đóng gói dữ liệu kịch bản Scratch Studio thành file ZIP .sb3 chuẩn của MIT Scratch 3.0.
    """
    if isinstance(project_data, str):
        try:
            p_data = json.loads(project_data)
        except Exception:
            p_data = {}
    elif isinstance(project_data, dict):
        p_data = project_data
    else:
        p_data = {}

    sprite = p_data.get("sprite") or {}
    blocks_list = p_data.get("blocks") or []
    blockly_xml = p_data.get("blocklyXml") or ""

    # Chuyển đổi danh sách blocks của Scratch Studio sang Scratch 3.0 blocks object
    scratch_blocks: Dict[str, Any] = {}
    prev_block_id: Optional[str] = None

    for idx, b in enumerate(blocks_list):
        b_id = str(b.get("id") or f"block_{idx}")
        b_type = b.get("type", "")
        opcode = BLOCK_TYPE_TO_OPCODE.get(b_type, "motion_movesteps")
        fields = b.get("fields") or {}
        parent_id = b.get("parentId") or prev_block_id

        inputs: Dict[str, Any] = {}
        block_fields: Dict[str, Any] = {}

        if b_type == "scratch_move_steps":
            steps = str(fields.get("STEPS", 10))
            inputs["STEPS"] = [1, [4, steps]]
        elif b_type in ("scratch_turn_right", "scratch_turn_left"):
            degs = str(fields.get("DEGREES", 15))
            inputs["DEGREES"] = [1, [4, degs]]
        elif b_type == "scratch_goto_xy":
            inputs["X"] = [1, [4, str(fields.get("X", 0))]]
            inputs["Y"] = [1, [4, str(fields.get("Y", 0))]]
        elif b_type == "scratch_point_direction":
            inputs["DIRECTION"] = [1, [4, str(fields.get("DIRECTION", 90))]]
        elif b_type == "scratch_change_x_by":
            inputs["DX"] = [1, [4, str(fields.get("DX", 10))]]
        elif b_type == "scratch_change_y_by":
            inputs["DY"] = [1, [4, str(fields.get("DY", 10))]]
        elif b_type == "scratch_say_for_secs":
            inputs["MESSAGE"] = [1, [10, str(fields.get("MESSAGE", "Xin chào!"))]]
            inputs["SECS"] = [1, [4, str(fields.get("SECS", 2))]]
        elif b_type == "scratch_say":
            inputs["MESSAGE"] = [1, [10, str(fields.get("MESSAGE", "Xin chào!"))]]
        elif b_type == "scratch_change_size_by":
            inputs["CHANGE"] = [1, [4, str(fields.get("CHANGE", 10))]]
        elif b_type == "scratch_set_size_to":
            inputs["SIZE"] = [1, [4, str(fields.get("SIZE", 100))]]
        elif b_type == "scratch_wait_secs":
            inputs["DURATION"] = [1, [4, str(fields.get("SECS", 1))]]
        elif b_type == "scratch_repeat":
            inputs["TIMES"] = [1, [6, str(fields.get("TIMES", 10))]]
        elif b_type == "scratch_random_number":
            inputs["FROM"] = [1, [4, str(fields.get("FROM", 1))]]
            inputs["TO"] = [1, [4, str(fields.get("TO", 10))]]
        elif b_type == "scratch_when_key_pressed":
            key_opt = str(fields.get("KEY_OPTION", "space"))
            block_fields["KEY_OPTION"] = [key_opt, None]
        elif b_type in ("scratch_broadcast_message", "scratch_when_receive_message"):
            msg = str(fields.get("MESSAGE", "thông_báo_1"))
            inputs["BROADCAST_INPUT"] = [1, [11, msg, f"broadcast_{msg}"]]
            block_fields["BROADCAST_OPTION"] = [msg, f"broadcast_{msg}"]
        elif b_type == "scratch_set_variable_to":
            var_name = str(fields.get("VAR", "điểm"))
            val = str(fields.get("VALUE", 0))
            block_fields["VARIABLE"] = [var_name, f"var_{var_name}"]
            inputs["VALUE"] = [1, [4, val]]
        elif b_type == "scratch_change_variable_by":
            var_name = str(fields.get("VAR", "điểm"))
            chg = str(fields.get("CHANGE", 1))
            block_fields["VARIABLE"] = [var_name, f"var_{var_name}"]
            inputs["VALUE"] = [1, [4, chg]]

        is_top = idx == 0 or b_type.startswith("scratch_when_") or not parent_id
        next_id = str(blocks_list[idx + 1].get("id") or f"block_{idx + 1}") if idx + 1 < len(blocks_list) else None

        scratch_blocks[b_id] = {
            "opcode": opcode,
            "next": next_id,
            "parent": parent_id if not is_top else None,
            "inputs": inputs,
            "fields": block_fields,
            "shadow": False,
            "topLevel": is_top,
            "x": 80 if is_top else None,
            "y": 60 if is_top else None,
        }
        prev_block_id = b_id

    # Cấu trúc project.json chuẩn Scratch 3.0
    project_json = {
        "targets": [
            {
                "isStage": True,
                "name": "Stage",
                "variables": {},
                "lists": {},
                "broadcasts": {},
                "customVars": [],
                "blocks": {},
                "comments": {},
                "currentCostume": 0,
                "costumes": [
                    {
                        "name": "backdrop1",
                        "dataFormat": "svg",
                        "assetId": STAGE_BACKDROP_ID,
                        "md5ext": f"{STAGE_BACKDROP_ID}.svg",
                        "rotationCenterX": 240,
                        "rotationCenterY": 180,
                    }
                ],
                "sounds": [],
                "volume": 100,
                "layerOrder": 0,
                "tempo": 60,
                "videoTransparency": 50,
                "videoState": "on",
                "textToSpeechLanguage": None,
            },
            {
                "isStage": False,
                "name": "Sprite1",
                "variables": {},
                "lists": {},
                "broadcasts": {},
                "customVars": [],
                "blocks": scratch_blocks,
                "comments": {},
                "currentCostume": 0,
                "costumes": [
                    {
                        "name": "costume1",
                        "dataFormat": "svg",
                        "assetId": CAT_COSTUME_ID,
                        "md5ext": f"{CAT_COSTUME_ID}.svg",
                        "rotationCenterX": 32,
                        "rotationCenterY": 32,
                    }
                ],
                "sounds": [],
                "volume": 100,
                "layerOrder": 1,
                "visible": sprite.get("visible", True),
                "x": sprite.get("x", 0),
                "y": sprite.get("y", 0),
                "size": sprite.get("size", 100),
                "direction": sprite.get("direction", 90),
                "draggable": False,
                "rotationStyle": "all around",
            },
        ],
        "monitors": [],
        "extensions": [],
        "meta": {
            "semver": "3.0.0",
            "vm": "0.2.0",
            "agent": "IQKids-ScratchStudio/1.0.0",
        },
        # Metadata nội bộ lưu giữ nguyên trạng 100% Blockly XML
        "iqkids_studio": {
            "title": title,
            "sprite": sprite,
            "blocklyXml": blockly_xml,
            "blocks": blocks_list,
        },
    }

    # Đóng gói zip
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr("project.json", json.dumps(project_json, ensure_ascii=False, indent=2))
        zip_file.writestr(f"{STAGE_BACKDROP_ID}.svg", STAGE_BACKDROP_SVG)
        zip_file.writestr(f"{CAT_COSTUME_ID}.svg", CAT_COSTUME_SVG)

    buffer.seek(0)
    return buffer.getvalue()


def _extract_input_value(input_entry: Any, default: Any = "") -> Any:
    """Trích xuất giá trị tham số từ cấu trúc Scratch 3.0 input [1, [type, value]]."""
    if not input_entry or not isinstance(input_entry, list):
        return default
    if len(input_entry) >= 2 and isinstance(input_entry[1], list) and len(input_entry[1]) >= 2:
        return input_entry[1][1]
    return default


def _build_blockly_xml_from_scratch_blocks(scratch_blocks: Dict[str, Any]) -> str:
    """
    Xây dựng cây Blockly XML từ cấu trúc Scratch 3.0 blocks dictionary.
    """
    root = ET.Element("xml", {"xmlns": "https://developers.google.com/blockly/xml"})

    # Tìm các block top-level
    top_blocks = [
        (bid, b)
        for bid, b in scratch_blocks.items()
        if b.get("topLevel") or not b.get("parent")
    ]

    for idx, (bid, block_data) in enumerate(top_blocks):
        x = block_data.get("x") or (80 + idx * 240)
        y = block_data.get("y") or 60

        current_xml_parent = root
        curr_id: Optional[str] = bid
        is_root_block = True

        while curr_id and curr_id in scratch_blocks:
            curr_b = scratch_blocks[curr_id]
            opcode = curr_b.get("opcode", "")
            block_type = OPCODE_TO_BLOCK_TYPE.get(opcode)

            if not block_type:
                # Bỏ qua block không nhận diện được và tiếp tục
                curr_id = curr_b.get("next")
                continue

            b_elem = ET.SubElement(current_xml_parent, "block", {"type": block_type, "id": curr_id})
            if is_root_block:
                b_elem.set("x", str(x))
                b_elem.set("y", str(y))
                is_root_block = False

            # Gán fields tương ứng
            inputs = curr_b.get("inputs") or {}
            if block_type == "scratch_move_steps":
                val = _extract_input_value(inputs.get("STEPS"), "10")
                f = ET.SubElement(b_elem, "field", {"name": "STEPS"})
                f.text = str(val)
            elif block_type in ("scratch_turn_right", "scratch_turn_left"):
                val = _extract_input_value(inputs.get("DEGREES"), "15")
                f = ET.SubElement(b_elem, "field", {"name": "DEGREES"})
                f.text = str(val)
            elif block_type == "scratch_goto_xy":
                x_val = _extract_input_value(inputs.get("X"), "0")
                y_val = _extract_input_value(inputs.get("Y"), "0")
                fx = ET.SubElement(b_elem, "field", {"name": "X"})
                fx.text = str(x_val)
                fy = ET.SubElement(b_elem, "field", {"name": "Y"})
                fy.text = str(y_val)
            elif block_type == "scratch_point_direction":
                val = _extract_input_value(inputs.get("DIRECTION"), "90")
                f = ET.SubElement(b_elem, "field", {"name": "DIRECTION"})
                f.text = str(val)
            elif block_type == "scratch_change_x_by":
                val = _extract_input_value(inputs.get("DX"), "10")
                f = ET.SubElement(b_elem, "field", {"name": "DX"})
                f.text = str(val)
            elif block_type == "scratch_change_y_by":
                val = _extract_input_value(inputs.get("DY"), "10")
                f = ET.SubElement(b_elem, "field", {"name": "DY"})
                f.text = str(val)
            elif block_type == "scratch_say_for_secs":
                msg = _extract_input_value(inputs.get("MESSAGE"), "Xin chào!")
                sec = _extract_input_value(inputs.get("SECS"), "2")
                fm = ET.SubElement(b_elem, "field", {"name": "MESSAGE"})
                fm.text = str(msg)
                fs = ET.SubElement(b_elem, "field", {"name": "SECS"})
                fs.text = str(sec)
            elif block_type == "scratch_say":
                msg = _extract_input_value(inputs.get("MESSAGE"), "Xin chào!")
                fm = ET.SubElement(b_elem, "field", {"name": "MESSAGE"})
                fm.text = str(msg)
            elif block_type == "scratch_change_size_by":
                val = _extract_input_value(inputs.get("CHANGE"), "10")
                f = ET.SubElement(b_elem, "field", {"name": "CHANGE"})
                f.text = str(val)
            elif block_type == "scratch_set_size_to":
                val = _extract_input_value(inputs.get("SIZE"), "100")
                f = ET.SubElement(b_elem, "field", {"name": "SIZE"})
                f.text = str(val)
            elif block_type == "scratch_wait_secs":
                val = _extract_input_value(inputs.get("DURATION"), "1")
                f = ET.SubElement(b_elem, "field", {"name": "SECS"})
                f.text = str(val)
            elif block_type == "scratch_repeat":
                val = _extract_input_value(inputs.get("TIMES"), "10")
                f = ET.SubElement(b_elem, "field", {"name": "TIMES"})
                f.text = str(val)
            elif block_type == "scratch_when_key_pressed":
                key_val = "space"
                if "KEY_OPTION" in curr_b.get("fields", {}):
                    key_val = str(curr_b["fields"]["KEY_OPTION"][0])
                f = ET.SubElement(b_elem, "field", {"name": "KEY_OPTION"})
                f.text = key_val
            elif block_type in ("scratch_broadcast_message", "scratch_when_receive_message"):
                msg_val = "thông_báo_1"
                if "BROADCAST_OPTION" in curr_b.get("fields", {}):
                    msg_val = str(curr_b["fields"]["BROADCAST_OPTION"][0])
                elif "BROADCAST_INPUT" in inputs:
                    msg_val = _extract_input_value(inputs.get("BROADCAST_INPUT"), "thông_báo_1")
                f = ET.SubElement(b_elem, "field", {"name": "MESSAGE"})
                f.text = msg_val
            elif block_type in ("scratch_set_variable_to", "scratch_change_variable_by"):
                var_val = "điểm"
                if "VARIABLE" in curr_b.get("fields", {}):
                    var_val = str(curr_b["fields"]["VARIABLE"][0])
                f_var = ET.SubElement(b_elem, "field", {"name": "VAR"})
                f_var.text = var_val
                val_name = "VALUE" if block_type == "scratch_set_variable_to" else "CHANGE"
                val_def = "0" if block_type == "scratch_set_variable_to" else "1"
                val = _extract_input_value(inputs.get("VALUE"), val_def)
                f_val = ET.SubElement(b_elem, "field", {"name": val_name})
                f_val.text = str(val)

            # Khối tiếp theo
            next_bid = curr_b.get("next")
            if next_bid and next_bid in scratch_blocks:
                next_elem = ET.SubElement(b_elem, "next")
                current_xml_parent = next_elem
                curr_id = next_bid
            else:
                curr_id = None

    return ET.tostring(root, encoding="utf-8").decode("utf-8")


MAX_SB3_COMPRESSED_BYTES = 15 * 1024 * 1024       # 15 MB
MAX_SB3_UNCOMPRESSED_TOTAL = 50 * 1024 * 1024      # 50 MB
MAX_SB3_UNCOMPRESSED_SINGLE = 25 * 1024 * 1024     # 25 MB
MAX_SB3_ENTRY_COUNT = 500
MAX_SAFE_COMPRESSION_RATIO = 100


def import_sb3_bytes(zip_bytes: bytes, filename: str = "imported_project.sb3") -> Dict[str, Any]:
    """
    Giải nén và đọc file .sb3 (MIT Scratch hoặc Scratch Studio) thành cấu trúc dữ liệu Scratch Studio.
    Được trang bị cơ chế bảo vệ Zip Bomb & Zip Slip nhiều lớp:
    - Giới hạn kích thước file nén (15MB)
    - Giới hạn tổng dung lượng giải nén (50MB) và từng file (25MB)
    - Giới hạn số lượng tệp tin tối đa trong archive (500)
    - Ngăn chặn tỷ lệ nén bất thường (>100x)
    - Chặn đường dẫn thoát thư mục (Path Traversal / Zip Slip)
    """
    if not zip_bytes or len(zip_bytes) == 0:
        raise ValueError("File .sb3 rỗng hoặc không có dữ liệu!")

    if len(zip_bytes) > MAX_SB3_COMPRESSED_BYTES:
        raise ValueError(
            f"Kích thước file .sb3 ({len(zip_bytes) / 1024 / 1024:.1f}MB) vượt quá giới hạn cho phép ({MAX_SB3_COMPRESSED_BYTES // 1024 // 1024}MB)!"
        )

    buffer = io.BytesIO(zip_bytes)
    try:
        with zipfile.ZipFile(buffer, mode="r") as zip_file:
            infolist = zip_file.infolist()
            if len(infolist) > MAX_SB3_ENTRY_COUNT:
                raise ValueError(
                    f"File .sb3 chứa quá nhiều tệp con ({len(infolist)}/{MAX_SB3_ENTRY_COUNT})! Nghi ngờ Zip Bomb."
                )

            total_uncompressed = 0
            for info in infolist:
                # 1. Chống Path Traversal (Zip Slip)
                fname = info.filename
                if ".." in fname or fname.startswith(("/", "\\")):
                    raise ValueError(f"Phát hiện đường dẫn không an toàn trong file zip: '{fname}'!")

                # 2. Chống Zip Bomb: kiểm tra dung lượng từng file
                if info.file_size > MAX_SB3_UNCOMPRESSED_SINGLE:
                    raise ValueError(
                        f"Tệp '{fname}' có dung lượng giải nén quá lớn ({info.file_size / 1024 / 1024:.1f}MB)!"
                    )

                # 3. Chống Zip Bomb: kiểm tra tỷ lệ nén
                if info.file_size > 50 * 1024 and info.compress_size > 0:
                    ratio = info.file_size / info.compress_size
                    if ratio > MAX_SAFE_COMPRESSION_RATIO:
                        raise ValueError(
                            f"Phát hiện tỷ lệ nén bất thường ({ratio:.1f}x) tại tệp '{fname}'! Ngăn chặn Zip Bomb."
                        )

                total_uncompressed += info.file_size
                if total_uncompressed > MAX_SB3_UNCOMPRESSED_TOTAL:
                    raise ValueError(
                        f"Tổng dung lượng giải nén ({total_uncompressed / 1024 / 1024:.1f}MB) vượt quá ngưỡng an toàn ({MAX_SB3_UNCOMPRESSED_TOTAL // 1024 // 1024}MB)!"
                    )

            file_list = [info.filename for info in infolist]
            if "project.json" not in file_list:
                raise ValueError("File .sb3 không hợp lệ: Thiếu project.json trong gói nén!")

            raw_json = zip_file.read("project.json").decode("utf-8")
            project_json = json.loads(raw_json)
    except zipfile.BadZipFile:
        raise ValueError("File tải lên không phải là định dạng PKZIP hợp lệ của Scratch .sb3!")

    # 1. Nếu file chứa metadata nguyên bản của Scratch Studio (100% loss-free)
    if "iqkids_studio" in project_json and isinstance(project_json["iqkids_studio"], dict):
        studio_meta = project_json["iqkids_studio"]
        return {
            "title": studio_meta.get("title") or filename.replace(".sb3", ""),
            "sprite": studio_meta.get("sprite") or {},
            "blocklyXml": studio_meta.get("blocklyXml") or "",
            "blocks": studio_meta.get("blocks") or [],
            "source": "scratch_studio",
        }

    # 2. Xử lý file chuẩn từ MIT Scratch 3.0
    targets = project_json.get("targets") or []
    sprite_target = next((t for t in targets if not t.get("isStage")), None)

    sprite_state = {
        "x": 0,
        "y": 0,
        "direction": 90,
        "size": 100,
        "visible": True,
    }

    scratch_blocks: Dict[str, Any] = {}
    if sprite_target:
        sprite_state["x"] = sprite_target.get("x", 0)
        sprite_state["y"] = sprite_target.get("y", 0)
        sprite_state["direction"] = sprite_target.get("direction", 90)
        sprite_state["size"] = sprite_target.get("size", 100)
        sprite_state["visible"] = sprite_target.get("visible", True)
        scratch_blocks = sprite_target.get("blocks") or {}

    blockly_xml = _build_blockly_xml_from_scratch_blocks(scratch_blocks)

    # Trích xuất danh sách blocks thô để tương thích evaluator/preview
    extracted_blocks = []
    for bid, bdata in scratch_blocks.items():
        opcode = bdata.get("opcode", "")
        btype = OPCODE_TO_BLOCK_TYPE.get(opcode)
        if btype:
            extracted_blocks.append({
                "id": bid,
                "type": btype,
                "fields": {},
                "parentId": bdata.get("parent"),
            })

    title = filename.replace(".sb3", "").replace("_", " ").title()

    return {
        "title": title or "Dự Án Nhập Từ Scratch 3.0",
        "sprite": sprite_state,
        "blocklyXml": blockly_xml,
        "blocks": extracted_blocks,
        "source": "mit_scratch_3",
    }
