from flask import Blueprint, jsonify, request
from db.database import get_db_connection
import os
import json
import shutil
import datetime

settings_bp = Blueprint('settings', __name__)

# 앱 설정 가져오기
@settings_bp.route('/api/settings', methods=['GET'])
def get_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM settings WHERE id = 1')
    settings = cursor.fetchone()
    
    if not settings:
        # 기본 설정 생성
        cursor.execute(
            'INSERT INTO settings (theme, backup_path, auto_backup, backup_interval) VALUES (?, ?, ?, ?)',
            ('light', None, 0, 7)
        )
        conn.commit()
        
        cursor.execute('SELECT * FROM settings WHERE id = 1')
        settings = cursor.fetchone()
    
    conn.close()
    return jsonify(dict(settings))

# 앱 설정 업데이트
@settings_bp.route('/api/settings', methods=['PUT'])
def update_settings():
    data = request.json
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE settings
            SET theme = ?, backup_path = ?, auto_backup = ?, backup_interval = ?
            WHERE id = 1
        ''', (
            data.get('theme', 'light'),
            data.get('backup_path'),
            1 if data.get('auto_backup') else 0,
            data.get('backup_interval', 7)
        ))
        
        conn.commit()
        
        # 업데이트된 설정 반환
        cursor.execute('SELECT * FROM settings WHERE id = 1')
        updated_settings = dict(cursor.fetchone())
        
        conn.close()
        return jsonify(updated_settings)
    
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500

# 데이터베이스 백업
@settings_bp.route('/api/backup', methods=['POST'])
def backup_database():
    data = request.json
    backup_path = data.get('path')
    
    if not backup_path:
        return jsonify({"error": "백업 경로가 제공되지 않았습니다."}), 400
    
    try:
        # 백업 디렉토리 생성
        os.makedirs(backup_path, exist_ok=True)
        
        # 현재 시간을 이용한 백업 파일 이름 생성
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(backup_path, f'prompt_manager_backup_{timestamp}.db')
        
        # 데이터베이스 파일 복사
        from db.database import DB_PATH
        shutil.copy2(DB_PATH, backup_file)
        
        return jsonify({
            "message": "데이터베이스가 성공적으로 백업되었습니다.",
            "backup_file": backup_file
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 데이터베이스 복원
@settings_bp.route('/api/restore', methods=['POST'])
def restore_database():
    data = request.json
    restore_file = data.get('file')
    
    if not restore_file:
        return jsonify({"error": "복원 파일이 제공되지 않았습니다."}), 400
    
    if not os.path.exists(restore_file):
        return jsonify({"error": "제공된 복원 파일을 찾을 수 없습니다."}), 404
    
    try:
        # 현재 데이터베이스 백업
        from db.database import DB_PATH
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = f'{DB_PATH}.bak_{timestamp}'
        shutil.copy2(DB_PATH, backup_file)
        
        # 복원 파일로 대체
        shutil.copy2(restore_file, DB_PATH)
        
        return jsonify({
            "message": "데이터베이스가 성공적으로 복원되었습니다.",
            "original_backup": backup_file
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 프롬프트 내보내기
@settings_bp.route('/api/export', methods=['GET'])
def export_prompts():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 모든 데이터 수집
        # 1. 폴더
        cursor.execute('SELECT * FROM folders')
        folders = [dict(row) for row in cursor.fetchall()]
        
        # 2. 태그
        cursor.execute('SELECT * FROM tags')
        tags = [dict(row) for row in cursor.fetchall()]
        
        # 3. 프롬프트와 관련 데이터
        cursor.execute('SELECT * FROM prompts')
        prompts = []
        
        for row in cursor.fetchall():
            prompt = dict(row)
            
            # 프롬프트에 연결된 태그
            cursor.execute('''
                SELECT t.id, t.name, t.color
                FROM tags t
                JOIN prompt_tags pt ON t.id = pt.tag_id
                WHERE pt.prompt_id = ?
            ''', (prompt['id'],))
            
            prompt['tags'] = [dict(tag) for tag in cursor.fetchall()]
            
            # 프롬프트에 포함된 변수
            cursor.execute('''
                SELECT id, name, default_value
                FROM variables
                WHERE prompt_id = ?
            ''', (prompt['id'],))
            
            prompt['variables'] = [dict(variable) for variable in cursor.fetchall()]
            
            prompts.append(prompt)
        
        # 내보내기 데이터 구성
        export_data = {
            'version': '1.0',
            'timestamp': datetime.datetime.now().isoformat(),
            'folders': folders,
            'tags': tags,
            'prompts': prompts
        }
        
        conn.close()
        return jsonify(export_data)
    
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

# 프롬프트 가져오기
@settings_bp.route('/api/import', methods=['POST'])
def import_prompts():
    data = request.json
    
    if not data:
        return jsonify({"error": "가져올 데이터가 제공되지 않았습니다."}), 400
    
    if 'version' not in data:
        return jsonify({"error": "유효하지 않은 가져오기 파일 형식입니다."}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        conn.execute('BEGIN')
        
        # 1. 폴더 가져오기
        if 'folders' in data:
            for folder in data['folders']:
                # 이미 존재하는 폴더인지 확인
                cursor.execute('SELECT id FROM folders WHERE name = ?', (folder['name'],))
                existing = cursor.fetchone()
                
                if not existing:
                    cursor.execute(
                        'INSERT INTO folders (name, parent_id) VALUES (?, ?)',
                        (folder['name'], folder.get('parent_id'))
                    )
        
        # 2. 태그 가져오기
        if 'tags' in data:
            for tag in data['tags']:
                # 이미 존재하는 태그인지 확인
                cursor.execute('SELECT id FROM tags WHERE name = ?', (tag['name'],))
                existing = cursor.fetchone()
                
                if not existing:
                    cursor.execute(
                        'INSERT INTO tags (name, color) VALUES (?, ?)',
                        (tag['name'], tag.get('color', 'blue'))
                    )
        
        # 3. 프롬프트 가져오기
        imported_count = 0
        
        if 'prompts' in data:
            for prompt in data['prompts']:
                # 폴더 이름으로 ID 조회
                folder_id = None
                if 'folder_name' in prompt:
                    cursor.execute('SELECT id FROM folders WHERE name = ?', (prompt['folder_name'],))
                    folder_result = cursor.fetchone()
                    if folder_result:
                        folder_id = folder_result['id']
                elif 'folder_id' in prompt:
                    folder_id = prompt['folder_id']
                
                # 프롬프트 추가
                cursor.execute('''
                    INSERT INTO prompts (title, content, folder_id, is_favorite)
                    VALUES (?, ?, ?, ?)
                ''', (
                    prompt['title'],
                    prompt['content'],
                    folder_id,
                    prompt.get('is_favorite', 0)
                ))
                
                prompt_id = cursor.lastrowid
                imported_count += 1
                
                # 태그 연결
                if 'tags' in prompt:
                    for tag in prompt['tags']:
                        tag_id = None
                        
                        if 'id' in tag:
                            tag_id = tag['id']
                        else:
                            # 태그 이름으로 ID 조회
                            cursor.execute('SELECT id FROM tags WHERE name = ?', (tag['name'],))
                            tag_result = cursor.fetchone()
                            
                            if tag_result:
                                tag_id = tag_result['id']
                            else:
                                # 새 태그 생성
                                cursor.execute(
                                    'INSERT INTO tags (name, color) VALUES (?, ?)',
                                    (tag['name'], tag.get('color', 'blue'))
                                )
                                tag_id = cursor.lastrowid
                        
                        # 프롬프트-태그 연결
                        if tag_id:
                            cursor.execute(
                                'INSERT INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)',
                                (prompt_id, tag_id)
                            )
                
                # 변수 추가
                if 'variables' in prompt:
                    for variable in prompt['variables']:
                        cursor.execute(
                            'INSERT INTO variables (prompt_id, name, default_value) VALUES (?, ?, ?)',
                            (
                                prompt_id,
                                variable['name'],
                                variable.get('default_value', '')
                            )
                        )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            "message": "데이터 가져오기가 완료되었습니다.",
            "imported_count": imported_count
        })
    
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": str(e)}), 500