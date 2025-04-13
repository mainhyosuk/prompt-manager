from flask import Blueprint, jsonify, request
from db.database import get_db_connection
import datetime

prompt_bp = Blueprint("prompts", __name__)


# 모든 프롬프트 가져오기
@prompt_bp.route("/api/prompts", methods=["GET"])
def get_prompts():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 프롬프트 기본 정보 조회
    cursor.execute(
        """
        SELECT p.id, p.title, p.content, p.folder_id, f.name as folder,
               p.created_at, p.updated_at, p.is_favorite, 
               p.use_count, p.last_used_at, p.memo
        FROM prompts p
        LEFT JOIN folders f ON p.folder_id = f.id
    """
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

        # last_used_at을 보기 좋게 포맷팅
        if prompt["last_used_at"]:
            try:
                # ISO 형식 문자열을 datetime 객체로 변환
                # 타임존 정보가 있는 경우와 없는 경우를 모두 처리
                last_used_at = prompt["last_used_at"]
                if "Z" in last_used_at:
                    last_used_date = datetime.datetime.fromisoformat(
                        last_used_at.replace("Z", "+00:00")
                    )
                elif "+" in last_used_at or "-" in last_used_at and "T" in last_used_at:
                    # 이미 타임존 정보가 있는 경우
                    last_used_date = datetime.datetime.fromisoformat(last_used_at)
                else:
                    # 타임존 정보가 없는 경우, UTC로 가정
                    last_used_date = datetime.datetime.fromisoformat(last_used_at)
                    last_used_date = last_used_date.replace(
                        tzinfo=datetime.timezone.utc
                    )

                # 현재 UTC 시간 가져오기 (tzinfo 유지)
                now = datetime.datetime.now(datetime.timezone.utc)

                # 시간대 정보 확인을 위한 디버깅 출력
                print(f"Last used: {last_used_date}, tzinfo: {last_used_date.tzinfo}")
                print(f"Now: {now}, tzinfo: {now.tzinfo}")

                # 두 시간 모두 tzinfo가 있는지 확인하고 비교
                if last_used_date.tzinfo is None:
                    last_used_date = last_used_date.replace(
                        tzinfo=datetime.timezone.utc
                    )

                delta = now - last_used_date

                if delta.days == 0:
                    if delta.seconds < 60:
                        prompt["last_used"] = "방금 전"
                    elif delta.seconds < 3600:
                        prompt["last_used"] = f"{delta.seconds // 60}분 전"
                    else:
                        prompt["last_used"] = f"{delta.seconds // 3600}시간 전"
                elif delta.days == 1:
                    prompt["last_used"] = "어제"
                elif delta.days < 7:
                    prompt["last_used"] = f"{delta.days}일 전"
                elif delta.days < 30:
                    prompt["last_used"] = f"{delta.days // 7}주 전"
                else:
                    prompt["last_used"] = last_used_date.strftime("%Y-%m-%d")
            except Exception as e:
                # 형식 변환 오류 발생 시 기본값 표시
                print(f"시간 변환 오류: {e}, last_used_at: {prompt['last_used_at']}")
                prompt["last_used"] = "날짜 형식 오류"
        else:
            prompt["last_used"] = "사용 이력 없음"

        prompts.append(prompt)

    conn.close()
    return jsonify(prompts)


# 특정 프롬프트 가져오기
@prompt_bp.route("/api/prompts/<int:id>", methods=["GET"])
def get_prompt(id):
    conn = get_db_connection()
    cursor = conn.cursor()

    # 프롬프트 기본 정보 조회
    cursor.execute(
        """
        SELECT p.id, p.title, p.content, p.folder_id, f.name as folder,
               p.created_at, p.updated_at, p.is_favorite, 
               p.use_count, p.last_used_at, p.memo
        FROM prompts p
        LEFT JOIN folders f ON p.folder_id = f.id
        WHERE p.id = ?
    """,
        (id,),
    )

    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"error": "프롬프트를 찾을 수 없습니다."}), 404

    prompt = dict(row)

    # 태그 조회
    cursor.execute(
        """
        SELECT t.id, t.name, t.color
        FROM tags t
        JOIN prompt_tags pt ON t.id = pt.tag_id
        WHERE pt.prompt_id = ?
    """,
        (id,),
    )

    prompt["tags"] = [dict(tag) for tag in cursor.fetchall()]

    # 변수 조회
    cursor.execute(
        """
        SELECT id, name, default_value
        FROM variables
        WHERE prompt_id = ?
    """,
        (id,),
    )

    prompt["variables"] = [dict(variable) for variable in cursor.fetchall()]

    conn.close()
    return jsonify(prompt)


