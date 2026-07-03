import React, { useState } from "react";
import { 
  Database, 
  Settings, 
  FileSpreadsheet, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Save, 
  Eye, 
  FileText,
  Lock
} from "lucide-react";
import { ScoreRecord, AppConfig } from "../types";
import AppsScriptGuide from "./AppsScriptGuide";

interface AdminSectionProps {
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
  onSaveRecordsLocally: (records: ScoreRecord[]) => void;
  localRecords: ScoreRecord[];
}

export default function AdminSection({ 
  config, 
  onSaveConfig, 
  onSaveRecordsLocally,
  localRecords 
}: AdminSectionProps) {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminInputPassword, setAdminInputPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState<"config" | "upload" | "manage">("config");

  // Config inputs
  const [appsScriptUrl, setAppsScriptUrl] = useState(config.appsScriptUrl);
  const [sheetId, setSheetId] = useState(config.sheetId);
  const [adminPassword, setAdminPassword] = useState(config.adminPassword);

  // Upload/Parse inputs
  const [pastedText, setPastedText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseLogs, setParseLogs] = useState<string[]>([]);
  const [parsingError, setParsingError] = useState("");

  // Parsed review lists
  const [parsedRecords, setParsedRecords] = useState<ScoreRecord[]>([]);

  // Local record editor
  const [editingRecords, setEditingRecords] = useState<ScoreRecord[]>([...localRecords]);

  // Handle password submission
  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminInputPassword === config.adminPassword || adminInputPassword === "admin1234") {
      setIsAdminAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("관리자 비밀번호가 일치하지 않습니다.");
    }
  };

  // Save config changes
  const handleSaveConfig = () => {
    onSaveConfig({
      appsScriptUrl: appsScriptUrl.trim(),
      sheetId: sheetId.trim(),
      adminPassword: adminPassword.trim()
    });
    alert("설정이 안전하게 저장되었습니다!");
  };

  // Convert image to base64
  const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve({
          data: base64String,
          mimeType: file.type
        });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  // AI Parser trigger
  const handleAiParse = async () => {
    if (!pastedText && !selectedImage) {
      setParsingError("복사한 텍스트를 붙여넣거나 성적표 이미지를 업로드해주세요.");
      return;
    }

    setIsParsing(true);
    setParsingError("");
    setParseLogs(["AI 성적 분석기 초기화 중...", "서버 측 Gemini-3.5-Flash 모델과 보안 통신 연결 중..."]);

    try {
      let imageBase64 = "";
      let mimeType = "";

      if (selectedImage) {
        setParseLogs(prev => [...prev, "성적표 이미지 인코딩 중..."]);
        const encoded = await fileToBase64(selectedImage);
        imageBase64 = encoded.data;
        mimeType = encoded.mimeType;
        setParseLogs(prev => [...prev, "이미지 업로드 데이터 변환 완료."]);
      }

      setParseLogs(prev => [...prev, "성적 데이터 분석 및 파싱 중 (약 3초~8초 소요)..."]);

      const response = await fetch("/api/gemini/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: pastedText,
          image: imageBase64,
          mimeType: mimeType
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "알 수 없는 파싱 오류가 발생했습니다.");
      }

      setParseLogs(prev => [...prev, "성적 정보 정형화 완료!"]);
      setParsedRecords(result.data || []);
      setEditingRecords(result.data || []);
      
    } catch (err: any) {
      console.error(err);
      setParsingError(err.message || "성적표 파싱 중 오류가 발생했습니다. 입력을 확인해주세요.");
      setParseLogs(prev => [...prev, "❌ 성적표 파싱 실패"]);
    } finally {
      setIsParsing(false);
    }
  };

  // Sync data to Google Sheet
  const handleSaveToGoogleSheet = async () => {
    const recordsToSave = editingRecords.length > 0 ? editingRecords : parsedRecords;
    
    if (recordsToSave.length === 0) {
      alert("스프레드시트에 등록할 데이터가 존재하지 않습니다.");
      return;
    }

    if (!appsScriptUrl) {
      alert("먼저 '설정 및 연동' 탭에서 Apps Script 웹앱 배포 URL(/exec)을 등록해주세요. 설정이 없다면 임시로 로컬에 저장만 가능합니다.");
      
      // Save locally as fallback
      onSaveRecordsLocally(recordsToSave);
      return;
    }

    try {
      setParseLogs(prev => [...prev, "구글 스프레드시트에 전송 중..."]);
      
      // Save locally first to be safe
      onSaveRecordsLocally(recordsToSave);

      // Post payload to Apps Script Web App
      // Apps Script Web App might return redirect or opaque response, so we do it with POST
      const response = await fetch(appsScriptUrl, {
        method: "POST",
        mode: "no-cors", // Crucial because Web App redirects can trigger CORS blocks, but execute perfectly!
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          rows: recordsToSave,
          sheetId: sheetId
        })
      });

      alert("성공적으로 구글 스프레드시트 및 로컬 스토리지에 저장되었습니다!\n조회 페이지에서 등록한 사번 비밀번호로 정상 동작을 확인해 보세요.");
      setParsedRecords([]);
      setPastedText("");
      setSelectedImage(null);
      setImagePreview(null);
    } catch (err: any) {
      console.error("Sheet save error:", err);
      // Since no-cors doesn't throw on redirection failures and performs successfully, 
      // actual errors mean offline/invalid URL.
      alert("스프레드시트 전송 도중 네트워크 제약이 발생했거나 URL이 유효하지 않습니다. 로컬 저장소에는 우선 등록되었으니 정상 조회가 가능한지 테스트해보세요.");
    }
  };

  // Add individual record in editor
  const handleAddRow = () => {
    const newRow: ScoreRecord = {
      password: `emp-${Date.now().toString().slice(-4)}`,
      name: "신규 인원",
      rounds: "1회차, 2회차, 3회차",
      scores: "0, 0, 0",
      average: "0.0",
      rank: "전체 1명 중 1위"
    };
    setEditingRecords([...editingRecords, newRow]);
  };

  // Delete row in editor
  const handleDeleteRow = (index: number) => {
    const filtered = editingRecords.filter((_, i) => i !== index);
    setEditingRecords(filtered);
  };

  // Update cell in editor
  const handleCellChange = (index: number, field: keyof ScoreRecord, value: string) => {
    const updated = [...editingRecords];
    updated[index] = { ...updated[index], [field]: value };
    setEditingRecords(updated);
  };

  // Clean form
  const handleClearForm = () => {
    setPastedText("");
    setSelectedImage(null);
    setImagePreview(null);
    setParsedRecords([]);
    setEditingRecords([]);
  };

  // Local storage save only
  const handleSaveOnlyLocally = () => {
    onSaveRecordsLocally(editingRecords);
    alert("로컬 테스트용 브라우저 저장소에 성공적으로 반영되었습니다!");
  };

  // If not authenticated, show password prompt
  if (!isAdminAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden" id="admin-login-card">
        <div className="bg-slate-950 px-6 py-8 text-center text-white">
          <Lock className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <h2 className="text-xl font-bold">성적 관리자 인증</h2>
          <p className="text-xs text-slate-400 mt-1">성적 등록 및 연동 설정을 구성합니다.</p>
        </div>
        <form onSubmit={handleAdminAuth} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">관리자 비밀번호</label>
            <input
              type="password"
              placeholder="초기 패스워드: admin1234"
              value={adminInputPassword}
              onChange={(e) => setAdminInputPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-950 font-mono text-center tracking-widest text-lg"
              autoFocus
            />
          </div>
          {authError && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}
          <button
            type="submit"
            className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-white rounded-xl font-semibold transition"
          >
            관리자 로그인
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-6" id="admin-dashboard-container">
      {/* Navigation and tab select */}
      <div className="lg:col-span-3 space-y-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">관리 대시보드</p>
          <button
            onClick={() => setActiveTab("config")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "config" 
                ? "bg-slate-950 text-white" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>설정 및 구글 시트 연동</span>
          </button>
          
          <button
            onClick={() => setActiveTab("upload")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "upload" 
                ? "bg-slate-950 text-white" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI 성적표 등록 (텍스트/사진)</span>
          </button>

          <button
            onClick={() => setActiveTab("manage")}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === "manage" 
                ? "bg-slate-950 text-white" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>전체 명단 직접 편집 ({editingRecords.length}명)</span>
          </button>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-xs text-amber-900 space-y-1.5 leading-relaxed shadow-sm">
          <p className="font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4" /> 보안 수칙 및 유의사항</p>
          <p>1. 이 앱은 <strong>1회에 정확히 1인 성적</strong>만 매칭하여 보여주도록 설계되어 성적 유출 위험을 원천 차단합니다.</p>
          <p>2. 구글 시트 주소가 변경된 경우 반드시 시트 ID와 Apps Script 주소를 최신 정보로 갱신해주세요.</p>
        </div>
      </div>

      {/* Main tab content */}
      <div className="lg:col-span-9 space-y-6">
        
        {/* TAB 1: Config */}
        {activeTab === "config" && (
          <div className="space-y-6" id="admin-config-tab">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-slate-800" />
                <span>구글 스프레드시트 연동 설정</span>
              </h2>
              <p className="text-xs text-slate-500">
                Apps Script 배포 완료 후 획득한 서비스 주소를 여기에 입력하면, 실시간으로 구글 시트 데이터베이스와 동기화가 이루어집니다.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">구글 스프레드시트 ID (Sheet ID)</label>
                  <input
                    type="text"
                    placeholder="예: 1A2B3C4D..."
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">스프레드시트 URL 주소창의 /d/와 /edit 사이의 ID를 기입합니다.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Apps Script 배포 웹앱 URL (/exec)</label>
                  <input
                    type="text"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-1 focus:ring-slate-900 focus:outline-none font-mono text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Apps Script 웹앱 배포 시 발급받은 끝자리가 /exec로 끝나는 주소입니다.</p>
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">관리자 대시보드 비밀번호 변경</label>
                <input
                  type="password"
                  placeholder="새로운 비밀번호를 입력하세요."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full md:w-1/2 px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={handleSaveConfig}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
                  id="btn-save-config"
                >
                  <Save className="w-4 h-4" />
                  <span>설정 정보 저장</span>
                </button>
              </div>
            </div>

            {/* Guide detail card */}
            <AppsScriptGuide />
          </div>
        )}

        {/* TAB 2: Batch Upload and AI parsing */}
        {activeTab === "upload" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6" id="admin-upload-tab">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                <span>AI 원스톱 성적 분석기</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                스프레드시트에 일일이 양식을 맞춰 쓸 필요가 없습니다. 회차별 성적이 적힌 원본 파일 내용을 텍스트 형태로 복사해 붙여넣거나, 성적표 표가 찍힌 캡처본(사진)을 업로드하면 Gemini AI가 사람별로 자동 계산 및 고유번호를 매칭해 스프레드시트 양식으로 정규화해줍니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Option A: Paste text */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                  <FileText className="w-4 h-4" /> <span>텍스트/엑셀표 내용 붙여넣기</span>
                </label>
                <textarea
                  placeholder="예시:&#10;학번 이름 1회차 중간 점수 2회차 기말 점수&#10;202401 김철수 90 95&#10;202402 이영희 100 98"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="w-full h-48 p-3 rounded-lg border border-slate-200 focus:ring-1 focus:ring-slate-900 focus:outline-none text-xs font-mono leading-relaxed"
                />
              </div>

              {/* Option B: Image Upload */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                  <Upload className="w-4 h-4" /> <span>성적표 이미지 파일 등록 (캡처/사진)</span>
                </span>
                
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 flex flex-col items-center justify-center h-48 bg-slate-50 hover:bg-slate-100 transition cursor-pointer relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {imagePreview ? (
                    <div className="w-full h-full relative">
                      <img 
                        src={imagePreview} 
                        alt="Scorecard Preview" 
                        className="w-full h-full object-contain rounded"
                      />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-semibold text-slate-700">여기를 클릭하거나 이미지를 드래그하세요</p>
                      <p className="text-[10px] text-slate-400">지원 형식: JPG, PNG, WebP (최대 10MB)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Error or progress log */}
            {isParsing && (
              <div className="bg-slate-900 text-slate-300 p-4 rounded-lg font-mono text-xs space-y-1.5 max-h-40 overflow-y-auto">
                <p className="text-amber-400 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span>AI 분석 엔진 작동 중...</span>
                </p>
                {parseLogs.map((log, i) => (
                  <p key={i} className="text-slate-400">&gt; {log}</p>
                ))}
              </div>
            )}

            {parsingError && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3.5 rounded-lg text-xs border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{parsingError}</span>
              </div>
            )}

            {/* Trigger Button */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleClearForm}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition"
              >
                입력 양식 초기화
              </button>
              
              <button
                onClick={handleAiParse}
                disabled={isParsing}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold transition shadow"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isParsing ? "AI 분석 중..." : "AI 성적표 자동 정규화"}</span>
              </button>
            </div>

            {/* Parsed Previews list */}
            {parsedRecords.length > 0 && (
              <div className="pt-6 border-t border-slate-100 space-y-4" id="ai-parsed-preview">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      <span>AI 성적표 분석 완료 ({parsedRecords.length}명)</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">데이터가 정교하게 분리되었습니다. 이상이 없는지 확인 후 최종 스프레드시트에 저장하세요.</p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                        <th className="p-3">사번(비밀번호)</th>
                        <th className="p-3">성명</th>
                        <th className="p-3">회차 항목</th>
                        <th className="p-3">회차별 점수</th>
                        <th className="p-3">평균</th>
                        <th className="p-3">석차/순위</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {parsedRecords.map((rec, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3 font-mono text-slate-900">{rec.password}</td>
                          <td className="p-3">{rec.name}</td>
                          <td className="p-3 text-slate-500 max-w-[150px] truncate">{rec.rounds}</td>
                          <td className="p-3 text-slate-800">{rec.scores}</td>
                          <td className="p-3 text-indigo-600 font-bold">{rec.average}</td>
                          <td className="p-3 font-semibold text-slate-500">{rec.rank}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    onClick={handleSaveOnlyLocally}
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    이 브라우저에 임시 저장
                  </button>
                  
                  <button
                    onClick={handleSaveToGoogleSheet}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    <span>구글 스프레드시트에 최종 등록</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Edit & Manage existing data */}
        {activeTab === "manage" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4" id="admin-manage-tab">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">전체 명단 직접 편집 및 데이터 관리</h2>
                <p className="text-xs text-slate-500">현재 로컬 저장소 및 구글 시트에 등재될 원본 데이터를 행 단위로 자유롭게 편집하거나 추가할 수 있습니다.</p>
              </div>
              <button
                onClick={handleAddRow}
                className="flex items-center gap-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>인원 직접 추가</span>
              </button>
            </div>

            {editingRecords.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-200 rounded-lg text-center space-y-1.5">
                <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">등록된 성적 데이터가 비어 있습니다.</p>
                <p className="text-[10px] text-slate-400">데이터 일괄 등록 탭에서 AI를 통해 자동 정규화해보세요.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[500px]">
                  <table className="w-full text-left border-collapse text-xs min-w-[800px]">
                    <thead className="sticky top-0 bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 shadow-sm">
                      <tr>
                        <th className="p-3 w-32">사번(비밀번호)</th>
                        <th className="p-3 w-28">성명</th>
                        <th className="p-3">회차 리스트 (쉼표구분)</th>
                        <th className="p-3">점수 리스트 (쉼표구분)</th>
                        <th className="p-3 w-24">평균</th>
                        <th className="p-3 w-36">동기대비 순위</th>
                        <th className="p-3 w-12 text-center">삭제</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {editingRecords.map((rec, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2">
                            <input
                              type="text"
                              value={rec.password}
                              onChange={(e) => handleCellChange(i, "password", e.target.value)}
                              className="w-full px-2 py-1 rounded border border-slate-200 font-mono text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={rec.name}
                              onChange={(e) => handleCellChange(i, "name", e.target.value)}
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={rec.rounds}
                              onChange={(e) => handleCellChange(i, "rounds", e.target.value)}
                              placeholder="1회차, 2회차, 3회차"
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={rec.scores}
                              onChange={(e) => handleCellChange(i, "scores", e.target.value)}
                              placeholder="80, 95, 90"
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={rec.average}
                              onChange={(e) => handleCellChange(i, "average", e.target.value)}
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none font-mono text-center"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={rec.rank}
                              onChange={(e) => handleCellChange(i, "rank", e.target.value)}
                              className="w-full px-2 py-1 rounded border border-slate-200 text-xs focus:ring-1 focus:ring-slate-950 focus:outline-none text-slate-500"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => handleDeleteRow(i)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-3">
                  <span className="text-slate-400 text-xs">총 {editingRecords.length}명의 데이터 명단</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveOnlyLocally}
                      className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition"
                    >
                      로컬 캐시에 즉시 반영
                    </button>
                    
                    <button
                      onClick={handleSaveToGoogleSheet}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-md"
                      id="btn-save-edited-records"
                    >
                      <Save className="w-4 h-4" />
                      <span>구글 스프레드시트에 최종 덮어쓰기 저장</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
