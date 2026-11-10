# قرارداد پیشنهادی API عملیاتی

این مسیرها هنوز پیاده نشده‌اند؛ سرور نمونه فقط فایل‌های ثابت مجاز را سرو می‌کند.

## فهرست موارد

`GET /api/companies/{company_id}/inventory?site_id=...`

پاسخ: `scope`, `status`, `revision`, `selected_area_ids`, `effective_from`, `permissions` و پیش‌نویس کاربر. وضعیت `unconfigured` با انتخاب خالی تأییدشده متفاوت است.

`PUT /api/companies/{company_id}/inventory/draft`

```json
{"site_id":null,"selected_area_ids":["A01","O01"],"expected_revision":3}
```

این عملیات نسخه مؤثر را تغییر نمی‌دهد؛ پیش‌نویس به actor و scope متصل است.

`POST /api/companies/{company_id}/inventory/confirm`

```json
{"site_id":null,"selected_area_ids":["A01","O01"],"expected_revision":3,"effective_from":"2026-11-10","reason":"تطبیق با محدوده مصوب","mutation_id":"client-generated-uuid"}
```

پیش‌شرط‌ها: مجوز شرکت، عناوین معتبر و یکتا، دلیل برای حذف/فهرست خالی، زیرمجموعه شرکت در سایت، تعیین تکلیف موارد سایت و برنامه باز. تغییر در تراکنش همراه رویداد ثبت می‌شود. Idempotency با همان کلید و همان payload نتیجه قبلی می‌دهد؛ payload متفاوت خطاست.

## چک‌لیست و ممیزی

| مسیر | شرط |
|---|---|
| `POST /api/checklists/{id}/versions` | ساخت پیش‌نویس با منشأ لایه‌ها |
| `POST /api/checklist-versions/{id}/publish` | معیار، rubric، شواهد و پوشش S کامل؛ نسخه بعد از انتشار تغییرناپذیر |
| `POST /api/audits` | هدف موجود، slot معتبر، نسخه منتشرشده و ارزیاب مجاز |
| `PUT /api/audits/{id}/responses/{item}` | مجوز رکورد، score_option یا N/A معتبر، نسخه مورد انتظار |
| `POST /api/audits/{id}/submit` | پاسخ کامل و شواهد لازم، یافته‌های لازم |
| `POST /api/audits/{id}/approve` | تأییدکننده مستقل؛ محاسبه سرور و ثبت snapshot اتمیک |
| `POST /api/actions/{id}/verify` | راستی‌آزما غیر از مجری؛ شاهد و نتیجه |

خطاها: 401 بدون نشست، 403 خارج از دامنه، 404 رکورد غیرقابل مشاهده، 409 تعارض نسخه/وضعیت، 422 اعتبارسنجی با مسیر فیلد و شناسه قلم. پاسخ خطا شامل `code`, `message`, `field_errors`, `request_id` است و داده شرکت دیگر را افشا نمی‌کند.

## گزارش

`GET /api/reports/summary` با فیلتر شرکت‌های مجاز، سایت، نوع واحد، دوره، policy و cohort. پاسخ شامل پوشش، زمان محاسبه، نسخه روش، numerator/denominator و نبود داده صریح است. خروجی CSV/PDF و داشبورد از یک query/سیاست استفاده کنند. دامنه پیکربندی‌نشده داخل امتیاز قطعی نیاید.

