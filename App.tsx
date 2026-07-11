import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, Auth } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Firestore } from 'firebase/firestore';
import { Preferences } from '@capacitor/preferences';
import { Search, Bold, Underline, ChevronLeft, LogOut, Moon, Sun, Folder, Folders, Settings as SettingsIcon, Lightbulb, Zap, PenTool, X, Plus, Trash2, RotateCw, LayoutList, Edit3, Check, Smartphone, Home, FileText } from 'lucide-react';

// --- Types ---

interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string;
  fontSize?: string;
  fontColor?: string;
  createdAt: string | any;
  updatedAt: string | any;
}

interface Folder {
  id: string;
  name: string;
  createdAt: string | any;
}

interface ToastMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

// --- Firebase Configuration ---
const MOCK_APP_ID = 'local-app-dev';
const appId = (window as any).__app_id || MOCK_APP_ID;
const firebaseConfig = (window as any).__firebase_config ? JSON.parse((window as any).__firebase_config) : {};

let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  if (Object.keys(firebaseConfig).length > 0) {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      db = getFirestore(app);
      auth = getAuth(app);
      
      // Offline persistence is disabled to prevent IndexedDB errors on mobile WebView environments
  }
} catch (error) {
  // Firebase initialization failed
}

// --- Utility Functions ---

const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    let date;
    if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else if (timestamp && timestamp.toDate) {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }
    
    if (isNaN(date.getTime())) return 'Just now';

    const diffInSeconds = (new Date().getTime() - date.getTime()) / 1000;

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
};

// --- Components ---

const Toast = ({ message, clearMessage }: { message: ToastMessage, clearMessage: () => void }) => {
    let bgColor, icon;
    switch (message.type) {
        case 'success':
            bgColor = 'rgba(16, 185, 129, 0.95)';
            icon = <Check size={20} />;
            break;
        case 'error':
            bgColor = 'rgba(239, 68, 68, 0.95)';
            icon = <X size={20} />;
            break;
        case 'info':
        default:
            bgColor = 'rgba(59, 130, 246, 0.95)';
            icon = <Lightbulb size={20} />;
            break;
    }

    return (
        <div 
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] p-4 rounded-2xl text-white font-bold shadow-2xl animate-toastIn cursor-pointer flex items-center space-x-3 backdrop-blur-md border border-white/20 min-w-[300px] justify-center"
            style={{ backgroundColor: bgColor }}
            onClick={clearMessage}
        >
            <div className="p-1 bg-white/20 rounded-full">{icon}</div>
            <span className="tracking-wide text-sm">{message.text}</span>
        </div>
    );
};

const WELCOME_TOPICS = ['IDEAS', 'WORK', 'RECIPES', 'TRAVEL', 'PLANS'];

