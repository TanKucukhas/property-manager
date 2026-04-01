"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LogEntry {
  time: string;
  uid: string;
  success: boolean;
  detail: string;
}

export default function EmailTestPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sending, setSending] = useState(false);

  async function sendTest() {
    setSending(true);
    const time = new Date().toLocaleTimeString();
    try {
      const res = await fetch("/api/email-test", { method: "POST" });
      const data = await res.json();
      setLogs((prev) => [
        {
          time,
          uid: data.uid || "—",
          success: data.success,
          detail: data.success
            ? `Brevo messageId: ${data.result?.messageId || "ok"}`
            : `Error: ${data.error || res.statusText}`,
        },
        ...prev,
      ]);
    } catch (err) {
      setLogs((prev) => [
        {
          time,
          uid: "—",
          success: false,
          detail: err instanceof Error ? err.message : "Network error",
        },
        ...prev,
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">Email Test</h1>
      <p className="mt-2 text-muted-foreground">
        Sends a test email to tankucukhas@gmail.com via Brevo and logs the result.
      </p>

      <Button onClick={sendTest} disabled={sending} className="mt-6 h-12 px-8 text-lg">
        {sending ? "Sending..." : "Send Test Email"}
      </Button>

      {logs.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`rounded-lg border p-3 text-sm ${
                  log.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted-foreground">{log.time}</span>
                  <span className={`text-xs font-semibold ${log.success ? "text-green-700" : "text-red-700"}`}>
                    {log.success ? "OK" : "FAIL"}
                  </span>
                </div>
                <p className="mt-1 font-mono text-xs break-all">uid: {log.uid}</p>
                <p className="mt-1 text-xs">{log.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
