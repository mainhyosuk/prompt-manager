import sqlite3
import os

# 상대 경로에서 절대 경로로 변경
DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../data/prompt_manager.db")
)


def get_db_connection():
    """데이터베이스 연결을 반환합니다."""
    # 데이터 디렉토리가 없으면 생성
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """데이터베이스 및 테이블 초기화"""
    # DB 파일이 이미 존재하는지 확인
    db_exists = os.path.exists(DB_PATH)

    conn = get_db_connection()
    cursor = conn.cursor()

    # 프롬프트 테이블 - is_user_prompt, user_id 컬럼 추가
    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        folder_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_favorite BOOLEAN DEFAULT 0,
        use_count INTEGER DEFAULT 0,
        last_used_at TIMESTAMP,
        memo TEXT,
        is_user_prompt BOOLEAN DEFAULT 0, -- 사용자 추가 프롬프트 여부
        user_id TEXT, -- 사용자 식별자 (추후 확장 가능성 고려하여 TEXT)
        FOREIGN KEY (folder_id) REFERENCES folders(id)
    )
    """
    )

    # 폴더 테이블 - position 필드 추가됨
    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES folders(id)
    )
    """
    )

    # 태그 테이블
    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT 'blue'
    )
    """
    )

    # 프롬프트-태그 관계 테이블
    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS prompt_tags (
        prompt_id INTEGER,
        tag_id INTEGER,
        PRIMARY KEY (prompt_id, tag_id),
        FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
    """
    )

    # 변수 테이블
    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS variables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prompt_id INTEGER,
        name TEXT NOT NULL,
        default_value TEXT,
        FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
    )
    """
    )

    # 설정 테이블 추가
    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        theme TEXT DEFAULT 'light',
        backup_path TEXT,
        auto_backup BOOLEAN DEFAULT 0,
        backup_interval INTEGER DEFAULT 7
    )
    """
    )

    # 컬렉션 테이블 추가
    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """
    )

    # 컬렉션-프롬프트 관계 테이블 추가
    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS collection_prompts (
        collection_id INTEGER,
        prompt_id INTEGER,
        position INTEGER DEFAULT 0,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (collection_id, prompt_id),
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
        FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
    )
    """
    )

    conn.commit()

    # 기존 DB가 없는 경우에만 기본 데이터 추가
    if not db_exists:
        create_default_data(conn)
        migrate_folder_positions(conn)
    else:
        # 기졸 DB에는 폴더 위치 속성만 마이그레이션
        migrate_folder_positions(conn)

    conn.close()


