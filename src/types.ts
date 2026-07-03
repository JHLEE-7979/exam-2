export interface ScoreRecord {
  password: string; // 사번, 학번, 또는 임의 비밀번호
  name: string;      // 성명 (본인 외에는 절대 노출 안 됨)
  rounds: string;    // 회차 목록 (쉼표 구분, 예: "1회차, 2회차, 3회차")
  scores: string;    // 점수 목록 (쉼표 구분, 예: "85, 90, 95")
  average: string;   // 전체 평균
  rank: string;      // 동기 대비 순위 (예: "30명 중 7위" 또는 "7위")
}

export interface AppConfig {
  appsScriptUrl: string; // 구글 Apps Script 웹앱 배포 URL (/exec로 끝남)
  sheetId: string;       // 구글 스프레드시트 ID
  adminPassword: string; // 관리자 페이지 진입 비밀번호
}

export interface ParseResponse {
  success: boolean;
  data?: ScoreRecord[];
  error?: string;
}
