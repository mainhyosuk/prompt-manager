from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import sys

# 상위 디렉토리의 모듈을 임포트하기 위한 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import setup_database, DB_PATH
from routes.prompt_routes import prompt_bp
from routes.folder_routes import folder_bp
from routes.tag_routes import tag_bp
from routes.settings_routes import settings_bp

app = Flask(__name__)

# 프론트엔드와의 CORS 이슈 해결
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})


# OPTIONS 메서드에 대한 글로벌 라우트 추가
@app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
@app.route("/<path:path>", methods=["OPTIONS"])
def handle_options(path):
    return "", 200


# 모든 응답에 CORS 헤더 추가
@app.after_request
def add_cors_headers(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    response.headers.add("Access-Control-Allow-Credentials", "true")
    return response


# 데이터베이스 초기화 - 애플리케이션 시작 시 한 번만 실행됨
# 이 함수는 테이블이 없는 경우에만 테이블을 생성하고,
# 기본 데이터가 없는 경우에만 기본 데이터를 삽입합니다.
# 사용자가 추가한 데이터는 유지됩니다.
# 메인 앱에서 이미 초기화된 경우 중복 실행을 방지하기 위해 조건부 초기화
if not os.path.exists(DB_PATH):
    setup_database()

# 블루프린트 등록
app.register_blueprint(prompt_bp)
app.register_blueprint(folder_bp)
app.register_blueprint(tag_bp)
app.register_blueprint(settings_bp)


# 루트 경로
@app.route("/")
def index():
    return jsonify(
        {"message": "프롬프트 관리 도구 API", "version": "0.1.0", "status": "running"}
    )


if __name__ == "__main__":
    app.run(debug=True, port=8000, host="0.0.0.0")
