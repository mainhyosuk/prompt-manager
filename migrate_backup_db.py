import sqlite3
import os

# 백업 데이터베이스 파일 경로 (사용자 환경에 맞게 수정될 수 있음)
BACKUP_DB_PATH = "/Users/AhnHyoSuk/Library/Mobile Documents/com~apple~CloudDocs/01_program-dev/03_prompt-manager/data/backups/prompt_manager.db"
# BACKUP_DB_PATH = "data/backups/prompt_manager.db" # 스크립트를 프로젝트 루트에서 실행할 경우 상대 경로


def column_exists(cursor, table_name, column_name):
    """테이블에 특정 컬럼이 존재하는지 확인합니다."""
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    return column_name in columns

def add_column_if_not_exists(cursor, table_name, column_name, column_type):
    """테이블에 컬럼이 없으면 추가합니다."""
    if not column_exists(cursor, table_name, column_name):
        try:
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
            print(f"'{table_name}' 테이블에 '{column_name}' 컬럼을 추가했습니다.")
        except sqlite3.OperationalError as e:
            print(f"오류: '{column_name}' 컬럼 추가 중 문제 발생 - {e}")
            if "duplicate column name" in str(e).lower():
                 print(f"'{column_name}' 컬럼은 이미 존재할 수 있습니다. 확인이 필요합니다.")
            else:
                raise
    else:
        print(f"'{table_name}' 테이블에 '{column_name}' 컬럼이 이미 존재합니다.")


def copy_data_and_drop_old_column(conn, cursor, table_name, old_col, new_col, new_col_type):
    """
    새로운 컬럼을 추가하고 (없으면), 기존 컬럼에서 데이터를 복사한 후, 기존 컬럼을 삭제합니다.
    """
    print(f"\n--- '{old_col}' -> '{new_col}' 마이그레이션 시작 ---")

    # 1. 새로운 컬럼 추가 (없으면)
    add_column_if_not_exists(cursor, table_name, new_col, new_col_type)

    # 2. 기존 컬럼이 존재하는 경우 데이터 복사
    if column_exists(cursor, table_name, old_col):
        try:
            print(f"'{old_col}' 컬럼의 데이터를 '{new_col}' 컬럼으로 복사합니다...")
            cursor.execute(f"UPDATE {table_name} SET {new_col} = {old_col} WHERE {old_col} IS NOT NULL")
            conn.commit()
            print(f"데이터 복사 완료: {cursor.rowcount} 행 업데이트됨.")

            # 3. 기존 컬럼 삭제
            print(f"'{old_col}' 컬럼을 삭제합니다...")
            try:
                cursor.execute(f"ALTER TABLE {table_name} DROP COLUMN {old_col}")
                conn.commit()
                print(f"'{old_col}' 컬럼 삭제 완료.")
            except sqlite3.OperationalError as e:
                print(f"오류: '{old_col}' 컬럼 삭제 중 문제 발생 - {e}")
                print(f"SQLite 버전이 낮아 DROP COLUMN을 지원하지 않을 수 있습니다. 이 경우 수동 확인 및 조치가 필요합니다.")
                print(f"'{old_col}' 컬럼의 데이터는 '{new_col}'로 복사되었으므로, 애플리케이션은 '{new_col}'을 사용해야 합니다.")

        except sqlite3.Error as e:
            print(f"오류: '{old_col}'에서 '{new_col}'로 데이터 이전 중 문제 발생 - {e}")
            conn.rollback()
    else:
        print(f"'{old_col}' 컬럼이 존재하지 않아 데이터 복사 및 삭제를 건너<0xEB><0x9C><0x85>니다.")
    print(f"--- '{old_col}' -> '{new_col}' 마이그레이션 완료 ---")


def main():
    if not os.path.exists(BACKUP_DB_PATH):
        print(f"오류: 백업 데이터베이스 파일 '{BACKUP_DB_PATH}'을(를) 찾을 수 없습니다.")
        return

    conn = None
    try:
        conn = sqlite3.connect(BACKUP_DB_PATH)
        cursor = conn.cursor()
        print(f"'{BACKUP_DB_PATH}'에 연결되었습니다.")

        table_name = "prompts"

        # 1. use_count -> usage_count
        copy_data_and_drop_old_column(conn, cursor, table_name, "use_count", "usage_count", "INTEGER DEFAULT 0")

        # 2. isDeleted -> is_deleted
        copy_data_and_drop_old_column(conn, cursor, table_name, "isDeleted", "is_deleted", "INTEGER DEFAULT 0")

        # 3. deletedAt -> deleted_at
        copy_data_and_drop_old_column(conn, cursor, table_name, "deletedAt", "deleted_at", "TIMESTAMP")

        print("\n모든 마이그레이션 작업이 요청되었습니다.")
        print("출력된 메시지를 확인하여 각 단계가 성공적으로 완료되었는지, 또는 추가 조치가 필요한지 확인하십시오.")

    except sqlite3.Error as e:
        print(f"데이터베이스 작업 중 오류 발생: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()
            print("데이터베이스 연결이 닫혔습니다.")

if __name__ == "__main__":
    print("백업 데이터베이스 스키마 마이그레이션 스크립트를 시작합니다.")
    print(f"대상 파일: {BACKUP_DB_PATH}")
    main()
