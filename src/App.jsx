import React, { useState, useEffect, useCallback } from "react";
import { Scissors, Clock, Phone, User, X, Check, Lock, Trash2, Plane } from "lucide-react";
import { supabase } from "./lib/supabaseClient";

/* ---------------- Jalali (Persian) calendar conversion ---------------- */
function div(a, b) { return ~~(a / b); }
function mod(a, b) { return a - ~~(a / b) * b; }

function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function jalCal(jy) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jm, jump, n;
  if (jy < jp || jy >= breaks[bl - 1]) return null;
  let i = 1;
  for (; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function toJalaali(gy, gm, gd) {
  const jdn = g2d(gy, gm, gd);
  const gy2 = d2g(jdn).gy;
  let jy = gy2 - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(r.gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm, jd;
  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    } else {
      k -= 186;
    }
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

const JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const WEEKDAYS = ["یک\u200cشنبه", "دوشنبه", "سه\u200cشنبه", "چهارشنبه", "پنج\u200cشنبه", "جمعه", "شنبه"];

function toPersianDigits(input) {
  const en = "0123456789";
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  return String(input).replace(/[0-9]/g, (d) => fa[en.indexOf(d)]);
}
function toEnglishDigits(input) {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  return String(input).replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
}

function isoKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDayInfo(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const jy = d.getFullYear(), jm = d.getMonth() + 1, jd = d.getDate();
  const j = toJalaali(jy, jm, jd);
  const weekdayIdx = d.getDay(); // 0 = Sunday
  const isMonday = weekdayIdx === 1;
  return {
    key: isoKey(d),
    label: offset === 0 ? "امروز" : offset === 1 ? "فردا" : "پس\u200cفردا",
    weekday: WEEKDAYS[weekdayIdx],
    jalaliDate: `${toPersianDigits(j.jd)} ${JALALI_MONTHS[j.jm - 1]} ${toPersianDigits(j.jy)}`,
    jm: j.jm,
    isMonday,
    dateObj: d,
  };
}

function slotsForMonth(jm, dateObj) {
  let times = [];
  if (jm >= 1 && jm <= 6) {
    times = ["08:00", "09:00", "10:00", "11:00", "12:00", "12:30", "17:00", "18:00", "19:00", "20:00", "21:00"];
  } else {
    times = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
  }
  const now = new Date();
  const isToday = isoKey(now) === isoKey(dateObj);
  if (isToday) {
    times = times.filter((t) => {
      const [h, m] = t.split(":").map(Number);
      return h > now.getHours() || (h === now.getHours() && m > now.getMinutes());
    });
  }
  return times;
}

/* ---------------- Design tokens ---------------- */
const palette = {
  bg: "#F6EFE9",
  card: "#FFFCFA",
  ink: "#2E2024",
  inkSoft: "#6B5A5F",
  wine: "#7C2A3B",
  wineDeep: "#5C1E2C",
  gold: "#B08A4E",
  goldSoft: "#E7D3AE",
  line: "#E3D6CC",
};

const fontStack = "'Vazirmatn', Tahoma, 'Segoe UI', Arial, sans-serif";

/* ---------------- Small UI atoms ---------------- */
function Pill({ children }) {
  return (
    <span
      className="inline-block px-3 py-1 rounded-full text-xs"
      style={{ backgroundColor: palette.goldSoft, color: palette.wineDeep }}
    >
      {children}
    </span>
  );
}

function rowToBooking(row) {
  return {
    id: row.id,
    dateKey: row.date_key,
    dateDisplay: row.date_display,
    weekday: row.weekday,
    time: row.time,
    name: row.name,
    phone: row.phone,
  };
}

export default function SalonBooking() {
  const [days] = useState(() => [buildDayInfo(0), buildDayInfo(1), buildDayInfo(2)]);
  const [bookings, setBookings] = useState([]);
  const [settings, setSettings] = useState({ bookingDisabled: false });
  const [loading, setLoading] = useState(true);
  const [storageOk, setStorageOk] = useState(true);

  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [adminAuthed, setAdminAuthed] = useState(false);
  const [pwInput, setPwInput] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: bookingRows, error: bErr } = await supabase
        .from("bookings")
        .select("*")
        .order("date_key", { ascending: true })
        .order("time", { ascending: true });
      if (mounted && !bErr && bookingRows) setBookings(bookingRows.map(rowToBooking));
      if (bErr) setStorageOk(false);

      const { data: settingsRows, error: sErr } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .single();
      if (mounted && !sErr && settingsRows) {
        setSettings({ bookingDisabled: settingsRows.booking_disabled });
      }
      if (sErr) setStorageOk(false);

      if (mounted) setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, []);

  const addBookingRemote = useCallback(async (booking) => {
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        date_key: booking.dateKey,
        date_display: booking.dateDisplay,
        weekday: booking.weekday,
        time: booking.time,
        name: booking.name,
        phone: booking.phone,
      })
      .select()
      .single();
    if (error || !data) { setStorageOk(false); return null; }
    setStorageOk(true);
    const saved = rowToBooking(data);
    setBookings((prev) => [...prev, saved]);
    return saved;
  }, []);

  const removeBookingRemote = useCallback(async (id) => {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) { setStorageOk(false); return; }
    setStorageOk(true);
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const updateSettingsRemote = useCallback(async (bookingDisabled) => {
    const { error } = await supabase
      .from("settings")
      .update({ booking_disabled: bookingDisabled })
      .eq("id", 1);
    if (error) { setStorageOk(false); return; }
    setStorageOk(true);
    setSettings({ bookingDisabled });
  }, []);

  const selectedDay = days.find((d) => d.key === selectedDayKey);
  const availableTimes = selectedDay ? slotsForMonth(selectedDay.jm, selectedDay.dateObj) : [];
  const isTimeTaken = (dayKey, time) => bookings.some((b) => b.dateKey === dayKey && b.time === time);

  function openDay(day) {
    if (day.isMonday) return;
    setSelectedDayKey(day.key);
    setSelectedTime(null);
    setFormError("");
  }

  async function submitBooking(e) {
    e.preventDefault();
    setFormError("");
    const cleanName = name.trim();
    const cleanPhone = toEnglishDigits(phone).trim();
    if (!cleanName) { setFormError("لطفاً نام و نام خانوادگی را وارد کنید."); return; }
    if (!/^\d{11}$/.test(cleanPhone)) { setFormError("شماره تماس باید دقیقاً ۱۱ رقم باشد."); return; }
    if (!selectedDay || !selectedTime) { setFormError("لطفاً روز و ساعت را انتخاب کنید."); return; }
    if (isTimeTaken(selectedDay.key, selectedTime)) { setFormError("این ساعت همین الان رزرو شد، یک ساعت دیگر را انتخاب کنید."); return; }

    setSubmitting(true);
    const saved = await addBookingRemote({
      dateKey: selectedDay.key,
      dateDisplay: selectedDay.jalaliDate,
      weekday: selectedDay.weekday,
      time: selectedTime,
      name: cleanName,
      phone: cleanPhone,
    });
    setSubmitting(false);
    if (saved) {
      setSuccessInfo(saved);
      setName("");
      setPhone("");
      setSelectedTime(null);
      setSelectedDayKey(null);
    } else {
      setFormError("ثبت نوبت با خطا مواجه شد، دوباره تلاش کنید.");
    }
  }

  async function deleteBooking(id) {
    await removeBookingRemote(id);
  }

  async function toggleDisabled() {
    await updateSettingsRemote(!settings.bookingDisabled);
  }

  function submitAdminPw(e) {
    e.preventDefault();
    if (toEnglishDigits(pwInput).trim() === "MNewface2284") {
      setAdminAuthed(true);
      setPwError("");
    } else {
      setPwError("رمز اشتباه است.");
    }
  }

  const sortedBookings = [...bookings].sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.time.localeCompare(b.time));

  return (
    <div dir="rtl" style={{ fontFamily: fontStack, backgroundColor: palette.bg, color: palette.ink, minHeight: "100%" }} className="relative min-h-screen w-full">
      {/* Header / Hero */}
      <header className="px-6 pt-12 pb-10 text-center relative overflow-hidden">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Scissors size={22} style={{ color: palette.wine }} />
          <Pill>سالن نیوفیس</Pill>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: palette.wineDeep }}>
          رزرو آنلاین نوبت آرایشگاه
        </h1>
        <p className="max-w-md mx-auto text-sm sm:text-base" style={{ color: palette.inkSoft }}>
          روز و ساعت دلخواهتان را انتخاب کنید، مشخصاتتان را بگذارید و نوبتتان قطعی می‌شود.
        </p>
        <div className="mx-auto mt-6 w-16 h-px" style={{ backgroundColor: palette.gold }} />
      </header>

      <main className="max-w-3xl mx-auto px-5 pb-20">
        {!storageOk && (
          <div className="mb-6 rounded-xl px-4 py-3 text-sm text-center" style={{ backgroundColor: "#F6DCD9", color: palette.wineDeep }}>
            مشکلی در ذخیره‌سازی پیش آمد. لطفاً دوباره تلاش کنید.
          </div>
        )}

        {successInfo && (
          <div className="mb-6 rounded-2xl p-5 flex items-start justify-between gap-3" style={{ backgroundColor: palette.goldSoft, border: `1px solid ${palette.gold}` }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#fff" }}>
                <Check size={18} style={{ color: palette.wineDeep }} />
              </div>
              <div>
                <div className="text-sm font-bold mb-1" style={{ color: palette.wineDeep }}>نوبت شما ثبت شد</div>
                <div className="text-xs" style={{ color: palette.inkSoft }}>
                  {successInfo.weekday}، {successInfo.dateDisplay} — ساعت {toPersianDigits(successInfo.time)} — به نام {successInfo.name}
                </div>
              </div>
            </div>
            <button onClick={() => setSuccessInfo(null)} style={{ color: palette.wineDeep }}>
              <X size={18} />
            </button>
          </div>
        )}

        {loading ? (
          <p className="text-center py-10" style={{ color: palette.inkSoft }}>در حال بارگذاری...</p>
        ) : settings.bookingDisabled ? (
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: palette.card, border: `1px solid ${palette.line}` }}>
            <Plane size={28} className="mx-auto mb-3" style={{ color: palette.wine }} />
            <h2 className="text-lg font-bold mb-2" style={{ color: palette.wineDeep }}>رزرو نوبت موقتاً غیرفعال است</h2>
            <p className="text-sm" style={{ color: palette.inkSoft }}>آرایشگاه فعلاً در دسترس نیست. لطفاً بعداً دوباره سر بزنید.</p>
          </div>
        ) : (
          <>
            {/* Day cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {days.map((day) => {
                const isActive = selectedDayKey === day.key;
                const daySlots = slotsForMonth(day.jm, day.dateObj);
                const isFull = !day.isMonday && daySlots.length > 0 && daySlots.every((t) => isTimeTaken(day.key, t));
                const isBlocked = day.isMonday || isFull;
                return (
                  <button
                    key={day.key}
                    onClick={() => openDay(day)}
                    disabled={isBlocked}
                    className="rounded-2xl p-5 text-center transition"
                    style={{
                      backgroundColor: isActive ? palette.wine : palette.card,
                      border: `1px solid ${isActive ? palette.wine : palette.line}`,
                      opacity: isBlocked ? 0.55 : 1,
                      cursor: isBlocked ? "not-allowed" : "pointer",
                    }}
                  >
                    <div className="text-xs mb-1" style={{ color: isActive ? palette.goldSoft : palette.inkSoft }}>
                      {day.label}
                    </div>
                    <div
                      className="text-base font-bold mb-1"
                      style={{ color: isActive ? "#fff" : palette.ink, textDecoration: isFull ? "line-through" : "none" }}
                    >
                      {day.weekday}
                    </div>
                    <div
                      className="text-sm"
                      style={{ color: isActive ? "#fff" : palette.inkSoft, textDecoration: isFull ? "line-through" : "none" }}
                    >
                      {day.jalaliDate}
                    </div>
                    {day.isMonday && (
                      <div className="mt-2 text-xs font-semibold" style={{ color: palette.wine }}>تعطیل</div>
                    )}
                    {isFull && (
                      <div className="mt-2 text-xs font-semibold" style={{ color: palette.wine }}>پر شده</div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            {selectedDay && (
              <div className="rounded-2xl p-5 mb-6" style={{ backgroundColor: palette.card, border: `1px solid ${palette.line}` }}>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={16} style={{ color: palette.wine }} />
                  <span className="text-sm font-semibold">
                    ساعت‌های خالی {selectedDay.weekday} {selectedDay.jalaliDate}
                  </span>
                </div>
                {availableTimes.length === 0 ? (
                  <p className="text-sm" style={{ color: palette.inkSoft }}>ساعت خالی‌ای برای امروز باقی نمانده است.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTimes.map((t) => {
                      const taken = isTimeTaken(selectedDay.key, t);
                      const active = selectedTime === t;
                      return (
                        <button
                          key={t}
                          disabled={taken}
                          onClick={() => setSelectedTime(t)}
                          className="px-4 py-2 rounded-xl text-sm font-medium transition"
                          style={{
                            backgroundColor: taken ? "#EFE7E1" : active ? palette.wine : "#fff",
                            color: taken ? "#B7A99F" : active ? "#fff" : palette.ink,
                            border: `1px solid ${active ? palette.wine : palette.line}`,
                            textDecoration: taken ? "line-through" : "none",
                            cursor: taken ? "not-allowed" : "pointer",
                          }}
                        >
                          {toPersianDigits(t)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Booking form */}
            {selectedDay && selectedTime && (
              <form onSubmit={submitBooking} className="rounded-2xl p-5" style={{ backgroundColor: palette.card, border: `1px solid ${palette.line}` }}>
                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm mb-2" style={{ color: palette.inkSoft }}>
                    <User size={15} /> نام و نام خانوادگی
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً سارا محمدی"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: `1px solid ${palette.line}`, backgroundColor: "#fff" }}
                  />
                </div>
                <div className="mb-5">
                  <label className="flex items-center gap-2 text-sm mb-2" style={{ color: palette.inkSoft }}>
                    <Phone size={15} /> شماره تماس (۱۱ رقم)
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xxxxxxxxx"
                    inputMode="numeric"
                    maxLength={11}
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: `1px solid ${palette.line}`, backgroundColor: "#fff" }}
                  />
                </div>
                {formError && (
                  <p className="text-xs mb-4" style={{ color: palette.wine }}>{formError}</p>
                )}
                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !/^\d{11}$/.test(toEnglishDigits(phone))}
                  className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ backgroundColor: palette.wine, color: "#fff" }}
                >
                  {submitting ? "در حال ثبت..." : "ثبت نوبت"}
                </button>
              </form>
            )}
          </>
        )}

        {/* Gallery placeholders */}
        <section className="mt-12">
          <h3 className="text-sm font-semibold mb-3" style={{ color: palette.inkSoft }}>گالری آرایشگاه</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-xl flex items-center justify-center text-xs text-center px-2"
                style={{ border: `1.5px dashed ${palette.gold}`, color: palette.inkSoft }}
              >
                عکس {toPersianDigits(i)} را اینجا جایگزین کنید
              </div>
            ))}
          </div>
          <div
            className="mx-auto w-2/3 sm:w-1/2 rounded-xl flex items-center justify-center text-xs text-center px-2"
            style={{ border: `1.5px dashed ${palette.gold}`, color: palette.inkSoft, aspectRatio: "3 / 4" }}
          >
            عکس {toPersianDigits(3)} را اینجا جایگزین کنید
          </div>
        </section>

        {/* Admin entry point */}
        <div className="mt-14">
          <div className="text-center">
            <button
              onClick={() => {
                setAdminOpen((v) => !v);
                if (!adminOpen) { setAdminAuthed(false); setPwInput(""); setPwError(""); }
              }}
              className="text-xs inline-flex items-center gap-1"
              style={{ color: palette.inkSoft }}
            >
              <Lock size={12} /> {adminOpen ? "بستن پنل مدیریت" : "ورود مدیر"}
            </button>
          </div>

          {adminOpen && (
            <div className="mt-4 rounded-2xl p-6" style={{ backgroundColor: palette.card, border: `1px solid ${palette.line}` }}>
              {!adminAuthed ? (
                <form onSubmit={submitAdminPw} className="pt-1">
                  <h3 className="text-base font-bold mb-4 text-center" style={{ color: palette.wineDeep }}>ورود پنل مدیریت</h3>
                  <input
                    type="password"
                    value={pwInput}
                    onChange={(e) => setPwInput(e.target.value)}
                    placeholder="رمز عبور"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none mb-3"
                    style={{ border: `1px solid ${palette.line}` }}
                  />
                  {pwError && <p className="text-xs mb-3" style={{ color: palette.wine }}>{pwError}</p>}
                  <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-bold" style={{ backgroundColor: palette.wine, color: "#fff" }}>
                    ورود
                  </button>
                </form>
              ) : (
                <div>
                  <h3 className="text-base font-bold mb-4" style={{ color: palette.wineDeep }}>پنل مدیریت</h3>

                  <div className="flex items-center justify-between rounded-xl p-4 mb-5" style={{ backgroundColor: palette.bg }}>
                    <div>
                      <div className="text-sm font-semibold">غیرفعال کردن رزرو (مسافرت)</div>
                      <div className="text-xs" style={{ color: palette.inkSoft }}>
                        {settings.bookingDisabled ? "الان رزرو برای مشتری‌ها بسته است" : "الان رزرو برای مشتری‌ها باز است"}
                      </div>
                    </div>
                    <button
                      onClick={toggleDisabled}
                      className="w-12 h-7 rounded-full relative transition"
                      style={{ backgroundColor: settings.bookingDisabled ? palette.wine : palette.line }}
                    >
                      <span
                        className="absolute top-0.5 w-6 h-6 rounded-full bg-white transition"
                        style={{ right: settings.bookingDisabled ? "2px" : "22px" }}
                      />
                    </button>
                  </div>

                  <div className="text-sm font-semibold mb-2">نوبت‌های ثبت شده ({toPersianDigits(bookings.length)})</div>
                  {sortedBookings.length === 0 ? (
                    <p className="text-sm" style={{ color: palette.inkSoft }}>هنوز نوبتی ثبت نشده است.</p>
                  ) : (
                    <div className="space-y-2">
                      {sortedBookings.map((b) => (
                        <div key={b.id} className="flex items-center justify-between rounded-xl p-3" style={{ border: `1px solid ${palette.line}` }}>
                          <div>
                            <div className="text-sm font-semibold">{b.name}</div>
                            <div className="text-xs" style={{ color: palette.inkSoft }}>
                              {b.weekday} {b.dateDisplay} — ساعت {toPersianDigits(b.time)} — {toPersianDigits(b.phone)}
                            </div>
                          </div>
                          <button onClick={() => deleteBooking(b.id)} style={{ color: palette.wine }}>
                            <Trash2 size={17} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
