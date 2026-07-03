import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON size limit for large base64 images from scorecard uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize Gemini client (server-side only to keep key safe)
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      })
    : null;

  // API route to parse scorecard data via Gemini AI
  app.post("/api/gemini/parse", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({
          success: false,
          error: "서버에 GEMINI_API_KEY가 설정되어 있지 않습니다. AI Studio Secrets 패널에서 API 키를 먼저 등록해주세요.",
        });
      }

      const { text, image, mimeType } = req.body;
      if (!text && !image) {
        return res.status(400).json({
          success: false,
          error: "분석할 성적표 텍스트 또는 이미지 데이터가 누락되었습니다.",
        });
      }

      const prompt = `
당신은 대한민국 최고의 성적표 분석 도우미입니다.
관리자가 입력한 성적표 텍스트나 성적 이미지(사진/스크린샷)를 정밀하게 분석하여 각 인원별 성적 정보를 구조화해야 합니다.

아래 규칙에 맞춰 완벽하게 데이터를 추출하여 반환하세요:
1. 사번(비밀번호) [password]: 성적표의 사번, 학번, 번호, 수험번호 등 각 개인을 고유하게 구분할 수 있는 식별자를 찾아 비밀번호로 사용하세요. 만약 성적표에 어떠한 식별자도 없이 오직 이름만 존재한다면, '성명'을 그대로 비밀번호로 사용하거나 성명 뒤에 중복되지 않도록 고유 번호를 부여하여 비밀번호(사번) 필드로 정하십시오. (예: "2024001", "A-12" 등) 공백이나 문자 중 조회에 방해가 될 수 있는 불필요한 기호는 배제하세요.
2. 성명 [name]: 학생 또는 직원의 본명 혹은 닉네임을 기입합니다.
3. 회차 [rounds]: 성적표에 표기된 각 시험 회차나 과목명 리스트를 쉼표(,)로 이어진 하나의 문자열로 나열하세요. (예: "1회차, 2회차, 3회차" 또는 "국어, 영어, 수학")
4. 점수 [scores]: 각 회차/과목에 상응하는 개인 성적 점수를 회차 리스트 순서에 맞게 쉼표(,)로 구분된 하나의 문자열로 작성하세요. 점수가 누락된 경우에는 '-' 또는 'N/A'를 입력하세요. (예: "85, 90, 78")
5. 평균 [average]: 각 개인이 취득한 점수들의 산술 평균을 계산하거나 기재된 값을 기입하세요. 소수점 첫째 자리 또는 둘째 자리 형태의 숫자로 입력해야 합니다. (예: "84.3")
6. 순위 [rank]: 동기 대비 개인 순위를 기입하세요. 성적표에 순위가 안 적혀 있는 경우 평균 점수를 기준으로 공동 순위를 계산하십시오. 전체 모집단 수를 표현할 수 있다면 "30명 중 7위" 혹은 "7 / 30"과 같이 표현해주고, 알기 어려운 경우 "7위" 등으로 기록하세요.

주의: 절대로 다른 사람의 점수가 서로 뒤바뀌거나 누락되지 않도록 철저히 검수하고 원본 성적 그대로 정확한 수치로 구성해야 합니다.
`;

      const contents: any[] = [];
      
      if (image && mimeType) {
        contents.push({
          inlineData: {
            mimeType: mimeType,
            data: image,
          },
        });
      }

      if (text) {
        contents.push({
          text: `관리자가 복사해 붙여넣은 텍스트:\n${text}\n\n${prompt}`,
        });
      } else {
        contents.push({
          text: prompt,
        });
      }

      // Helper for backoff delay
      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      let response = null;
      let usedModel = "gemini-3.5-flash";
      const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
      let lastError: any = null;

      for (const currentModel of modelsToTry) {
        usedModel = currentModel;
        let attempt = 0;
        const maxAttempts = 2; // Try 2 times per model

        while (attempt < maxAttempts) {
          try {
            console.log(`[AI-Backend] Parsing scorecard using model: ${currentModel} (Attempt ${attempt + 1}/${maxAttempts})`);
            response = await ai.models.generateContent({
              model: currentModel,
              contents: contents,
              config: {
                systemInstruction: "성적표 이미지 또는 텍스트 성적 데이터를 파싱하여 사번(비밀번호), 성명, 회차 리스트, 점수 리스트, 평균, 순위 형식의 정형화된 JSON 배열로 반환하세요.",
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      password: {
                        type: Type.STRING,
                        description: "고유 비밀번호 (사번, 학번 등 식별번호)",
                      },
                      name: {
                        type: Type.STRING,
                        description: "이름",
                      },
                      rounds: {
                        type: Type.STRING,
                        description: "회차 또는 과목 (쉼표 구분, 예: '1회차, 2회차, 3회차')",
                      },
                      scores: {
                        type: Type.STRING,
                        description: "회차별 점수 (쉼표 구분, 예: '85, 90, 78')",
                      },
                      average: {
                        type: Type.STRING,
                        description: "평균 점수 (예: '84.3')",
                      },
                      rank: {
                        type: Type.STRING,
                        description: "순위 (예: '30명 중 7위')",
                      },
                    },
                    required: ["password", "name", "rounds", "scores", "average", "rank"],
                  },
                },
              },
            });
            break; // Success, exit inner loop
          } catch (err: any) {
            lastError = err;
            attempt++;
            console.warn(`[AI-Backend] Failed with ${currentModel} on attempt ${attempt}:`, err.message || err);
            
            if (attempt < maxAttempts) {
              const delay = attempt * 1500;
              console.log(`[AI-Backend] Retrying in ${delay}ms...`);
              await sleep(delay);
            }
          }
        }

        if (response) {
          break; // Success with a model, exit outer loop
        }
      }

      if (!response) {
        let userFriendlyError = "AI 모델의 일시적인 혼잡 또는 점검으로 인해 요청을 처리할 수 없습니다.";
        if (lastError && lastError.message) {
          const errMsg = String(lastError.message);
          if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("demand") || errMsg.includes("limit")) {
            userFriendlyError = "현재 구글 제미나이(Gemini) AI 서버의 일시적인 혼잡 상태(503 High Demand)로 분석이 제한되었습니다. 1~2분 후 다시 [AI 분석 및 등록]을 클릭하시면 정상적으로 분석이 진행됩니다.";
          } else {
            userFriendlyError = `AI 성적표 분석 중 오류가 발생했습니다: ${lastError.message}`;
          }
        }
        return res.status(503).json({
          success: false,
          error: userFriendlyError,
        });
      }

      const jsonText = response.text?.trim() || "[]";
      let parsedData;
      try {
        parsedData = JSON.parse(jsonText);
      } catch (parseError) {
        // Fallback to match array regex if there's any envelope text
        const arrayMatch = jsonText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
          parsedData = JSON.parse(arrayMatch[0]);
        } else {
          throw parseError;
        }
      }

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (error: any) {
      console.error("Gemini scorecard parsing failed:", error);
      return res.status(500).json({
        success: false,
        error: "AI 성적표 분석 중 오류가 발생했습니다: " + error.message,
      });
    }
  });

  // API route to serve compiled single-file index.html for Apps Script copy-pasting
  app.get("/api/gas/html", async (req, res) => {
    try {
      const fs = await import("fs/promises");
      const htmlPath = path.join(process.cwd(), "dist", "index.html");
      const htmlContent = await fs.readFile(htmlPath, "utf-8");
      return res.json({
        success: true,
        html: htmlContent
      });
    } catch (error: any) {
      console.warn("Failed to read dist/index.html (it might not be built yet):", error);
      return res.status(500).json({
        success: false,
        error: "단일 파일 빌드본(dist/index.html)이 생성되지 않았습니다. 먼저 '빌드하기'를 클릭하거나 'npm run build:gas'를 실행해주세요."
      });
    }
  });

  // Serve static assets in production, or mount Vite dev middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Backend] Express server booting on port ${PORT}`);
  });
}

startServer();
