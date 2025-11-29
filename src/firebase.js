import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const getFirebaseConfig = () => {
  try {
    // Check for injected config or env vars (if you add them later)
    // For now, we keep the existing pattern but you might want to replace this 
    // with actual keys if running locally without the injection mechanism.
    return JSON.parse(
      typeof __firebase_config !== "undefined" ? __firebase_config : "{}"
    );
  } catch (e) {
    console.error("Firebase config error:", e);
    return {};
  }
};

const app = initializeApp(getFirebaseConfig());
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
