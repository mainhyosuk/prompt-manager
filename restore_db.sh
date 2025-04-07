#!/bin/bash

# 백업 파일 경로
BACKUP_DIR="data/backups"
BACKUP_FILE="$BACKUP_DIR/prompt_manager.db.latest"
TARGET_FILE="data/prompt_manager.db"

# 백업 파일 존재 확인
if [ ! -f "$BACKUP_FILE" ]; then
  echo "오류: 백업 파일을 찾을 수 없습니다: $BACKUP_FILE"
  exit 1
fi

# 복원 전 현재 DB 백업 (안전을 위해)
TIMESTAMP=$(date "+%Y%m%d_%H%M%S")
CURRENT_BACKUP="$BACKUP_DIR/prompt_manager.db.before_restore.$TIMESTAMP"

if [ -f "$TARGET_FILE" ]; then
  echo "현재 데이터베이스를 백업합니다: $CURRENT_BACKUP"
  cp "$TARGET_FILE" "$CURRENT_BACKUP"
fi

# 백업에서 복원
echo "데이터베이스를 복원합니다..."
cp "$BACKUP_FILE" "$TARGET_FILE"
echo "완료: 데이터베이스가 성공적으로 복원되었습니다."
echo "원본 백업 파일: $BACKUP_FILE" 