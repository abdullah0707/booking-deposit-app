"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/AuthContext";
import { api } from "@/lib/api";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
type Weekday = (typeof WEEKDAYS)[number];

interface WorkingHour {
  weekday: Weekday;
  startTime: string;
  endTime: string;
}

type DayState = Record<Weekday, { enabled: boolean; startTime: string; endTime: string }>;

function defaultDayState(): DayState {
  return Object.fromEntries(
    WEEKDAYS.map((day) => [day, { enabled: false, startTime: "09:00", endTime: "17:00" }]),
  ) as DayState;
}

export default function SettingsPage() {
  const t = useTranslations("admin.settings");
  const { token } = useAuth();
  const [days, setDays] = useState<DayState>(defaultDayState());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get<WorkingHour[]>("/working-hours", token).then((hours) => {
      const next = defaultDayState();
      for (const h of hours) {
        next[h.weekday] = { enabled: true, startTime: h.startTime, endTime: h.endTime };
      }
      setDays(next);
    });
  }, [token]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const hours = WEEKDAYS.filter((day) => days[day].enabled).map((day) => ({
      weekday: day,
      startTime: days[day].startTime,
      endTime: days[day].endTime,
    }));
    await api.put("/admin/working-hours", { hours }, token);
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-sm text-ink/60">{t("subtitle")}</p>

      <div className="space-y-2">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="flex items-center gap-4 rounded-xl border border-line bg-bg px-4 py-3"
          >
            <label className="flex w-32 items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={days[day].enabled}
                onChange={(e) =>
                  setDays({ ...days, [day]: { ...days[day], enabled: e.target.checked } })
                }
              />
              {t(`weekday.${day}`)}
            </label>
            <input
              type="time"
              disabled={!days[day].enabled}
              value={days[day].startTime}
              onChange={(e) =>
                setDays({ ...days, [day]: { ...days[day], startTime: e.target.value } })
              }
              className="rounded-lg border border-line bg-bg px-2 py-1 text-sm disabled:opacity-40"
            />
            <span className="text-ink/40">–</span>
            <input
              type="time"
              disabled={!days[day].enabled}
              value={days[day].endTime}
              onChange={(e) =>
                setDays({ ...days, [day]: { ...days[day], endTime: e.target.value } })
              }
              className="rounded-lg border border-line bg-bg px-2 py-1 text-sm disabled:opacity-40"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t("saving") : t("save")}
        </button>
        {saved && <span className="text-sm text-accent-2">{t("saved")}</span>}
      </div>
    </div>
  );
}
