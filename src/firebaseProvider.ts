import type { DataProvider } from "@refinedev/core";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { firestore, app } from "./firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions(app);
const toData = (docSnap: any) => ({ id: docSnap.id, ...(docSnap.data() as any) });

const firebaseProvider = () => ({

  getList: async (params: any) => {
    const { resource } = params;
    const col = collection(firestore, resource as string);
    const snap = await getDocs(col);
    const data = snap.docs.map(toData);
    return { data, total: data.length };
  },

  getOne: async (params: any) => {
    const { resource, id } = params;
    const ref = doc(firestore, resource as string, id as string);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error("Document not found");
    }
    return { data: toData(snap) };
  },

  create: async (params: any) => {
    const { resource, variables } = params;
    const col = collection(firestore, resource as string);
    const res = await addDoc(col, variables as any);
    return { data: { id: res.id, ...(variables as any) } } as any;
  },

  update: async (params: any) => {
    const { resource, id, variables } = params;
    const ref = doc(firestore, resource as string, id as string);
    await updateDoc(ref, variables as any);
    return { data: { id, ...(variables as any) } } as any;
  },

  deleteOne: async (params: any) => {
    const { resource, id } = params;
    
    // Special handling for files resource - call Cloud Function
    if (resource === "files") {
      const ref = doc(firestore, resource as string, id as string);
      const snap = await getDoc(ref);
      
      if (snap.exists()) {
        const fileData = snap.data();
        const deleteFileFn = httpsCallable(functions, "deleteFile");
        
        try {
          await deleteFileFn({
            fileId: id,
            filePath: fileData.filePath,
          });
        } catch (error) {
          console.error("Error calling deleteFile function:", error);
          // Fallback: just delete Firestore record if Cloud Function fails
          await deleteDoc(ref);
        }
      }
    } else {
      // Regular delete for other resources
      const ref = doc(firestore, resource as string, id as string);
      await deleteDoc(ref);
    }
    
    return { data: { id } } as any;
  },

  getMany: async (params: any) => {
    const { resource, ids } = params;
    const results: any[] = [];
    for (const id of ids as string[]) {
      const ref = doc(firestore, resource as string, id);
      const snap = await getDoc(ref);
      if (snap.exists()) results.push(toData(snap));
    }
    return { data: results } as any;
  },
});

export default firebaseProvider as any;
