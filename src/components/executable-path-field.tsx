// src/components/settings/executable-path-field.tsx
import * as React from "react";
import { CheckCircle2, FileSearch, AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

type ValidationState =
    | { status: "idle"; message?: string }
    | { status: "valid"; message?: string }
    | { status: "invalid"; message?: string }
    | { status: "loading"; message?: string };

interface ExecutablePathFieldProps {
    label: string;
    description?: string;
    value: string;
    placeholder?: string;
    expectedAppName?: string;
    onChange: (value: string) => void;
}

export function ExecutablePathField({
    label,
    description,
    value,
    placeholder = "경로가 아직 설정되지 않았습니다.",
    expectedAppName,
    onChange,
}: ExecutablePathFieldProps) {
    const [validation, setValidation] = React.useState<ValidationState>({
        status: "idle",
    });

    //
    useEffect(() => {
        console.log("[renderer] prop:value changed", value);
    }, [value]);
    //

    const handleBrowse = async () => {
        console.log("[renderer] browse:start", { valueBefore: value });
        setValidation({ status: "loading", message: "파일 선택창을 여는 중..." });

        try {
            const selected = await window.desktopApi.pickExecutable();
            console.log("[renderer] browse:selected", selected);

            if (!selected) {
                setValidation({ status: "idle" });
                return;
            }

            onChange(selected);
            console.log("[renderer] browse:onChange-called", selected);

            setValidation({ status: "idle" });
        } catch (error: any) {
            setValidation({
                status: "invalid",
                message: error?.message ?? "파일 선택 중 오류가 발생했습니다.",
            });
        }
    };

    const handleValidate = async () => {
        if (!value) {
            setValidation({
                status: "invalid",
                message: "먼저 실행 파일 경로를 선택해주세요.",
            });
            return;
        }

        setValidation({ status: "loading", message: "경로를 검사하는 중..." });

        try {
            const result = await window.desktopApi.validateExecutable(value);
            console.log("[renderer] browse:validation-result", result);


            if (!result.ok) {
                setValidation({
                    status: "invalid",
                    message: result.error ?? "유효한 실행 파일이 아닙니다.",
                });
                console.log("[renderer] browse:invalid-basic");
                return;
            }
            else if (!result.looksLikeTarget) {
                console.log("[renderer] browse:invalid-target");
            } else {
                console.log("[renderer] browse:valid-target");
            }

            if (expectedAppName && !result.looksLikeTarget) {
                setValidation({
                    status: "invalid",
                    message: `${expectedAppName} 실행 파일처럼 보이지 않습니다. 경로를 다시 확인해주세요.`,
                });
                return;
            }

            setValidation({
                status: "valid",
                message: "정상적인 실행 파일 경로입니다.",
            });
        } catch (error: any) {
            setValidation({
                status: "invalid",
                message: error?.message ?? "검증 중 오류가 발생했습니다.",
            });
        }
    };

    const statusBadge = React.useMemo(() => {
        switch (validation.status) {
            case "valid":
                return (
                    <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        Valid
                    </Badge>
                );
            case "invalid":
                return (
                    <Badge variant="destructive">
                        Invalid
                    </Badge>
                );
            case "loading":
                return (
                    <Badge variant="secondary">
                        Checking
                    </Badge>
                );
            default:
                return <Badge variant="secondary">Not set</Badge>;
        }
    }, [validation.status]);

    return (
        <Card className="border-border/60 shadow-sm">
            <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle className="text-base">{label}</CardTitle>
                        {description ? (
                            <CardDescription className="text-sm leading-6">
                                {description}
                            </CardDescription>
                        ) : null}
                    </div>
                    {statusBadge}
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                <div className="flex gap-2">
                    <Input
                        value={value}
                        readOnly
                        placeholder={placeholder}
                        className="font-mono text-xs sm:text-sm"
                        title={value}
                    />
                    <Button type="button" variant="outline" onClick={handleBrowse}>
                        <FileSearch className="mr-2 h-4 w-4" />
                        찾아보기
                    </Button>
                    <Button type="button" onClick={handleValidate} disabled={validation.status === "loading"}>
                        {validation.status === "loading" ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        검증
                    </Button>
                </div>

                <div
                    className={cn(
                        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
                        validation.status === "valid" &&
                        "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
                        validation.status === "invalid" &&
                        "border-destructive/20 bg-destructive/5 text-destructive",
                        (validation.status === "idle" || validation.status === "loading") &&
                        "border-border/60 bg-muted/40 text-muted-foreground"
                    )}
                >
                    {validation.status === "valid" ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : validation.status === "invalid" ? (
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : validation.status === "loading" ? (
                        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                        <FileSearch className="mt-0.5 h-4 w-4 shrink-0" />
                    )}

                    <p className="leading-6">
                        {validation.message ??
                            "실행 파일 경로를 선택한 뒤 검증하면 상태가 표시됩니다."}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}