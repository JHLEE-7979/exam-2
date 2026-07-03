/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  ShieldAlert, 
  Settings, 
  Lock, 
  GraduationCap, 
  UserCheck, 
  Info
} from "lucide-react";
import { motion } from "motion/react";
import { AppConfig, ScoreRecord } from "./types";
import { DEMO_RECORDS, DEFAULT_ADMIN_PASSWORD } from "./demoData";
import LookupSection from "./components/LookupSection";
import AdminSection from "./components/AdminSection";
import { KhnpLogo } from "./components/KhnpLogo";

export default function App() {
  // Config state load from localStorage or default template
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem("grade_helper_config");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      appsScriptUrl: "",
      sheetId: "1Uop7Lxelz_tv9S2NiVdFj_snvIrZn7EpJ6tL8enZpw0",
      adminPassword: DEFAULT_ADMIN_PASSWORD
    };
  });

  // Local records list (Fallback database) load from localStorage or DEMO_RECORDS
  const [localRecords, setLocalRecords] = useState<ScoreRecord[]>(() => {
    const saved = localStorage.getItem("grade_helper_records");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return DEMO_RECORDS;
  });

  // App mode: standard lookup vs admin panel
  const [appMode, setAppMode] = useState<"lookup" | "admin">("lookup");

  // Save config to local storage
  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem("grade_helper_config", JSON.stringify(newConfig));
  };

  // Save records locally
  const handleSaveRecordsLocally = (records: ScoreRecord[]) => {
    setLocalRecords(records);
    localStorage.setItem("grade_helper_records", JSON.stringify(records));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app-root-container">
      
      {/* Navigation Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-sm" id="main-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo and Brand */}
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setAppMode("lookup")}>
              <div className="bg-slate-800/80 p-2 rounded-xl shadow-md border border-slate-700/50 flex items-center justify-center">
                <KhnpLogo size={22} />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5">
                  <span className="text-white hover:text-emerald-300 transition">한울교육훈련센터</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block">보안 개인 성적 조회 시스템</p>
              </div>
            </div>

            {/* Mode Switcher Pill */}
            <div className="flex items-center gap-2">
              <div className="bg-slate-950 p-1 rounded-xl flex border border-slate-800" id="pill-mode-switcher">
                <button
                  onClick={() => setAppMode("lookup")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    appMode === "lookup"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>성적 셀프 조회</span>
                </button>
                
                <button
                  onClick={() => setAppMode("admin")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    appMode === "admin"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  id="btn-goto-admin"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>관리자 콘솔</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col justify-center">
        
        {/* Animated Headline */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2 mb-8 md:mb-10"
          id="app-headline-block"
        >
          {appMode === "lookup" ? (
            <>
              <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 tracking-tight">
                나의 성적 조회
              </h2>
              <p className="text-slate-500 font-bold text-sm sm:text-base flex items-center justify-center gap-1.5">
                <Info className="w-4 h-4 text-indigo-600" />
                <span>본인 비밀번호를 입력하면 내 성적만 볼 수 있어요</span>
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
                <span>성적표 업로드 및 연동</span>
              </h2>
              <p className="text-slate-500 font-bold text-sm sm:text-base">
                스프레드시트 연동 정보를 설정하고, 성적표 원본을 업로드해 저장합니다.
              </p>
            </>
          )}
        </motion.div>

        {/* Core Component Render */}
        <div className="flex-1 flex flex-col justify-center">
          {appMode === "lookup" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <LookupSection 
                config={config} 
                localRecords={localRecords} 
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AdminSection
                config={config}
                onSaveConfig={handleSaveConfig}
                onSaveRecordsLocally={handleSaveRecordsLocally}
                localRecords={localRecords}
              />
            </motion.div>
          )}
        </div>

      </main>

      {/* Footer Section - Strictly fixed bottom as required */}
      <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-800 text-center text-xs px-4" id="main-footer">
        <div className="max-w-7xl mx-auto space-y-1.5 leading-relaxed">
          <p className="font-bold text-slate-300">
            본 조회 결과는 참고용이며, 공식 성적은 담당 부서 확인을 따릅니다. 타인의 비밀번호를 무단으로 입력하지 마세요.
          </p>
          <p className="text-slate-500">
            &copy; 2026 한울교육훈련센터. All rights reserved. Secure Personal Grade Portal.
          </p>
        </div>
      </footer>

    </div>
  );
}
