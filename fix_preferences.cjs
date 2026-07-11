const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Add import
const importRegex = /import \{ Search, Bold, /;
code = code.replace(importRegex, "import { Preferences } from '@capacitor/preferences';\nimport { Search, Bold, ");

// Replace initializeUser
const initializeUserRegex = /const initializeUser = async \(\) => \{[\s\S]*?initializeUser\(\);\n    \}, \[\]\);/;
const newInitializeUser = `const initializeUser = async () => {
            let storedRes = await Preferences.get({ key: 'noteflow_user_id' });
            let stored = storedRes.value;

            if (!auth || !db) {
                if (!stored) {
                    stored = crypto.randomUUID();
                    await Preferences.set({ key: 'noteflow_user_id', value: stored });
                }
                setUserId(stored);
                setDbError(true);
                return;
            }
            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    await Preferences.set({ key: 'noteflow_user_id', value: user.uid });
                } else {
                    try {
                        const cred = await signInAnonymously(auth);
                        setUserId(cred.user.uid);
                        await Preferences.set({ key: 'noteflow_user_id', value: cred.user.uid });
                    } catch (e) {
                        if (!stored) {
                            stored = crypto.randomUUID();
                            await Preferences.set({ key: 'noteflow_user_id', value: stored });
                        }
                        setUserId(stored);
                        setDbError(true);
                    }
                }
            });
            return () => unsubscribe();
        };

        initializeUser();
    }, []);`;
code = code.replace(initializeUserRegex, newInitializeUser);

// Load local data and remove dbError screen
const returnRegex = /if \(dbError\) \{[\s\S]*?return \(\n\s+<div className="min-h-screen flex flex-col transition-colors duration-500 overflow-x-hidden">/;

const newReturn = `
    const loadLocalData = useCallback(async (uid: string) => {
        const localNotesRes = await Preferences.get({ key: \`noteflow_notes_\$\{uid\}\` });
        const localFoldersRes = await Preferences.get({ key: \`noteflow_folders_\$\{uid\}\` });
        
        if (localNotesRes.value) {
            setNotes(JSON.parse(localNotesRes.value));
        } else {
            setNotes([]);
        }
        
        if (localFoldersRes.value) {
            setFolders(JSON.parse(localFoldersRes.value));
        } else {
            setFolders([{ id: 'work', name: 'Work', createdAt: new Date().toISOString() }, { id: 'personal', name: 'Personal', createdAt: new Date().toISOString() }]);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (userId) {
            if (dbError) {
                loadLocalData(userId);
            }
        }
    }, [userId, dbError, loadLocalData]);

    return (
        <div className="min-h-screen flex flex-col transition-colors duration-500 overflow-x-hidden">`;
code = code.replace(returnRegex, newReturn);

// Update data in useEffect 
const useEffectDataRegex = /useEffect\(\(\) => \{\n\s+if \(userId && db\) \{\n\s+const unsubNotes = onSnapshot[\s\S]*?setIsLoading\(false\);\n\s+\}\);\n\s+const unsubFolders = onSnapshot[\s\S]*?\}\);\n\s+return \(\) => \{ unsubNotes\(\); unsubFolders\(\); \};\n\s+\}\n\s+\}, \[userId\]\);/;

const newUseEffectData = `useEffect(() => {
        if (userId && db && !dbError) {
            const unsubNotes = onSnapshot(collection(db, \`/artifacts/\${appId}/users/\${userId}/notes\`), s => {
                const updatedNotes = s.docs.map(d => ({ id: d.id, ...d.data() } as Note));
                setNotes(updatedNotes);
                Preferences.set({ key: \`noteflow_notes_\${userId}\`, value: JSON.stringify(updatedNotes) });
                setIsLoading(false);
            }, (error) => {
                console.error("Notes fetch error:", error);
                setDbError(true);
            });
            const unsubFolders = onSnapshot(collection(db, \`/artifacts/\${appId}/users/\${userId}/folders\`), s => {
                if(!s.empty) {
                    const updatedFolders = s.docs.map(d => ({ id: d.id, ...d.data() } as Folder));
                    setFolders(updatedFolders);
                    Preferences.set({ key: \`noteflow_folders_\${userId}\`, value: JSON.stringify(updatedFolders) });
                }
            }, (error) => {
                console.error("Folders fetch error:", error);
                setDbError(true);
            });
            return () => { unsubNotes(); unsubFolders(); };
        }
    }, [userId, dbError]);`;

code = code.replace(useEffectDataRegex, newUseEffectData);

const handleSaveRegex = /const handleSaveNote = async \(d: Partial<Note>\): Promise<string \| undefined> => \{ \n\s+if\(!userId \|\| !db\) return; \n\s+const p = \{ \.\.\.d, updatedAt: serverTimestamp\(\) \}; \n\s+if\(d\.id\) \{\n\s+await updateDoc\(doc\(db, `\/artifacts\/\$\{appId\}\/users\/\$\{userId\}\/notes`, d\.id\), p\); \n\s+return d\.id;\n\s+\} else \{\n\s+const docRef = await addDoc\(collection\(db, `\/artifacts\/\$\{appId\}\/users\/\$\{userId\}\/notes`\), \{\.\.\.p, createdAt: serverTimestamp\(\)\}\); \n\s+return docRef\.id;\n\s+\}\n\s+\};/;

