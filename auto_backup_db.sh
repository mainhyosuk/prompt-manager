#!/bin/bash

# 백업 디렉토리 경로 확인
BACKUP_DIR="data/backups"
DB_FILE="data/prompt_manager.db"
BACKUP_FILE="$BACKUP_DIR/prompt_manager.db.latest"

# 시작 메시지
echo "데이터베이스 자동 백업을 시작합니다. (1분 간격)"
echo "백업 위치: $BACKUP_FILE"
echo "종료하려면 Ctrl+C를 누르세요."

# 무한 루프로 백업 수행
while true; do
  # 타임스탬프 표시
  TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
  
  # 파일이 존재하는지 확인
  if [ -f "$DB_FILE" ]; then
    # 이전 백업이 없거나 차이가 있는 경우에만 백업
    if [ ! -f "$BACKUP_FILE" ] || ! cmp -s "$DB_FILE" "$BACKUP_FILE"; then
      # 백업 수행
      cp "$DB_FILE" "$BACKUP_FILE"
      echo "[$TIMESTAMP] 데이터베이스가 백업되었습니다: $BACKUP_FILE"
    else
      echo "[$TIMESTAMP] 변경사항 없음. 백업 생략."
    fi
  else
    echo "[$TIMESTAMP] 경고: 데이터베이스 파일이 존재하지 않습니다: $DB_FILE"
  fi
  
  # 1분 대기
  sleep 60
done 