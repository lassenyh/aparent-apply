"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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

function isValidEmail(value: string): boolean {
  if (!value) {
    return false;
  }

  // Basic format check suitable for form validation.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function toAttachment(file: File) {
  const bytes = await file.arrayBuffer();
  return {
    filename: file.name,
    content: Buffer.from(bytes),
  };
}

async function buildApplicationPdf(params: {
  name: string;
  email: string;
  website: string;
  reelUrl: string;
  experience: string;
  about: string;
  softwareList: string;
  otherSoftware: string;
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const monoSize = 10.5;
  const labelSize = 9.5;
  const left = 48;
  const right = 547.28;
  const maxWidth = right - left;
  const sectionLine = rgb(0.84, 0.84, 0.84);
  const textColor = rgb(0.1, 0.1, 0.1);
  let y = 805;

  try {
    const logoPath = path.join(
      process.cwd(),
      "public",
      "logo",
      "APARENT_DOUBLE_BLACK.png",
    );
    const logoBytes = await readFile(logoPath);
    const logo = await pdf.embedPng(logoBytes);
    const targetWidth = 128;
    const scale = targetWidth / logo.width;
    const targetHeight = logo.height * scale;

    page.drawImage(logo, {
      x: left,
      y: y - targetHeight,
      width: targetWidth,
      height: targetHeight,
    });
    y -= targetHeight + 24;
  } catch {
    // Fall back to text header if logo file is unavailable in runtime.
    page.drawText("APARENT", {
      x: left,
      y,
      size: 13,
      font: boldFont,
      color: textColor,
    });
    y -= 26;
  }

  page.drawRectangle({
    x: left,
    y,
    width: right - left,
    height: 1,
    color: sectionLine,
  });
  y -= 20;

  const wrapText = (text: string) => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      const width = font.widthOfTextAtSize(next, monoSize);
      if (width <= maxWidth) {
        current = next;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const drawFieldRow = (label: string, value: string) => {
    page.drawText(label, {
      x: left,
      y,
      size: labelSize,
      font: boldFont,
      color: textColor,
    });
    page.drawText(value || "-", {
      x: 205,
      y,
      size: monoSize,
      font,
      color: textColor,
    });
    y -= 16;
    page.drawRectangle({
      x: left,
      y,
      width: right - left,
      height: 0.7,
      color: sectionLine,
    });
    y -= 14;
  };

  drawFieldRow("NAVN", params.name);
  drawFieldRow("EPOST", params.email);
  drawFieldRow("WEBSIDE", params.website);
  drawFieldRow("SHOWREEL URL", params.reelUrl);
  drawFieldRow("ERFARING", params.experience);
  drawFieldRow("SOFTWARE KUNNSKAP", params.softwareList);
  drawFieldRow("ANNEN SOFTWARE", params.otherSoftware);

  page.drawText("NOEN ORD OM DEG SELV", {
    x: left,
    y,
    size: labelSize,
    font: boldFont,
    color: textColor,
  });
  y -= 14;
  page.drawRectangle({
    x: left,
    y,
    width: right - left,
    height: 0.7,
    color: sectionLine,
  });
  y -= 16;

  const aboutLines = wrapText(params.about || "-");
  for (const line of aboutLines) {
    page.drawText(line, {
      x: left,
      y,
      size: monoSize,
      font,
      color: textColor,
    });
    y -= 14;
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
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
  const email = textValue(formData, "email");
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

  if (!email) {
    errors.email = "Legg inn epost.";
  } else if (!isValidEmail(email)) {
    errors.email = "Epost må være gyldig.";
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
    const applicationPdf = await buildApplicationPdf({
      name,
      email,
      website,
      reelUrl,
      experience,
      about,
      softwareList,
      otherSoftware,
    });

    attachments.unshift({
      filename: "aparent-soknad.pdf",
      content: applicationPdf,
    });

    await resend.emails.send({
      from: fromDomain,
      to: [adminEmail],
      subject: `Ny søknad: ${name}`,
      text: [
        `NAVN: ${name}`,
        `EPOST: ${email}`,
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
