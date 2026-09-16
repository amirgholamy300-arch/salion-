# سالن نیوفیس — راهنمای آپلود روی گیت‌هاب، Supabase و Vercel

## مرحله ۱ — ساخت پایگاه داده در Supabase

1. به [supabase.com](https://supabase.com) برو، ثبت‌نام کن (رایگانه) و یک پروژه‌ی جدید بساز.
2. از منوی سمت چپ برو به بخش **SQL Editor**.
3. کل محتوای فایل `supabase-schema.sql` (همین پوشه) رو کپی کن، داخل SQL Editor بچسبون و Run بزن.
   این کار دو جدول می‌سازه: `bookings` (نوبت‌ها) و `settings` (تنظیمات).
4. از منوی سمت چپ برو به **Project Settings → API**. دو مقدار زیر رو لازم داری:
   - `Project URL`
   - `anon public` key

## مرحله ۲ — آپلود کد روی گیت‌هاب

1. اگه گیت‌هاب نداری، تو [github.com](https://github.com) یه حساب بساز.
2. یک ریپازیتوری جدید بساز (مثلاً به اسم `newface-salon`) — خالی، بدون README.
3. توی کامپیوتر خودت، داخل همین پوشه‌ی پروژه این دستورات رو بزن:
   ```
   git init
   git add .
   git commit -m "نسخه اول سایت رزرو"
   git branch -M main
   git remote add origin https://github.com/USERNAME/newface-salon.git
   git push -u origin main
   ```
   (به‌جای USERNAME اسم کاربری خودت رو بذار)

## مرحله ۳ — دیپلوی روی Vercel

1. به [vercel.com](https://vercel.com) برو و با همون حساب گیت‌هاب وارد شو.
2. روی **Add New → Project** بزن و ریپازیتوری `newface-salon` رو انتخاب کن.
3. Vercel خودش می‌فهمه پروژه Vite هست (نیازی به تنظیم دستی نیست).
4. قبل از زدن Deploy، بخش **Environment Variables** رو باز کن و این دو مقدار رو اضافه کن:
   - `VITE_SUPABASE_URL` → همون Project URL از Supabase
   - `VITE_SUPABASE_ANON_KEY` → همون anon public key از Supabase
5. روی **Deploy** بزن. بعد از چند ثانیه یه لینک زنده (مثل `newface-salon.vercel.app`) بهت میده.

## نکات مهم

- **رمز پنل مدیریت** الان به‌صورت ساده تو کد (`src/App.jsx`، عدد `1234`) نوشته شده. حتماً قبل از استفاده‌ی واقعی عوضش کن (جستجو کن دنبال `"1234"`).
- این یه دیتابیس عمومیه (هر کسی که سایت رو باز کنه می‌تونه ببینه نوبت‌ها رو ذخیره یا حذف کنه اگه رمز ادمین رو بدونه) — برای یه سالن کوچیک کافیه، ولی امنیت واقعی (لاگین با ایمیل/رمز جدا) نداره.
- بخش پیامک هنوز وصل نیست؛ هروقت خواستی وصلش کنیم بگو.
- برای تست روی سیستم خودت قبل از دیپلوی:
  ```
  npm install
  npm run dev
  ```
  و یه فایل `.env` (از روی `.env.example`) با مقادیر Supabase خودت بساز.
