// Google Apps Script - Code.gs
// 개인 성적 셀프 조회 도우미용 백엔드 API 스크립트

// [필수 설정] 본인의 구글 스프레드시트 ID 또는 전체 URL을 입력하세요.
// 주소 전체를 붙여넣어도 자동으로 ID만 추출하여 연결해 줍니다!
var SPREADSHEET_ID = "https://docs.google.com/spreadsheets/d/1Uop7Lxelz_tv9S2NiVdFj_snvIrZn7EpJ6tL8enZpw0/edit?gid=0#gid=0";

/**
 * ID 또는 전체 URL에서 순수 스프레드시트 ID만 안전하게 정규식으로 파싱하는 헬퍼 함수
 */
function getPureSheetId(idOrUrl) {
  if (!idOrUrl) return "";
  var trimmed = String(idOrUrl).trim();
  if (trimmed.indexOf("http") === 0) {
    var match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return trimmed;
}

/**
 * GET 요청 처리: 비밀번호를 검증하여 일치하는 1명의 성적 데이터를 필터링해 반환합니다.
 */
function doGet(e) {
  // CORS 프리플라이트 요청 지원을 위한 헤더 설정
  var origin = e.parameter.origin || "*";
  
  try {
    var password = e.parameter.password;
    if (!password) {
      // 브라우저로 직접 접속한 경우 친절한 이용 설명 페이지를 반환합니다.
      return HtmlService.createHtmlOutput(
        "<!DOCTYPE html><html><head><meta charset='utf-8'>" +
        "<meta name='viewport' content='width=device-width, initial-scale=1.5'>" +
        "<title>성적 조회 백엔드 서비스 정상 가동 중</title>" +
        "<style>" +
        "body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; background: #f8fafc; color: #1e293b; padding: 30px; display: flex; justify-content: center; align-items: center; min-height: 80vh; margin: 0; }" +
        ".card { background: #ffffff; border: 1px solid #e2e8f0; padding: 32px; border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); max-width: 520px; width: 100%; box-sizing: border-box; }" +
        "h2 { color: #0f172a; margin-top: 0; font-size: 20px; display: flex; align-items: center; gap: 8px; }" +
        "p { font-size: 14px; line-height: 1.6; color: #475569; }" +
        "code { background: #f1f5f9; color: #4f46e5; padding: 3px 6px; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: bold; word-break: break-all; }" +
        "ol { padding-left: 20px; margin: 20px 0; font-size: 13.5px; color: #334155; }" +
        "li { margin-bottom: 12px; line-height: 1.5; }" +
        ".badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; margin-bottom: 12px; }" +
        "</style>" +
        "</head><body><div class='card'>" +
        "<span class='badge'>Backend Service Active</span>" +
        "<h2>✅ Google Apps Script 백엔드가 정상 작동 중입니다!</h2>" +
        "<p>현재 보시는 화면은 성적표 데이터를 안전하게 처리하기 위한 <b>보안 API 주소</b>입니다. 브라우저로 직접 접속했을 때 이 메세지가 나타나는 것은 <b>정상적이고 안전하게 구동 중임</b>을 뜻합니다.</p>" +
        "<hr style='border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;'>" +
        "<p><b>💡 웹앱 연동 5단계 완료 가이드:</b></p>" +
        "<ol>" +
        "<li>브라우저 주소창에 표시된 이 URL(끝이 <code>/exec</code>로 끝나는 전체 주소)을 복사하세요.</li>" +
        "<li><b>개인 성적 조회 도우미 웹앱</b>으로 이동하세요.</li>" +
        "<li>화면 우측 상단의 <b>[관리자 콘솔]</b> 메뉴를 누릅니다.</li>" +
        "<li>기본 관리자 패스워드인 <code>admin1234</code>를 입력하고 로그인하세요.</li>" +
        "<li><b>'설정 및 구글 시트 연동'</b> 메뉴에 있는 <b>'Apps Script 배포 웹앱 URL'</b> 입력란에 이 복사한 주소를 붙여넣고 [설정 정보 저장]을 클릭하면 연동이 즉시 완료됩니다!</li>" +
        "</ol>" +
        "<p style='font-size:12px; color:#94a3b8; text-align:center; margin-top:20px;'>개인 성적 셀프 조회 도우미 • Secure Personal Score System</p>" +
        "</div></body></html>"
      );
    }

    // 앱에서 스프레드시트 ID를 동적으로 보낼 수 있도록 지원 (설정 편의성 제공)
    var rawSheetId = e.parameter.sheetId || SPREADSHEET_ID;
    var sheetId = getPureSheetId(rawSheetId);
    
    if (!sheetId || sheetId === "YOUR_SPREADSHEET_ID_HERE") {
      return createJsonResponse({ 
        success: false, 
        error: "스프레드시트 ID가 설정되지 않았습니다. Apps Script의 SPREADSHEET_ID를 작성하거나 조회 창에서 설정해주세요." 
      });
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0]; // 첫 번째 시트 사용
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createJsonResponse({ success: false, error: "등록된 성적 데이터가 없습니다. 먼저 성적 데이터를 등록해주세요." });
    }

    var headers = data[0].map(function(h) { return String(h).trim(); });
    
    // 1. 비밀번호(비번) 컬럼 인덱스 찾기 (기본값: K열 = index 10)
    var pwdIdx = -1;
    for (var k = 0; k < headers.length; k++) {
      var h = headers[k];
      if (h.indexOf("비밀번호") !== -1 || h.indexOf("비번") !== -1 || h === "Password" || h === "password" || h === "패스워드") {
        pwdIdx = k;
        break;
      }
    }
    if (pwdIdx === -1) {
      if (headers.length >= 11) {
        pwdIdx = 10; // K열 (index 10)
      } else {
        pwdIdx = 0; // fallback to Column A
      }
    }

    // 2. 사번 컬럼 찾기 (기본값: A열 = index 0)
    var idIdx = -1;
    for (var k = 0; k < headers.length; k++) {
      var h = headers[k];
      if (h.indexOf("사번") !== -1 || h.indexOf("학번") !== -1 || h === "ID" || h === "id" || h === "사원번호" || h === "번호") {
        idIdx = k;
        break;
      }
    }
    if (idIdx === -1) idIdx = 0;

    // 3. 성명 컬럼 찾기 (기본값: B열 = index 1)
    var nameIdx = -1;
    for (var k = 0; k < headers.length; k++) {
      var h = headers[k];
      if (h.indexOf("성명") !== -1 || h.indexOf("이름") !== -1 || h === "Name" || h === "name") {
        nameIdx = k;
        break;
      }
    }
    if (nameIdx === -1) nameIdx = (headers.length > 1) ? 1 : 0;

    // 4. 평균 컬럼 찾기
    var avgIdx = -1;
    for (var k = 0; k < headers.length; k++) {
      var h = headers[k];
      if (h.indexOf("평균") !== -1 || h === "Average" || h === "average" || h === "평균점수") {
        avgIdx = k;
        break;
      }
    }

    // 5. 순위 컬럼 찾기
    var rankIdx = -1;
    for (var k = 0; k < headers.length; k++) {
      var h = headers[k];
      if (h.indexOf("순위") !== -1 || h.indexOf("석차") !== -1 || h === "Rank" || h === "rank") {
        rankIdx = k;
        break;
      }
    }

    // 비밀번호 일치 행 검색 (성적 유출 방지를 위해 단 1명의 데이터만 매칭)
    var matchedRow = null;
    var totalCount = data.length - 1; // 헤더 제외 전체 인원수

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // 비번셀(pwdIdx)과 입력 비밀번호 비교 (문자열 변환 후 공백 제거)
      if (String(row[pwdIdx]).trim() === String(password).trim()) {
        matchedRow = row;
        break;
      }
    }

    if (!matchedRow) {
      // 보안을 위해 상세 오답 원인은 제공하지 않음
      return createJsonResponse({ success: false, error: "일치하는 정보가 없습니다. 비밀번호를 다시 확인해주세요." });
    }

    // 동적 회차/과목 컬럼 추출
    var roundNames = [];
    var roundScores = [];
    for (var j = 0; j < headers.length; j++) {
      if (j === pwdIdx || j === idIdx || j === nameIdx || j === avgIdx || j === rankIdx) {
        continue;
      }
      if (headers[j]) {
        roundNames.push(headers[j]);
        roundScores.push(String(matchedRow[j] !== undefined ? matchedRow[j] : ""));
      }
    }

    // 평균값 구하기
    var averageVal = "";
    if (avgIdx !== -1) {
      averageVal = String(matchedRow[avgIdx]);
    } else {
      var sum = 0;
      var count = 0;
      for (var s = 0; s < roundScores.length; s++) {
        var num = parseFloat(roundScores[s]);
        if (!isNaN(num)) {
          sum += num;
          count++;
        }
      }
      averageVal = count > 0 ? (sum / count).toFixed(1) : "0.0";
    }

    // 순위값 구하기
    var rankVal = "";
    if (rankIdx !== -1) {
      rankVal = String(matchedRow[rankIdx]);
    } else {
      rankVal = "확인 불가";
    }

    // 본인의 데이터 외 다른 사람의 이름이나 정보는 절대 노출 금지 (가이드라인 준수)
    var result = {
      password: String(matchedRow[idIdx]), // 화면 표시는 사번(idIdx)으로 하되, 검증은 K열 비번으로 함
      name: String(matchedRow[nameIdx]),
      rounds: roundNames.join(", "),
      scores: roundScores.join(", "),
      average: averageVal,
      rank: rankVal,
      totalCount: totalCount
    };

    return createJsonResponse({ success: true, data: result });

  } catch (error) {
    return createJsonResponse({ success: false, error: "서버 오류: " + error.toString() });
  }
}

