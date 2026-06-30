import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

console.log("API_URL =", API_URL);

// FIX: per-user session isolation. Each browser gets its own persistent
// client ID, stored in localStorage. We send it as X-Client-Id on every
// request so the backend only ever shows this browser its own uploaded
// documents and chat history — not whoever else opens the same link.
const getClientId = () => {
  let id = localStorage.getItem("verity_client_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("verity_client_id", id);
  }
  return id;
};

export const CLIENT_ID = getClientId();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
    "X-Client-Id": CLIENT_ID,
  },
});

export const uploadPDF = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post(`${API_URL}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      "X-Client-Id": CLIENT_ID,
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

// FIX: free-tier hosts (e.g. HF Spaces) put the backend to sleep after a
// period of inactivity, and waking up / restarting wipes its ephemeral
// storage mid-session. A lightweight ping while the tab is open keeps the
// container warm during active use — it won't survive memory-pressure
// restarts, but it cuts down on idle-triggered ones.
export const pingHealth = async () => {
  try {
    await api.get("/health");
  } catch {
    // Silent — this is best-effort, not user-facing.
  }
};