import axios from "axios";

type ViteEnv = {
  VITE_API_ORIGIN?: string;
};

const VITE_API_ORIGIN = (import.meta as unknown as { env?: ViteEnv }).env
  ?.VITE_API_ORIGIN;

export const API_ORIGIN: string = (VITE_API_ORIGIN ?? "").replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_ORIGIN || "",
  withCredentials: false,
});
