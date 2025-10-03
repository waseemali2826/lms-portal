import type { VoucherDetails } from "@/components/admissions/VoucherCard";

export function buildVoucherId(reference: string) {
  const suffix = reference.slice(-6).padStart(6, "0");
  return `VCH-${suffix.toUpperCase()}`;
}

export function printVoucher(voucher: VoucherDetails) {
  const currencyDisplay = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  });
  const amount = currencyDisplay.format(voucher.amount || 0);
  const issueDate = new Date(voucher.issueDate).toLocaleDateString();
  const dueDate = new Date(voucher.dueDate).toLocaleDateString();

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Voucher ${voucher.id}</title>
<style>
  :root { color-scheme: light; font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  @page { margin: 16mm; }
  body { margin: 0; padding: 32px; background: #f1f5f9; }
  .voucher { max-width: 720px; margin: 0 auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 30px 70px rgba(79, 70, 229, 0.25); }
  .voucher__header { padding: 36px; background: linear-gradient(135deg, #5b21b6, #4c1d95, #1d4ed8); color: white; position: relative; }
  .voucher__header::after { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 80% 20%, rgba(255,255,255,0.25), transparent 60%); pointer-events: none; }
  .voucher__tag { font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.8; }
  .voucher__title { margin: 16px 0 4px; font-size: 36px; font-weight: 700; }
  .voucher__reference { font-size: 14px; opacity: 0.85; }
  .voucher__body { padding: 36px; }
  .voucher__row { display: grid; gap: 16px; }
  .voucher__row--three { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
  .voucher__block { border-radius: 18px; background: #f8fafc; padding: 20px; }
  .voucher__label { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #64748b; }
  .voucher__value { font-size: 18px; font-weight: 600; color: #111827; margin-top: 4px; }
  .voucher__amount { font-size: 34px; font-weight: 700; color: #1d4ed8; }
  .voucher__footer { margin-top: 24px; font-size: 12px; color: #475569; text-align: center; }
</style>
</head>
<body>
  <div class="voucher">
    <div class="voucher__header">
      <div class="voucher__tag">EDUADMIN INSTITUTE</div>
      <div class="voucher__title">Admission Voucher</div>
      <div class="voucher__reference">Reference ${voucher.reference}</div>
    </div>
    <div class="voucher__body">
      <div class="voucher__row voucher__row--three">
        <div class="voucher__block">
          <div class="voucher__label">Student</div>
          <div class="voucher__value">${voucher.studentName}</div>
          <div class="voucher__value" style="font-size:14px; color:#475569;">${voucher.email}</div>
          <div class="voucher__value" style="font-size:14px; color:#475569;">${voucher.phone}</div>
        </div>
        <div class="voucher__block">
          <div class="voucher__label">Course</div>
          <div class="voucher__value">${voucher.courseName}</div>
          <div class="voucher__value" style="font-size:14px; color:#475569;">Campus: ${voucher.campus}</div>
        </div>
        <div class="voucher__block">
          <div class="voucher__label">Voucher ID</div>
          <div class="voucher__value">${voucher.id}</div>
          <div class="voucher__value" style="font-size:14px; color:#475569;">Issued ${issueDate}</div>
          <div class="voucher__value" style="font-size:14px; color:#ef4444;">Due ${dueDate}</div>
        </div>
      </div>
      <div class="voucher__block" style="margin-top: 24px; text-align:center;">
        <div class="voucher__label">Payable Amount</div>
        <div class="voucher__amount">${amount}</div>
        <div style="margin-top:8px; font-size:13px; color:#475569;">
          Present this voucher at campus reception or email admissions@eduadmin.pk to confirm your enrollment.
        </div>
      </div>
      <div class="voucher__footer">Thank you for choosing EduAdmin. Our counselor will reach out shortly with next steps.</div>
    </div>
  </div>
</body>
</html>`;

  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    if (!win) throw new Error("no-iframe");
    win.document.open();
    win.document.write(html);
    win.document.close();
    const printNow = () => {
      try {
        win.focus();
        win.print();
      } finally {
        setTimeout(() => document.body.removeChild(iframe), 500);
      }
    };
    if (win.document.readyState === "complete") setTimeout(printNow, 50);
    else win.addEventListener("load", () => setTimeout(printNow, 50));
  } catch {
    const w = window.open("", "PRINT", "width=900,height=650,top=100,left=150");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    const after = () => {
      w.focus();
      w.print();
      setTimeout(() => w.close(), 300);
    };
    if (w.document.readyState === "complete") setTimeout(after, 50);
    else w.addEventListener("load", () => setTimeout(after, 50));
  }
}
