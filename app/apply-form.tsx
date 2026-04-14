"use client";

import { Check } from "lucide-react";
import jsPDF from "jspdf";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { submitApplication, type FormState } from "./actions";

const SOFTWARE_OPTIONS = [
  "Premiere Pro",
  "After Effects",
  "Photoshop",
  "Illustrator",
  "DaVinci Resolve",
];

const EXPERIENCE_OPTIONS = [
  "0-1 år",
  "1-2 år",
  "2-4 år",
  "4-6 år",
  "6-8 år",
  "8+ år",
];

const initialState: FormState = {
  status: "idle",
  message: "",
  errors: {},
};

const isProd = process.env.NODE_ENV === "production";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="pt-2 text-[12px] uppercase tracking-[0.12em] text-[#8f1d1d] dark:text-[#dc8989]">{message}</p>;
}

type UploadFieldProps = {
  label: string;
  name: string;
  accept?: string;
  error?: string;
};

function UploadField({ label, name, accept, error }: UploadFieldProps) {
  const [fileName, setFileName] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);

  return (
    <div>
      {label ? (
        <p className="pb-2 text-[12px] uppercase tracking-[0.16em] text-[color:var(--muted)]">{label}</p>
      ) : null}
      <label
        className={`block cursor-pointer border-b pb-3 text-[12px] uppercase tracking-[0.13em] transition-colors ${
          isDragActive
            ? "border-[color:var(--line-strong)] text-[color:var(--fg)]"
            : "border-[color:var(--line)] text-[color:var(--muted)]"
        }`}
        onDragEnter={() => setIsDragActive(true)}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={() => setIsDragActive(false)}
      >
        <input
          name={name}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setFileName(file ? file.name : "");
          }}
        />
        {fileName || "Last opp fil"}
      </label>
      <FieldError message={error} />
    </div>
  );
}

