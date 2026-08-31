"use client";

import { useState } from "react";
import {
  BEST_OF_CHOICES,
  isTimed,
  PERIOD_CHOICES,
  SPORTS,
  type SportId,
} from "@/lib/sport/rules";
import { FIELD, LABEL } from "@/components/console/ui";

/** Sport picker + the format inputs that sport needs (sets vs. periods). */
export function ConsoleFormatFields() {
  const [sport, setSport] = useState<SportId>("volleyball");
  const config = SPORTS[sport];

  return (
    <>
      <label className="block">
        <span className={LABEL}>Sport · กีฬา</span>
        <select
          name="sport"
          required
          value={sport}
          onChange={(e) => setSport(e.target.value as SportId)}
          className={FIELD}
        >
          {Object.values(SPORTS).map((s) => (
            <option key={s.id} value={s.id}>
              {s.labelEn} · {s.labelTh}
            </option>
          ))}
        </select>
      </label>

      {isTimed(config) ? (
        <>
          <label className="block">
            <span className={LABEL}>Periods · จำนวนควอเตอร์</span>
            <select
              key={`${sport}-periods`}
              name="best_of"
              required
              defaultValue={String(config.defaultPeriods)}
              className={FIELD}
            >
              {PERIOD_CHOICES.map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "period" : "periods"} ·{" "}
                  {n === 4 ? "4 ควอเตอร์ (FIBA)" : `${n} ช่วง`}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={LABEL}>Minutes per period · นาทีต่อควอเตอร์</span>
            <input
              key={`${sport}-minutes`}
              name="period_minutes"
              type="number"
              required
              defaultValue={config.defaultPeriodMinutes}
              min={1}
              max={60}
              step={1}
              className={FIELD}
            />
            <span className="mt-1 block text-[12px] text-gray-500">
              Countdown holds at 0:00 until End quarter · overtime{" "}
              {config.overtimeMinutes} min when tied
            </span>
          </label>
        </>
      ) : (
        <>
          <label className="block">
            <span className={LABEL}>Sets · จำนวนเซต</span>
            <select
              key={`${sport}-sets`}
              name="best_of"
              required
              defaultValue={String(config.defaultBestOf)}
              className={FIELD}
            >
              {BEST_OF_CHOICES.map((n) => (
                <option key={n} value={n}>
                  Best of {n} · ชนะ {Math.floor(n / 2) + 1} เซต
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={LABEL}>Points per set · แต้มต่อเซต</span>
            <input
              key={`${sport}-points`}
              name="points_to_win"
              type="number"
              required
              defaultValue={config.defaultPointsToWin}
              min={1}
              max={99}
              step={1}
              className={FIELD}
            />
            <span className="mt-1 block text-[12px] text-gray-500">
              Advisory target — sets end when the referee presses End set
            </span>
          </label>
        </>
      )}
    </>
  );
}
