from flask import Blueprint, jsonify, request
from db.database import get_db_connection, migrate_folder_positions
import sqlite3
import traceback
import json

folder_bp = Blueprint("folders", __name__)


# 모든 폴더 가져오기
@folder_bp.route("/api/folders", methods=["GET"])
def get_folders():
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 특별 폴더 추가 (모든 프롬프트, 즐겨찾기)
        all_prompts_folder = {
            "id": -1,
            "name": "모든 프롬프트",
            "parent_id": None,
            "position": -1,
            "created_at": "",
            "children": [],
        }

        favorites_folder = {
            "id": -2,
            "name": "즐겨찾기",
            "parent_id": None,
            "position": -2,
            "created_at": "",
            "children": [],
        }

        # 모든 프롬프트 개수 계산
        cursor.execute("SELECT COUNT(*) AS count FROM prompts")
        all_prompts_folder["count"] = cursor.fetchone()["count"]
        all_prompts_folder["total_count"] = all_prompts_folder[
            "count"
        ]  # 총 개수는 동일

        # 즐겨찾기 프롬프트 개수 계산
        cursor.execute("SELECT COUNT(*) AS count FROM prompts WHERE is_favorite = 1")
        favorites_folder["count"] = cursor.fetchone()["count"]
        favorites_folder["total_count"] = favorites_folder["count"]  # 총 개수는 동일

        # 사용자 정의 폴더 가져오기
        cursor.execute(
            """
            SELECT id, name, parent_id, position, created_at
            FROM folders
            ORDER BY 
                CASE 
                    WHEN name IN ('모든 프롬프트', '즐겨찾기') THEN 0 
                    ELSE 1 
                END,
                CASE 
                    WHEN parent_id IS NULL THEN 0 
                    ELSE 1 
                END,
                position
        """
        )

        folder_rows = cursor.fetchall()
        folder_dict = {}

        # 폴더별 직접 프롬프트 개수 계산
        for row in folder_rows:
            folder = dict(row)
            cursor.execute(
                "SELECT COUNT(*) AS count FROM prompts WHERE folder_id = ?",
                (folder["id"],),
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

        # 각 레벨에서 폴더를 position 기준으로 정렬하고 total_count 계산
        def process_folders(folders_list):
            if not folders_list:
                return []

            folders_list.sort(key=lambda x: x.get("position", 0))

            for folder in folders_list:
                # 하위 폴더 처리
                if "children" in folder and folder["children"]:
                    folder["children"] = process_folders(folder["children"])

                    # total_count 계산: 자신의 count + 모든 하위 폴더의 total_count 합계
                    children_count = sum(
                        child.get("total_count", 0) for child in folder["children"]
                    )
                    folder["total_count"] = folder.get("count", 0) + children_count
                else:
                    # 하위 폴더가 없는 경우 total_count는 자신의 count와 동일
                    folder["total_count"] = folder.get("count", 0)

            return folders_list

        # 폴더 계층 구조 처리 (한 번만 호출)
        result = process_folders(result)

        # 특별 폴더와 사용자 폴더 합치기
        final_result = []

        # 모든 프롬프트와 즐겨찾기는 맨 앞에 추가
        final_result.append(all_prompts_folder)
        final_result.append(favorites_folder)

        # 사용자 정의 폴더 중 특별 폴더와 이름이 겹치지 않는 것만 추가
        for folder in result:
            if folder["name"] not in ["모든 프롬프트", "즐겨찾기"]:
                final_result.append(folder)

        conn.close()
        return jsonify(final_result)
    except Exception as e:
        print(f"폴더 조회 오류: {str(e)}")
        conn.close()
        return jsonify({"error": str(e)}), 500


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

        # 새 폴더의 position 계산 (같은 부모 아래에서 마지막 위치)
        if data.get("parent_id"):
            cursor.execute(
                "SELECT COALESCE(MAX(position), -1) + 1 AS new_position FROM folders WHERE parent_id = ?",
                (data["parent_id"],),
            )
        else:
            cursor.execute(
                "SELECT COALESCE(MAX(position), -1) + 1 AS new_position FROM folders WHERE parent_id IS NULL"
            )

        new_position = cursor.fetchone()["new_position"]

        # 폴더 생성
        cursor.execute(
            "INSERT INTO folders (name, parent_id, position) VALUES (?, ?, ?)",
            (data["name"], data.get("parent_id"), new_position),
        )

        folder_id = cursor.lastrowid

        conn.commit()

        # 생성된 폴더 정보 반환
        cursor.execute(
            "SELECT id, name, parent_id, position, created_at FROM folders WHERE id = ?",
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


# 폴더 순서 변경
@folder_bp.route("/api/folders/<int:id>/reorder", methods=["PUT"])
def reorder_folder(id):
    data = request.json
    print(f"폴더 순서 변경 요청: id={id}, data={data}")

    # 필수 필드 검증
    if "target_position" not in data or "reference_folder_id" not in data:
        return (
            jsonify({"error": "target_position과 reference_folder_id는 필수입니다."}),
            400,
        )

    target_position = data["target_position"]  # before, after, inside
    reference_folder_id = data["reference_folder_id"]  # 기준 폴더 ID

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 이동할 폴더와 기준 폴더 정보 조회
        cursor.execute(
            "SELECT id, name, parent_id, position FROM folders WHERE id = ?", (id,)
        )
        source_folder = cursor.fetchone()

        if not source_folder:
            conn.close()
            return jsonify({"error": "이동할 폴더를 찾을 수 없습니다."}), 404

        source_folder = dict(source_folder)
        print(f"이동할 폴더 정보: {source_folder}")

        # 기본 폴더는 이동 불가 (모든 프롬프트, 즐겨찾기)
        if source_folder["name"] in ["모든 프롬프트", "즐겨찾기"]:
            conn.close()
            return (
                jsonify(
                    {"error": "모든 프롬프트와 즐겨찾기 폴더는 이동할 수 없습니다."}
                ),
                400,
            )

        # inside 위치 처리 - 폴더 내부로 이동
        if target_position == "inside" and reference_folder_id != "root":
            cursor.execute(
                "SELECT id, name FROM folders WHERE id = ?",
                (reference_folder_id,),
            )
            target_folder = cursor.fetchone()

            if not target_folder:
                conn.close()
                return jsonify({"error": "대상 폴더를 찾을 수 없습니다."}), 404

            # 기본 폴더 내부로 이동 불가 (모든 프롬프트, 즐겨찾기)
            target_folder = dict(target_folder)
            if target_folder["name"] in ["모든 프롬프트", "즐겨찾기"]:
                conn.close()
                return (
                    jsonify(
                        {
                            "error": "모든 프롬프트와 즐겨찾기 폴더 내부로 이동할 수 없습니다."
                        }
                    ),
                    400,
                )

            # 원래 위치에서 폴더들의 position 조정
            if source_folder["parent_id"] is None:
                cursor.execute(
                    """
                    UPDATE folders 
                    SET position = position - 1 
                    WHERE parent_id IS NULL AND position > ? AND name NOT IN ('모든 프롬프트', '즐겨찾기')
                    """,
                    (source_folder["position"],),
                )
            else:
                cursor.execute(
                    """
                    UPDATE folders 
                    SET position = position - 1 
                    WHERE parent_id = ? AND position > ?
                    """,
                    (source_folder["parent_id"], source_folder["position"]),
                )

            # 대상 폴더 내의 마지막 위치 확인
            cursor.execute(
                "SELECT COALESCE(MAX(position), -1) + 1 AS max_position FROM folders WHERE parent_id = ?",
                (reference_folder_id,),
            )
            new_position = cursor.fetchone()["max_position"]

            # 폴더 위치 업데이트
            cursor.execute(
                "UPDATE folders SET parent_id = ?, position = ? WHERE id = ?",
                (reference_folder_id, new_position, id),
            )

            conn.commit()

            # 업데이트된 폴더 정보 반환
            cursor.execute(
                "SELECT id, name, parent_id, position, created_at FROM folders WHERE id = ?",
                (id,),
            )

            updated_folder = dict(cursor.fetchone())

            # 프롬프트 개수 계산
            cursor.execute(
                "SELECT COUNT(*) AS count FROM prompts WHERE folder_id = ?", (id,)
            )
            updated_folder["count"] = cursor.fetchone()["count"]

            conn.close()
            print(f"폴더를 내부로 이동 완료: {updated_folder}")
            return jsonify(updated_folder)

        # 기준 폴더가 'root'인 경우 최상위 레벨로 이동
        if reference_folder_id == "root":
            target_parent_id = None

            # 기본 폴더 이후부터 위치를 시작하도록 함
            cursor.execute(
                """
                SELECT MAX(position) as max_default_position 
                FROM folders 
                WHERE parent_id IS NULL AND name IN ('모든 프롬프트', '즐겨찾기')
                """
            )
            max_default_position = cursor.fetchone()["max_default_position"] or 1

            # 최상위 폴더의 position 계산 방식을 변경
            if target_position == "before":
                # 기본 폴더(모든 프롬프트, 즐겨찾기) 다음 첫 번째 위치로 이동
                cursor.execute(
                    """
                    UPDATE folders 
                    SET position = position + 1 
                    WHERE parent_id IS NULL AND position > ? AND name NOT IN ('모든 프롬프트', '즐겨찾기')
                    """,
                    (max_default_position,),
                )
                new_position = max_default_position + 1
            else:  # after 또는 기본
                cursor.execute(
                    """
                    SELECT COALESCE(MAX(position), ?) + 1 AS max_position 
                    FROM folders 
                    WHERE parent_id IS NULL
                    """,
                    (max_default_position,),
                )
                new_position = cursor.fetchone()["max_position"]

            print(f"최상위 레벨로 이동: 새 위치={new_position}")
        else:
            cursor.execute(
                "SELECT id, name, parent_id, position FROM folders WHERE id = ?",
                (reference_folder_id,),
            )
            reference_folder = cursor.fetchone()

            if not reference_folder:
                conn.close()
                return jsonify({"error": "기준 폴더를 찾을 수 없습니다."}), 404

            reference_folder = dict(reference_folder)
            target_parent_id = reference_folder["parent_id"]
            print(f"기준 폴더 정보: {reference_folder}")

            # 같은 부모 내에서 순서만 변경하는 경우
            if (source_folder["parent_id"] is None and target_parent_id is None) or (
                source_folder["parent_id"] is not None
                and source_folder["parent_id"] == target_parent_id
            ):
                print(
                    f"같은 부모 내에서 순서 변경: 소스 위치={source_folder['position']}, 대상 위치={reference_folder['position']}"
                )

                # 이전 위치보다 이후 위치로 이동하는 경우 (뒤로 이동)
                if (
                    target_position == "after"
                    and source_folder["position"] < reference_folder["position"]
                ):
                    print("뒤로 이동 (이전->이후)")
                    # NULL 값을 처리하는 조건문 수정
                    if target_parent_id is None:
                        cursor.execute(
                            """
                            UPDATE folders 
                            SET position = position - 1 
                            WHERE parent_id IS NULL AND position > ? AND position <= ?
                            """,
                            (
                                source_folder["position"],
                                reference_folder["position"],
                            ),
                        )
                    else:
                        cursor.execute(
                            """
                            UPDATE folders 
                            SET position = position - 1 
                            WHERE parent_id = ? AND position > ? AND position <= ?
                            """,
                            (
                                target_parent_id,
                                source_folder["position"],
                                reference_folder["position"],
                            ),
                        )
                    new_position = reference_folder["position"]
                # 이후 위치보다 이전 위치로 이동하는 경우 (앞으로 이동)
                elif (
                    target_position == "before"
                    and source_folder["position"] > reference_folder["position"]
                ):
                    print("앞으로 이동 (이후->이전)")
                    # NULL 값을 처리하는 조건문 수정
                    if target_parent_id is None:
                        cursor.execute(
                            """
                            UPDATE folders 
                            SET position = position + 1 
                            WHERE parent_id IS NULL AND position >= ? AND position < ?
                            """,
                            (
                                reference_folder["position"],
                                source_folder["position"],
                            ),
                        )
                    else:
                        cursor.execute(
                            """
                            UPDATE folders 
                            SET position = position + 1 
                            WHERE parent_id = ? AND position >= ? AND position < ?
                            """,
                            (
                                target_parent_id,
                                reference_folder["position"],
                                source_folder["position"],
                            ),
                        )
                    new_position = reference_folder["position"]
                # 이전 위치보다 이전 위치로 이동하는 경우
                elif target_position == "before":
                    print("같은 방향 이동 (이전 위치보다 이전)")
                    # NULL 값을 처리하는 조건문 수정
                    if target_parent_id is None:
                        cursor.execute(
                            """
                            UPDATE folders 
                            SET position = position + 1 
                            WHERE parent_id IS NULL AND position >= ? AND position < ?
                            """,
                            (
                                reference_folder["position"],
                                (
                                    source_folder["position"]
                                    if source_folder["position"]
                                    > reference_folder["position"]
                                    else 999999
                                ),
                            ),
                        )
                    else:
                        cursor.execute(
                            """
                            UPDATE folders 
                            SET position = position + 1 
                            WHERE parent_id = ? AND position >= ? AND position < ?
                            """,
                            (
                                target_parent_id,
                                reference_folder["position"],
                                (
                                    source_folder["position"]
                                    if source_folder["position"]
                                    > reference_folder["position"]
                                    else 999999
                                ),
                            ),
                        )
                    new_position = reference_folder["position"]
                # 이후 위치보다 이후 위치로 이동하는 경우
                else:  # after
                    print("같은 방향 이동 (이후 위치보다 이후)")
                    # NULL 값을 처리하는 조건문 수정
                    if target_parent_id is None:
                        cursor.execute(
                            """
                            UPDATE folders 
                            SET position = position - 1 
                            WHERE parent_id IS NULL AND position > ? AND position <= ?
                            """,
                            (
                                (
                                    source_folder["position"]
                                    if source_folder["position"]
                                    < reference_folder["position"]
                                    else -1
                                ),
                                reference_folder["position"],
                            ),
                        )
                    else:
                        cursor.execute(
                            """
                            UPDATE folders 
                            SET position = position - 1 
                            WHERE parent_id = ? AND position > ? AND position <= ?
                            """,
                            (
                                target_parent_id,
                                (
                                    source_folder["position"]
                                    if source_folder["position"]
                                    < reference_folder["position"]
                                    else -1
                                ),
                                reference_folder["position"],
                            ),
                        )
                    new_position = reference_folder["position"]
            else:
                print(
                    f"다른 부모로 이동: 소스 부모={source_folder['parent_id']}, 대상 부모={target_parent_id}"
                )
                # 다른 부모로 이동하는 경우
                # 1. 원래 위치에서 폴더들의 position 조정
                if source_folder["parent_id"] is None:
                    cursor.execute(
                        """
                        UPDATE folders 
                        SET position = position - 1 
                        WHERE parent_id IS NULL AND position > ?
                        """,
                        (source_folder["position"],),
                    )
                else:
                    cursor.execute(
                        """
                        UPDATE folders 
                        SET position = position - 1 
                        WHERE parent_id = ? AND position > ?
                        """,
                        (source_folder["parent_id"], source_folder["position"]),
                    )

                # 2. 새 위치에서 폴더들의 position 조정
                if target_position == "before":
                    if target_parent_id is None:
                        cursor.execute(
                            """
                            UPDATE folders 
                            SET position = position + 1 
                            WHERE parent_id IS NULL AND position >= ?
                            """,
                            (reference_folder["position"],),
                        )
                    else:
                        cursor.execute(
                            """
                            UPDATE folders 
                            SET position = position + 1 
                            WHERE parent_id = ? AND position >= ?
                            """,
                            (target_parent_id, reference_folder["position"]),
                        )
                    new_position = reference_folder["position"]
                else:  # after
                    if target_parent_id is None:
                        cursor.execute(
                            """
                            UPDATE folders 
                            SET position = position + 1 
                            WHERE parent_id IS NULL AND position > ?
                            """,
                            (reference_folder["position"],),
                        )
                    else:
                        cursor.execute(
                            """
                            UPDATE folders 
                            SET position = position + 1 
                            WHERE parent_id = ? AND position > ?
                            """,
                            (target_parent_id, reference_folder["position"]),
                        )
                    new_position = reference_folder["position"] + 1

        # 폴더 위치 업데이트
        print(f"폴더 위치 업데이트: 부모={target_parent_id}, 위치={new_position}")
        cursor.execute(
            "UPDATE folders SET parent_id = ?, position = ? WHERE id = ?",
            (target_parent_id, new_position, id),
        )

        conn.commit()

        # 업데이트된 폴더 정보 반환
        cursor.execute(
            "SELECT id, name, parent_id, position, created_at FROM folders WHERE id = ?",
            (id,),
        )

        updated_folder = dict(cursor.fetchone())

        # 프롬프트 개수 계산
        cursor.execute(
            "SELECT COUNT(*) AS count FROM prompts WHERE folder_id = ?", (id,)
        )
        updated_folder["count"] = cursor.fetchone()["count"]

        conn.close()
        print(f"폴더 순서 변경 완료: {updated_folder}")
        return jsonify(updated_folder)

    except Exception as e:
        print(f"폴더 순서 변경 오류: {str(e)}")
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500


# 폴더 마이그레이션 엔드포인트
@folder_bp.route("/api/folders/migrate", methods=["POST"])
def migrate_folders():
    """폴더 위치 속성 마이그레이션 API"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # position 값이 있는지 확인
        cursor.execute(
            "SELECT COUNT(*) FROM folders WHERE position IS NULL OR position = 0"
        )
        count = cursor.fetchone()[0]

        # position 값이 대부분 설정되어 있으면 마이그레이션 스킵
        if count <= 2:  # 기본 폴더 1-2개만 0이면 이미 마이그레이션된 것으로 간주
            return (
                jsonify({"message": "이미 마이그레이션되었습니다", "migrated": False}),
                200,
            )

        # 마이그레이션 실행
        migrate_folder_positions(conn)
        conn.commit()

        return (
            jsonify(
                {
                    "message": "폴더 위치 속성이 성공적으로 마이그레이션되었습니다",
                    "migrated": True,
                }
            ),
            200,
        )

    except Exception as e:
        if conn:
            conn.rollback()
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@folder_bp.route("/api/folders/migration-needed", methods=["GET"])
def check_migration_needed():
    """폴더 위치 마이그레이션 필요 여부 확인 API"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # position 값이 없는 폴더 개수 확인
        cursor.execute(
            "SELECT COUNT(*) FROM folders WHERE position IS NULL OR position = 0"
        )
        count = cursor.fetchone()[0]

        # position 값이 대부분 설정되어 있으면 마이그레이션 불필요
        migration_needed = (
            count > 2
        )  # 기본 폴더 1-2개만 0이면 이미 마이그레이션된 것으로 간주

        return (
            jsonify({"migrationNeeded": migration_needed, "pendingCount": count}),
            200,
        )

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e), "migrationNeeded": False}), 500
    finally:
        if conn:
            conn.close()