export function ApplyForm() {
  const [state, formAction, isPending] = useActionState(submitApplication, initialState);
  const [selectedSoftware, setSelectedSoftware] = useState<string[]>([]);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const submitLabel = useMemo(
    () => (isPending ? "SENDER..." : "SEND INN SØKNAD"),
    [isPending],
  );

  const toggleSoftware = (skill: string) => {
    setSelectedSoftware((current) =>
      current.includes(skill)
        ? current.filter((item) => item !== skill)
        : [...current, skill],
    );
  };

  useEffect(() => {
    if (state.status === "success") {
      router.push("/soknad-sendt");
    }
  }, [router, state.status]);

  const handlePdfExport = () => {
    const formElement = formRef.current;
    if (!formElement) {
      return;
    }

    const data = new FormData(formElement);
    const name = String(data.get("name") || "-");
    const website = String(data.get("website") || "-");
    const reelUrl = String(data.get("reelUrl") || "-");
    const experience = String(data.get("experience") || "-");
    const about = String(data.get("about") || "-");
    const otherSoftware = String(data.get("otherSoftware") || "-");
    const software = data
      .getAll("software")
      .filter((item): item is string => typeof item === "string");
    const reelFile = data.get("reelFile");
    const cvFile = data.get("cvFile");

    const lines = [
      "Aparent - Soknad (preview)",
      "",
      `NAVN: ${name || "-"}`,
      `WEBSIDE: ${website || "-"}`,
      `SHOWREEL URL: ${reelUrl || "-"}`,
      `SHOWREEL FIL: ${reelFile instanceof File && reelFile.name ? reelFile.name : "-"}`,
      `CV FIL: ${cvFile instanceof File && cvFile.name ? cvFile.name : "-"}`,
      `ERFARING: ${experience || "-"}`,
      `SOFTWARE KUNNSKAP: ${software.length > 0 ? software.join(", ") : "-"}`,
      `ANNEN SOFTWARE: ${otherSoftware || "-"}`,
      "",
      "NOEN ORD OM DEG SELV:",
      about || "-",
    ];

    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });

    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    doc.text(lines, 48, 56, { maxWidth: 500, lineHeightFactor: 1.5 });
    doc.save("aparent-soknad-preview.pdf");
  };

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto w-full max-w-3xl pb-16 pt-4">
        <div className="mb-16 flex items-center justify-between">
          <Image
            src="/logo/APARENT_DOUBLE_BLACK.png"
            alt="Aparent"
            width={128}
            height={20}
            priority
            className="h-auto w-[128px]"
          />
        </div>

        <form ref={formRef} action={formAction}>
          {!isProd ? <input type="hidden" name="__preview_thanks" value="1" /> : null}
          <p className="pb-3 text-[12px] uppercase tracking-[0.16em] text-[color:var(--muted)]">
            Jobbsøknad som klipper - april & mai 2026
          </p>
          <div className="border-t border-[color:var(--line)] py-4">
            <h2 className="text-[12px] uppercase tracking-[0.2em] text-[color:var(--muted)]">Din info</h2>
          </div>

          <div className="border-b border-[color:var(--line)] py-3 sm:grid sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start sm:gap-8">
            <label htmlFor="name" className="text-[12px] uppercase tracking-[0.16em] text-[color:var(--fg)]">
              Navn
            </label>
            <div>
              <input
                id="name"
                name="name"
                type="text"
                required={isProd}
                className="w-full bg-transparent text-[12px] uppercase tracking-[0.12em] text-[color:var(--fg)] outline-none placeholder:text-[color:var(--muted)]"
              />
              <FieldError message={state.errors.name} />
            </div>
          </div>

          <div className="border-b border-[color:var(--line)] py-3 sm:grid sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start sm:gap-8">
            <label htmlFor="website" className="text-[12px] uppercase tracking-[0.16em] text-[color:var(--fg)]">
              Webside
            </label>
            <div>
              <input
                id="website"
                name="website"
                type="text"
                inputMode="url"
                className="w-full bg-transparent text-[12px] uppercase tracking-[0.12em] text-[color:var(--fg)] outline-none placeholder:text-[color:var(--muted)]"
              />
              <FieldError message={state.errors.website} />
            </div>
          </div>

          <div className="border-b border-[color:var(--line)] py-3 sm:grid sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8">
            <p className="pb-2 text-[12px] uppercase tracking-[0.16em] text-[color:var(--fg)]">Showreel</p>
            <div className="space-y-4">
              <input
                id="reelUrl"
                name="reelUrl"
                type="text"
                inputMode="url"
                className="w-full border-b border-[color:var(--line)] bg-transparent pb-3 text-[12px] uppercase tracking-[0.12em] text-[color:var(--fg)] outline-none placeholder:text-[color:var(--muted)]"
                placeholder="Lim inn URL"
              />
              <FieldError message={state.errors.reelUrl || state.errors.reel} />
            </div>
          </div>

          <div className="border-b border-[color:var(--line)] py-3 sm:grid sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8">
            <p className="pb-2 text-[12px] uppercase tracking-[0.16em] text-[color:var(--fg)]">CV</p>
            <UploadField label="" name="cvFile" accept="application/pdf" error={state.errors.cvFile} />
          </div>

          <div className="border-b border-[color:var(--line)] py-3 sm:grid sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8">
            <label
              htmlFor="experience"
              className="pb-2 text-[12px] uppercase tracking-[0.16em] text-[color:var(--fg)]"
            >
              Erfaring
            </label>
            <div>
              <select
                id="experience"
                name="experience"
                required={isProd}
                defaultValue=""
                className="w-full border-b border-[color:var(--line)] bg-transparent pb-3 text-[12px] uppercase tracking-[0.12em] text-[color:var(--fg)] outline-none"
              >
                <option value="">
                  Velg antall år
                </option>
                {EXPERIENCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <FieldError message={state.errors.experience} />
            </div>
          </div>

          <div className="border-b border-[color:var(--line)] py-4">
            <label htmlFor="about" className="block pb-2 text-[12px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Noen ord om deg selv
            </label>
            <textarea
              id="about"
              name="about"
              rows={4}
              className="w-full resize-none bg-transparent py-1 text-[12px] uppercase tracking-[0.1em] text-[color:var(--fg)] outline-none placeholder:text-[color:var(--muted)]"
            />
          </div>

          <div className="border-b border-[color:var(--line)] py-6">
            <h3 className="pb-5 text-[12px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Software kunnskap (trykk på software du mestrer)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {SOFTWARE_OPTIONS.map((skill) => {
                const isSelected = selectedSoftware.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSoftware(skill)}
                    className={`inline-flex items-center gap-2 py-1 text-left text-[12px] uppercase tracking-[0.11em] transition-colors ${
                      isSelected
                        ? "text-[#1f7a39] dark:text-[#75d690]"
                        : "text-[color:var(--fg)] hover:text-[color:var(--muted)]"
                    }`}
                  >
                    <span className="min-h-4 min-w-4">{isSelected ? <Check size={14} /> : null}</span>
                    <span>{skill}</span>
                  </button>
                );
              })}
            </div>
            {selectedSoftware.map((skill) => (
              <input key={skill} type="hidden" name="software" value={skill} />
            ))}
            <FieldError message={state.errors.software} />

            <div className="pt-[50px]">
              <label
                htmlFor="otherSoftware"
                className="block pb-2 text-[12px] uppercase tracking-[0.16em] text-[color:var(--muted)]"
              >
                Annen software
              </label>
              <input
                id="otherSoftware"
                name="otherSoftware"
                type="text"
                className="w-full bg-transparent pb-3 text-[12px] uppercase tracking-[0.1em] text-[color:var(--fg)] outline-none placeholder:text-[color:var(--muted)]"
              />
            </div>
          </div>

          <div className="pt-12 text-center">
            <div className="inline-flex items-center gap-6">
              {!isProd ? (
                <button
                  type="button"
                  onClick={handlePdfExport}
                  className="inline-flex items-center justify-center px-2 py-3 text-[12px] uppercase tracking-[0.2em] text-[color:var(--fg)] transition-colors hover:text-[color:var(--muted)]"
                >
                  PDF
                </button>
              ) : null}
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center px-2 py-3 text-[12px] uppercase tracking-[0.2em] text-[color:var(--fg)] transition-colors hover:text-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitLabel}
              </button>
            </div>
            {state.status === "error" ? (
              <p
                className={`mx-auto mt-4 max-w-md text-[12px] uppercase tracking-[0.12em] ${
                  "text-[#8f1d1d] dark:text-[#dc8989]"
                }`}
                role="status"
              >
                {state.message}
              </p>
            ) : null}
          </div>
        </form>

        <footer className="mt-20 border-t border-[color:var(--line)] pt-6 text-[12px] uppercase tracking-[0.14em] text-[color:var(--muted)]">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>© 2026 APARENT</span>
            <a
              href="https://www.aparent.tv"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--fg)] transition-colors hover:text-[color:var(--muted)]"
            >
              APARENT.TV
            </a>
            <a
              href="https://www.instagram.com/aparent.tv"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[color:var(--fg)] transition-colors hover:text-[color:var(--muted)]"
            >
              INSTAGRAM
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
