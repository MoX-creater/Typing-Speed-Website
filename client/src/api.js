import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000/api" });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const register = (data) => API.post("/users/register", data);
export const login = (data) => API.post("/users/login", data);
export const getProfile = () => API.get("/users/profile");
export const saveSession = (data) => API.post("/sessions", data);
export const getLeaderboard = () => API.get("/sessions/leaderboard");
export const getHistory = (page = 1) => API.get(`/sessions/history?page=${page}`);
export const healthCheck = () => API.get("/health");

export default API;
