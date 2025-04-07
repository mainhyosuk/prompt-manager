from flask import Blueprint, jsonify, request
from db.database import get_db_connection

folder_bp = Blueprint("folders", __name__)


# 모든 폴더 가져오기
@folder_bp.route("/api/folders", methods=["GET"])
def get_folders():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 기본 폴더 정보 가져오기
    cursor.execute("SELECT id, name, parent_id, created_at FROM folders")
    folder_rows = cursor.fetchall()

    # 프롬프트 개수 계산
    folder_dict = {}
    for row in folder_rows:
        folder = dict(row)
        cursor.execute(
            "SELECT COUNT(*) AS count FROM prompts WHERE folder_id = ?", (folder["id"],)
        )
        folder["count"] = cursor.fetchone()["count"]
        folder_dict[folder["id"]] = folder

    # 폴더 계층 구조 구성
    result = []
    for folder in folder_dict.values():
        if folder["parent_id"] is None:
            # 최상위 폴더
            folder["children"] = []
            result.append(folder)
        else:
            # 하위 폴더
            parent = folder_dict.get(folder["parent_id"])
            if parent:
                if "children" not in parent:
                    parent["children"] = []
                parent["children"].append(folder)

    conn.close()
    return jsonify(result)


# 폴더 생성
@folder_bp.route("/api/folders", methods=["POST"])
def create_folder():
    data = request.json

    # 필수 필드 검증
    if not data.get("name"):
        return jsonify({"error": "폴더 이름은 필수입니다."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 같은 이름의 폴더가 이미 존재하는지 확인
        if data.get("parent_id"):
            cursor.execute(
                "SELECT id FROM folders WHERE name = ? AND parent_id = ?",
                (data["name"], data["parent_id"]),
            )
        else:
            cursor.execute(
                "SELECT id FROM folders WHERE name = ? AND parent_id IS NULL",
                (data["name"],),
            )

        if cursor.fetchone():
            return jsonify({"error": "같은 이름의 폴더가 이미 존재합니다."}), 400

        # 폴더 생성
        cursor.execute(
            "INSERT INTO folders (name, parent_id) VALUES (?, ?)",
            (data["name"], data.get("parent_id")),
        )

        folder_id = cursor.lastrowid

        conn.commit()

        # 생성된 폴더 정보 반환
        cursor.execute(
            "SELECT id, name, parent_id, created_at FROM folders WHERE id = ?",
            (folder_id,),
        )

        new_folder = dict(cursor.fetchone())

        # 프롬프트 개수 (새 폴더는 0)
        new_folder["count"] = 0

        conn.close()
        return jsonify(new_folder)

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500


# 폴더 수정
@folder_bp.route("/api/folders/<int:id>", methods=["PUT"])
def update_folder(id):
    data = request.json

    # 필수 필드 검증
    if not data.get("name"):
        return jsonify({"error": "폴더 이름은 필수입니다."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 폴더 존재 여부 확인
        cursor.execute("SELECT id FROM folders WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "폴더를 찾을 수 없습니다."}), 404

        # 같은 이름의 다른 폴더가 이미 존재하는지 확인
        if data.get("parent_id"):
            cursor.execute(
                "SELECT id FROM folders WHERE name = ? AND parent_id = ? AND id != ?",
                (data["name"], data["parent_id"], id),
            )
        else:
            cursor.execute(
                "SELECT id FROM folders WHERE name = ? AND parent_id IS NULL AND id != ?",
                (data["name"], id),
            )

        if cursor.fetchone():
            conn.close()
            return jsonify({"error": "같은 이름의 폴더가 이미 존재합니다."}), 400

        # 부모-자식 순환 참조 방지
        if data.get("parent_id"):

            def check_cycle(folder_id, target_id):
                if folder_id == target_id:
                    return True

                cursor.execute(
                    "SELECT parent_id FROM folders WHERE id = ?", (folder_id,)
                )
                result = cursor.fetchone()

                if result and result["parent_id"]:
                    return check_cycle(result["parent_id"], target_id)

                return False

            if check_cycle(data["parent_id"], id):
                conn.close()
                return jsonify({"error": "폴더 구조에 순환 참조가 발생합니다."}), 400

        # 폴더 업데이트
        cursor.execute(
            "UPDATE folders SET name = ?, parent_id = ? WHERE id = ?",
            (data["name"], data.get("parent_id"), id),
        )

        conn.commit()

        # 업데이트된 폴더 정보 반환
        cursor.execute(
            "SELECT id, name, parent_id, created_at FROM folders WHERE id = ?", (id,)
        )

        updated_folder = dict(cursor.fetchone())

        # 프롬프트 개수 계산
        cursor.execute(
            "SELECT COUNT(*) AS count FROM prompts WHERE folder_id = ?", (id,)
        )
        updated_folder["count"] = cursor.fetchone()["count"]

        conn.close()
        return jsonify(updated_folder)

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500


# 폴더 삭제
@folder_bp.route("/api/folders/<int:id>", methods=["DELETE"])
def delete_folder(id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 폴더 존재 여부 확인
        cursor.execute("SELECT id FROM folders WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "폴더를 찾을 수 없습니다."}), 404

        # 기본 폴더는 삭제 불가
        cursor.execute(
            'SELECT id FROM folders WHERE id = ? AND name IN ("모든 프롬프트", "즐겨찾기")',
            (id,),
        )
        if cursor.fetchone():
            conn.close()
            return jsonify({"error": "기본 폴더는 삭제할 수 없습니다."}), 400

        # 하위 폴더 확인
        cursor.execute("SELECT id FROM folders WHERE parent_id = ?", (id,))
        if cursor.fetchone():
            conn.close()
            return jsonify({"error": "먼저 하위 폴더를 삭제해주세요."}), 400

        # 폴더 내 프롬프트 확인
        cursor.execute("SELECT id FROM prompts WHERE folder_id = ?", (id,))
        if cursor.fetchone():
            conn.close()
            return (
                jsonify({"error": "폴더 내 프롬프트를 먼저 삭제하거나 이동해주세요."}),
                400,
            )

        # 폴더 삭제
        cursor.execute("DELETE FROM folders WHERE id = ?", (id,))

        conn.commit()
        conn.close()
        return jsonify({"message": "폴더가 삭제되었습니다.", "id": id})

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500
