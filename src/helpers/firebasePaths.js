import { doc, collection } from "firebase/firestore";

const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

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
