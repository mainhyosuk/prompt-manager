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

app = Flask(__name__)
# 프론트엔드와의 CORS 이슈 해결
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})


# OPTIONS 메서드에 대한 글로벌 라우트 추가
@app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
@app.route("/<path:path>", methods=["OPTIONS"])
def handle_options(path):
    return "", 200


# 데이터베이스 초기화
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
    app.run(debug=True, port=8000)
