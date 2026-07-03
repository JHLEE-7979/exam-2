import { ScoreRecord } from "./types";

export const DEMO_RECORDS: ScoreRecord[] = [
  {
    password: "emp101",
    name: "김동현",
    rounds: "1회차, 2회차, 3회차, 4회차",
    scores: "88, 92, 85, 90",
    average: "88.8",
    rank: "전체 30명 중 11위"
  },
  {
    password: "emp102",
    name: "이지민",
    rounds: "1회차, 2회차, 3회차, 4회차",
    scores: "95, 98, 96, 100",
    average: "97.3",
    rank: "전체 30명 중 1위"
  },
  {
    password: "emp103",
    name: "박준서",
    rounds: "1회차, 2회차, 3회차, 4회차",
    scores: "72, 80, 78, 75",
    average: "76.3",
    rank: "전체 30명 중 25위"
  },
  {
    password: "emp104",
    name: "최예은",
    rounds: "1회차, 2회차, 3회차, 4회차",
    scores: "90, 88, 94, 92",
    average: "91.0",
    rank: "전체 30명 중 6위"
  }
];

export const DEFAULT_ADMIN_PASSWORD = "admin1234";
