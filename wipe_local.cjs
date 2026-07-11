const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const initializeUserRegex = /const initializeUser = async \(\) => \{[\s\S]*?initializeUser\(\);\n    \}, \[\]\);/;

const newInitializeUser = `const initializeUser = async () => {
            if (!auth || !db) {
                setDbError(true);
                return;
            }
            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    try {
                        const cred = await signInAnonymously(auth);
                        setUserId(cred.user.uid);
                    } catch (e) {
                        setDbError(true);
                    }
                }
            });
            return () => unsubscribe();
        };

        initializeUser();
    }, []);`;

code = code.replace(initializeUserRegex, newInitializeUser);

const appStateRegex = /const \[isSearchVisible, setIsSearchVisible\] = useState\(false\);/;
const newAppState = `const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [dbError, setDbError] = useState(false);`;

code = code.replace(appStateRegex, newAppState);

const returnRegex = /return \(\n\s+<div className="min-h-screen flex flex-col transition-colors duration-500 overflow-x-hidden">/;
const newReturn = `
    if (dbError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-[#0f172a] text-white font-['League_Spartan']">
                <RotateCw size={48} className="mb-6 opacity-20" />
                <h1 className="text-3xl font-black tracking-widest mb-4">OFFLINE STORAGE UNAVAILABLE</h1>
                <p className="text-gray-400 font-medium max-w-md leading-relaxed">
                    Firebase could not be initialized or is unreachable. Note Flow requires an active connection to securely store your data. Please check your network and try again.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col transition-colors duration-500 overflow-x-hidden">`;

code = code.replace(returnRegex, newReturn);

// Remove localStorage from SettingsView handleReset
const handleResetRegex = /localStorage\.removeItem\('noteflow_user_id'\);/;
code = code.replace(handleResetRegex, '');

// Clean up loadLocalData since we no longer fallback to it
const loadLocalDataRegex = /\/\/ Data Management[\s\S]*?const loadLocalData = useCallback\(\(uid: string\) => \{[\s\S]*?\}, \[\]\);/;
code = code.replace(loadLocalDataRegex, '// Data Management');

const useEffectDataRegex = /useEffect\(\(\) => \{\n\s+if \(userId\) \{\n\s+if \(db\) \{\n\s+const unsubNotes = onSnapshot[\s\S]*?\} else \{\n\s+loadLocalData\(userId\);\n\s+\}\n\s+\}\n\s+\}, \[userId, loadLocalData\]\);/;

const newUseEffectData = `useEffect(() => {
        if (userId && db) {
            const unsubNotes = onSnapshot(collection(db, \`/artifacts/\${appId}/users/\${userId}/notes\`), s => {
                setNotes(s.docs.map(d => ({ id: d.id, ...d.data() } as Note)));
                setIsLoading(false);
            });
            const unsubFolders = onSnapshot(collection(db, \`/artifacts/\${appId}/users/\${userId}/folders\`), s => {
                if(!s.empty) setFolders(s.docs.map(d => ({ id: d.id, ...d.data() } as Folder)));
            });
            return () => { unsubNotes(); unsubFolders(); };
        }
    }, [userId]);`;

code = code.replace(useEffectDataRegex, newUseEffectData);

const handleSaveRegex = /const handleSaveNote = async \(d: Partial<Note>\): Promise<string \| undefined> => \{\n\s+if\(!userId\) return;\n\s+if\(db\) \{[\s\S]*?\} else \{[\s\S]*?return idToReturn;\n\s+\}\n\s+\};/;
const newHandleSave = `const handleSaveNote = async (d: Partial<Note>): Promise<string | undefined> => { 
        if(!userId || !db) return; 
        const p = { ...d, updatedAt: serverTimestamp() }; 
        if(d.id) {
            await updateDoc(doc(db, \`/artifacts/\${appId}/users/\${userId}/notes\`, d.id), p); 
            return d.id;
        } else {
            const docRef = await addDoc(collection(db, \`/artifacts/\${appId}/users/\${userId}/notes\`), {...p, createdAt: serverTimestamp()}); 
            return docRef.id;
        }
    };`;
code = code.replace(handleSaveRegex, newHandleSave);

const handleDeleteRegex = /const handleDeleteNote = async \(n: Note\) => \{\n\s+if\(!userId\) return;\n\s+if\(db\) \{\n\s+await deleteDoc\(doc\(db, `\/artifacts\/\$\{appId\}\/users\/\$\{userId\}\/notes`, n\.id\)\);\n\s+\} else \{[\s\S]*?\}\n\s+\};/;
const newHandleDelete = `const handleDeleteNote = async (n: Note) => { 
        if(!userId || !db) return; 
        await deleteDoc(doc(db, \`/artifacts/\${appId}/users/\${userId}/notes\`, n.id)); 
    };`;
code = code.replace(handleDeleteRegex, newHandleDelete);

const handleCreateFolderRegex = /const handleCreateFolder = async \(name: string\) => \{\n\s+if\(!userId\) return;\n\s+if\(db\) \{\n\s+await addDoc\(collection\(db, `\/artifacts\/\$\{appId\}\/users\/\$\{userId\}\/folders`\), \{ name, createdAt: serverTimestamp\(\) \}\);\n\s+\} else \{[\s\S]*?\}\n\s+\};/;
const newHandleCreateFolder = `const handleCreateFolder = async (name: string) => { 
        if(!userId || !db) return; 
        await addDoc(collection(db, \`/artifacts/\${appId}/users/\${userId}/folders\`), { name, createdAt: serverTimestamp() }); 
    };`;
code = code.replace(handleCreateFolderRegex, newHandleCreateFolder);

const handleRenameFolderRegex = /const handleRenameFolder = async \(id: string, name: string\) => \{\n\s+if\(!userId\) return;\n\s+if\(db\) \{\n\s+await updateDoc\(doc\(db, `\/artifacts\/\$\{appId\}\/users\/\$\{userId\}\/folders`, id\), \{ name \}\);\n\s+\} else \{[\s\S]*?\}\n\s+\};/;
const newHandleRenameFolder = `const handleRenameFolder = async (id: string, name: string) => { 
        if(!userId || !db) return; 
        await updateDoc(doc(db, \`/artifacts/\${appId}/users/\${userId}/folders\`, id), { name }); 
    };`;
code = code.replace(handleRenameFolderRegex, newHandleRenameFolder);

const handleDeleteFolderRegex = /const handleDeleteFolder = async \(f: Folder\) => \{\n\s+if\(!userId\) return;\n\s+if\(db\) \{\n\s+await deleteDoc\(doc\(db, `\/artifacts\/\$\{appId\}\/users\/\$\{userId\}\/folders`, f\.id\)\);\n\s+\} else \{[\s\S]*?\}\n\s+if\(currentFolderId===f\.id\) setCurrentFolderId\('all'\);\n\s+\};/;
const newHandleDeleteFolder = `const handleDeleteFolder = async (f: Folder) => { 
        if(!userId || !db) return; 
        await deleteDoc(doc(db, \`/artifacts/\${appId}/users/\${userId}/folders\`, f.id)); 
        if(currentFolderId===f.id) setCurrentFolderId('all'); 
    };`;
code = code.replace(handleDeleteFolderRegex, newHandleDeleteFolder);

fs.writeFileSync('App.tsx', code);
