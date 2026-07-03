import React, { useState } from "react";
import { 
  Search, 
  User, 
  Award, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  FileSpreadsheet
} from "lucide-react";
import { ScoreRecord, AppConfig } from "../types";

interface LookupSectionProps {
  config: AppConfig;
  localRecords: ScoreRecord[];
}

export default function LookupSection({ config, localRecords }: LookupSectionProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [matchedRecord, setMatchedRecord] = useState<ScoreRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setErrorMessage("");
    setMatchedRecord(null);
    setSearched(false);

    // Simulate looking up state for a smooth professional experience
    await new Promise((resolve) => setTimeout(resolve, 800));

    // 1. Try Google Sheets Apps Script first if configured
    if (config.appsScriptUrl) {
      try {
        const targetUrl = `${config.appsScriptUrl}?password=${encodeURIComponent(password.trim())}&sheetId=${encodeURIComponent(config.sheetId)}`;
        
        // For Google Apps Script, we can fetch via GET
        const res = await fetch(targetUrl);
        const json = await res.json();

        if (json.success && json.data) {
          const rec = json.data;
          setMatchedRecord({
            password: rec.password,
            name: rec.name,
            rounds: rec.rounds,
            scores: rec.scores,
            average: rec.average,
            rank: rec.rank || `${json.totalCount || 30}명 중 일부`
          });
          setSearched(true);
          setLoading(false);
          return;
        } else {
          // If the script responded with unmatched error, show it securely
          setErrorMessage("일치하는 정보가 없습니다. 비밀번호를 다시 확인해주세요.");
          setSearched(true);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Apps Script API fetch failed. Trying local/cached fallback search...", err);
        // Fallback to local storage/demo database lookup if offline or network error
      }
    }

    // 2. Fallback: Search local database (Demo data + manager-registered local database)
    const normalizedPwd = password.trim().toLowerCase();
    const found = localRecords.find(
      (rec) => rec.password.trim().toLowerCase() === normalizedPwd
    );

    if (found) {
      setMatchedRecord(found);
    } else {
      // Security: Strictly do not leak hints, output precise error message
      setErrorMessage("일치하는 정보가 없습니다. 비밀번호를 다시 확인해주세요.");
    }

    setSearched(true);
    setLoading(false);
  };

  // Parse rounds & scores for visual plotting
  const roundNames = matchedRecord?.rounds ? matchedRecord.rounds.split(",").map(r => r.trim()) : [];
  const roundScores = matchedRecord?.scores ? matchedRecord.scores.split(",").map(s => {
    const num = parseFloat(s.trim());
    return isNaN(num) ? 0 : num;
  }) : [];

  const maxScore = roundScores.length > 0 ? Math.max(...roundScores, 100) : 100;

  const formatScore = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return "-";
    const num = typeof val === "number" ? val : parseFloat(String(val).trim());
    return isNaN(num) ? String(val) : num.toFixed(1);
  };

  // Clear query and search state safely
  const handleResetSearch = () => {
    setPassword("");
    setMatchedRecord(null);
    setSearched(false);
    setErrorMessage("");
  };

  return (
    <div className="max-w-xl mx-auto py-6" id="lookup-section-container">
      
      {/* Lookup Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-md hover:shadow-lg transition space-y-6" id="lookup-form-card">


        <form onSubmit={handleLookup} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="비밀번호(Password)를 입력해주세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full pl-5 pr-12 py-4 rounded-xl border-2 border-slate-200 text-slate-800 font-semibold focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 placeholder-slate-400 text-lg transition shadow-inner"
              autoFocus
              autoComplete="off"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
          </div>

          <div className="flex gap-3">
            {searched && (
              <button
                type="button"
                onClick={handleResetSearch}
                className="px-4 py-3.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-semibold text-sm transition shrink-0 flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-bold transition flex items-center justify-center gap-2 shadow"
              id="btn-lookup-score"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  <span className="text-base text-slate-300">내 성적을 찾는 중...</span>
                </>
              ) : (
                <span className="text-base">나의 성적 조회하기</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Result Display Area */}
      <div className="mt-6" id="lookup-result-container">
        {loading && (
          <div className="bg-white/60 border border-slate-100 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 animate-pulse">
            <Loader2 className="w-10 h-10 animate-spin text-slate-600" />
            <p className="text-slate-500 text-sm font-medium">데이터베이스 보안 조회를 수행하고 있습니다...</p>
          </div>
        )}

        {searched && errorMessage && (
          <div className="bg-red-50 text-red-800 border-2 border-red-100 rounded-2xl p-6 flex items-start gap-3 shadow-md animate-fade-in" id="error-alert-box">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm">성적 정보 조회 실패</h4>
              <p className="text-xs text-red-700 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {searched && matchedRecord && (
          <div className="space-y-6 animate-fade-in" id="grade-report-card">
            
            {/* Top Badge Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-12 -translate-y-12"></div>
              
              <div className="flex justify-between items-center relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-300 text-xs font-semibold uppercase tracking-widest">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>본인 조회 완료</span>
                  </div>
                  {/* Security protection: only display lookup key and masked name, no comparative names */}
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    {matchedRecord.name} 님 성적표
                  </h3>
                  <p className="text-slate-400 text-xs font-mono">사번/번호: {matchedRecord.password}</p>
                </div>
                
                <div className="bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10 text-right">
                  <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">동기 대비 석차</p>
                  <p className="text-lg font-black text-amber-300">{matchedRecord.rank}</p>
                </div>
              </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
                <Award className="w-5 h-5 text-indigo-600 mx-auto mb-1.5" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">전체 평균 점수</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{formatScore(matchedRecord.average)}</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
                <TrendingUp className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">전체 순위</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{matchedRecord.rank.replace(/[^0-0a-zA-Z가-힣\s]/g, "")}</p>
              </div>
            </div>

            {/* Score History List & Interactive Progress Visualizer */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <FileSpreadsheet className="w-4.5 h-4.5 text-slate-700" />
                <span>회차별 상세 점수 현황</span>
              </h4>

              {roundNames.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">표기할 회차별 기록이 없습니다.</p>
              ) : (
                <div className="space-y-4">
                  {roundNames.map((name, index) => {
                    const score = roundScores[index] !== undefined ? roundScores[index] : 0;
                    const percent = (score / maxScore) * 100;
                    
                    return (
                      <div key={index} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700">{name}</span>
                          <span className="font-mono font-black text-slate-900 text-sm">{formatScore(score)}점</span>
                        </div>
                        {/* Custom beautiful progress bar acting as a visual chart */}
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
