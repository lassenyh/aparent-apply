"use server";

import { Resend } from "resend";

export type FormState = {
  status: "idle" | "success" | "error";
  message: string;
  errors: Record<string, string>;
};

const MAX_CV_UPLOAD_SIZE = 4 * 1024 * 1024;

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function fileValue(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (value instanceof File && value.size > 0) {
    return value;
  }

  return null;
}

function isValidUrl(value: string): boolean {
  if (!value) {
    return false;
  }

  const normalizedValue = /^https?:\/\//i.test(value)
    ? value
    : `https://${value}`;

  try {
    const parsed = new URL(normalizedValue);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function toAttachment(file: File) {
  const bytes = await file.arrayBuffer();
  return {
    filename: file.name,
    content: Buffer.from(bytes),
  };
}

export async function submitApplication(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const previewThanks =
    process.env.NODE_ENV !== "production" &&
    formData.get("__preview_thanks") === "1";

  if (previewThanks) {
    return {
      status: "success",
      message: "Preview: takk-side",
      errors: {},
    };
  }

  const name = textValue(formData, "name");
  const website = textValue(formData, "website");
  const reelUrl = textValue(formData, "reelUrl");
  const experience = textValue(formData, "experience");
  const about = textValue(formData, "about");
  const otherSoftware = textValue(formData, "otherSoftware");
  const software = formData
    .getAll("software")
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  const cvFile = fileValue(formData, "cvFile");

  const errors: Record<string, string> = {};

  if (!name) {
    errors.name = "Legg inn navn.";
  }

  if (!experience) {
    errors.experience = "Velg erfaring.";
  }

  if (reelUrl && !isValidUrl(reelUrl)) {
    errors.reelUrl = "Reel-URL må være gyldig.";
  }

  if (website && !isValidUrl(website)) {
    errors.website = "Nettside må være gyldig URL.";
  }

  if (cvFile && cvFile.type !== "application/pdf") {
    errors.cvFile = "CV må være en PDF.";
  }

  if (cvFile && cvFile.size > MAX_CV_UPLOAD_SIZE) {
    errors.cvFile = "CV-fil er for stor (maks 4 MB).";
  }

  if (software.length === 0) {
    errors.software = "Velg minst ett software-verktøy.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Skjemaet mangler noen felt.",
      errors,
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL || "work@aparent.tv";

  if (!apiKey) {
    return {
      status: "error",
      message: "RESEND_API_KEY mangler i miljøvariabler.",
      errors: {},
    };
  }

  try {
    const resend = new Resend(apiKey);
    const attachments = [];

    if (cvFile) {
      attachments.push(await toAttachment(cvFile));
    }

    const softwareList = software.length ? software.join(", ") : "Ingen valgt";
    const fromDomain = process.env.RESEND_FROM || "Aparent Apply <onboarding@resend.dev>";

    await resend.emails.send({
      from: fromDomain,
      to: [adminEmail],
      subject: `Ny søknad: ${name}`,
      text: [
        `NAVN: ${name}`,
        `WEBSIDE: ${website || "-"}`,
        `REEL URL: ${reelUrl || "-"}`,
        `ERFARING: ${experience}`,
        `NOEN ORD OM DEG SELV:`,
        about || "-",
        "",
        `SOFTWARE KUNNSKAP: ${softwareList}`,
        `ANDRE SOFTWARE: ${otherSoftware || "-"}`,
      ].join("\n"),
      attachments,
    });

    return {
      status: "success",
      message: "Takk. Søknaden din er sendt.",
      errors: {},
    };
  } catch {
    return {
      status: "error",
      message: "Kunne ikke sende søknaden akkurat nå. Prøv igjen.",
      errors: {},
    };
  }
}
