import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../../data/prompt_manager.db")


def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """데이터베이스 및 테이블 초기화"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 프롬프트 테이블
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
        FOREIGN KEY (folder_id) REFERENCES folders(id)
    )
    """
    )

    # 폴더 테이블
    cursor.execute(
        """
    CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
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

    # 기본 폴더 생성 (아직 없는 경우에만)
    cursor.execute("SELECT COUNT(*) FROM folders WHERE name = '모든 프롬프트'")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO folders (name, parent_id) VALUES ('모든 프롬프트', NULL)")
        cursor.execute("INSERT INTO folders (name, parent_id) VALUES ('즐겨찾기', NULL)")
        cursor.execute("INSERT INTO folders (name, parent_id) VALUES ('업무', NULL)")
        cursor.execute("INSERT INTO folders (name, parent_id) VALUES ('개인', NULL)")

    # 업무 폴더의 ID 가져오기
    cursor.execute("SELECT id FROM folders WHERE name = '업무'")
    work_folder_id = cursor.fetchone()[0]
    
    # 업무 폴더의 하위 폴더 생성
    cursor.execute("SELECT COUNT(*) FROM folders WHERE name = '마케팅'")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO folders (name, parent_id) VALUES ('마케팅', ?)", (work_folder_id,))
        cursor.execute("INSERT INTO folders (name, parent_id) VALUES ('개발', ?)", (work_folder_id,))

    # 기본 태그 생성 (아직 없는 경우에만)
    for tag_data in [
        ('GPT-4', 'blue'), 
        ('Claude', 'sky'), 
        ('요약', 'green'), 
        ('번역', 'amber'), 
        ('코드생성', 'purple'),
        ('마케팅', 'pink'),
        ('개발', 'red')
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

    # 데이터베이스에 변경 사항 반영
    conn.commit()
    conn.close()


def add_sample_prompts():
    """샘플 프롬프트 데이터 추가"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 이미 샘플 데이터가 있는지 확인
    cursor.execute("SELECT COUNT(*) FROM prompts")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

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
            "variables": [("요약_길이", "5")]
        },
        {
            "title": "블로그 아이디어 생성",
            "content": "{주제}에 대한 10가지 블로그 포스트 아이디어를 제안해주세요...",
            "folder_id": marketing_folder_id,
            "is_favorite": 0,
            "tags": [marketing_tag_id, gpt4_tag_id],
            "variables": [("주제", "")]
        },
        {
            "title": "코드 리팩토링 도우미",
            "content": "다음 {언어} 코드를 더 효율적으로 리팩토링해주세요...",
            "folder_id": dev_folder_id,
            "is_favorite": 1,
            "tags": [dev_tag_id, code_tag_id],
            "variables": [("언어", "JavaScript")]
        },
        {
            "title": "기술 문서 번역",
            "content": "다음 기술 문서를 {대상_언어}로 번역해주세요...",
            "folder_id": dev_folder_id,
            "is_favorite": 0,
            "tags": [translate_tag_id, dev_tag_id],
            "variables": [("대상_언어", "한국어")]
        }
    ]

    for prompt in sample_prompts:
        # 프롬프트 추가
        cursor.execute(
            """
            INSERT INTO prompts (title, content, folder_id, is_favorite, created_at, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            """,
            (prompt["title"], prompt["content"], prompt["folder_id"], prompt["is_favorite"])
        )
        prompt_id = cursor.lastrowid

        # 태그 연결
        for tag_id in prompt["tags"]:
            cursor.execute(
                "INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)",
                (prompt_id, tag_id)
            )

        # 변수 추가
        for var_name, var_default in prompt["variables"]:
            cursor.execute(
                "INSERT INTO variables (prompt_id, name, default_value) VALUES (?, ?, ?)",
                (prompt_id, var_name, var_default)
            )

    conn.commit()
    conn.close()


# 데이터베이스 초기화 함수 - 애플리케이션 시작 시 호출
def setup_database():
    init_db()
    add_sample_prompts()