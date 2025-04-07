import sys
import os
from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QUrl
from PyQt6.QtWebEngineWidgets import QWebEngineView
from db.database import init_db

class PromptManagerApp:
    def __init__(self):
        # 데이터베이스 초기화
        init_db()
        
        # PyQt 애플리케이션 생성
        self.app = QApplication(sys.argv)
        
        # 웹뷰 생성
        self.view = QWebEngineView()
        self.view.setWindowTitle("프롬프트 관리 도구")
        
        # 개발 모드에서는 로컬 서버 URL 사용
        # 배포 시에는 내장된 HTML 파일 사용
        if os.environ.get('DEV_MODE'):
            self.view.load(QUrl("http://localhost:5173"))
        else:
            self.view.load(QUrl.fromLocalFile(
                os.path.join(os.path.dirname(__file__), "../dist/index.html")
            ))
        
        self.view.show()
        
        sys.exit(self.app.exec())

if __name__ == "__main__":
    PromptManagerApp()