const WelcomeView = ({ userId, openEditModal }: { userId: string, openEditModal: () => void }) => {
    const [topicIndex, setTopicIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTopicIndex(prev => (prev + 1) % WELCOME_TOPICS.length);
        }, 3000); 
        return () => clearInterval(interval);
    }, []);

    const FeatureCard = ({ icon: Icon, title, description, delay }: any) => (
        <div 
            className="glass-card p-3 flex flex-col items-center justify-center text-center hover:scale-[1.05] active:scale-95 transition-all duration-300"
            style={{ animationDelay: `${delay}ms`, opacity: 0, animation: 'slideUpFade 0.8s forwards' }}
        >
            <div className="p-2 rounded-full mb-2 bg-white/20 dark:bg-white/10 text-teal-800 dark:text-white">
                <Icon size={20} />
            </div>
            <p className="font-bold text-gray-800 dark:text-white text-xs tracking-wide">{title}</p>
            <p className="text-gray-600 dark:text-gray-300 text-[9px] mt-0.5 font-medium">{description}</p>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col items-center justify-center px-4 pb-20 relative pt-4">
            <div className="absolute top-10 left-10 w-32 h-32 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float"></div>
            <div className="absolute bottom-20 right-10 w-32 h-32 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float" style={{ animationDelay: '2s' }}></div>

            <div className="glass-card p-6 w-full max-w-lg mb-4 relative overflow-hidden animate-slideUpFade">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <PenTool size={120} className="text-gray-900 dark:text-white transform rotate-12" />
                </div>
                <div className="relative z-10">
                    <h1 className="text-5xl sm:text-7xl font-black text-gray-900 dark:text-white tracking-tighter mb-2 leading-none">
                        NOTE<br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600 dark:from-teal-300 dark:to-blue-300">FLOW</span>
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 font-bold text-base mb-4 max-w-xs">
                        The liquid-smooth way to capture your thoughts.
                    </p>
                    <div className="glass-btn rounded-xl py-2 px-4 inline-flex items-center space-x-2 border-l-4 border-teal-500">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Draft:</span>
                        <span className="text-teal-700 dark:text-white font-black tracking-wide uppercase">
                            {WELCOME_TOPICS[topicIndex]}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full max-w-lg mb-6">
                <FeatureCard icon={Zap} title="FAST" description="Instant Capture" delay={100} />
                <FeatureCard icon={Smartphone} title="OFFLINE" description="Always Ready" delay={200} />
                <FeatureCard icon={LayoutList} title="FOLDERS" description="Organize" delay={300} />
            </div>

            <button
                onClick={openEditModal}
                className="w-full max-w-lg py-4 text-white font-black text-lg rounded-2xl glass-fab transform hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center space-x-3 shadow-2xl animate-slideUpFade mb-2"
                style={{ animationDelay: '400ms' }}
            >
                <Plus size={24} strokeWidth={3} />
                <span>NEW NOTE</span>
            </button>
            
            <div className="mt-2 text-center opacity-50 animate-slideUpFade" style={{ animationDelay: '600ms' }}>
                 <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                    LOCAL ID: {userId ? userId.substring(0, 8) : '...'}
                 </p>
            </div>
        </div>
    );
};

