import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { FileText, Upload, Search, Trash2, Tag, Calendar, File, Hash, FolderOpen, Link, ExternalLink, Eye } from 'lucide-react';
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/pdf_manager")({
    component: PDFManagerAppShell,
});


// ==================== Types ====================
interface Document {
    id: number;
    documentNumber: string;
    category: CategoryKey;
    name: string;
    size: number;
    uploadDate: string;
    tags: string[];
    description: string;
    links: DocumentLink[];
    lastOpened: string | null;
    storagePath?: string;
}

interface DocumentLink {
    id: number;
    url: string;
    title: string;
    addedDate: string;
}

interface StorageResult<T = any> {
    success: boolean;
    data?: T;
    error?: any;
}

interface FileUploadResult {
    name: string;
    size: number;
    type: string;
    storagePath?: string;
    localPath?: string;
}

type CategoryKey = 'REPORT' | 'TECH' | 'SPEC' | 'MANUAL' | 'PROPOSAL' | 'MEETING' | 'OTHER';

interface Category {
    prefix: string;
    name: string;
    color: string;
}

interface CategoryWithStats extends Category {
    key: CategoryKey;
    count: number;
}

// ==================== Storage Strategy Interface ====================
abstract class StorageStrategy {
    abstract saveDocuments(documents: Document[]): Promise<StorageResult>;
    abstract loadDocuments(): Promise<StorageResult<Document[]>>;
    abstract uploadFile(file: File): Promise<StorageResult<FileUploadResult>>;
    abstract deleteFile(documentId: number): Promise<StorageResult>;
    // [추가] 파일 열기 메서드 정의
    abstract openFile(document: Document): Promise<StorageResult>;
}

// ==================== Browser Storage Strategy ====================
class BrowserStorageStrategy extends StorageStrategy {
    async saveDocuments(documents: Document[]): Promise<StorageResult> {
        try {
            await (window as any).storage.set('pdf-documents', JSON.stringify(documents));
            return { success: true };
        } catch (error) {
            console.error('Failed to save documents:', error);
            return { success: false, error };
        }
    }

    async loadDocuments(): Promise<StorageResult<Document[]>> {
        try {
            const stored = await (window as any).storage.get('pdf-documents');
            if (stored) {
                return { success: true, data: JSON.parse(stored.value) };
            }
            return { success: true, data: [] };
        } catch (error) {
            console.log('No existing documents');
            return { success: true, data: [] };
        }
    }

    async uploadFile(file: File): Promise<StorageResult<FileUploadResult>> {
        return {
            success: true,
            data: {
                name: file.name,
                size: file.size,
                type: file.type
            }
        };
    }

    async deleteFile(documentId: number): Promise<StorageResult> {
        return { success: true };
    }

    // [추가] 브라우저 전략 구현
    async openFile(document: Document): Promise<StorageResult> {
        // 실제 파일 시스템이 아니므로 데모 메시지 출력 또는 Blob URL 처리
        console.log(`Opening file: ${document.name}`);
        alert(`브라우저 스토리지 데모: ${document.name} 파일을 엽니다.\n(실제 파일은 서버나 로컬에 저장되지 않았습니다)`);
        return { success: true };
    }
}

// ==================== Supabase Storage Strategy ====================
class SupabaseStorageStrategy extends StorageStrategy {
    private client: any;

    constructor(supabaseClient: any) {
        super();
        this.client = supabaseClient;
    }

