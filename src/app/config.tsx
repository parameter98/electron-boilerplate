import { ExecutablePathField } from "@/components/executable-path-field";
import Title from "@/components/title";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/config")({
    component: Config,
});

function Config() {
    const [lmStudioPath, setLmStudioPath] = useState("");

    useEffect(() => {
        console.log("[parent] lmStudioPath changed", lmStudioPath);
    }, [lmStudioPath]);

    return (
        <div className="space-y-2 text-sm">
            <Title>Config</Title>
            <ExecutablePathField
                label="Chrome Executable Path"
                description="Select the path to the executable file."
                value={lmStudioPath}
                onChange={(next) => {
                    console.log("[parent] onChange received", next);
                    setLmStudioPath(next);
                }}
            />
        </div>
    );
}
