"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownLeft, CheckCircle2, CircleAlert, ClipboardList, LogOut, LockKeyhole, RefreshCw, Search, ShieldCheck } from "lucide-react";

type Inquiry = {
  id: string; reference: string; customerName: string; email: string; phone: string | null;
  company: string | null; message: string; items: unknown; status: string; createdAt: string;
};
type Admin = { name: string; email: string; role: string };
const statuses = [
  ["NEW", "جديد"], ["REVIEWING", "قيد المراجعة"], ["WAITING_FOR_CUSTOMER", "بانتظار العميل"],
  ["APPROVED", "تمت الموافقة"], ["IN_PROGRESS", "قيد التنفيذ"],
  ["READY_FOR_DELIVERY", "جاهز للتسليم"], ["COMPLETED", "مكتمل"], ["CANCELLED", "ملغي"],
] as const;

export default function AdminPage() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [items, setItems] = useState<Inquiry[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadInquiries = useCallback(async () => {
    const response = await fetch("/api/admin/inquiries", { cache: "no-store" });
    if (response.status === 401) { setAdmin(null); setItems([]); return; }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "تعذر تحميل الطلبات");
    setItems(data.items as Inquiry[]);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/inquiries", { cache: "no-store" })
      .then(async response => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("تعذر تحميل لوحة الإدارة");
        return response.json();
      })
      .then(data => { if (active && data) setItems(data.items as Inquiry[]); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : "حدث خطأ"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => items.filter(item =>
    [item.reference, item.customerName, item.email, item.company || "", item.message]
      .join(" ").toLowerCase().includes(query.toLowerCase())
  ), [items, query]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "فشل تسجيل الدخول");
      setAdmin(data.admin as Admin); setPassword(""); await loadInquiries();
    } catch (err) { setError(err instanceof Error ? err.message : "حدث خطأ"); }
    finally { setBusy(false); }
  }

  async function updateStatus(id: string, status: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/inquiries", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحديث الحالة");
      await loadInquiries();
    } catch (err) { setError(err instanceof Error ? err.message : "حدث خطأ"); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAdmin(null); setItems([]);
  }

  const label = (status: string) => statuses.find(s => s[0] === status)?.[1] || status;
  const countNew = items.filter(item => item.status === "NEW").length;
  const countActive = items.filter(item => ["REVIEWING", "APPROVED", "IN_PROGRESS", "READY_FOR_DELIVERY"].includes(item.status)).length;

  if (loading) return <main className="admin-shell"><div className="admin-loading">BOLA TECH · جاري تحميل لوحة الإدارة…</div></main>;

  if (!admin) return <main className="admin-shell"><section className="admin-login"><div className="admin-brand"><span>B</span><div><b>BOLA TECH</b><small>SECURE ADMIN PORTAL</small></div></div><div className="admin-login-icon"><LockKeyhole size={25}/></div><h1>تسجيل دخول الإدارة</h1><p>منطقة خاصة بفريق BOLA TECH. سجّل الدخول بحساب الإدارة المعتمد.</p><form onSubmit={login}><label>البريد الإلكتروني<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com"/></label><label>كلمة المرور<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••"/></label>{error && <div className="admin-error"><CircleAlert size={16}/>{error}</div>}<button className="admin-submit" disabled={busy}>{busy ? "جارٍ التحقق…" : "دخول آمن"} <ShieldCheck size={17}/></button></form><small className="admin-security-note">جلسة محمية · تشفير كلمة المرور · تقييد محاولات الدخول</small></section></main>;

  return <main className="admin-shell"><header className="admin-top"><a href="/" className="admin-brand"><span>B</span><div><b>BOLA TECH</b><small>OPERATIONS CENTER</small></div></a><div className="admin-user"><span>{admin.name} · {admin.role}</span><button onClick={logout}><LogOut size={16}/> خروج</button></div></header><div className="admin-content"><div className="admin-title-row"><div><span className="section-kicker">OPERATIONS</span><h1>مركز إدارة الطلبات</h1><p>راجع الطلبات الجديدة وحدّث مراحل التنفيذ والتسليم.</p></div><button className="admin-refresh" onClick={() => void loadInquiries()}><RefreshCw size={16}/> تحديث</button></div>{error && <div className="admin-error"><CircleAlert size={16}/>{error}</div>}<div className="admin-stats"><article><ClipboardList/><span>إجمالي الطلبات</span><b>{items.length}</b></article><article><Activity/><span>طلبات جديدة</span><b>{countNew}</b></article><article><CheckCircle2/><span>طلبات قيد التنفيذ</span><b>{countActive}</b></article></div><div className="admin-list-panel"><div className="admin-list-heading"><div><h2>الطلبات الواردة</h2><span>{filtered.length} طلب ظاهر</span></div><div className="admin-search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالاسم أو رقم الطلب…"/></div></div>{filtered.length === 0 ? <div className="admin-empty">لا توجد طلبات مطابقة حتى الآن.</div> : <div className="admin-inquiry-list">{filtered.map(item => { const names = Array.isArray(item.items) ? item.items.map((v) => typeof v === "object" && v && "name" in v ? String(v.name) : "").filter(Boolean) : []; return <article className="admin-inquiry" key={item.id}><div className="admin-inquiry-main"><div className="admin-inquiry-ref"><b>{item.reference}</b><time>{new Date(item.createdAt).toLocaleString("ar-EG")}</time></div><h3>{item.customerName}</h3><div className="admin-contact-line">{item.email}{item.phone ? " · " + item.phone : ""}{item.company ? " · " + item.company : ""}</div><p>{item.message}</p><div className="admin-item-chips">{names.map((name,index) => <span key={index}>{name}</span>)}</div></div><label className="admin-status">حالة الطلب<select value={item.status} disabled={busy} onChange={e => void updateStatus(item.id,e.target.value)}>{statuses.map(([value,title]) => <option key={value} value={value}>{title}</option>)}</select></label></article>; })}</div>}</div></div></main>;
}
