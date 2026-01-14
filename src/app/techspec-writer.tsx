import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/techspec-writer")({
    component: TechSpecWriter,
});

export default function TechSpecWriter() {
    const [isLoading, setIsLoading] = useState(true); // 로딩 상태 추가
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // iframe 로드 완료 핸들러
    const handleIframeLoad = () => {
        setIsLoading(false);
    };

    return (
        <>
            <div className="w-full h-full flex flex-col overflow-hidden bg-white dark:bg-gray-900">

                {/* 1. 로딩 인디케이터 (Overlay) */}
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white dark:bg-gray-900">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">기술 사양서 작성기 로딩 중...</p>
                    </div>
                )}

                <iframe
                    ref={iframeRef}
                    src="tech-spec-writer.html" // public 폴더의 파일 경로
                    title="Tech Spec Writer"
                    onLoad={handleIframeLoad} // 로드 완료 이벤트 연결
                    className={`w-full h-full border-none transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'
                        }`}
                    style={{ display: 'block' }} // 하단 여백 제거용
                />
            </div>
        </>
    );
}