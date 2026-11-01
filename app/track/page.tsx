"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, PackageCheck, Search, ShieldCheck } from "lucide-react";

type TrackingResult = { reference: string; status: string; createdAt: string; updatedAt: string; items: unknown; events: { action: string; createdAt: string }[] };
const labels: Record<string,string> = {
  NEW: "تم استلام الطلب", REVIEWING: "قيد المراجعة", WAITING_FOR_CUSTOMER: "بانتظار معلومات منك",
  APPROVED: "تمت الموافقة", IN_PROGRESS: "قيد التنفيذ", READY_FOR_DELIVERY: "جاهز للتسليم",
  COMPLETED: "تم التسليم", CANCELLED: "تم إلغاء الطلب",
};
const stages = ["NEW","REVIEWING","APPROVED","IN_PROGRESS","READY_FOR_DELIVERY","COMPLETED"];

export default function TrackPage() {
  const [reference,setReference] = useState("");
  const [email,setEmail] = useState("");
  const [result,setResult] = useState<TrackingResult | null>(null);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);

  async function track(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/track", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({reference,email}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر العثور على الطلب");
      setResult(data.inquiry as TrackingResult);
    } catch(err) { setError(err instanceof Error ? err.message : "حدث خطأ"); }
    finally { setBusy(false); }
  }

  const activeIndex = result ? stages.indexOf(result.status) : -1;
  const products = result && Array.isArray(result.items) ? result.items.map(v => typeof v === "object" && v && "name" in v ? String(v.name) : "").filter(Boolean) : [];

  return <main className="track-shell"><header className="track-header"><Link href="/" className="admin-brand"><span>B</span><div><b>BOLA TECH</b><small>INNOVATE · AUTOMATE · GROW</small></div></Link><Link href="/" className="track-back">الرئيسية <ArrowRight size={16}/></Link></header><section className="track-content"><div className="track-heading"><span className="section-kicker">CUSTOMER PORTAL</span><div className="track-icon"><PackageCheck size={29}/></div><h1>تابع حالة طلبك</h1><p>أدخل رقم الطلب والبريد الإلكتروني المستخدم عند الإرسال لعرض آخر تحديث.</p></div><form className="track-form" onSubmit={track}><label>رقم الطلب<input required value={reference} onChange={e=>setReference(e.target.value)} placeholder="BOLA-…"/></label><label>البريد الإلكتروني<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label>{error && <div className="admin-error">{error}</div>}<button className="admin-submit" disabled={busy}>{busy ? "جارٍ البحث…" : "اعرض حالة الطلب"} <Search size={17}/></button></form>{result && <section className="track-result"><div className="track-result-top"><div><small>رقم الطلب</small><b>{result.reference}</b></div><span className="track-status">{labels[result.status] || result.status}</span></div><div className="track-progress">{stages.map((stage,index)=><div className={index <= activeIndex ? "track-step done" : "track-step"} key={stage}><span>{index < activeIndex ? <CheckCircle2 size={16}/> : <i/>}</span><small>{labels[stage]}</small></div>)}</div>{result.status === "CANCELLED" && <p className="track-cancelled">إذا كنت تحتاج مساعدة بخصوص هذا الطلب، تواصل مع فريق BOLA TECH.</p>}<div className="track-result-meta"><span><Clock3 size={15}/> تاريخ الطلب: {new Date(result.createdAt).toLocaleString("ar-EG")}</span><span><ShieldCheck size={15}/> آخر تحديث: {new Date(result.updatedAt).toLocaleString("ar-EG")}</span></div>{products.length>0 && <div className="track-products"><b>المنتجات المطلوبة</b>{products.map((name,i)=><span key={i}>{name}</span>)}</div>}</section>}</section></main>;
}