const newHandleSave = `const handleSaveNote = async (d: Partial<Note>): Promise<string | undefined> => { 
        if(!userId) return; 
        
        if (db && !dbError) {
            try {
                const p = { ...d, updatedAt: serverTimestamp() }; 
                if(d.id) {
                    await updateDoc(doc(db, \`/artifacts/\${appId}/users/\${userId}/notes\`, d.id), p); 
                    return d.id;
                } else {
                    const docRef = await addDoc(collection(db, \`/artifacts/\${appId}/users/\${userId}/notes\`), {...p, createdAt: serverTimestamp()}); 
                    return docRef.id;
                }
            } catch(e) {
                console.error("Firebase save failed, falling back to local storage", e);
                setDbError(true);
            }
        }
        
        // Offline / Local save
        const now = new Date().toISOString();
        const idToReturn = d.id || crypto.randomUUID();
        
        setNotes(prev => {
            let updated;
            const exists = prev.some(n => n.id === idToReturn);
            if(exists) {
                updated = prev.map(n => n.id === idToReturn ? { ...n, ...d, updatedAt: now } : n);
            } else {
                const newNote = { ...d, id: idToReturn, createdAt: now, updatedAt: now } as Note;
                updated = [...prev, newNote];
            }
            Preferences.set({ key: \`noteflow_notes_\${userId}\`, value: JSON.stringify(updated) });
            return updated;
        });
        return idToReturn;
    };`;

code = code.replace(handleSaveRegex, newHandleSave);


const handleDeleteRegex = /const handleDeleteNote = async \(n: Note\) => \{ \n\s+if\(!userId \|\| !db\) return; \n\s+await deleteDoc\(doc\(db, `\/artifacts\/\$\{appId\}\/users\/\$\{userId\}\/notes`, n\.id\)\); \n\s+\};/;
const newHandleDelete = `const handleDeleteNote = async (n: Note) => { 
        if(!userId) return; 
        if (db && !dbError) {
            try {
                await deleteDoc(doc(db, \`/artifacts/\${appId}/users/\${userId}/notes\`, n.id)); 
            } catch(e) {
                console.error("Firebase delete failed, falling back to local storage", e);
                setDbError(true);
            }
        }
        
        // Offline / Local delete
        setNotes(prev => {
            const updated = prev.filter(note => note.id !== n.id);
            Preferences.set({ key: \`noteflow_notes_\${userId}\`, value: JSON.stringify(updated) });
            return updated;
        });
    };`;
code = code.replace(handleDeleteRegex, newHandleDelete);


const handleCreateFolderRegex = /const handleCreateFolder = async \(name: string\) => \{ \n\s+if\(!userId \|\| !db\) return; \n\s+await addDoc\(collection\(db, `\/artifacts\/\$\{appId\}\/users\/\$\{userId\}\/folders`\), \{ name, createdAt: serverTimestamp\(\) \}\); \n\s+\};/;
const newHandleCreateFolder = `const handleCreateFolder = async (name: string) => { 
        if(!userId) return; 
        if (db && !dbError) {
            try {
                await addDoc(collection(db, \`/artifacts/\${appId}/users/\${userId}/folders\`), { name, createdAt: serverTimestamp() });
                return;
            } catch(e) {
                console.error("Firebase create folder failed", e);
                setDbError(true);
            }
        }
        
        // Offline / Local create
        setFolders(prev => {
            const updated = [...prev, { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }];
            Preferences.set({ key: \`noteflow_folders_\${userId}\`, value: JSON.stringify(updated) });
            return updated;
        });
    };`;
code = code.replace(handleCreateFolderRegex, newHandleCreateFolder);


const handleRenameFolderRegex = /const handleRenameFolder = async \(id: string, name: string\) => \{ \n\s+if\(!userId \|\| !db\) return; \n\s+await updateDoc\(doc\(db, `\/artifacts\/\$\{appId\}\/users\/\$\{userId\}\/folders`, id\), \{ name \}\); \n\s+\};/;
const newHandleRenameFolder = `const handleRenameFolder = async (id: string, name: string) => { 
        if(!userId) return; 
        if (db && !dbError) {
            try {
                await updateDoc(doc(db, \`/artifacts/\${appId}/users/\${userId}/folders\`, id), { name }); 
                return;
            } catch(e) {
                console.error("Firebase rename folder failed", e);
                setDbError(true);
            }
        }
        
        // Offline / Local rename
        setFolders(prev => {
            const updated = prev.map(f => f.id === id ? { ...f, name } : f);
            Preferences.set({ key: \`noteflow_folders_\${userId}\`, value: JSON.stringify(updated) });
            return updated;
        });
    };`;
code = code.replace(handleRenameFolderRegex, newHandleRenameFolder);


const handleDeleteFolderRegex = /const handleDeleteFolder = async \(f: Folder\) => \{ \n\s+if\(!userId \|\| !db\) return; \n\s+await deleteDoc\(doc\(db, `\/artifacts\/\$\{appId\}\/users\/\$\{userId\}\/folders`, f\.id\)\); \n\s+if\(currentFolderId===f\.id\) setCurrentFolderId\('all'\); \n\s+\};/;
const newHandleDeleteFolder = `const handleDeleteFolder = async (f: Folder) => { 
        if(!userId) return; 
        if (db && !dbError) {
            try {
                await deleteDoc(doc(db, \`/artifacts/\${appId}/users/\${userId}/folders\`, f.id)); 
                if(currentFolderId===f.id) setCurrentFolderId('all'); 
                return;
            } catch(e) {
                console.error("Firebase delete folder failed", e);
                setDbError(true);
            }
        }
        
        // Offline / Local delete
        setFolders(prev => {
            const updated = prev.filter(folder => folder.id !== f.id);
            Preferences.set({ key: \`noteflow_folders_\${userId}\`, value: JSON.stringify(updated) });
            return updated;
        });
        if(currentFolderId===f.id) setCurrentFolderId('all');
    };`;
code = code.replace(handleDeleteFolderRegex, newHandleDeleteFolder);

fs.writeFileSync('App.tsx', code);