    async saveDocuments(documents: Document[]): Promise<StorageResult> {
        try {
            const { error } = await this.client
                .from('documents')
                .upsert(documents);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    }

    async loadDocuments(): Promise<StorageResult<Document[]>> {
        try {
            const { data, error } = await this.client
                .from('documents')
                .select('*')
                .order('uploadDate', { ascending: false });

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            return { success: false, error, data: [] };
        }
    }

    async uploadFile(file: File): Promise<StorageResult<FileUploadResult>> {
        try {
            const fileName = `${Date.now()}-${file.name}`;
            const { data, error } = await this.client.storage
                .from('pdf-files')
                .upload(fileName, file);

            if (error) throw error;

            return {
                success: true,
                data: {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    storagePath: data.path
                }
            };
        } catch (error) {
            return { success: false, error };
        }
    }

    async deleteFile(documentId: number): Promise<StorageResult> {
        try {
            const { error } = await this.client
                .from('documents')
                .delete()
                .eq('id', documentId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    }

    // [추가] Supabase 전략 구현
    async openFile(document: Document): Promise<StorageResult> {
        try {
            // storagePath가 있다고 가정 (uploadFile에서 저장됨)
            if (!document.storagePath) throw new Error("파일 경로가 없습니다.");

            const { data } = this.client.storage
                .from('pdf-files') // 버킷 이름
                .getPublicUrl(document.storagePath);

            if (!data.publicUrl) throw new Error("URL을 생성할 수 없습니다.");

            // 새 탭에서 열기
            window.open(data.publicUrl, '_blank');
            return { success: true };
        } catch (error) {
            console.error('File open error:', error);
            return { success: false, error };
        }
    }
}

// ==================== Local File System Strategy ====================
class LocalFileSystemStrategy extends StorageStrategy {
    private basePath: string;

    constructor(basePath: string = './documents') {
        super();
        this.basePath = basePath;
    }

    async saveDocuments(documents: Document[]): Promise<StorageResult> {
        try {
            localStorage.setItem('pdf-documents-local', JSON.stringify(documents));
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    }

    async loadDocuments(): Promise<StorageResult<Document[]>> {
        try {
            const data = localStorage.getItem('pdf-documents-local');
            return { success: true, data: data ? JSON.parse(data) : [] };
        } catch (error) {
            return { success: true, data: [] };
        }
    }

    // [수정] 파일 업로드: 실제로 Electron을 통해 디스크에 저장
    async uploadFile(file: File): Promise<StorageResult<FileUploadResult>> {
        try {
            // 1. 파일 데이터를 ArrayBuffer로 변환
            const arrayBuffer = await file.arrayBuffer();

            // 2. Electron Main Process로 데이터 전송 및 저장 요청
            // (preload.js에 saveFile이 정의되어 있어야 함)
            const result = await (window as any).api.saveFile(file.name, arrayBuffer);

            if (!result.success) {
                throw new Error(result.error || '파일 저장 실패');
            }

            // 3. Main Process가 반환한 "절대 경로"를 사용
            return {
                success: true,
                data: {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    // 중요: 여기에 절대 경로가 저장됩니다 (예: C:\Users\...\pdf-files\1234.pdf)
                    storagePath: result.path
                }
            };
        } catch (error) {
            console.error(error);
            return { success: false, error };
        }
    }

    // [수정] 파일 삭제: 실제 파일 삭제 + 메타데이터 삭제
    async deleteFile(documentId: number): Promise<StorageResult> {
        try {
            // 1. 현재 저장된 문서 목록을 불러와서 삭제 대상 찾기
            const loadResult = await this.loadDocuments();
            const documents = loadResult.data || [];
            const targetDoc = documents.find(doc => doc.id === documentId);

            // 2. 실제 파일 삭제 (Electron IPC 호출)
            // targetDoc이 있고, 경로 정보(storagePath)가 있다면 실제 파일 삭제 시도
            if (targetDoc && targetDoc.storagePath) {
                const electronAPI = (window as any).api;

                if (electronAPI && electronAPI.deleteFile) {
                    const deleteResult = await electronAPI.deleteFile(targetDoc.storagePath);

                    if (!deleteResult.success) {
                        console.warn(`실제 파일 삭제 실패 (${targetDoc.storagePath}):`, deleteResult.error);
                        // 실제 파일 삭제에 실패해도, 목록에서는 지울지 여부를 결정해야 합니다.
                        // 여기서는 경고만 하고 목록 삭제를 진행합니다.
                    }
                }
            }

            // 3. 메타데이터(목록)에서 삭제 및 저장
            // 기존 로직과 동일하게 필터링 후 localStorage 업데이트
            const updatedDocs = documents.filter(doc => doc.id !== documentId);
            localStorage.setItem('pdf-documents-local', JSON.stringify(updatedDocs));

            return { success: true };

        } catch (error) {
            console.error('Delete operation failed:', error);
            return { success: false, error };
        }
    }

    // [수정] 파일 열기: 저장된 절대 경로로 열기 요청
    async openFile(document: Document): Promise<StorageResult> {
        try {
            const electronAPI = (window as any).api;

            // storagePath(절대 경로)가 있는지 확인
            // 하위 호환성을 위해 localPath도 체크하지만, 새로 저장된 건 storagePath를 사용
            const pathOpen = document.storagePath || (document as any).localPath;

            if (!pathOpen) {
                throw new Error("파일 경로를 찾을 수 없습니다.");
            }

            if (electronAPI && electronAPI.openPath) {
                // Electron에게 절대 경로로 열기 요청
                const errorMsg = await electronAPI.openPath(pathOpen);

                if (errorMsg) throw new Error(`파일 열기 실패: ${errorMsg}`);
                return { success: true };
            } else {
                alert(`Electron 환경이 아닙니다.\n경로: ${pathOpen}`);
                return { success: true };
            }
        } catch (error) {
            return { success: false, error };
        }
    }
}

// ==================== Storage Context ====================
interface StorageContextType {
    strategy: StorageStrategy;
    changeStrategy: (newStrategy: StorageStrategy) => void;
    saveDocuments: (docs: Document[]) => Promise<StorageResult>;
    loadDocuments: () => Promise<StorageResult<Document[]>>;
    uploadFile: (file: File) => Promise<StorageResult<FileUploadResult>>;
    deleteFile: (docId: number) => Promise<StorageResult>;
    // [추가]
    openFile: (doc: Document) => Promise<StorageResult>;
}

const StorageContext = createContext<StorageContextType | null>(null);

export const useStorage = (): StorageContextType => {
    const context = useContext(StorageContext);
    if (!context) {
        throw new Error('useStorage must be used within StorageProvider');
    }
    return context;
};

// ==================== Storage Provider ====================
interface StorageProviderProps {
    children: ReactNode;
    strategy: StorageStrategy;
}

export const StorageProvider: React.FC<StorageProviderProps> = ({ children, strategy }) => {
    const [currentStrategy, setCurrentStrategy] = useState<StorageStrategy>(strategy);

    const changeStrategy = (newStrategy: StorageStrategy) => {
        setCurrentStrategy(newStrategy);
    };

    const value: StorageContextType = {
        strategy: currentStrategy,
        changeStrategy,
        saveDocuments: (docs) => currentStrategy.saveDocuments(docs),
        loadDocuments: () => currentStrategy.loadDocuments(),
        uploadFile: (file) => currentStrategy.uploadFile(file),
        deleteFile: (docId) => currentStrategy.deleteFile(docId),
        // [추가]
        openFile: (doc) => currentStrategy.openFile(doc)
    };

    return (
        <StorageContext.Provider value={value}>
            {children}
        </StorageContext.Provider>
    );
};

// ==================== Document Categories ====================
const DOCUMENT_CATEGORIES: Record<CategoryKey, Category> = {
    REPORT: { prefix: 'REP', name: '보고서', color: 'blue' },
    TECH: { prefix: 'TECH', name: '기술문서', color: 'green' },
    SPEC: { prefix: 'SPEC', name: '명세서', color: 'purple' },
    MANUAL: { prefix: 'MAN', name: '매뉴얼', color: 'orange' },
    PROPOSAL: { prefix: 'PROP', name: '제안서', color: 'pink' },
    MEETING: { prefix: 'MTG', name: '회의록', color: 'indigo' },
    OTHER: { prefix: 'DOC', name: '기타', color: 'gray' }
};

// ==================== Main App Component ====================
function PDFManagerAppShell() {
    return <App />;
}

const PDFManagerApp: React.FC = () => {
    const storage = useStorage();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [filterCategory, setFilterCategory] = useState<CategoryKey | 'all'>('all');
    const [filterTag, setFilterTag] = useState<string>('all');
    const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [uploadCategory, setUploadCategory] = useState<CategoryKey>('REPORT');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        loadDocuments();
    }, [storage.strategy]);

    const loadDocuments = async (): Promise<void> => {
        setIsLoading(true);
        const result = await storage.loadDocuments();
        if (result.success && result.data) {
            setDocuments(result.data);
        }
        setIsLoading(false);
    };

    const saveDocuments = async (docs: Document[]): Promise<void> => {
        const result = await storage.saveDocuments(docs);
        if (!result.success) {
            alert('문서 저장에 실패했습니다.');
        }
    };

    const generateDocumentNumber = (category: CategoryKey, date: string): string => {
        const categoryDocs = documents.filter(doc => doc.category === category);
        const sameYearDocs = categoryDocs.filter(doc => {
            const docDate = new Date(doc.uploadDate);
            const uploadDate = new Date(date);
            return docDate.getFullYear() === uploadDate.getFullYear();
        });

        const nextNumber = sameYearDocs.length + 1;
        const year = new Date(date).getFullYear();
        const prefix = DOCUMENT_CATEGORIES[category].prefix;

        return `${prefix}-${year}-${String(nextNumber).padStart(3, '0')}`;
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const files = Array.from(e.target.files || []);

        // 파일이 선택되지 않았을 경우(취소 등) 처리
        if (files.length === 0) return;

        setUploadFiles(files);
        setShowUploadModal(true);

        // [핵심 수정] 입력 값을 초기화하여 동일한 파일을 다시 선택해도 onChange가 트리거되도록 함
        e.target.value = '';
    };

    const confirmUpload = async (): Promise<void> => {
        setIsLoading(true);
        const uploadDate = new Date().toISOString();
        const uploadedDocs: Document[] = [];

        for (const file of uploadFiles) {
            const uploadResult = await storage.uploadFile(file);

            if (uploadResult.success && uploadResult.data) {
                uploadedDocs.push({
                    id: Date.now() + Math.random(),
                    documentNumber: generateDocumentNumber(uploadCategory, uploadDate),
                    category: uploadCategory,
                    name: uploadResult.data.name,
                    size: uploadResult.data.size,
                    uploadDate: uploadDate,
                    tags: [],
                    description: '',
                    links: [],
                    lastOpened: null,
                    storagePath: uploadResult.data.storagePath || uploadResult.data.localPath
                });
            }
        }

        const updated = [...documents, ...uploadedDocs];
        setDocuments(updated);
        await saveDocuments(updated);

        setShowUploadModal(false);
        setUploadFiles([]);
        setUploadCategory('REPORT');
        setIsLoading(false);
    };

    const deleteDocument = async (id: number): Promise<void> => {
        setIsLoading(true);
        await storage.deleteFile(id);

        const updated = documents.filter(doc => doc.id !== id);
        setDocuments(updated);
        await saveDocuments(updated);

        if (selectedDoc?.id === id) setSelectedDoc(null);
        setIsLoading(false);
    };

    const updateDocument = async (id: number, updates: Partial<Document>): Promise<void> => {
        const updated = documents.map(doc =>
            doc.id === id ? { ...doc, ...updates } : doc
        );
        setDocuments(updated);
        await saveDocuments(updated);

        if (selectedDoc?.id === id) {
            setSelectedDoc({ ...selectedDoc, ...updates } as Document);
        }
    };

    const addTag = (id: number, tag: string): void => {
        if (!tag.trim()) return;
        const doc = documents.find(d => d.id === id);
        if (doc && !doc.tags.includes(tag)) {
            updateDocument(id, { tags: [...doc.tags, tag] });
        }
    };

    const removeTag = (id: number, tag: string): void => {
        const doc = documents.find(d => d.id === id);
        if (doc) {
            updateDocument(id, { tags: doc.tags.filter(t => t !== tag) });
        }
    };

    const addLink = (id: number, url: string, title: string): void => {
        if (!url.trim()) return;
        const doc = documents.find(d => d.id === id);
        if (doc) {
            const newLink: DocumentLink = {
                id: Date.now() + Math.random(),
                url: url.trim(),
                title: title.trim() || url.trim(),
                addedDate: new Date().toISOString()
            };
            updateDocument(id, { links: [...(doc.links || []), newLink] });
        }
    };

    const removeLink = (id: number, linkId: number): void => {
        const doc = documents.find(d => d.id === id);
        if (doc) {
            updateDocument(id, { links: (doc.links || []).filter(l => l.id !== linkId) });
        }
    };

    // [추가] 파일 열기 핸들러
    const handleOpenFile = async (e: React.MouseEvent, doc: Document) => {
        e.stopPropagation(); // 카드 클릭 이벤트(상세보기) 방지
        setIsLoading(true);
        const result = await storage.openFile(doc);
        setIsLoading(false);

        if (!result.success) {
            console.error(result.error);
            alert('파일을 열 수 없습니다. 파일 경로가 유효하지 않거나 삭제되었을 수 있습니다.');
        }
    };

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
        const matchesTag = filterTag === 'all' || doc.tags.includes(filterTag);
        return matchesSearch && matchesCategory && matchesTag;
    });