def migrate_folder_positions(conn=None):
    """폴더의 position 속성을 초기화합니다."""
    if conn is None:
        conn = get_db_connection()
        should_close = True
    else:
        should_close = False

    cursor = conn.cursor()

    try:
        # position 칼럼이 존재하는지 확인
        cursor.execute("PRAGMA table_info(folders)")
        columns = [column["name"] for column in cursor.fetchall()]

        # position 필드가 없다면 추가
        if "position" not in columns:
            try:
                cursor.execute(
                    "ALTER TABLE folders ADD COLUMN position INTEGER DEFAULT 0"
                )
                print("폴더 테이블에 position 필드가 추가되었습니다.")
            except Exception as e:
                print(f"position 필드 추가 실패: {str(e)}")

        # 이미 position 값이 설정되어 있는지 확인
        cursor.execute(
            "SELECT COUNT(*) FROM folders WHERE position IS NULL OR position = 0"
        )
        count = cursor.fetchone()[0]

        # position 값을 초기화 (부모 폴더별로 동일한 레벨의 형제 폴더들에게 고유한 position 값 부여)
        if count > 0:
            # 먼저 기본 폴더(모든 프롬프트, 즐겨찾기)의 position 값을 명시적으로 설정
            cursor.execute(
                """
                UPDATE folders
                SET position = CASE
                    WHEN name = '모든 프롬프트' THEN 0
                    WHEN name = '즐겨찾기' THEN 1
                    ELSE position
                END
                WHERE name IN ('모든 프롬프트', '즐겨찾기')
                """
            )

            # 다음으로 다른 최상위 폴더 정렬
            cursor.execute(
                """
                SELECT id FROM folders 
                WHERE parent_id IS NULL AND name NOT IN ('모든 프롬프트', '즐겨찾기')
                ORDER BY name
                """
            )
            root_folders = cursor.fetchall()

            # 기본 폴더 다음 위치부터 시작 (position 2부터)
            start_position = 2
            for idx, folder in enumerate(root_folders):
                cursor.execute(
                    "UPDATE folders SET position = ? WHERE id = ?",
                    (start_position + idx, folder["id"]),
                )

            # 그 다음 하위 폴더들 정렬
            cursor.execute(
                """
                SELECT DISTINCT parent_id FROM folders 
                WHERE parent_id IS NOT NULL
                """
            )
            parent_ids = cursor.fetchall()

            for parent in parent_ids:
                parent_id = parent["parent_id"]

                cursor.execute(
                    """
                    SELECT id FROM folders 
                    WHERE parent_id = ? 
                    ORDER BY name
                    """,
                    (parent_id,),
                )
                child_folders = cursor.fetchall()

                for idx, folder in enumerate(child_folders):
                    cursor.execute(
                        "UPDATE folders SET position = ? WHERE id = ?",
                        (idx, folder["id"]),
                    )

            conn.commit()
            print("폴더의 position 값이 성공적으로 초기화되었습니다.")

    except Exception as e:
        conn.rollback()
        print(f"폴더 position 마이그레이션 오류: {str(e)}")

    if should_close:
        conn.close()


def create_default_data(conn=None):
    """기본 폴더, 태그, 설정 데이터를 생성합니다. 이미 존재하는 경우 생성하지 않습니다."""
    if conn is None:
        conn = get_db_connection()
        should_close = True
    else:
        should_close = False

    cursor = conn.cursor()

    # 기본 폴더 생성 (아직 없는 경우에만)
    cursor.execute("SELECT COUNT(*) FROM folders WHERE name = '모든 프롬프트'")
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            "INSERT INTO folders (name, parent_id, position) VALUES ('모든 프롬프트', NULL, 0)"
        )
        cursor.execute(
            "INSERT INTO folders (name, parent_id, position) VALUES ('즐겨찾기', NULL, 1)"
        )
        cursor.execute(
            "INSERT INTO folders (name, parent_id, position) VALUES ('업무', NULL, 2)"
        )
        cursor.execute(
            "INSERT INTO folders (name, parent_id, position) VALUES ('개인', NULL, 3)"
        )

        # 업무 폴더의 ID 가져오기
        cursor.execute("SELECT id FROM folders WHERE name = '업무'")
        work_folder_id = cursor.fetchone()[0]

        # 업무 폴더의 하위 폴더 생성
        cursor.execute(
            "INSERT INTO folders (name, parent_id, position) VALUES ('마케팅', ?, 0)",
            (work_folder_id,),
        )
        cursor.execute(
            "INSERT INTO folders (name, parent_id, position) VALUES ('개발', ?, 1)",
            (work_folder_id,),
        )

    # 기본 태그 생성 (아직 없는 경우에만)
    for tag_data in [
        ("GPT-4", "blue"),
        ("Claude", "sky"),
        ("요약", "green"),
        ("번역", "amber"),
        ("코드생성", "purple"),
        ("마케팅", "pink"),
        ("개발", "red"),
    ]:
        cursor.execute("SELECT COUNT(*) FROM tags WHERE name = ?", (tag_data[0],))
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO tags (name, color) VALUES (?, ?)", tag_data)

    # 기본 설정 생성 (아직 없는 경우에만)
    cursor.execute("SELECT COUNT(*) FROM settings")
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            """
        INSERT INTO settings (theme, backup_path, auto_backup, backup_interval)
        VALUES ('light', NULL, 0, 7)
        """
        )

    # 기본 컬렉션 생성 (아직 없는 경우에만)
    cursor.execute("SELECT COUNT(*) FROM collections")
    if cursor.fetchone()[0] == 0:
        cursor.execute(
            """
        INSERT INTO collections (name)
        VALUES ('자주 사용하는 프롬프트')
        """
        )
        cursor.execute(
            """
        INSERT INTO collections (name)
        VALUES ('유용한 템플릿')
        """
        )

    # 데이터베이스에 변경 사항 반영
    conn.commit()

    if should_close:
        conn.close()


