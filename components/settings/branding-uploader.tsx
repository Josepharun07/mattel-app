"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { FileSignature, Upload } from "lucide-react";
import { createBrandingUploadUrl, updateBrandingAssets } from "@/actions/settings-actions";

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read the image."));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function BrandingUploader({
  logoUrl,
  signatureUrl,
  onSaved,
}: {
  logoUrl: string;
  signatureUrl: string;
  onSaved: (patch: { logoUrl?: string; signatureUrl?: string }) => void;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"logos" | "signatures" | null>(null);

  async function accept(file: File, folder: "logos" | "signatures") {
    if (file.size > 2_000_000) {
      setMessage("Keep the image under 2 MB.");
      return;
    }
    setBusy(folder);
    const prepared = await createBrandingUploadUrl(file.name, file.type || "application/octet-stream", folder);
    if (!prepared.success && !prepared.offline) {
      setMessage(prepared.message);
      setBusy(null);
      return;
    }

    let stored = "";
    if (prepared.success) {
      const response = await fetch(prepared.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!response.ok) {
        setMessage("The bucket refused the upload.");
        setBusy(null);
        return;
      }
      stored = prepared.publicUrl;
    } else {
      stored = await readDataUrl(file);
    }

    const patch = folder === "logos" ? { logoUrl: stored } : { signatureUrl: stored };
    const saved = await updateBrandingAssets(patch);
    if (saved.success || ("offline" in saved && saved.offline)) {
      onSaved(patch);
    }
    setMessage(prepared.success ? "Uploaded to storage." : "Image kept in this browser until object storage is connected.");
    setBusy(null);
  }

  function drop(event: DragEvent<HTMLLabelElement>, folder: "logos" | "signatures") {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      void accept(file, folder);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <UploadCard
        title="Company logo"
        hint="PNG, JPEG, WEBP, or SVG"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        preview={logoUrl}
        light={false}
        busy={busy === "logos"}
        icon={<Upload className="size-4" />}
        onFile={(file) => void accept(file, "logos")}
        onDrop={(event) => drop(event, "logos")}
      />
      <UploadCard
        title="Signature stamp"
        hint="Transparent PNG only"
        accept="image/png"
        preview={signatureUrl}
        light
        busy={busy === "signatures"}
        icon={<FileSignature className="size-4" />}
        onFile={(file) => void accept(file, "signatures")}
        onDrop={(event) => drop(event, "signatures")}
      />
      {message ? <p className="text-sm text-muted-foreground md:col-span-2">{message}</p> : null}
    </div>
  );
}

function UploadCard({
  title,
  hint,
  accept,
  preview,
  light,
  busy,
  icon,
  onFile,
  onDrop,
}: {
  title: string;
  hint: string;
  accept: string;
  preview: string;
  light: boolean;
  busy: boolean;
  icon: ReactNode;
  onFile: (file: File) => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
}) {
  return (
    <label
      className="block cursor-pointer rounded-xl border border-dashed bg-white p-4"
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <span className="flex items-center gap-2 text-sm font-medium">{icon}{title}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{hint}. Drop a file or choose one.</span>
      <input
        className="mt-3 block w-full text-sm"
        type="file"
        accept={accept}
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onFile(file);
          }
        }}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className={`mt-3 h-20 w-auto max-w-full object-contain ${light ? "rounded-md bg-slate-100 p-2" : ""}`}
        />
      ) : null}
    </label>
  );
}
