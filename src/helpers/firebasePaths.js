import { doc, collection } from "firebase/firestore";

const ENV = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
const runtimeAppId = typeof __app_id !== "undefined" ? __app_id : null;
const appId = ENV.VITE_APP_ID || runtimeAppId || "default-app-id";

export const getGameDocPath = (db, gameCode) =>
  doc(db, `artifacts/${appId}/public/data/games/${gameCode}`);

export const getPlayersCollectionPath = (db, gameCode) =>
  collection(db, `artifacts/${appId}/public/data/games/${gameCode}/players`);

export const getPlayerDocPath = (db, gameCode, userId) =>
  doc(db, `artifacts/${appId}/public/data/games/${gameCode}/players/${userId}`);

export const getUserStatsDocPath = (db, userId) =>
  doc(db, `artifacts/${appId}/public/data/userStats/${userId}`);

export const getUserSettingsDocPath = (db, userId) =>
  doc(db, `artifacts/${appId}/public/data/users/${userId}`);
