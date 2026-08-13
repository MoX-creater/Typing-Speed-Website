import axios from "axios";
import { getAuthToken } from "../lib/authToken";

const serverBase = (import.meta.env.VITE_SERVER_URL || "http://localhost:5000").replace(/\/$/, "");
const API = axios.create({ baseURL: `${serverBase}/api` });

API.interceptors.request.use(async (req) => {
  const token = await getAuthToken();
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export const login = (formData) => API.post("/users/login", formData);
export const register = (formData) => API.post("/users/register", formData);
export const saveTypingProfile = (profileData) => API.post("/typing-profile", profileData);
export const generatePassage = ({ difficulty, theme, duration }) =>
  API.post("/passages/generate", { difficulty, theme, duration });
export const generateRaceSummary = (raceData) =>
  API.post("/races/summary", raceData);
export const generateTestSummary = (testData) =>
  API.post("/tests/summary", testData);
