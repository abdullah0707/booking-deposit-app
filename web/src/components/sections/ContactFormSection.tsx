"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";

export function ContactFormSection({ content }: { content: { title?: string; description?: string } }) {
  const t = useTranslations("contactForm");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      await api.post("/contact", { name, email, message });
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <div className="text-center">
        {content.title && <h2 className="text-xl font-semibold">{content.title}</h2>}
        {content.description && <p className="mt-2 text-ink/60">{content.description}</p>}
      </div>

      {status === "sent" ? (
        <p className="mt-6 text-center text-accent-2">{t("sent")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            required
            placeholder={t("namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <input
            required
            type="email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <textarea
            required
            placeholder={t("messagePlaceholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          {status === "error" && <p className="text-sm text-red-600">{t("error")}</p>}
          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {status === "submitting" ? t("sending") : t("send")}
          </button>
        </form>
      )}
    </div>
  );
}
