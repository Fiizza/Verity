import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

console.log("API_URL =", API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
export const uploadPDF = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post(`${API_URL}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

export const askQuestion = async (session_id, question) => {
  const res = await api.post("/ask", { session_id, question });
  return res.data;
};

export const getSessions = async () => {
  const res = await api.get("/sessions");
  return res.data;
};

export const getHistory = async (session_id) => {
  const res = await api.get(`/sessions/${session_id}/history`);
  return res.data;
};

export const deleteSession = async (session_id) => {
  const res = await api.delete(`/sessions/${session_id}`);
  return res.data;
};