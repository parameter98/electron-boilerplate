// src/types/global.d.ts
export { };

declare global {
    interface Window {
        desktopApi: {
            pickExecutable: () => Promise<string | null>;
            validateExecutable: (
                filePath: string
            ) => Promise<{
                ok: boolean;
                exists: boolean;
                extOk: boolean;
                looksLikeTarget?: boolean;
                error?: string;
            }>;
        };
    }
}