import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000/api" });

API.interceptors.request.use((req) => {
  if (localStorage.getItem("token")) {
    req.headers.Authorization = `Bearer ${localStorage.getItem("token")}`;
  }
  return req;
});

export const login = (formData) => API.post("/users/login", formData);
export const register = (formData) => API.post("/users/register", formData);
export const saveSession = (sessionData) => API.post("/sessions", sessionData);
