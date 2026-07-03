import React, { useState, useEffect } from "react";
import { Check, Copy, HelpCircle, ExternalLink, Globe, Database, Cpu, Loader2, Sparkles } from "lucide-react";

export default function AppsScriptGuide() {
  const [guideMode, setGuideMode] = useState<"all-in-one" | "api-only">("all-in-one");
  
  const [copiedGs, setCopiedGs] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [htmlError, setHtmlError] = useState("");

  // Fetch the compiled single-file HTML on load or mode switch
  const fetchGasHtml = async () => {
    setHtmlLoading(true);
    setHtmlError("");
    try {
      const res = await fetch("/api/gas/html");
      const json = await res.json();
      if (json.success && json.html) {
        setHtmlContent(json.html);
      } else {
        setHtmlError(json.error || "빌드 파일을 읽어오지 못했습니다.");
      }
    } catch (err) {
      setHtmlError("Vite 빌드 결과물을 읽어오는 도중 오류가 발생했습니다.");
    } finally {
      setHtmlLoading(false);
    }
  };

  useEffect(() => {
    if (guideMode === "all-in-one") {
      fetchGasHtml();
    }
  }, [guideMode]);

  // Unified code.gs that can serve BOTH as the Frontend server AND the secure API Backend
  const codeGsAllInOne = `// Google Apps Script - Code.gs (방법 A: 웹앱 & API 통합용)
// 한울교육훈련센터 개인 성적 조회 시스템

var SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE"; // 구글 스프레드시트 ID 또는 전체 URL을 여기에 지정하세요.

function getPureSheetId(idOrUrl) {
  if (!idOrUrl) return "";
  var trimmed = String(idOrUrl).trim();
  if (trimmed.indexOf("http") === 0) {
    var match = trimmed.match(/\\/d\\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return trimmed;
}

function doGet(e) {
  // 1. 만약 비밀번호(password) 파라미터가 URL 주소창에 들어오면 API 데이터 제공 기능을 수행합니다.
  if (e && e.parameter && e.parameter.password) {
    return handleGradeLookup(e);
  }
  
  // 2. 파라미터가 없는 기본 접속인 경우, 업로드된 React SPA 단일 웹앱(Index.html)을 화면에 렌더링합니다.
  try {
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('한울교육훈련센터 성적 조회 시스템')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
  } catch (err) {
    return HtmlService.createHtmlOutput(
      "<div style='font-family:sans-serif; padding: 40px; text-align: center;'>" +
      "<h2>⚠️ Index.html 파일을 찾을 수 없습니다.</h2>" +
      "<p>Apps Script 프로젝트에 <b>Index</b>라는 이름의 HTML 파일을 새로 만들고,</p>" +
      "<p>빌드된 <code>React Frontend HTML 코드</code>를 붙여넣어 주셨는지 확인하세요.</p>" +
      "<small style='color:#777'>에러 메시지: " + err.toString() + "</small>" +
      "</div>"
    );
  }
}

// 비밀번호 기반 성적 검색 엔진
function handleGradeLookup(e) {
  try {
    var password = e.parameter.password;
    var rawSheetId = e.parameter.sheetId || SPREADSHEET_ID;
    var sheetId = getPureSheetId(rawSheetId);
    
    if (!sheetId || sheetId === "YOUR_SPREADSHEET_ID_HERE") {
      return createJsonResponse({ 
        success: false, 
        error: "스프레드시트 ID가 설정되지 않았습니다. Apps Script 상단의 SPREADSHEET_ID 변수를 채워주시거나 관리자 콘솔에서 설정해주세요." 
      });
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createJsonResponse({ success: false, error: "구글 시트에 등록된 성적 데이터가 없습니다." });
    }

    var headers = data[0].map(function(h) { return String(h).trim(); });
    
    // 비밀번호 컬럼 탐색
    var pwdIdx = -1;
    for (var k = 0; k < headers.length; k++) {
      var h = headers[k];
      if (h.indexOf("비밀번호") !== -1 || h.indexOf("비번") !== -1 || h === "Password" || h === "password" || h === "패스워드") {
        pwdIdx = k;
        break;
      }
    }
    if (pwdIdx === -1) pwdIdx = headers.length >= 11 ? 10 : 0;

    // 사번 컬럼 탐색
    var idIdx = -1;
    for (var k = 0; k < headers.length; k++) {
      var h = headers[k];
      if (h.indexOf("사번") !== -1 || h.indexOf("학번") !== -1 || h === "ID" || h === "id" || h === "사원번호" || h === "번호") {
        idIdx = k;
        break;
      }
    }
    if (idIdx === -1) idIdx = 0;

    // 성명 컬럼 탐색
    var nameIdx = -1;
    for (var k = 0; k < headers.length; k++) {
      var h = headers[k];
      if (h.indexOf("성명") !== -1 || h.indexOf("이름") !== -1 || h === "Name" || h === "name") {
        nameIdx = k;
        break;
      }
    }
    if (nameIdx === -1) nameIdx = (headers.length > 1) ? 1 : 0;

    // 평균 컬럼 탐색
    var avgIdx = -1;
    for (var k = 0; k < headers.length; k++) {
      var h = headers[k];
      if (h.indexOf("평균") !== -1 || h === "Average" || h === "average" || h === "평균점수") {
        avgIdx = k;
        break;
      }
    }

    // 순위 컬럼 탐색
    var rankIdx = -1;
    for (var k = 0; k < headers.length; k++) {
      var h = headers[k];
      if (h.indexOf("순위") !== -1 || h.indexOf("석차") !== -1 || h === "Rank" || h === "rank") {
        rankIdx = k;
        break;
      }
    }

    var matchedRow = null;
    var totalCount = data.length - 1;

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (String(row[pwdIdx]).trim() === String(password).trim()) {
        matchedRow = row;
        break;
      }
    }

    if (!matchedRow) {
      return createJsonResponse({ success: false, error: "일치하는 성적 정보가 존재하지 않습니다." });
    }

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

    var rankVal = "";
    if (rankIdx !== -1) {
      rankVal = String(matchedRow[rankIdx]);
    } else {
      rankVal = "확인 불가";
    }

    var result = {
      password: String(matchedRow[idIdx]),
      name: String(matchedRow[nameIdx]),
      rounds: roundNames.join(", "),
      scores: roundScores.join(", "),
      average: averageVal,
      rank: rankVal,
      totalCount: totalCount
    };

    return createJsonResponse({ success: true, data: result });

  } catch (error) {
    return createJsonResponse({ success: false, error: "서버 처리 에러: " + error.toString() });
  }
}

// 관리자 데이터 저장 기능 (POST)
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: "전송된 데이터가 없습니다." });
    }

    var postData = JSON.parse(e.postData.contents);
    var rows = postData.rows;
    var sheetId = postData.sheetId || SPREADSHEET_ID;

    if (!sheetId || sheetId === "YOUR_SPREADSHEET_ID_HERE") {
      return createJsonResponse({ success: false, error: "스프레드시트 ID가 비어있습니다." });
    }

    if (!rows || !Array.isArray(rows)) {
      return createJsonResponse({ success: false, error: "정규화 데이터 포맷이 유효하지 않습니다." });
    }

    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0];
    
    sheet.clear();
    
    var headers = ["사번(비밀번호)", "성명", "회차", "점수", "평균", "순위"];
    sheet.appendRow(headers);
    
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
    return createJsonResponse({ success: false, error: "저장 처리 중 실패: " + error.toString() });
  }
}

function createJsonResponse(data) {
  var JSONString = JSON.stringify(data);
  return ContentService.createTextOutput(JSONString).setMimeType(ContentService.MimeType.JSON);
}`;

  const codeGsApiOnly = `// Google Apps Script - Code.gs (방법 B: API 백엔드 기능 전용)
// 한울교육훈련센터 개인 성적 조회 시스템 용 백엔드

var SPREADSHEET_ID = "YOUR_SPREADSHEET_ID_HERE";

function getPureSheetId(idOrUrl) {
  if (!idOrUrl) return "";
  var trimmed = String(idOrUrl).trim();
  if (trimmed.indexOf("http") === 0) {
    var match = trimmed.match(/\\/d\\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return trimmed;
}

function doGet(e) {
  try {
    var password = e.parameter.password;
    if (!password) {
      return HtmlService.createHtmlOutput(
        "<h1>✅ 백엔드 API 서비스 정상 작동 중</h1>" +
        "<p>이 주소는 스프레드시트 성적을 조회하기 위한 API 엔드포인트입니다.</p>" +
        "<p>해당 /exec URL 주소를 복사해 프론트엔드 관리자 설정 창에 연동하십시오.</p>"
      );
    }

    var rawSheetId = e.parameter.sheetId || SPREADSHEET_ID;
    var sheetId = getPureSheetId(rawSheetId);
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return createJsonResponse({ success: false, error: "성적 데이터가 없습니다." });
    }

    var headers = data[0].map(function(h) { return String(h).trim(); });
    var pwdIdx = 0, idIdx = 0, nameIdx = 1, avgIdx = -1, rankIdx = -1;

    for (var k = 0; k < headers.length; k++) {
      var h = headers[k];
      if (h.indexOf("비밀번호") !== -1 || h.indexOf("비번") !== -1 || h === "Password") pwdIdx = k;
      if (h.indexOf("사번") !== -1 || h.indexOf("학번") !== -1 || h === "ID") idIdx = k;
      if (h.indexOf("성명") !== -1 || h.indexOf("이름") !== -1 || h === "Name") nameIdx = k;
      if (h.indexOf("평균") !== -1) avgIdx = k;
      if (h.indexOf("순위") !== -1 || h.indexOf("석차") !== -1) rankIdx = k;
    }

    var matchedRow = null;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][pwdIdx]).trim() === String(password).trim()) {
        matchedRow = data[i];
        break;
      }
    }

    if (!matchedRow) {
      return createJsonResponse({ success: false, error: "일치하는 성적 정보가 없습니다." });
    }

    var roundNames = [];
    var roundScores = [];
    for (var j = 0; j < headers.length; j++) {
      if (j === pwdIdx || j === idIdx || j === nameIdx || j === avgIdx || j === rankIdx) continue;
      if (headers[j]) {
        roundNames.push(headers[j]);
        roundScores.push(String(matchedRow[j] !== undefined ? matchedRow[j] : ""));
      }
    }

    var averageVal = avgIdx !== -1 ? String(matchedRow[avgIdx]) : "0.0";
    var rankVal = rankIdx !== -1 ? String(matchedRow[rankIdx]) : "확인 불가";

    return createJsonResponse({
      success: true,
      data: {
        password: String(matchedRow[idIdx]),
        name: String(matchedRow[nameIdx]),
        rounds: roundNames.join(", "),
        scores: roundScores.join(", "),
        average: averageVal,
        rank: rankVal
      }
    });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}`;

  const handleCopyGs = () => {
    const code = guideMode === "all-in-one" ? codeGsAllInOne : codeGsApiOnly;
    navigator.clipboard.writeText(code);
    setCopiedGs(true);
    setTimeout(() => setCopiedGs(false), 2000);
  };

  const handleCopyHtml = () => {
    if (!htmlContent) return;
    navigator.clipboard.writeText(htmlContent);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  return (
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-sm space-y-6" id="apps-script-guide-card">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="w-5 h-5 text-slate-800" />
          <div>
            <h3 className="font-bold text-slate-900 text-base">구글 앱스 스크립트(Apps Script) 배포 안내</h3>
            <p className="text-xs text-slate-500 mt-0.5">원클릭으로 구글 시트 기반 완전 무상 독립 배포를 완료하세요.</p>
          </div>
        </div>
        
        {/* Guide Mode Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold" id="gas-guide-mode-selector">
          <button
            onClick={() => setGuideMode("all-in-one")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${
              guideMode === "all-in-one" 
                ? "bg-white text-slate-950 shadow-sm" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>방법 A: 전체 웹앱 배포 (가장 추천)</span>
          </button>
          <button
            onClick={() => setGuideMode("api-only")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition ${
              guideMode === "api-only" 
                ? "bg-white text-slate-950 shadow-sm" 
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>방법 B: 구글 시트 API 연동</span>
          </button>
        </div>
      </div>

      {guideMode === "all-in-one" ? (
        <div className="space-y-4 animate-fade-in" id="all-in-one-guide-content">
          <div className="bg-emerald-50 text-emerald-900 px-4 py-3.5 rounded-xl border border-emerald-200 flex items-start gap-2 text-xs leading-relaxed">
            <Sparkles className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">💡 방법 A (전체 웹앱 배포)의 엄청난 장점:</p>
              <p className="mt-1">인프라 유지 비용이 <strong>완전한 0원(무상)</strong>이며, 구글 스프레드시트 자체에 React 화면과 백엔드가 결합하여 독립 구동합니다. 서버 다운이나 유출 우려 없이 안전하게 성적 검색 사이트를 운용할 수 있습니다.</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs">🚀 5분 완성 웹앱 무상 배포 가이드 :</h4>
            <ol className="list-decimal list-inside space-y-3 text-slate-600 leading-relaxed text-xs pl-1">
              <li>
                <a
                  href="https://docs.google.com/spreadsheets"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  구글 스프레드시트 <ExternalLink className="w-3.5 h-3.5" />
                </a>
                를 새로 생성하고, 브라우저 주소창의 고유 ID를 복사해둡니다.
                <span className="block text-[11px] text-slate-400 pl-4 mt-0.5">예: <code>https://docs.google.com/spreadsheets/d/<b>[스프레드시트_ID]</b>/edit</code></span>
              </li>
              <li>
                스프레드시트 상단 메뉴에서 <strong>확장 프로그램 &gt; Apps Script</strong>를 실행합니다.
              </li>
              <li>
                열린 편집기 창의 기존 코드를 완전히 삭제하고, 아래의 <strong>Code.gs</strong> 전체 코드를 복사해 붙여넣습니다.
                <span className="block text-[11px] text-red-500 font-bold pl-4 mt-0.5">※ 상단의 <code>var SPREADSHEET_ID = "..."</code> 위치에 방금 복사한 스프레드시트 ID를 입력하세요.</span>
              </li>
              <li>
                좌측 상단 <strong>[+] (파일 추가)</strong> 버튼을 눌러 <strong>'HTML'</strong> 파일을 만들고, 파일 이름을 반드시 <strong className="text-blue-600">Index</strong>로 입력합니다. (확장자 .html은 자동 추가됩니다.)
              </li>
              <li>
                새로 만든 <strong className="text-slate-800">Index.html</strong> 파일에 아래의 <strong>Vite 단일 컴파일 React HTML 코드</strong>를 전체 복사하여 붙여넣고 저장합니다.
              </li>
              <li>
                우측 상단 <strong>배포 &gt; 새 배포</strong>를 클릭합니다.
                <ul className="list-disc list-inside pl-5 mt-1 text-slate-500 space-y-1 text-[11px]">
                  <li>유형 선택(톱니바퀴): <strong>웹 앱</strong></li>
                  <li>설명: <code>한울교육훈련센터 성적조회</code></li>
                  <li>다음 사용자 권한으로 실행: <strong>나(본인 구글 계정)</strong></li>
                  <li>액세스 권한이 있는 사용자: <strong className="text-emerald-600 font-bold">모든 사용자(Anyone)</strong></li>
                </ul>
              </li>
              <li>
                배포가 성공하면 <strong>'웹 앱 URL'</strong>이 표시됩니다! 이 주소에 접속하면 전용 도메인 상에서 로그인 및 성적 조회가 완벽히 수행됩니다!
              </li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            {/* GS CODE */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 text-xs">① Code.gs 파일 소스코드</span>
                <button
                  onClick={handleCopyGs}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
                  id="btn-copy-gas-gs-all"
                >
                  {copiedGs ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>코드 복사</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-slate-900 text-slate-300 p-3 rounded-lg overflow-x-auto text-[10px] h-60 leading-relaxed font-mono">
                {codeGsAllInOne}
              </pre>
            </div>

            {/* BUNDLED HTML */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  ② Index.html 파일 소스코드 
                  <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-black uppercase">React 19</span>
                </span>
                <button
                  onClick={handleCopyHtml}
                  disabled={htmlLoading || !htmlContent}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold transition"
                  id="btn-copy-gas-html"
                >
                  {copiedHtml ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>복사 완료!</span>
                    </>
                  ) : htmlLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>읽는 중...</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>HTML 복사</span>
                    </>
                  )}
                </button>
              </div>
              
              {htmlLoading ? (
                <div className="bg-slate-900 rounded-lg h-60 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span>단일 파일 리액트 소스코드를 로드하고 있습니다...</span>
                </div>
              ) : htmlError ? (
                <div className="bg-slate-900 rounded-lg h-60 flex flex-col items-center justify-center p-4 text-center text-red-400 text-xs">
                  <p>{htmlError}</p>
                  <p className="mt-2 text-[10px] text-slate-500">서버 콘솔에서 'npm run build:gas'를 완료해 주세요.</p>
                </div>
              ) : (
                <pre className="bg-slate-900 text-slate-400 p-3 rounded-lg overflow-x-auto text-[10px] h-60 leading-relaxed font-mono">
                  {htmlContent ? htmlContent : "빌드된 내용을 가져오는 데 실패했습니다."}
                </pre>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in" id="api-only-guide-content">
          <div className="bg-slate-100 text-slate-700 px-4 py-3.5 rounded-xl border border-slate-200 flex items-start gap-2 text-xs leading-relaxed">
            <Cpu className="w-4.5 h-4.5 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">방법 B (구글 시트 API 연동):</p>
              <p className="mt-1">React 프론트엔드는 현재 서버(AI Studio 또는 독자적 웹서버)를 계속 유지하고, 사용자 데이터베이스(성적표 보관) 기능만 구글 스프레드시트와 실시간 연동하는 방식입니다.</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs">🚀 API 연동 단계 가이드:</h4>
            <ol className="list-decimal list-inside space-y-2 text-slate-600 leading-relaxed text-xs pl-1">
              <li>
                스프레드시트를 새로 생성하고, 브라우저 주소창의 고유 ID를 복사해둡니다.
              </li>
              <li>
                확장 프로그램 &gt; Apps Script를 열고 기존의 모든 코드를 지운 후 아래의 <strong>Code.gs</strong>를 복사해 붙여넣습니다.
              </li>
              <li>
                상단의 <strong>배포 &gt; 새 배포</strong>를 누릅니다.
                <ul className="list-disc list-inside pl-5 mt-1 text-slate-500 space-y-0.5 text-[11px]">
                  <li>유형: <strong>웹 앱</strong></li>
                  <li>사용자 권한: <strong>나(본인 계정)</strong></li>
                  <li>액세스: <strong>모든 사용자(Anyone)</strong></li>
                </ul>
              </li>
              <li>
                발급받은 <code>웹 앱 URL (/exec)</code>을 복사하여 아래 관리자 콘솔 <strong>'Apps Script 배포 웹앱 URL'</strong> 항목에 기입 후 저장하십시오!
              </li>
            </ol>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800 text-xs">Apps Script 소스코드 (Code.gs)</span>
              <button
                onClick={handleCopyGs}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition"
                id="btn-copy-gas-gs-api"
              >
                {copiedGs ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>코드 복사</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-300 p-3 rounded-lg overflow-x-auto text-[10px] h-60 leading-relaxed font-mono">
              {codeGsApiOnly}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
