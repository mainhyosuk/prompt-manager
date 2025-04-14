from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import sys

# 상위 디렉토리의 모듈을 임포트하기 위한 경로 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import setup_database
from routes.prompt_routes import prompt_bp
from routes.folder_routes import folder_bp
from routes.tag_routes import tag_bp
from routes.settings_routes import settings_bp
from routes.collection_routes import collection_bp

app = Flask(__name__)

# 애플리케이션 컨텍스트 외부에서, 서버 시작 시 1회 실행되도록 함
setup_database()


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


# 블루프린트 등록
app.register_blueprint(prompt_bp)
app.register_blueprint(folder_bp)
app.register_blueprint(tag_bp)
app.register_blueprint(settings_bp)
app.register_blueprint(collection_bp)


# 루트 경로
@app.route("/")
def index():
    return jsonify(
        {"message": "프롬프트 관리 도구 API", "version": "0.1.0", "status": "running"}
    )


if __name__ == "__main__":
    # debug=True 상태에서는 reloader가 동작하여 초기화 코드가 두 번 실행될 수 있으나,
    # database.py 내의 마이그레이션 함수들은 멱등성을 가지므로 문제되지 않음
    app.run(debug=True, port=8000, host="0.0.0.0")