def add_sample_prompts():
    """샘플 프롬프트 데이터 추가 (데이터가 없는 경우에만)"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 이미 프롬프트 데이터가 있는지 확인
    cursor.execute("SELECT COUNT(*) FROM prompts")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    # 필요한 폴더와 태그가 있는지 확인하고 없으면 기본 데이터 생성
    create_default_data(conn)

    # 마케팅 폴더 ID 가져오기
    cursor.execute("SELECT id FROM folders WHERE name = '마케팅'")
    marketing_folder_id = cursor.fetchone()[0]

    # 개발 폴더 ID 가져오기
    cursor.execute("SELECT id FROM folders WHERE name = '개발'")
    dev_folder_id = cursor.fetchone()[0]

    # 태그 ID 가져오기
    cursor.execute("SELECT id FROM tags WHERE name = '요약'")
    summary_tag_id = cursor.fetchone()[0]

    cursor.execute("SELECT id FROM tags WHERE name = 'GPT-4'")
    gpt4_tag_id = cursor.fetchone()[0]

    cursor.execute("SELECT id FROM tags WHERE name = '마케팅'")
    marketing_tag_id = cursor.fetchone()[0]

    cursor.execute("SELECT id FROM tags WHERE name = '개발'")
    dev_tag_id = cursor.fetchone()[0]

    cursor.execute("SELECT id FROM tags WHERE name = '코드생성'")
    code_tag_id = cursor.fetchone()[0]

    cursor.execute("SELECT id FROM tags WHERE name = '번역'")
    translate_tag_id = cursor.fetchone()[0]

    # 샘플 프롬프트 추가
    sample_prompts = [
        {
            "title": "마케팅 콘텐츠 요약",
            "content": "다음 텍스트를 읽고 {요약_길이}개의 핵심 포인트로 요약해주세요...",
            "folder_id": marketing_folder_id,
            "is_favorite": 1,
            "tags": [summary_tag_id, gpt4_tag_id],
            "variables": [("요약_길이", "5")],
        },
        {
            "title": "블로그 아이디어 생성",
            "content": "{주제}에 대한 10가지 블로그 포스트 아이디어를 제안해주세요...",
            "folder_id": marketing_folder_id,
            "is_favorite": 0,
            "tags": [marketing_tag_id, gpt4_tag_id],
            "variables": [("주제", "인공지능")],
        },
        {
            "title": "코드 최적화",
            "content": "다음 {언어} 코드를 최적화해주세요:\n\n```\n{코드}\n```\n\n최적화 관점:\n1. 성능\n2. 가독성\n3. 메모리 사용량",
            "folder_id": dev_folder_id,
            "is_favorite": 1,
            "tags": [code_tag_id, dev_tag_id],
            "variables": [
                ("언어", "JavaScript"),
                ("코드", "// 여기에 코드를 입력하세요"),
            ],
        },
        {
            "title": "영한 번역",
            "content": "다음 영어 텍스트를 한국어로 자연스럽게 번역해주세요:\n\n{영어_텍스트}",
            "folder_id": None,
            "is_favorite": 0,
            "tags": [translate_tag_id],
            "variables": [("영어_텍스트", "Hello, world!")],
        },
    ]

    for prompt in sample_prompts:
        # 프롬프트 추가
        cursor.execute(
            """
            INSERT INTO prompts (title, content, folder_id, is_favorite)
            VALUES (?, ?, ?, ?)
            """,
            (
                prompt["title"],
                prompt["content"],
                prompt["folder_id"],
                prompt["is_favorite"],
            ),
        )
        prompt_id = cursor.lastrowid

        # 태그 연결
        for tag_id in prompt["tags"]:
            cursor.execute(
                "INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)",
                (prompt_id, tag_id),
            )

        # 변수 추가
        for var_name, default_value in prompt["variables"]:
            cursor.execute(
                "INSERT INTO variables (prompt_id, name, default_value) VALUES (?, ?, ?)",
                (prompt_id, var_name, default_value),
            )

    conn.commit()
    conn.close()


def migrate_collections_tables():
    """collections 및 collection_prompts 테이블이 없으면 추가합니다."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # 테이블 목록 확인
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [table[0] for table in cursor.fetchall()]

        # collections 테이블이 없으면 추가
        if "collections" not in tables:
            print("collections 테이블이 없어 새로 생성합니다.")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS collections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            # 기본 컬렉션 추가
            cursor.execute(
                """
                INSERT INTO collections (name)
                VALUES ('자주 사용하는 프롬프트')
                """
            )
            cursor.execute(
                """
                INSERT INTO collections (name)
                VALUES ('유용한 템플릿')
                """
            )
            print("기본 컬렉션이 추가되었습니다.")

        # collection_prompts 테이블이 없으면 추가
        if "collection_prompts" not in tables:
            print("collection_prompts 테이블이 없어 새로 생성합니다.")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS collection_prompts (
                    collection_id INTEGER,
                    prompt_id INTEGER,
                    position INTEGER DEFAULT 0,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (collection_id, prompt_id),
                    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
                    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
                )
                """
            )
            print("collection_prompts 테이블이 추가되었습니다.")

        conn.commit()

    except Exception as e:
        conn.rollback()
        print(f"컬렉션 테이블 마이그레이션 오류: {str(e)}")
    finally:
        conn.close()


def migrate_memo_field():
    """prompts 테이블에 memo 필드가 없으면 추가합니다."""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # memo 칼럼이 존재하는지 확인
        cursor.execute("PRAGMA table_info(prompts)")
        columns = [column[1] for column in cursor.fetchall()]

        # memo 필드가 없다면 추가
        if "memo" not in columns:
            try:
                cursor.execute("ALTER TABLE prompts ADD COLUMN memo TEXT")
                conn.commit()
                print("프롬프트 테이블에 memo 필드가 추가되었습니다.")
            except Exception as e:
                print(f"memo 필드 추가 실패: {str(e)}")

    except Exception as e:
        print(f"memo 필드 마이그레이션 오류: {str(e)}")
    finally:
        conn.close()


# --- 사용자 프롬프트 필드 마이그레이션 함수 추가 ---
def migrate_user_prompt_fields():
    """prompts 테이블에 is_user_prompt 와 user_id 필드가 없으면 추가합니다."""
    print("--- DEBUG: migrate_user_prompt_fields 함수 시작 ---")  # DEBUG LOG 추가
    conn = None  # conn 초기화
    should_commit = False
    try:
        print("--- DEBUG: DB 연결 시도 ---")  # DEBUG LOG 추가
        conn = get_db_connection()
        print("--- DEBUG: DB 연결 성공 ---")  # DEBUG LOG 추가
        cursor = conn.cursor()

        print("--- DEBUG: PRAGMA table_info(prompts) 실행 전 ---")  # DEBUG LOG 추가
        # 현재 prompts 테이블의 컬럼 정보 가져오기
        cursor.execute("PRAGMA table_info(prompts)")
        columns = [column[1] for column in cursor.fetchall()]
        print(f"--- DEBUG: 현재 컬럼 목록: {columns} ---")  # DEBUG LOG 추가

        # is_user_prompt 필드가 없다면 추가
        if "is_user_prompt" not in columns:
            print(
                "--- DEBUG: is_user_prompt 컬럼 없음, 추가 시도 ---"
            )  # DEBUG LOG 추가
            try:
                cursor.execute(
                    "ALTER TABLE prompts ADD COLUMN is_user_prompt BOOLEAN DEFAULT 0"
                )
                print("--- DEBUG: is_user_prompt 컬럼 추가 성공 ---")  # DEBUG LOG 추가
                print(
                    "프롬프트 테이블에 is_user_prompt 필드가 추가되었습니다."
                )  # 기존 로그 유지
                should_commit = True
            except Exception as e:
                print(
                    f"--- DEBUG: is_user_prompt 컬럼 추가 실패: {str(e)} ---"
                )  # DEBUG LOG 추가
                print(f"is_user_prompt 필드 추가 실패: {str(e)}")  # 기존 로그 유지
        else:
            print("--- DEBUG: is_user_prompt 컬럼 이미 존재 ---")  # DEBUG LOG 추가

        # user_id 필드가 없다면 추가
        if "user_id" not in columns:
            print("--- DEBUG: user_id 컬럼 없음, 추가 시도 ---")  # DEBUG LOG 추가
            try:
                # 사용자 ID는 NULL을 허용합니다.
                cursor.execute("ALTER TABLE prompts ADD COLUMN user_id TEXT")
                print("--- DEBUG: user_id 컬럼 추가 성공 ---")  # DEBUG LOG 추가
                print(
                    "프롬프트 테이블에 user_id 필드가 추가되었습니다."
                )  # 기존 로그 유지
                should_commit = True
            except Exception as e:
                print(
                    f"--- DEBUG: user_id 컬럼 추가 실패: {str(e)} ---"
                )  # DEBUG LOG 추가
                print(f"user_id 필드 추가 실패: {str(e)}")  # 기존 로그 유지
        else:
            print("--- DEBUG: user_id 컬럼 이미 존재 ---")  # DEBUG LOG 추가

        if should_commit:
            print("--- DEBUG: 변경 사항 커밋 시도 ---")  # DEBUG LOG 추가
            conn.commit()
            print("--- DEBUG: 변경 사항 커밋 완료 ---")  # DEBUG LOG 추가
        else:
            print("--- DEBUG: 커밋할 변경 사항 없음 ---")  # DEBUG LOG 추가

    except Exception as e:
        print(f"--- DEBUG: 마이그레이션 중 예외 발생: {str(e)} ---")  # DEBUG LOG 추가
        print(f"사용자 프롬프트 필드 마이그레이션 오류: {str(e)}")  # 기존 로그 유지
    finally:
        if conn:
            print("--- DEBUG: DB 연결 종료 ---")  # DEBUG LOG 추가
            conn.close()
        else:
            print("--- DEBUG: DB 연결 객체 없음 ---")  # DEBUG LOG 추가
        print("--- DEBUG: migrate_user_prompt_fields 함수 종료 ---")  # DEBUG LOG 추가


# --- 마이그레이션 함수 추가 끝 ---


# 데이터베이스 초기화 함수 - 애플리케이션 시작 시 호출
def setup_database():
    """데이터베이스 초기화 및 필요한 경우 샘플 데이터 추가"""
    try:
        # 데이터베이스 존재 여부 확인
        db_exists = os.path.exists(DB_PATH)

        # 데이터 디렉토리가 없으면 생성
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

        # 데이터베이스 및 테이블 생성
        init_db()

        # memo 필드 마이그레이션
        migrate_memo_field()

        # collections 테이블 마이그레이션
        migrate_collections_tables()

        # --- 사용자 프롬프트 필드 마이그레이션 호출 추가 ---
        migrate_user_prompt_fields()
        # --- 호출 추가 끝 ---

        # 데이터베이스가 새로 생성된 경우에만 샘플 프롬프트 추가
        if not db_exists:
            add_sample_prompts()
            print(f"새 데이터베이스 생성됨: {DB_PATH}")
        else:
            print(f"기존 데이터베이스 사용 중: {DB_PATH}")

        return True
    except Exception as e:
        print(f"데이터베이스 설정 오류: {str(e)}")
        return False