/**
 * POST 요청 처리: 관리자가 업로드한 성적표 원본 데이터를 시트에 덮어쓰기하여 저장합니다.
 */
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: "전송된 데이터가 없습니다." });
    }

    var postData = JSON.parse(e.postData.contents);
    var rows = postData.rows; // 저장할 전체 행 데이터
    var rawSheetId = postData.sheetId || SPREADSHEET_ID;
    var sheetId = getPureSheetId(rawSheetId);

    if (!sheetId || sheetId === "YOUR_SPREADSHEET_ID_HERE") {
      return createJsonResponse({ success: false, error: "스프레드시트 ID가 설정되지 않았습니다." });
    }

    if (!rows || !Array.isArray(rows)) {
      return createJsonResponse({ success: false, error: "전송된 데이터 형식이 올바르지 않습니다. (rows 배열 필요)" });
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0];
    
    // 기존 시트 전체 초기화 (구조화 및 덮어쓰기)
    sheet.clear();
    
    // 헤더 행 작성
    var headers = ["사번(비밀번호)", "성명", "회차", "점수", "평균", "순위"];
    sheet.appendRow(headers);
    
    // 데이터 행 추가
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      sheet.appendRow([
        String(row.password || ""),
        String(row.name || ""),
        String(row.rounds || ""),
        String(row.scores || ""),
        String(row.average || ""),
        String(row.rank || "")
      ]);
    }

    return createJsonResponse({ success: true, count: rows.length });

  } catch (error) {
    return createJsonResponse({ success: false, error: "저장 오류: " + error.toString() });
  }
}

/**
 * JSON 응답 객체 생성 및 MIME 타입 설정
 */
function createJsonResponse(data) {
  var JSONString = JSON.stringify(data);
  return ContentService.createTextOutput(JSONString).setMimeType(ContentService.MimeType.JSON);
}
