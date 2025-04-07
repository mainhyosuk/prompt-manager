from flask import Blueprint, jsonify, request
from db.database import get_db_connection

tag_bp = Blueprint("tags", __name__)


# 모든 태그 가져오기
@tag_bp.route("/api/tags", methods=["GET"])
def get_tags():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 태그 기본 정보와 사용 횟수 가져오기
    cursor.execute(
        """
        SELECT t.id, t.name, t.color, COUNT(pt.prompt_id) as count
        FROM tags t
        LEFT JOIN prompt_tags pt ON t.id = pt.tag_id
        GROUP BY t.id
        ORDER BY t.name
    """
    )

    tags = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return jsonify(tags)


# 태그 생성
@tag_bp.route("/api/tags", methods=["POST"])
def create_tag():
    data = request.json

    # 필수 필드 검증
    if not data.get("name"):
        return jsonify({"error": "태그 이름은 필수입니다."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 같은 이름의 태그가 이미 존재하는지 확인
        cursor.execute("SELECT id FROM tags WHERE name = ?", (data["name"],))
        existing = cursor.fetchone()

        if existing:
            # 이미 있는 태그면 정보 반환
            tag_id = existing["id"]
            cursor.execute(
                "SELECT t.id, t.name, t.color, COUNT(pt.prompt_id) as count FROM tags t LEFT JOIN prompt_tags pt ON t.id = pt.tag_id WHERE t.id = ? GROUP BY t.id",
                (tag_id,),
            )
            tag = dict(cursor.fetchone())

            conn.close()
            return jsonify(tag), 200

        # 새 태그 생성
        cursor.execute(
            "INSERT INTO tags (name, color) VALUES (?, ?)",
            (data["name"], data.get("color", "blue")),
        )

        tag_id = cursor.lastrowid

        conn.commit()

        # 생성된 태그 정보 반환
        tag = {
            "id": tag_id,
            "name": data["name"],
            "color": data.get("color", "blue"),
            "count": 0,
        }

        conn.close()
        return jsonify(tag), 201

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500


# 태그 수정
@tag_bp.route("/api/tags/<int:id>", methods=["PUT"])
def update_tag(id):
    data = request.json

    # 필수 필드 검증
    if not data.get("name"):
        return jsonify({"error": "태그 이름은 필수입니다."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 태그 존재 여부 확인
        cursor.execute("SELECT id FROM tags WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "태그를 찾을 수 없습니다."}), 404

        # 같은 이름의 다른 태그가 이미 존재하는지 확인
        cursor.execute(
            "SELECT id FROM tags WHERE name = ? AND id != ?", (data["name"], id)
        )

        if cursor.fetchone():
            conn.close()
            return jsonify({"error": "같은 이름의 태그가 이미 존재합니다."}), 400

        # 태그 업데이트
        cursor.execute(
            "UPDATE tags SET name = ?, color = ? WHERE id = ?",
            (data["name"], data.get("color", "blue"), id),
        )

        conn.commit()

        # 업데이트된 태그 정보 반환
        cursor.execute(
            "SELECT t.id, t.name, t.color, COUNT(pt.prompt_id) as count FROM tags t LEFT JOIN prompt_tags pt ON t.id = pt.tag_id WHERE t.id = ? GROUP BY t.id",
            (id,),
        )

        updated_tag = dict(cursor.fetchone())

        conn.close()
        return jsonify(updated_tag)

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500


# 태그 삭제
@tag_bp.route("/api/tags/<int:id>", methods=["DELETE"])
def delete_tag(id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 태그 존재 여부 확인
        cursor.execute("SELECT id FROM tags WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "태그를 찾을 수 없습니다."}), 404

        # 태그 삭제 (연결된 prompt_tags 데이터는 CASCADE로 자동 삭제)
        cursor.execute("DELETE FROM tags WHERE id = ?", (id,))

        conn.commit()
        conn.close()
        return jsonify({"message": "태그가 삭제되었습니다.", "id": id})

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500