    const allTags = [...new Set(documents.flatMap(doc => doc.tags))];

    const getCategoryStats = (): CategoryWithStats[] => {
        return (Object.keys(DOCUMENT_CATEGORIES) as CategoryKey[]).map(key => ({
            key,
            ...DOCUMENT_CATEGORIES[key],
            count: documents.filter(doc => doc.category === key).length
        }));
    };

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    };

    const getCategoryColor = (category: CategoryKey): string => {
        const colors: Record<string, string> = {
            blue: 'bg-blue-100 text-blue-700',
            green: 'bg-green-100 text-green-700',
            purple: 'bg-purple-100 text-purple-700',
            orange: 'bg-orange-100 text-orange-700',
            pink: 'bg-pink-100 text-pink-700',
            indigo: 'bg-indigo-100 text-indigo-700',
            gray: 'bg-gray-100 text-gray-700'
        };
        return colors[DOCUMENT_CATEGORIES[category]?.color] || colors.gray;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">처리중...</p>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-blue-600" />
                            <h1 className="text-2xl font-bold text-gray-900">PDF 문서 관리 시스템</h1>
                        </div>
                        <div className="text-sm text-gray-500">
                            총 {documents.length}개 문서
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="grid grid-cols-12 gap-6">
                    {/* Sidebar */}
                    <div className="col-span-3 space-y-4">
                        {/* Upload */}
                        <div className="bg-white rounded-lg shadow-sm p-4">
                            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-600">PDF 업로드</span>
                                <input
                                    type="file"
                                    multiple
                                    accept=".pdf"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {/* Category Filter */}
                        <div className="bg-white rounded-lg shadow-sm p-4">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <FolderOpen className="w-4 h-4" />
                                카테고리
                            </h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => setFilterCategory('all')}
                                    className={`w-full text-left px-3 py-2 rounded text-sm ${filterCategory === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    전체 ({documents.length})
                                </button>
                                {getCategoryStats().map(cat => (
                                    <button
                                        key={cat.key}
                                        onClick={() => setFilterCategory(cat.key)}
                                        className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${filterCategory === cat.key ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span>{cat.name}</span>
                                        <span className="text-xs">{cat.count}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Tag Filter */}
                        <div className="bg-white rounded-lg shadow-sm p-4">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Tag className="w-4 h-4" />
                                태그
                            </h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => setFilterTag('all')}
                                    className={`w-full text-left px-3 py-2 rounded text-sm ${filterTag === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    전체
                                </button>
                                {allTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setFilterTag(tag)}
                                        className={`w-full text-left px-3 py-2 rounded text-sm ${filterTag === tag ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="bg-white rounded-lg shadow-sm p-4">
                            <h3 className="font-semibold text-gray-900 mb-3">통계</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">총 문서</span>
                                    <span className="font-medium">{documents.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">총 용량</span>
                                    <span className="font-medium">
                                        {formatSize(documents.reduce((sum, doc) => sum + doc.size, 0))}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">태그 수</span>
                                    <span className="font-medium">{allTags.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="col-span-9 space-y-4">
                        {/* Search */}
                        <div className="bg-white rounded-lg shadow-sm p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="문서 검색 (문서번호, 파일명, 설명)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Document List */}
                        <div className="bg-white rounded-lg shadow-sm">
                            {filteredDocs.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    <File className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                    <p>문서가 없습니다</p>
                                    <p className="text-sm mt-2">PDF 파일을 업로드해주세요</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {filteredDocs.map(doc => (
                                        <div
                                            key={doc.id}
                                            className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors relative overflow-hidden ${selectedDoc?.id === doc.id ? 'bg-blue-50' : ''
                                                }`}
                                            onClick={() => setSelectedDoc(doc)}
                                        >
                                            {/* Watermark Stamp */}
                                            <div className="absolute top-4 right-4 opacity-10 pointer-events-none select-none">
                                                <div className="transform rotate-12">
                                                    <div className={`border-4 rounded-lg px-6 py-4 ${getCategoryColor(doc.category)} border-current`}>
                                                        <div className="text-center">
                                                            <div className="font-bold text-3xl tracking-wider">
                                                                {DOCUMENT_CATEGORIES[doc.category].prefix}
                                                            </div>
                                                            <div className="text-sm font-mono mt-1">
                                                                {doc.documentNumber.split('-').slice(1).join('-')}
                                                            </div>
                                                            <div className="text-xs mt-1 opacity-70">
                                                                {new Date(doc.uploadDate).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\./g, '.').replace(/\s/g, '')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-start justify-between relative z-10">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <FileText className="w-5 h-5 text-red-500" />
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-1 rounded text-xs font-mono font-semibold ${getCategoryColor(doc.category)}`}>
                                                                {doc.documentNumber}
                                                            </span>
                                                            <h3 className="font-medium text-gray-900">{doc.name}</h3>
                                                        </div>
                                                    </div>

                                                    {doc.description && (
                                                        <p className="text-sm text-gray-600 mb-2 ml-8">{doc.description}</p>
                                                    )}

                                                    <div className="flex items-center gap-4 ml-8 text-xs text-gray-500">
                                                        <span className={`px-2 py-0.5 rounded ${getCategoryColor(doc.category)}`}>
                                                            {DOCUMENT_CATEGORIES[doc.category].name}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDate(doc.uploadDate)}
                                                        </span>
                                                        <span>{formatSize(doc.size)}</span>
                                                    </div>

                                                    {doc.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-3 ml-8">
                                                            {doc.tags.map(tag => (
                                                                <span
                                                                    key={tag}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                                                                >
                                                                    <Tag className="w-3 h-3" />
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {doc.links && doc.links.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-2 ml-8">
                                                            {doc.links.map(link => (
                                                                <a
                                                                    key={link.id}
                                                                    href={link.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors"
                                                                    title={link.url}
                                                                >
                                                                    <Link className="w-3 h-3" />
                                                                    {link.title}
                                                                    <ExternalLink className="w-2 h-2" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 파일 열기 버튼 추가 */}
                                                <button
                                                    onClick={(e) => handleOpenFile(e, doc)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="PDF 파일 열기"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteDocument(doc.id);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-900">문서 업로드</h2>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    카테고리 선택
                                </label>
                                <select
                                    value={uploadCategory}
                                    onChange={(e) => setUploadCategory(e.target.value as CategoryKey)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {(Object.entries(DOCUMENT_CATEGORIES) as [CategoryKey, Category][]).map(([key, cat]) => (
                                        <option key={key} value={key}>
                                            {cat.name} ({cat.prefix})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    업로드할 파일 ({uploadFiles.length}개)
                                </label>
                                <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                                    {uploadFiles.map((file, idx) => (
                                        <div key={idx} className="text-sm text-gray-600 py-1">
                                            • {file.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    <Hash className="w-4 h-4 inline mr-1" />
                                    문서번호 예시: {generateDocumentNumber(uploadCategory, new Date().toISOString())}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 border-t flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setUploadFiles([]);
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={confirmUpload}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                업로드
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedDoc && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="p-6 border-b relative overflow-hidden">
                            {/* Large Watermark Stamp for Detail Modal */}
                            <div className="absolute top-1/2 right-8 -translate-y-1/2 opacity-5 pointer-events-none select-none">
                                <div className="transform -rotate-12">
                                    <div className={`border-8 rounded-2xl px-12 py-8 ${getCategoryColor(selectedDoc.category)} border-current`}>
                                        <div className="text-center">
                                            <div className="font-bold text-6xl tracking-wider">
                                                {DOCUMENT_CATEGORIES[selectedDoc.category].prefix}
                                            </div>
                                            <div className="text-2xl font-mono mt-2">
                                                {selectedDoc.documentNumber.split('-').slice(1).join('-')}
                                            </div>
                                            <div className="text-lg mt-2 opacity-70">
                                                {new Date(selectedDoc.uploadDate).getFullYear()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start justify-between relative z-10">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 rounded font-mono font-bold text-sm ${getCategoryColor(selectedDoc.category)}`}>
                                            {selectedDoc.documentNumber}
                                        </span>
                                        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(selectedDoc.category)}`}>
                                            {DOCUMENT_CATEGORIES[selectedDoc.category].name}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedDoc.name}</h2>
                                    <p className="text-sm text-gray-500">{formatSize(selectedDoc.size)} • {formatDate(selectedDoc.uploadDate)}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedDoc(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">설명</label>
                                <textarea
                                    value={selectedDoc.description}
                                    onChange={(e) => updateDocument(selectedDoc.id, { description: e.target.value })}
                                    placeholder="문서 설명을 입력하세요..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                />
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">태그</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {selectedDoc.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                                        >
                                            {tag}
                                            <button
                                                onClick={() => removeTag(selectedDoc.id, tag)}
                                                className="hover:text-blue-900"
                                            >
                                                ✕
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="태그 입력 후 Enter"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                const input = e.target as HTMLInputElement;
                                                addTag(selectedDoc.id, input.value);
                                                input.value = '';
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Reference Links */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Link className="w-4 h-4" />
                                    참고 링크
                                </label>
                                <div className="space-y-2 mb-3">
                                    {(selectedDoc.links || []).map(link => (
                                        <div
                                            key={link.id}
                                            className="flex items-center gap-2 p-3 bg-green-50 rounded-lg group"
                                        >
                                            <Link className="w-4 h-4 text-green-600 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <a
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-medium text-green-700 hover:text-green-900 hover:underline block truncate"
                                                >
                                                    {link.title}
                                                </a>
                                                <p className="text-xs text-green-600 truncate" title={link.url}>
                                                    {link.url}
                                                </p>
                                            </div>
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
                                                title="새 창에서 열기"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                            <button
                                                onClick={() => removeLink(selectedDoc.id, link.id)}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="링크 제목"
                                        id={`link-title-${selectedDoc.id}`}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="url"
                                            placeholder="URL 입력 (예: https://example.com)"
                                            id={`link-url-${selectedDoc.id}`}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    const titleInput = document.getElementById(`link-title-${selectedDoc.id}`) as HTMLInputElement;
                                                    const urlInput = e.target as HTMLInputElement;
                                                    addLink(selectedDoc.id, urlInput.value, titleInput.value);
                                                    titleInput.value = '';
                                                    urlInput.value = '';
                                                }
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                const titleInput = document.getElementById(`link-title-${selectedDoc.id}`) as HTMLInputElement;
                                                const urlInput = document.getElementById(`link-url-${selectedDoc.id}`) as HTMLInputElement;
                                                addLink(selectedDoc.id, urlInput.value, titleInput.value);
                                                titleInput.value = '';
                                                urlInput.value = '';
                                            }}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        >
                                            추가
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500">제목을 입력하지 않으면 URL이 제목으로 사용됩니다</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==================== App Wrapper with Provider ====================
const App: React.FC = () => {
    // const [storageStrategy] = useState<StorageStrategy>(() => new BrowserStorageStrategy());

    // 전략 변경 예시:
    const [storageStrategy] = useState<StorageStrategy>(() => new LocalFileSystemStrategy());
    // const [storageStrategy] = useState<StorageStrategy>(() => new SupabaseStorageStrategy(supabaseClient));

    return (
        <StorageProvider strategy={storageStrategy}>
            <PDFManagerApp />
        </StorageProvider>
    );
};

