from flask import Blueprint, jsonify, request
from db.database import get_db_connection

collection_bp = Blueprint("collections", __name__)


# 모든 컬렉션 가져오기
@collection_bp.route("/api/collections", methods=["GET"])
def get_collections():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT c.id, c.name, c.created_at, c.updated_at,
               COUNT(cp.prompt_id) as prompt_count
        FROM collections c
        LEFT JOIN collection_prompts cp ON c.id = cp.collection_id
        GROUP BY c.id
        ORDER BY c.name
    """
    )

    collections = [dict(collection) for collection in cursor.fetchall()]
    conn.close()
    return jsonify(collections)


# 컬렉션 생성
@collection_bp.route("/api/collections", methods=["POST"])
def create_collection():
    data = request.json
    name = data.get("name")

    if not name:
        return jsonify({"error": "컬렉션 이름은 필수입니다."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            """
            INSERT INTO collections (name)
            VALUES (?)
        """,
            (name,),
        )

        collection_id = cursor.lastrowid
        conn.commit()

        # 생성된 컬렉션 정보 조회
        cursor.execute(
            """
            SELECT id, name, created_at, updated_at
            FROM collections
            WHERE id = ?
        """,
            (collection_id,),
        )

        collection = dict(cursor.fetchone())
        conn.close()
        return jsonify(collection)
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": f"컬렉션 생성 오류: {str(e)}"}), 500


# 컬렉션 삭제
@collection_bp.route("/api/collections/<int:id>", methods=["DELETE"])
def delete_collection(id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 컬렉션 존재 여부 확인
        cursor.execute("SELECT id FROM collections WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "컬렉션을 찾을 수 없습니다."}), 404

        # 컬렉션-프롬프트 관계 삭제
        cursor.execute("DELETE FROM collection_prompts WHERE collection_id = ?", (id,))

        # 컬렉션 삭제
        cursor.execute("DELETE FROM collections WHERE id = ?", (id,))
        conn.commit()
        conn.close()

        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": f"컬렉션 삭제 오류: {str(e)}"}), 500


# 컬렉션의 프롬프트 목록 가져오기
@collection_bp.route("/api/collections/<int:id>/prompts", methods=["GET"])
def get_collection_prompts(id):
    conn = get_db_connection()
    cursor = conn.cursor()

    # 컬렉션 존재 여부 확인
    cursor.execute("SELECT id FROM collections WHERE id = ?", (id,))
    if not cursor.fetchone():
        conn.close()
        return jsonify({"error": "컬렉션을 찾을 수 없습니다."}), 404

    # 컬렉션에 속한 프롬프트 조회
    cursor.execute(
        """
        SELECT p.id, p.title, p.content, p.folder_id, f.name as folder,
               p.created_at, p.updated_at, p.is_favorite, 
               p.usage_count, p.last_used_at, p.memo,
               cp.position, cp.added_at
        FROM prompts p
        JOIN collection_prompts cp ON p.id = cp.prompt_id
        LEFT JOIN folders f ON p.folder_id = f.id
        WHERE cp.collection_id = ?
        ORDER BY cp.position
    """,
        (id,),
    )

    prompts = []
    for row in cursor.fetchall():
        prompt = dict(row)

        # 태그 조회
        cursor.execute(
            """
            SELECT t.id, t.name, t.color
            FROM tags t
            JOIN prompt_tags pt ON t.id = pt.tag_id
            WHERE pt.prompt_id = ?
        """,
            (prompt["id"],),
        )

        prompt["tags"] = [dict(tag) for tag in cursor.fetchall()]

        # 변수 조회
        cursor.execute(
            """
            SELECT id, name, default_value
            FROM variables
            WHERE prompt_id = ?
        """,
            (prompt["id"],),
        )

        prompt["variables"] = [dict(variable) for variable in cursor.fetchall()]

        prompts.append(prompt)

    conn.close()
    return jsonify(prompts)


# 프롬프트를 컬렉션에 추가
@collection_bp.route(
    "/api/collections/<int:id>/prompts/<int:prompt_id>", methods=["POST"]
)
def add_prompt_to_collection(id, prompt_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 컬렉션 존재 여부 확인
        cursor.execute("SELECT id FROM collections WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "컬렉션을 찾을 수 없습니다."}), 404

        # 프롬프트 존재 여부 확인
        cursor.execute("SELECT id FROM prompts WHERE id = ?", (prompt_id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "프롬프트를 찾을 수 없습니다."}), 404

        # 이미 컬렉션에 있는지 확인
        cursor.execute(
            "SELECT 1 FROM collection_prompts WHERE collection_id = ? AND prompt_id = ?",
            (id, prompt_id),
        )
        if cursor.fetchone():
            conn.close()
            return jsonify({"error": "이미 컬렉션에 포함된 프롬프트입니다."}), 400

        # 현재 컬렉션의 마지막 position 값 조회
        cursor.execute(
            "SELECT COALESCE(MAX(position), -1) FROM collection_prompts WHERE collection_id = ?",
            (id,),
        )
        last_position = cursor.fetchone()[0]

        # 컬렉션에 프롬프트 추가
        cursor.execute(
            """
            INSERT INTO collection_prompts (collection_id, prompt_id, position)
            VALUES (?, ?, ?)
        """,
            (id, prompt_id, last_position + 1),
        )

        conn.commit()
        conn.close()

        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": f"프롬프트 추가 오류: {str(e)}"}), 500


# 프롬프트를 컬렉션에서 제거
@collection_bp.route(
    "/api/collections/<int:id>/prompts/<int:prompt_id>", methods=["DELETE"]
)
def remove_prompt_from_collection(id, prompt_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 컬렉션 존재 여부 확인
        cursor.execute("SELECT id FROM collections WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "컬렉션을 찾을 수 없습니다."}), 404

        # 컬렉션에서 프롬프트 제거
        cursor.execute(
            "DELETE FROM collection_prompts WHERE collection_id = ? AND prompt_id = ?",
            (id, prompt_id),
        )

        # 컬렉션의 다른 프롬프트 position 값 재정렬
        cursor.execute(
            """
            SELECT prompt_id, position
            FROM collection_prompts
            WHERE collection_id = ?
            ORDER BY position
        """,
            (id,),
        )
        prompts = cursor.fetchall()

        for i, prompt in enumerate(prompts):
            cursor.execute(
                "UPDATE collection_prompts SET position = ? WHERE collection_id = ? AND prompt_id = ?",
                (i, id, prompt["prompt_id"]),
            )

        conn.commit()
        conn.close()

        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": f"프롬프트 제거 오류: {str(e)}"}), 500


# 컬렉션 내 프롬프트 위치 변경
@collection_bp.route("/api/collections/<int:id>/reorder", methods=["PUT"])
def reorder_collection_prompts(id):
    data = request.json
    prompt_ids = data.get("prompt_ids", [])

    if not prompt_ids:
        return jsonify({"error": "프롬프트 ID 목록이 필요합니다."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 컬렉션 존재 여부 확인
        cursor.execute("SELECT id FROM collections WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "컬렉션을 찾을 수 없습니다."}), 404

        # 위치 업데이트
        for position, prompt_id in enumerate(prompt_ids):
            cursor.execute(
                "UPDATE collection_prompts SET position = ? WHERE collection_id = ? AND prompt_id = ?",
                (position, id, prompt_id),
            )

        conn.commit()
        conn.close()

        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": f"위치 변경 오류: {str(e)}"}), 500


# 유사 프롬프트 가져오기
@collection_bp.route("/api/prompts/<int:id>/similar", methods=["GET"])
def get_similar_prompts(id):
    conn = get_db_connection()
    cursor = conn.cursor()

    # 프롬프트 존재 여부 확인
    cursor.execute("SELECT id, folder_id FROM prompts WHERE id = ?", (id,))
    prompt = cursor.fetchone()
    if not prompt:
        conn.close()
        return jsonify({"error": "프롬프트를 찾을 수 없습니다."}), 404

    prompt_id = prompt["id"]
    folder_id = prompt["folder_id"]

    # 프롬프트의 태그 가져오기
    cursor.execute("SELECT tag_id FROM prompt_tags WHERE prompt_id = ?", (prompt_id,))
    prompt_tags = [row["tag_id"] for row in cursor.fetchall()]

    similar_prompts = []
    params = [prompt_id]
    query_parts = []

    # 기본 SELECT 절
    base_select = """
        SELECT p.id, p.title, p.content, p.folder_id, f.name as folder_name, 
               p.is_favorite, p.usage_count, p.last_used_at
        FROM prompts p
        LEFT JOIN folders f ON p.folder_id = f.id
    """

    # 1. 같은 폴더 내 프롬프트 (최대 5개)
    if folder_id:
        folder_query = f" {base_select} WHERE p.folder_id = ? AND p.id != ? ORDER BY p.last_used_at DESC LIMIT 5"
        try:
            cursor.execute(folder_query, (folder_id, prompt_id))
            for row in cursor.fetchall():
                if row["id"] not in [sp["id"] for sp in similar_prompts]: 
                    similar_prompts.append(dict(row))
        except Exception as e:
            print(f"Error executing folder_query: {e}") 

    # 2. 같은 태그를 가진 프롬프트 (최대 5개, 이미 추가된 것 제외)
    if prompt_tags:
        existing_ids_placeholder = ",".join("?" for _ in [sp["id"] for sp in similar_prompts] + [prompt_id])
        
        tag_query = f"""
            {base_select}
            WHERE p.id IN (SELECT DISTINCT pt.prompt_id FROM prompt_tags pt WHERE pt.tag_id IN ({','.join('?' for _ in prompt_tags)}))
        """
        tag_params = list(prompt_tags)

        current_similar_ids = [sp["id"] for sp in similar_prompts]
        all_excluded_ids = [prompt_id] + current_similar_ids

        if all_excluded_ids:
            tag_query += f" AND p.id NOT IN ({','.join('?' for _ in all_excluded_ids)})"
            tag_params.extend(all_excluded_ids)
        
        tag_query += " ORDER BY p.last_used_at DESC LIMIT 5"

        try:
            cursor.execute(tag_query, tag_params)
            for row in cursor.fetchall():
                if row["id"] not in [sp["id"] for sp in similar_prompts]: 
                    similar_prompts.append(dict(row))
        except Exception as e:
            print(f"Error executing tag_query: {e}") 

    # 결과가 5개 미만이면 최근 사용 프롬프트로 채움 (최대 5개, 이미 추가된 것 제외)
    if len(similar_prompts) < 5:
        limit_recent = 5 - len(similar_prompts)
        current_similar_ids = [sp["id"] for sp in similar_prompts]
        all_excluded_ids = [prompt_id] + current_similar_ids

        recent_query_parts = [base_select, "WHERE 1=1"]
        params_recent = []

        if all_excluded_ids:
            recent_query_parts.append(f"AND p.id NOT IN ({','.join('?' for _ in all_excluded_ids)})")
            params_recent.extend(all_excluded_ids)
        
        recent_query_parts.append("ORDER BY p.last_used_at DESC LIMIT ?")
        params_recent.append(limit_recent)

        recent_query = " ".join(recent_query_parts)

        try:
            cursor.execute(recent_query, params_recent)
            for row in cursor.fetchall():
                if row["id"] not in [sp["id"] for sp in similar_prompts]: 
                    similar_prompts.append(dict(row))
        except Exception as e:
            print(f"Error executing recent_query: {e}") 

    # 각 유사 프롬프트에 태그 정보 추가
    for sp in similar_prompts:
        cursor.execute(
            """
            SELECT t.id, t.name, t.color
            FROM tags t
            JOIN prompt_tags pt ON t.id = pt.tag_id
            WHERE pt.prompt_id = ?
            """,
            (sp["id"],)
        )
        sp["tags"] = [dict(tag_row) for tag_row in cursor.fetchall()]

    conn.close()
    return jsonify(similar_prompts)


# 최근 사용 프롬프트 가져오기
@collection_bp.route("/api/prompts/recent", methods=["GET"])
def get_recent_prompts():
    limit = request.args.get("limit", 10, type=int)
    excluded_id = request.args.get("excluded_id", 0, type=int)

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT p.id, p.title, p.content, p.folder_id, f.name as folder,
               p.is_favorite, p.usage_count, p.last_used_at
        FROM prompts p
        LEFT JOIN folders f ON p.folder_id = f.id
        WHERE p.id != ? AND p.last_used_at IS NOT NULL
        ORDER BY p.last_used_at DESC
        LIMIT ?
    """,
        (excluded_id, limit),
    )

    recent_prompts = []
    for row in cursor.fetchall():
        recent_prompt = dict(row)

        # 태그 조회
        cursor.execute(
            """
            SELECT t.id, t.name, t.color
            FROM tags t
            JOIN prompt_tags pt ON t.id = pt.tag_id
            WHERE pt.prompt_id = ?
        """,
            (recent_prompt["id"],),
        )

        recent_prompt["tags"] = [dict(tag) for tag in cursor.fetchall()]
        recent_prompts.append(recent_prompt)

    conn.close()
    return jsonify(recent_prompts)


# 컬렉션 이름 변경
@collection_bp.route("/api/collections/<int:id>", methods=["PATCH"])
def rename_collection(id):
    data = request.json
    new_name = data.get("name")

    if not new_name:
        return jsonify({"error": "새 컬렉션 이름은 필수입니다."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 컬렉션 존재 여부 확인
        cursor.execute("SELECT id FROM collections WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "컬렉션을 찾을 수 없습니다."}), 404

        # 컬렉션 이름 업데이트
        cursor.execute(
            """
            UPDATE collections 
            SET name = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """,
            (new_name, id),
        )

        # 업데이트된 컬렉션 정보 조회
        cursor.execute(
            """
            SELECT id, name, created_at, updated_at
            FROM collections
            WHERE id = ?
        """,
            (id,),
        )

        collection = dict(cursor.fetchone())
        conn.commit()
        conn.close()

        return jsonify(collection)
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": f"컬렉션 이름 변경 오류: {str(e)}"}), 500