# 프롬프트 생성
@prompt_bp.route("/api/prompts", methods=["POST"])
def create_prompt():
    data = request.json

    # 필수 필드 검증
    if not data.get("title") or not data.get("content"):
        return jsonify({"error": "제목과 내용은 필수입니다."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        conn.execute("BEGIN")

        # 프롬프트 기본 정보 저장
        cursor.execute(
            """
            INSERT INTO prompts (title, content, folder_id, is_favorite)
            VALUES (?, ?, ?, ?)
        """,
            (
                data["title"],
                data["content"],
                data.get("folder_id"),
                1 if data.get("is_favorite") else 0,
            ),
        )

        prompt_id = cursor.lastrowid

        # 태그 처리
        if "tags" in data and data["tags"]:
            for tag in data["tags"]:
                # 태그 ID가 없으면 새로 생성
                if "id" not in tag:
                    cursor.execute(
                        """
                        INSERT OR IGNORE INTO tags (name, color)
                        VALUES (?, ?)
                    """,
                        (tag["name"], tag.get("color", "blue")),
                    )

                    cursor.execute(
                        """
                        SELECT id FROM tags WHERE name = ?
                    """,
                        (tag["name"],),
                    )

                    tag_id = cursor.fetchone()["id"]
                else:
                    tag_id = tag["id"]

                # 프롬프트-태그 연결
                cursor.execute(
                    """
                    INSERT INTO prompt_tags (prompt_id, tag_id)
                    VALUES (?, ?)
                """,
                    (prompt_id, tag_id),
                )

        # 변수 처리
        if "variables" in data and data["variables"]:
            for variable in data["variables"]:
                cursor.execute(
                    """
                    INSERT INTO variables (prompt_id, name, default_value)
                    VALUES (?, ?, ?)
                """,
                    (prompt_id, variable["name"], variable.get("default_value", "")),
                )

        conn.commit()

        # 새로 생성된 프롬프트 정보 반환
        return get_prompt(prompt_id)

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()


# 프롬프트 업데이트
@prompt_bp.route("/api/prompts/<int:id>", methods=["PUT"])
def update_prompt(id):
    data = request.json

    # 필수 필드 검증
    if not data.get("title") or not data.get("content"):
        return jsonify({"error": "제목과 내용은 필수입니다."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 프롬프트 존재 여부 확인
        cursor.execute("SELECT id FROM prompts WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "프롬프트를 찾을 수 없습니다."}), 404

        conn.execute("BEGIN")

        # 프롬프트 기본 정보 업데이트
        cursor.execute(
            """
            UPDATE prompts
            SET title = ?, content = ?, folder_id = ?, is_favorite = ?, updated_at = datetime('now')
            WHERE id = ?
        """,
            (
                data["title"],
                data["content"],
                data.get("folder_id"),
                1 if data.get("is_favorite") else 0,
                id,
            ),
        )

        # 기존 태그 연결 제거
        cursor.execute("DELETE FROM prompt_tags WHERE prompt_id = ?", (id,))

        # 새 태그 연결
        if "tags" in data and data["tags"]:
            for tag in data["tags"]:
                # 태그 ID가 없으면 새로 생성
                if "id" not in tag:
                    cursor.execute(
                        """
                        INSERT OR IGNORE INTO tags (name, color)
                        VALUES (?, ?)
                    """,
                        (tag["name"], tag.get("color", "blue")),
                    )

                    cursor.execute(
                        """
                        SELECT id FROM tags WHERE name = ?
                    """,
                        (tag["name"],),
                    )

                    tag_id = cursor.fetchone()["id"]
                else:
                    tag_id = tag["id"]

                # 프롬프트-태그 연결
                cursor.execute(
                    """
                    INSERT INTO prompt_tags (prompt_id, tag_id)
                    VALUES (?, ?)
                """,
                    (id, tag_id),
                )

        # 기존 변수 제거
        cursor.execute("DELETE FROM variables WHERE prompt_id = ?", (id,))

        # 새 변수 추가
        if "variables" in data and data["variables"]:
            for variable in data["variables"]:
                cursor.execute(
                    """
                    INSERT INTO variables (prompt_id, name, default_value)
                    VALUES (?, ?, ?)
                """,
                    (id, variable["name"], variable.get("default_value", "")),
                )

        conn.commit()

        # 업데이트된 프롬프트 정보 반환
        return get_prompt(id)

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()


# 프롬프트 삭제 (단일)
@prompt_bp.route("/api/prompts/<int:id>", methods=["DELETE"])
def delete_prompt(id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 프롬프트 존재 여부 확인
        cursor.execute("SELECT id FROM prompts WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "프롬프트를 찾을 수 없습니다."}), 404

        conn.execute("BEGIN")

        # 관련 데이터 삭제 (CASCADE로 처리되지만 명시적으로 작성)
        cursor.execute("DELETE FROM variables WHERE prompt_id = ?", (id,))
        cursor.execute("DELETE FROM prompt_tags WHERE prompt_id = ?", (id,))
        cursor.execute("DELETE FROM prompts WHERE id = ?", (id,))

        conn.commit()

        return jsonify({"message": "프롬프트가 삭제되었습니다.", "id": id})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()


# 여러 프롬프트 삭제 (벌크)
@prompt_bp.route("/api/prompts/bulk-delete", methods=["POST"])
def bulk_delete_prompts():
    data = request.json
    prompt_ids = data.get("ids")

    if not prompt_ids or not isinstance(prompt_ids, list):
        return jsonify({"error": "삭제할 프롬프트 ID 목록(ids)이 필요합니다."}), 400

    if not prompt_ids:  # 빈 배열인 경우
        return jsonify({"message": "삭제할 프롬프트가 없습니다.", "deleted_count": 0})

    conn = get_db_connection()
    cursor = conn.cursor()
    deleted_count = 0

    try:
        conn.execute("BEGIN")

        for prompt_id in prompt_ids:
            # 사용자 추가 프롬프트 ID 형식인지 확인 (문자열이고 'user-added-' 시작)
            # 백엔드에서는 현재 사용자 추가 프롬프트를 직접 처리하지 않으므로,
            # 숫자 ID만 처리하도록 가정하거나, userPromptApi.py와 연동 필요.
            # 여기서는 숫자 ID만 처리하는 것으로 가정합니다.
            if not isinstance(prompt_id, int):
                print(f"Skipping non-integer prompt ID: {prompt_id}")
                continue

            # 프롬프트 존재 여부 확인 (선택 사항, 성능 고려)
            cursor.execute("SELECT id FROM prompts WHERE id = ?", (prompt_id,))
            if not cursor.fetchone():
                print(f"Prompt ID not found, skipping: {prompt_id}")
                continue  # 없는 ID는 건너뜀

            # 관련 데이터 삭제 (CASCADE 설정되어 있다면 prompts 테이블만 삭제해도 됨)
            cursor.execute("DELETE FROM variables WHERE prompt_id = ?", (prompt_id,))
            cursor.execute("DELETE FROM prompt_tags WHERE prompt_id = ?", (prompt_id,))
            # 프롬프트 삭제
            cursor.execute("DELETE FROM prompts WHERE id = ?", (prompt_id,))

            if cursor.rowcount > 0:
                deleted_count += 1

        conn.commit()

        return jsonify(
            {
                "message": f"{deleted_count}개의 프롬프트가 성공적으로 삭제되었습니다.",
                "deleted_count": deleted_count,
            }
        )

    except Exception as e:
        conn.rollback()
        print(f"프롬프트 벌크 삭제 중 오류 발생: {e}")
        return (
            jsonify({"error": f"프롬프트 삭제 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )

    finally:
        conn.close()


# 여러 프롬프트 폴더 이동 (벌크)
@prompt_bp.route("/api/prompts/bulk-move", methods=["POST"])
def bulk_move_prompts():
    data = request.json
    prompt_ids = data.get("promptIds")
    target_folder_id = data.get("targetFolderId")  # null 허용 (최상위 폴더 이동)

    if not prompt_ids or not isinstance(prompt_ids, list):
        return (
            jsonify({"error": "이동할 프롬프트 ID 목록(promptIds)이 필요합니다."}),
            400,
        )
    # targetFolderId는 null일 수 있으므로 필수 체크 제외

    if not prompt_ids:
        return jsonify({"message": "이동할 프롬프트가 없습니다.", "moved_count": 0})

    conn = get_db_connection()
    cursor = conn.cursor()
    moved_count = 0

    try:
        # 대상 폴더 유효성 검사 (targetFolderId가 null이 아닐 때만)
        if target_folder_id is not None:
            cursor.execute("SELECT id FROM folders WHERE id = ?", (target_folder_id,))
            if not cursor.fetchone():
                conn.close()
                return jsonify({"error": "대상 폴더를 찾을 수 없습니다."}), 404

        conn.execute("BEGIN")

        for prompt_id in prompt_ids:
            # 사용자 추가 프롬프트 ID 등 비정수 ID 처리 (삭제와 동일)
            if not isinstance(prompt_id, int):
                print(f"Skipping non-integer prompt ID for move: {prompt_id}")
                continue

            # 프롬프트 업데이트
            cursor.execute(
                """
                UPDATE prompts 
                SET folder_id = ?, updated_at = datetime('now')
                WHERE id = ?
                """,
                (
                    target_folder_id,
                    prompt_id,
                ),  # targetFolderId가 None이면 NULL로 설정됨
            )
            if cursor.rowcount > 0:
                moved_count += 1

        conn.commit()

        return jsonify(
            {
                "message": f"{moved_count}개의 프롬프트가 성공적으로 이동되었습니다.",
                "moved_count": moved_count,
            }
        )

    except Exception as e:
        conn.rollback()
        print(f"프롬프트 벌크 이동 중 오류 발생: {e}")
        return (
            jsonify({"error": f"프롬프트 이동 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )

    finally:
        conn.close()


# 프롬프트 사용 횟수 증가
@prompt_bp.route("/api/prompts/<int:id>/use", methods=["POST"])
def increment_use_count(id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 프롬프트 존재 여부 확인
        cursor.execute("SELECT id FROM prompts WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "프롬프트를 찾을 수 없습니다."}), 404

        # 현재 UTC 시간을 ISO 포맷으로 생성 (Z 포맷 대신 +00:00 사용)
        current_utc_time = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # 디버깅용 로그
        print(f"저장할 시간: {current_utc_time}")

        # 사용 횟수 증가 및 마지막 사용 시간 업데이트
        cursor.execute(
            """
            UPDATE prompts
            SET use_count = use_count + 1, last_used_at = ?
            WHERE id = ?
        """,
            (current_utc_time, id),
        )

        conn.commit()

        return jsonify({"message": "프롬프트 사용 횟수가 증가되었습니다.", "id": id})

    except Exception as e:
        conn.rollback()
        print(f"프롬프트 사용 기록 오류: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()


# 즐겨찾기 토글
@prompt_bp.route("/api/prompts/<int:id>/favorite", methods=["POST"])
def toggle_favorite(id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 프롬프트 존재 여부 및 현재 즐겨찾기 상태 확인
        cursor.execute("SELECT id, is_favorite FROM prompts WHERE id = ?", (id,))
        prompt = cursor.fetchone()

        if not prompt:
            conn.close()
            return jsonify({"error": "프롬프트를 찾을 수 없습니다."}), 404

        # 즐겨찾기 상태 토글
        new_state = 0 if prompt["is_favorite"] else 1

        cursor.execute(
            """
            UPDATE prompts
            SET is_favorite = ?
            WHERE id = ?
        """,
            (new_state, id),
        )

        conn.commit()

        return jsonify(
            {
                "message": "즐겨찾기 상태가 변경되었습니다.",
                "id": id,
                "is_favorite": new_state,
            }
        )

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()


# 모든 프롬프트의 시간 필드 수정 (관리 도구)
@prompt_bp.route("/api/prompts/fix-timestamps", methods=["POST"])
def fix_timestamps():
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 현재 UTC 시간을 ISO 형식으로 가져오기
        current_utc_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
        print(f"기존 시간 데이터 업데이트: {current_utc_time}")

        # 마지막 사용 시간이 있는 모든 프롬프트 조회
        cursor.execute("SELECT id FROM prompts WHERE last_used_at IS NOT NULL")
        prompts = cursor.fetchall()

        # 각 프롬프트의 last_used_at 필드 업데이트
        for prompt in prompts:
            cursor.execute(
                """
                UPDATE prompts
                SET last_used_at = ?
                WHERE id = ?
            """,
                (current_utc_time, prompt["id"]),
            )

        conn.commit()

        updated_count = len(prompts)
        return jsonify(
            {
                "message": f"{updated_count}개의 프롬프트 시간 정보가 업데이트되었습니다.",
                "count": updated_count,
            }
        )

    except Exception as e:
        conn.rollback()
        print(f"시간 데이터 수정 오류: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()


# 프롬프트 복제
@prompt_bp.route("/api/prompts/<int:id>/duplicate", methods=["POST"])
def duplicate_prompt(id):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 원본 프롬프트 정보 가져오기
        cursor.execute(
            """
            SELECT title, content, folder_id, is_favorite
            FROM prompts
            WHERE id = ?
        """,
            (id,),
        )

        prompt = cursor.fetchone()
        if not prompt:
            conn.close()
            return jsonify({"error": "복제할 프롬프트를 찾을 수 없습니다."}), 404

        # 제목에 '복사본' 추가
        new_title = f"{prompt['title']} - 복사본"

        # 트랜잭션 시작
        conn.execute("BEGIN")

        # 새 프롬프트 생성
        cursor.execute(
            """
            INSERT INTO prompts (title, content, folder_id, is_favorite)
            VALUES (?, ?, ?, ?)
        """,
            (new_title, prompt["content"], prompt["folder_id"], prompt["is_favorite"]),
        )

        new_prompt_id = cursor.lastrowid

        # 원본 프롬프트의 태그 정보 복사
        cursor.execute(
            """
            SELECT tag_id
            FROM prompt_tags
            WHERE prompt_id = ?
        """,
            (id,),
        )

        tags = cursor.fetchall()
        for tag in tags:
            cursor.execute(
                """
                INSERT INTO prompt_tags (prompt_id, tag_id)
                VALUES (?, ?)
            """,
                (new_prompt_id, tag["tag_id"]),
            )

        # 원본 프롬프트의 변수 정보 복사
        cursor.execute(
            """
            SELECT name, default_value
            FROM variables
            WHERE prompt_id = ?
        """,
            (id,),
        )

        variables = cursor.fetchall()
        for variable in variables:
            cursor.execute(
                """
                INSERT INTO variables (prompt_id, name, default_value)
                VALUES (?, ?, ?)
            """,
                (new_prompt_id, variable["name"], variable["default_value"]),
            )

        # 변경사항 저장
        conn.commit()

        # 새로 생성된 프롬프트 정보 반환
        return get_prompt(new_prompt_id)

    except Exception as e:
        conn.rollback()
        print(f"프롬프트 복제 오류: {e}")
        return (
            jsonify({"error": f"프롬프트 복제 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )
    finally:
        conn.close()


# 변수 기본값 업데이트
@prompt_bp.route(
    "/api/prompts/<int:id>/variables/<string:variable_name>", methods=["PUT"]
)
def update_variable_default_value(id, variable_name):
    data = request.json

    # 필수 필드 검증
    if "default_value" not in data:
        return jsonify({"error": "기본값은 필수입니다."}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 프롬프트 존재 여부 확인
        cursor.execute("SELECT id FROM prompts WHERE id = ?", (id,))
        if not cursor.fetchone():
            conn.close()
            return jsonify({"error": "프롬프트를 찾을 수 없습니다."}), 404

        # 변수 존재 여부 확인
        cursor.execute(
            """
            SELECT id FROM variables 
            WHERE prompt_id = ? AND name = ?
            """,
            (id, variable_name),
        )
        variable = cursor.fetchone()

        # 트랜잭션 시작
        conn.execute("BEGIN")

        if variable:
            # 기존 변수 업데이트 (updated_at 컬럼 참조 제거)
            cursor.execute(
                """
                UPDATE variables 
                SET default_value = ?
                WHERE id = ?
                """,
                (data["default_value"], variable["id"]),
            )
        else:
            # 변수가 없는 경우 새로 생성
            cursor.execute(
                """
                INSERT INTO variables (prompt_id, name, default_value)
                VALUES (?, ?, ?)
                """,
                (id, variable_name, data["default_value"]),
            )

        # 프롬프트의 업데이트 시간도 갱신
        cursor.execute(
            """
            UPDATE prompts
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (id,),
        )

        # 변경사항 저장
        conn.commit()

        # 업데이트된 프롬프트 정보 반환
        return get_prompt(id)

    except Exception as e:
        conn.rollback()
        print(f"변수 기본값 업데이트 오류: {e}")
        return (
            jsonify(
                {"error": f"변수 기본값 업데이트 중 오류가 발생했습니다: {str(e)}"}
            ),
            500,
        )
    finally:
        conn.close()


# 프롬프트 메모 업데이트
@prompt_bp.route("/api/prompts/<int:id>/memo", methods=["PUT"])
def update_prompt_memo(id):
    data = request.json
    memo = data.get("memo", "")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # memo 컬럼이 존재하는지 확인
        cursor.execute("PRAGMA table_info(prompts)")
        columns = [column[1] for column in cursor.fetchall()]

        if "memo" not in columns:
            # memo 컬럼이 없으면 추가
            cursor.execute("ALTER TABLE prompts ADD COLUMN memo TEXT")

        # 프롬프트 메모 업데이트
        cursor.execute(
            """
            UPDATE prompts SET memo = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (memo, id),
        )

        if cursor.rowcount == 0:
            conn.close()
            return jsonify({"error": "프롬프트를 찾을 수 없습니다."}), 404

        conn.commit()

        # 업데이트된 프롬프트 정보 반환
        cursor.execute(
            """
            SELECT id, title, content, folder_id, is_favorite, memo, updated_at
            FROM prompts
            WHERE id = ?
            """,
            (id,),
        )

        updated_prompt = dict(cursor.fetchone())
        conn.close()

        return jsonify(updated_prompt)

    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"메모 업데이트 오류: {e}")
        return (
            jsonify({"error": f"메모 업데이트 중 오류가 발생했습니다: {str(e)}"}),
            500,
        )
