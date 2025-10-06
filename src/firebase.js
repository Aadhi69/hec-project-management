import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDrOWz5qFV5rAQmLMVSi069bcgN1pngyrY",
  authDomain: "hec-project-management.firebaseapp.com",
  projectId: "hec-project-management",
  storageBucket: "hec-project-management.firebasestorage.app",
  messagingSenderId: "432709658337",
  appId: "1:432709658337:web:e37c4ad73249061fc1f9a0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Collections
export const projectsCollection = collection(db, 'projects');

// Database functions
export const database = {
  // Save project
  async saveProject(project) {
    await setDoc(doc(db, 'projects', project.id), project);
  },

  // Get all projects
  async getProjects() {
    const snapshot = await getDocs(projectsCollection);
    return snapshot.docs.map(doc => doc.data());
  },

  // Update project
  async updateProject(projectId, updates) {
    await updateDoc(doc(db, 'projects', projectId), updates);
  },

  // Delete project
  async deleteProject(projectId) {
    await deleteDoc(doc(db, 'projects', projectId));
  }
};

export default app;