const SettingsView = ({ onBack, userId, isDarkMode, setIsDarkMode, onDeleteAccount }: any) => {
    const handleReset = async () => {
        if (window.confirm("Are you sure you want to clear ALL notes and data?")) {
            if (onDeleteAccount) {
                await onDeleteAccount();
            }
            
            window.location.reload();
        }
    };

    const SettingAction = ({ icon: Icon, label, onClick, className = '', subLabel = '' }: any) => (
        <button
            onClick={onClick}
            className={`w-full flex justify-between items-center p-4 rounded-xl font-bold text-gray-700 dark:text-white glass-btn ${className}`}
        >
            <div className="flex items-center space-x-4">
                {Icon && <Icon size={22} />}
                <div className="flex flex-col items-start text-left">
                    <span className="tracking-wide text-gray-900 dark:text-white">{label}</span>
                    {subLabel && <span className="text-xs font-normal opacity-70 text-gray-500 dark:text-gray-400">{subLabel}</span>}
                </div>
            </div>
            <ChevronLeft size={18} className="rotate-180 opacity-50 text-gray-700 dark:text-white" />
        </button>
    );
    
    return (
        <div className="p-4 w-full max-w-xl mx-auto animate-slideUp pb-24">
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-8 ml-2">Settings</h1>
            
            <div className="space-y-6">
                <section>
                    <h3 className="text-xs font-extrabold text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-3 ml-2">Appearance</h3>
                    <div className="glass-card p-4 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            {isDarkMode ? <Moon size={22} className="text-teal-400" /> : <Sun size={22} className="text-teal-600" />}
                            <span className="font-bold text-gray-800 dark:text-white">Dark Mode</span>
                        </div>
                        <button 
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${isDarkMode ? 'bg-teal-500' : 'bg-gray-300'}`}
                        >
                            <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </section>

                <section>
                    <h3 className="text-xs font-extrabold text-gray-400 dark:text-gray-400 uppercase tracking-widest mb-3 ml-2">Data Management</h3>
                    <div className="glass-card p-4 mb-3">
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">User Identifier</p>
                        <p className="text-sm font-mono text-gray-600 dark:text-gray-200 break-all">{userId}</p>
                    </div>
                    <div className="space-y-3">
                        <SettingAction 
                            label="Reset All Data" 
                            icon={Trash2} 
                            onClick={handleReset} 
                            className="text-red-600 dark:text-red-300"
                            subLabel="Deletes all notes and identifiers permanently."
                        />
                    </div>
                </section>
            </div>

            <button onClick={onBack} className="fixed bottom-8 left-8 w-12 h-12 glass-btn rounded-full flex items-center justify-center text-gray-800 dark:text-white z-50 shadow-lg border-2 border-white/50">
                <ChevronLeft size={24} />
            </button>
        </div>
    );
};

const FolderItem = ({ folder, currentFolderId, setCurrentFolderId, handleRenameFolder, handleDeleteFolder }: any) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(folder.name);

    const handleRenameSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newName.trim();
        if (trimmedName && trimmedName !== folder.name) handleRenameFolder(folder.id, trimmedName);
        setIsEditing(false);
    };

    const isSelected = currentFolderId === folder.id;
    return (
        <div 
            className={`group p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-300 glass-btn ${isSelected ? 'bg-white/40 dark:bg-white/10 border-teal-500/50' : ''}`}
            onClick={() => setCurrentFolderId(folder.id)}
        >
            <div className="flex items-center space-x-3 w-full overflow-hidden">
                <Folder size={22} className={isSelected ? 'text-teal-600 dark:text-teal-300' : 'text-gray-400 dark:text-gray-400'} />
                {isEditing ? (
                    <form onSubmit={handleRenameSubmit} className="flex-grow flex items-center">
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-transparent border-b-2 border-teal-500 text-gray-900 dark:text-white font-bold focus:outline-none"
                            autoFocus
                        />
                        <button type="submit" onClick={(e) => e.stopPropagation()} className="ml-2 text-teal-600 dark:text-teal-400"><Check size={18} /></button>
                    </form>
                ) : (
                    <span className={`truncate font-bold text-lg ${isSelected ? 'text-teal-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>{folder.name}</span>
                )}
            </div>
            {!isEditing && (
                <div className="flex space-x-1">
                    <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-2 text-gray-500 hover:text-teal-600 dark:text-gray-400 dark:hover:text-teal-300"><Edit3 size={16} /></button>
                    <button 
                        onClick={(e) => { 
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            handleDeleteFolder(folder); 
                        }} 
                        className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 z-10"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

const FoldersView = ({ folders, currentFolderId, setCurrentFolderId, handleCreateFolder, handleRenameFolder, handleDeleteFolder, setTempMessage }: any) => {
    const [newFolderName, setNewName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const onCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newFolderName.trim()) {
            handleCreateFolder(newFolderName.trim());
            setNewName('');
            setIsCreating(false);
        } else {
            setTempMessage({ type: 'error', text: 'NAME REQUIRED' });
        }
    };

    return (
        <div className="p-4 w-full max-w-xl mx-auto animate-slideUp pb-24">
            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-8 ml-2">Folders</h1>
            
            <div className="glass-card p-2 space-y-2 mb-6">
                <div 
                    className={`p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all glass-btn ${currentFolderId === 'all' ? 'bg-white/40 dark:bg-white/10 border-teal-500/50' : ''}`}
                    onClick={() => setCurrentFolderId('all')}
                >
                    <div className="flex items-center space-x-3">
                        <LayoutList size={22} className={currentFolderId === 'all' ? 'text-teal-600 dark:text-teal-300' : 'text-gray-400 dark:text-gray-500'} />
                        <span className={`font-bold text-lg ${currentFolderId === 'all' ? 'text-teal-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>All Notes</span>
                    </div>
                </div>
                {folders.map((folder: Folder) => (
                    <FolderItem key={folder.id} folder={folder} currentFolderId={currentFolderId} setCurrentFolderId={setCurrentFolderId} handleRenameFolder={handleRenameFolder} handleDeleteFolder={handleDeleteFolder} />
                ))}
            </div>

            {isCreating ? (
                <form onSubmit={onCreateSubmit} className="glass-card p-4 flex items-center space-x-2 animate-slideUp">
                    <input type="text" value={newFolderName} onChange={(e) => setNewName(e.target.value)} placeholder="Folder Name..." className="flex-grow bg-transparent p-2 text-gray-900 dark:text-white font-bold placeholder-gray-400 focus:outline-none" autoFocus />
                    <button type="submit" className="bg-teal-600 p-2 rounded-lg text-white"><Check size={20} /></button>
                    <button type="button" onClick={() => setIsCreating(false)} className="bg-gray-200 dark:bg-gray-700 p-2 rounded-lg text-gray-600 dark:text-white"><X size={20} /></button>
                </form>
            ) : (
                <button onClick={() => setIsCreating(true)} className="w-full py-4 text-teal-700 dark:text-white font-bold glass-btn rounded-xl flex items-center justify-center space-x-2 border-dashed border-2 border-teal-500/30">
                    <Plus size={20} />
                    <span>NEW FOLDER</span>
                </button>
            )}
        </div>
    );
};

const NoteItem = React.memo(({ note, onEdit, onDelete, style }: any) => {
    const snippet = note.content.split('\n')[0].substring(0, 80).trim();
    const dateText = formatDate(note.updatedAt || note.createdAt);
    const titleColor = note.fontColor && !note.fontColor.includes('gray') ? note.fontColor : 'text-gray-900 dark:text-white';
    const textSize = note.fontSize || 'text-lg';

    return (
        <div 
            className="glass-card p-5 mb-3 cursor-pointer transform transition-all duration-300 hover:scale-[1.01] hover:-translate-y-1 relative group" 
            onClick={() => onEdit(note)}
            style={style} 
        >
            <div className="flex justify-between items-start mb-2">
                <h2 className={`font-black tracking-tight leading-tight pr-6 ${textSize} ${titleColor}`}>{note.title || "Untitled"}</h2>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-md">{dateText}</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-200 line-clamp-2 font-medium leading-relaxed">{snippet || 'Empty note...'}</p>
            
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(note); }} 
                className="absolute bottom-4 right-4 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
});

const NoteList = ({ notes, isLoading, userId, onEdit, onDelete, folders, currentFolderId, isSearchActive, searchTerm, openEditModal }: any) => {
    const folderName = useMemo(() => {
        if (isSearchActive) return 'Search Results';
        if (currentFolderId === 'all') return 'All Notes';
        return folders.find((f: Folder) => f.id === currentFolderId)?.name || 'Notes';
    }, [currentFolderId, folders, isSearchActive]);

    if (!userId) return <div className="h-screen flex flex-col items-center justify-center text-gray-500 dark:text-white animate-pulse"><RotateCw size={32} className='animate-spin mb-4' /><span className="font-bold tracking-widest text-sm">INITIALIZING</span></div>;
    
    if (notes.length === 0 && !isSearchActive) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 animate-slideUpFade">
                <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-full mb-4">
                    <FileText size={48} className="opacity-50 text-gray-400 dark:text-gray-400" />
                </div>
                <p className="font-bold text-lg text-gray-500 dark:text-gray-300">No notes yet</p>
                <p className="text-sm text-gray-400 mb-6">Capture your first thought</p>
                <button onClick={openEditModal} className="px-6 py-2 glass-btn rounded-full font-bold text-teal-600 dark:text-teal-400 text-sm flex items-center gap-2">
                    <Plus size={16} /> Create Note
                </button>
            </div>
        );
    }

    if (notes.length === 0 && isSearchActive) return <div className="h-[60vh] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500"><Search size={48} className="mb-4 opacity-50 text-gray-400 dark:text-white" /><p className="font-bold text-gray-600 dark:text-gray-300">No matches for "{searchTerm}"</p></div>;

    return (
        <div className="p-4 w-full max-w-xl mx-auto pb-24">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-6 ml-1 animate-slideUp">{folderName}</h2>
            <div className="space-y-4">
                {notes.map((note: Note, index: number) => (
                    <NoteItem
                        key={note.id}
                        note={note}
                        onEdit={onEdit}
                        onDelete={onDelete} 
                        style={{ animation: `slideUpFade 0.4s ease-out ${index * 0.05}s forwards`, opacity: 0 }}
                    />
                ))}
            </div>
        </div>
    );
};

// ... Constants ...
const FONT_SIZES = [{ label: 'Normal', value: 'text-base' }, { label: 'Large', value: 'text-xl' }, { label: 'Huge', value: 'text-3xl' }];
const FONT_COLORS = [{ label: 'Standard', value: 'text-gray-900 dark:text-white' }, { label: 'Ocean', value: 'text-teal-600 dark:text-teal-400' }, { label: 'Berry', value: 'text-pink-600 dark:text-pink-400' }, { label: 'Alert', value: 'text-red-600 dark:text-red-400' }];

const NoteModal = ({ note, onClose, onSave, onDelete, folders }: any) => {
    const initialFolder = note?.folderId || 'all';

    const [title, setTitle] = useState(note?.title || '');
    const [content, setContent] = useState(note?.content || '');
    const [folderId, setFolderId] = useState(initialFolder);
    const [fontSize, setFontSize] = useState(note?.fontSize || FONT_SIZES[0].value); 
    const [fontColor, setFontColor] = useState(note?.fontColor || FONT_COLORS[0].value); 

    const [currentId, setCurrentId] = useState(note?.id);
    const contentRef = useRef<HTMLTextAreaElement>(null);

    // Auto-save effect
    useEffect(() => {
        // Skip if everything is empty
        if (!title.trim() && !content.trim()) return;

        const timer = setTimeout(async () => {
            const savedId = await onSave({ 
                id: currentId, 
                title: title.trim() || 'Untitled', 
                content: content.trim(), 
                folderId, 
                fontSize, 
                fontColor 
            });
            // If it was a new note, store the returned ID to continue updating the same draft
            if (savedId && !currentId) {
                setCurrentId(savedId);
            }
        }, 2000); // Debounce time: 2 seconds

        return () => clearTimeout(timer);
    }, [title, content, folderId, fontSize, fontColor, currentId, onSave]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() && !content.trim()) return;
        onSave({ id: currentId, title: title.trim() || 'Untitled', content: content.trim(), folderId, fontSize, fontColor });
        onClose();
    };

    const handleDelete = () => {
        if (currentId && onDelete) {
            onDelete({ id: currentId });
            onClose();
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center animate-modalUp">
            <div className="bg-white/95 dark:bg-gray-900/95 w-full h-full sm:rounded-none flex flex-col shadow-2xl backdrop-blur-xl">
                <div className="glass-header flex justify-between items-center px-4 py-3 shrink-0 z-10">
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition"><ChevronLeft className="text-gray-800 dark:text-white" /></button>
                    <div className="flex space-x-2">
                        {currentId && <button onClick={handleDelete} className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition mr-1"><Trash2 size={20} /></button>}
                        <button onClick={handleSubmit} className="px-5 py-2 bg-teal-600 text-white font-bold rounded-full shadow-lg hover:bg-teal-700 transition disabled:opacity-50" disabled={!title.trim() && !content.trim()}>Done</button>
                    </div>
                </div>

                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center space-x-4 overflow-x-auto">
                   <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer">
                        <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Unfiled</option>
                        {folders.map((f: Folder) => <option key={f.id} value={f.id} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{f.name}</option>)}
                    </select>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                     <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"><option value="text-base" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Aa</option><option value="text-xl" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Aa+</option><option value="text-3xl" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">AA</option></select>
                     <select value={fontColor} onChange={(e) => setFontColor(e.target.value)} className="bg-transparent text-sm font-bold text-gray-700 dark:text-gray-200 focus:outline-none cursor-pointer"><option value={FONT_COLORS[0].value} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">B/W</option><option value={FONT_COLORS[1].value} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Teal</option><option value={FONT_COLORS[2].value} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Pink</option><option value={FONT_COLORS[3].value} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Red</option></select>
                </div>

                <div className="flex-grow flex flex-col p-6 overflow-y-auto">
                    <input 
                        type="text" 
                        placeholder="Title" 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        className={`bg-transparent w-full text-3xl font-black mb-4 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none ${fontColor.includes('gray') ? 'text-gray-900 dark:text-white' : fontColor}`} 
                    />
                    <textarea 
                        ref={contentRef}
                        placeholder="Start typing..." 
                        value={content} 
                        onChange={(e) => setContent(e.target.value)} 
                        className={`bg-transparent w-full flex-grow resize-none focus:outline-none leading-relaxed placeholder-gray-400 dark:placeholder-gray-600 ${fontSize} ${fontColor.includes('gray') ? 'text-gray-800 dark:text-gray-200' : fontColor}`} 
                    />
                </div>
            </div>
        </div>
    );
};

// --- Main App ---

const App = () => {
    const [userId, setUserId] = useState<string | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingNote, setEditingNote] = useState<Partial<Note> | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false); 
    const [currentView, setCurrentView] = useState<'notes' | 'settings' | 'folders' | 'home'>('home'); 
    const [currentFolderId, setCurrentFolderId] = useState<string>('all'); 
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [dbError, setDbError] = useState(false);

    // Initial load of persistent userId
    useEffect(() => {
        const initializeUser = async () => {
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
    }, []);

    // Dark Mode Body Class
    useEffect(() => { 
        document.body.className = isDarkMode ? 'dark' : ''; 
        document.body.style.color = isDarkMode ? '#ffffff' : '#111827';
    }, [isDarkMode]);

    // Data Management

    useEffect(() => {
        if (userId && db && !dbError) {
            const unsubNotes = onSnapshot(collection(db, `/artifacts/${appId}/users/${userId}/notes`), s => {
                const updatedNotes = s.docs.map(d => ({ id: d.id, ...d.data() } as Note));
                setNotes(updatedNotes);
                Preferences.set({ key: `noteflow_notes_${userId}`, value: JSON.stringify(updatedNotes) });
                setIsLoading(false);
            }, (error) => {
                console.error("Notes fetch error:", error);
                setDbError(true);
            });
            const unsubFolders = onSnapshot(collection(db, `/artifacts/${appId}/users/${userId}/folders`), s => {
                if(!s.empty) {
                    const updatedFolders = s.docs.map(d => ({ id: d.id, ...d.data() } as Folder));
                    setFolders(updatedFolders);
                    Preferences.set({ key: `noteflow_folders_${userId}`, value: JSON.stringify(updatedFolders) });
                }
            }, (error) => {
                console.error("Folders fetch error:", error);
                setDbError(true);
            });
            return () => { unsubNotes(); unsubFolders(); };
        }
    }, [userId, dbError]);

    const handleSaveNote = async (d: Partial<Note>): Promise<string | undefined> => { 
        if(!userId) return; 
        
        if (db && !dbError) {
            try {
                const p = { ...d, updatedAt: serverTimestamp() }; 
                if(d.id) {
                    await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/notes`, d.id), p); 
                    return d.id;
                } else {
                    const docRef = await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/notes`), {...p, createdAt: serverTimestamp()}); 
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
            Preferences.set({ key: `noteflow_notes_${userId}`, value: JSON.stringify(updated) });
            return updated;
        });
        return idToReturn;
    };

    const handleDeleteNote = async (n: Note) => { 
        if(!userId) return; 
        if (db && !dbError) {
            try {
                await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/notes`, n.id)); 
            } catch(e) {
                console.error("Firebase delete failed, falling back to local storage", e);
                setDbError(true);
            }
        }
        
        // Offline / Local delete
        setNotes(prev => {
            const updated = prev.filter(note => note.id !== n.id);
            Preferences.set({ key: `noteflow_notes_${userId}`, value: JSON.stringify(updated) });
            return updated;
        });
    };

    const handleCreateFolder = async (name: string) => { 
        if(!userId) return; 
        if (db && !dbError) {
            try {
                await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/folders`), { name, createdAt: serverTimestamp() });
                return;
            } catch(e) {
                console.error("Firebase create folder failed", e);
                setDbError(true);
            }
        }
        
        // Offline / Local create
        setFolders(prev => {
            const updated = [...prev, { id: crypto.randomUUID(), name, createdAt: new Date().toISOString() }];
            Preferences.set({ key: `noteflow_folders_${userId}`, value: JSON.stringify(updated) });
            return updated;
        });
    };

    const handleRenameFolder = async (id: string, name: string) => { 
        if(!userId) return; 
        if (db && !dbError) {
            try {
                await updateDoc(doc(db, `/artifacts/${appId}/users/${userId}/folders`, id), { name }); 
                return;
            } catch(e) {
                console.error("Firebase rename folder failed", e);
                setDbError(true);
            }
        }
        
        // Offline / Local rename
        setFolders(prev => {
            const updated = prev.map(f => f.id === id ? { ...f, name } : f);
            Preferences.set({ key: `noteflow_folders_${userId}`, value: JSON.stringify(updated) });
            return updated;
        });
    };

    const handleDeleteFolder = async (f: Folder) => { 
        if(!userId) return; 
        if (db && !dbError) {
            try {
                await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/folders`, f.id)); 
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
            Preferences.set({ key: `noteflow_folders_${userId}`, value: JSON.stringify(updated) });
            return updated;
        });
        if(currentFolderId===f.id) setCurrentFolderId('all');
    };

    
    const handleDeleteAccount = async () => {
        if (!userId) return;
        if (db) {
            for (const note of notes) {
                await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/notes`, note.id)).catch(() => {});
            }
            for (const folder of folders) {
                await deleteDoc(doc(db, `/artifacts/${appId}/users/${userId}/folders`, folder.id)).catch(() => {});
            }
        }
        setNotes([]);
        setFolders([]);
    };

    const filteredNotes = useMemo(() => {
        let list = notes;
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            list = list.filter(n => (n.title || '').toLowerCase().includes(term) || (n.content || '').toLowerCase().includes(term));
        } else if (currentFolderId !== 'all') {
            list = list.filter(n => n.folderId === currentFolderId);
        }
        return list.sort((a, b) => {
             const dateA = new Date(a.updatedAt?.toDate ? a.updatedAt.toDate() : a.updatedAt || 0).getTime();
             const dateB = new Date(b.updatedAt?.toDate ? b.updatedAt.toDate() : b.updatedAt || 0).getTime();
             return dateB - dateA;
        });
    }, [notes, currentFolderId, searchTerm]);

    const openNewNoteModal = () => {
        setEditingNote({ folderId: currentFolderId === 'all' ? 'all' : currentFolderId });
    };

    
    
    const loadLocalData = useCallback(async (uid: string) => {
        const localNotesRes = await Preferences.get({ key: `noteflow_notes_${uid}` });
        const localFoldersRes = await Preferences.get({ key: `noteflow_folders_${uid}` });
        
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
        <div className="min-h-screen flex flex-col transition-colors duration-500 overflow-x-hidden">
            <header className="sticky top-0 z-30 glass-header px-4 py-3 flex justify-between items-center transition-all duration-300">
                <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition" onClick={() => setCurrentView('settings')}><SettingsIcon className="text-gray-700 dark:text-white" /></button>
                <span className="font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-700 to-teal-500 dark:from-white dark:to-gray-300">
                    {currentView === 'notes' ? 'NOTE FLOW' : currentView.toUpperCase()}
                </span>
                {currentView === 'notes' ? (
                    <button className={`p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition ${isSearchVisible ? 'text-teal-500' : 'text-gray-700 dark:text-white'}`} onClick={() => { setIsSearchVisible(!isSearchVisible); setSearchTerm(''); }}><Search /></button>
                ) : (
                    <div className="w-10 h-10"></div>
                )}
            </header>
            
            <div className={`transition-all duration-300 overflow-hidden ${isSearchVisible && currentView === 'notes' ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="mx-4 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-2xl p-2 flex items-center">
                    <Search size={18} className="text-gray-400 ml-2" />
                    <input type="text" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search notes..." className="bg-transparent w-full p-2 font-bold focus:outline-none text-gray-800 dark:text-white" />
                    {searchTerm && <button onClick={()=>setSearchTerm('')}><X size={18} className="text-gray-400 mr-2" /></button>}
                </div>
            </div>

            <main className="flex-grow pt-4">
                {currentView === 'home' ? <WelcomeView userId={userId || ''} openEditModal={openNewNoteModal} /> :
                 currentView === 'settings' ? <SettingsView onBack={() => setCurrentView('notes')} userId={userId} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} onDeleteAccount={handleDeleteAccount} /> :
                 currentView === 'folders' ? <FoldersView folders={folders} currentFolderId={currentFolderId} setCurrentFolderId={(id: string) => { setCurrentFolderId(id); setCurrentView('notes'); }} handleCreateFolder={handleCreateFolder} handleRenameFolder={handleRenameFolder} handleDeleteFolder={handleDeleteFolder} setTempMessage={()=>{}} /> :
                 <NoteList notes={filteredNotes} isLoading={isLoading} userId={userId} onEdit={setEditingNote} onDelete={handleDeleteNote} folders={folders} currentFolderId={currentFolderId} isSearchActive={isSearchVisible && !!searchTerm} searchTerm={searchTerm} openEditModal={openNewNoteModal} />}
            </main>

             {currentView !== 'settings' && (
                 <div className="hidden sm:flex fixed bottom-8 left-8 z-40 space-x-4">
                     <button onClick={() => setCurrentView(currentView === 'folders' ? 'notes' : 'folders')} className="w-14 h-14 glass-fab rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition">
                        {currentView === 'folders' ? <ChevronLeft size={28} /> : <Folders size={28} />}
                     </button>
                 </div>
             )}

             {(currentView === 'notes' || currentView === 'home') && (
                <button 
                    className="fixed bottom-24 right-6 sm:bottom-10 sm:right-10 w-16 h-16 glass-fab rounded-full flex items-center justify-center text-white shadow-2xl transform transition hover:scale-110 active:scale-95 animate-bounceOnce z-40" 
                    onClick={openNewNoteModal}
                >
                    <Plus size={36} strokeWidth={3} />
                </button>
            )}

            {currentView !== 'settings' && (
                <div className="fixed bottom-0 w-full glass-footer p-3 flex justify-between items-center px-8 z-30 sm:hidden">
                    <button onClick={() => setCurrentView('home')} className={`flex flex-col items-center transition ${currentView === 'home' ? 'text-teal-600 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-teal-600'}`}>
                        <div className={currentView === 'home' ? "bg-teal-100 dark:bg-white/20 p-2 rounded-xl" : ""}><Home size={24} /></div>
                        {currentView !== 'home' && <span className="text-[10px] font-bold mt-1">Home</span>}
                    </button>
                    
                    <button onClick={() => { setCurrentView('notes'); setCurrentFolderId('all'); }} className={`flex flex-col items-center transition ${currentView === 'notes' ? 'text-teal-600 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-teal-600'}`}>
                        <div className={currentView === 'notes' ? "bg-teal-100 dark:bg-white/20 p-2 rounded-xl" : ""}><FileText size={24} /></div>
                        {currentView !== 'notes' && <span className="text-[10px] font-bold mt-1">All Notes</span>}
                    </button>

                    <button onClick={() => setCurrentView('folders')} className={`flex flex-col items-center transition ${currentView === 'folders' ? 'text-teal-600 dark:text-white' : 'text-gray-400 dark:text-gray-500 hover:text-teal-600'}`}>
                        <div className={currentView === 'folders' ? "bg-teal-100 dark:bg-white/20 p-2 rounded-xl" : ""}><Folders size={24} /></div>
                        {currentView !== 'folders' && <span className="text-[10px] font-bold mt-1">Folders</span>}
                    </button>
                </div>
            )}

            {editingNote && (
                <NoteModal 
                    key={editingNote.id || 'new-note'}
                    note={editingNote} 
                    onClose={() => setEditingNote(null)} 
                    onSave={handleSaveNote} 
                    onDelete={handleDeleteNote} 
                    folders={folders} 
                />
            )}
        </div>
    );
};

export default App;