"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Boxes, Building2, ChartNoAxesCombined, CircleDollarSign, Headset, Plus, RefreshCw, Users } from "lucide-react";

const areas = [
  { id:"CRM", label:"العملاء وCRM", icon:Users },
  { id:"PROJECTS", label:"المشروعات", icon:BriefcaseBusiness },
  { id:"FINANCE", label:"المالية", icon:CircleDollarSign },
  { id:"INVENTORY", label:"المخزون", icon:Boxes },
  { id:"HR", label:"الموارد البشرية", icon:Building2 },
  { id:"SALES", label:"المبيعات", icon:ChartNoAxesCombined },
  { id:"SUPPORT", label:"الدعم الفني", icon:Headset },
] as const;

type RecordItem = { id:string; area:string; title:string; description:string|null; status:string; customer:string|null; owner:string|null; amountMinor:number|null; currency:string; dueAt:string|null; updatedAt:string };

export default function WorkspacePage() {
  const [area,setArea] = useState<string>("CRM");
  const [records,setRecords] = useState<RecordItem[]>([]);
  const [title,setTitle] = useState("");
  const [description,setDescription] = useState("");
  const [customer,setCustomer] = useState("");
  const [owner,setOwner] = useState("");
  const [amount,setAmount] = useState("");
  const [status,setStatus] = useState("OPEN");
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/workspace?area="+area,{cache:"no-store"});
      if (response.status===401) { window.location.href="/admin"; return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحميل بيانات القسم");
      setRecords(data.records as RecordItem[]);
    } catch (e) { setError(e instanceof Error ? e.message : "حدث خطأ"); }
    finally { setBusy(false); }
  },[area]);

  useEffect(()=>{ void load(); },[load]);

  async function createRecord(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/workspace",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        area,title,description:description || undefined,status,customer:customer || undefined,owner:owner || undefined,
        amountMinor:amount ? Math.round(Number(amount)*100) : undefined,currency:"EGP"
      })});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حفظ السجل");
      setTitle("");setDescription("");setCustomer("");setOwner("");setAmount("");setStatus("OPEN");
      await load();
    } catch(e) { setError(e instanceof Error ? e.message : "حدث خطأ"); }
    finally { setBusy(false); }
  }

  const selected = areas.find(item=>item.id===area)!;
  return <main className="workspace-shell" dir="rtl">
    <header className="workspace-header">
      <Link href="/admin" className="workspace-back"><ArrowRight size={17}/> العودة لمركز القيادة</Link>
      <div><b>BOLA TECH</b><span>COMPANY OPERATIONS WORKSPACE</span></div>
    </header>
    <section className="workspace-wrap">
      <div className="workspace-heading"><div><span className="section-kicker">CONNECTED COMPANY SYSTEM</span><h1>مساحة تشغيل الشركة</h1><p>إدارة السجلات التشغيلية للأقسام من مكان واحد. البيانات تحفظ في قاعدة البيانات بعد إعداد الاتصال.</p></div><button onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/> تحديث</button></div>
      <nav className="workspace-tabs">{areas.map(item=>{const Icon=item.icon;return <button key={item.id} className={area===item.id?"selected":""} onClick={()=>setArea(item.id)}><Icon size={17}/>{item.label}</button>;})}</nav>
      {error&&<div className="workspace-error">{error}</div>}
      <div className="workspace-grid">
        <section className="workspace-panel">
          <div className="workspace-panel-title"><div><span className="section-kicker">NEW ENTRY</span><h2>إضافة سجل جديد · {selected.label}</h2></div><Plus size={20}/></div>
          <form className="workspace-form" onSubmit={createRecord}>
            <label>العنوان<input required minLength={2} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} placeholder="اسم العميل أو المشروع أو العملية"/></label>
            <label>الوصف<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} placeholder="تفاصيل وملاحظات"/></label>
            <div className="workspace-form-row"><label>العميل / الجهة<input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="اسم العميل"/></label><label>المسؤول<input value={owner} onChange={e=>setOwner(e.target.value)} placeholder="اسم المسؤول"/></label></div>
            <div className="workspace-form-row"><label>الحالة<select value={status} onChange={e=>setStatus(e.target.value)}><option value="OPEN">مفتوح</option><option value="IN_PROGRESS">قيد التنفيذ</option><option value="WAITING">معلق</option><option value="DONE">مكتمل</option><option value="CANCELLED">ملغي</option></select></label><label>القيمة بالجنيه<input type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="اختياري"/></label></div>
            <button className="workspace-submit" disabled={busy}>{busy?"جارٍ الحفظ…":"حفظ السجل"} <Plus size={16}/></button>
          </form>
        </section>
        <section className="workspace-panel workspace-records">
          <div className="workspace-panel-title"><div><span className="section-kicker">LIVE RECORDS</span><h2>سجلات القسم</h2></div><span className="workspace-count">{records.length} سجل</span></div>
          {busy&&!records.length?<p className="workspace-empty">جارٍ تحميل البيانات…</p>:records.length===0?<p className="workspace-empty">لا توجد سجلات في هذا القسم حتى الآن. أضف أول سجل من النموذج.</p>:
            <div className="workspace-record-list">{records.map(record=><article key={record.id}><div className="workspace-record-top"><b>{record.title}</b><span>{record.status}</span></div>{record.description&&<p>{record.description}</p>}<div className="workspace-record-meta">{record.customer&&<span>الجهة: {record.customer}</span>}{record.owner&&<span>المسؤول: {record.owner}</span>}{record.amountMinor!==null&&<span>{(record.amountMinor/100).toLocaleString("ar-EG")} {record.currency}</span>}<time>{new Date(record.updatedAt).toLocaleDateString("ar-EG")}</time></div></article>)}</div>}
        </section>
      </div>
    </section>
  </main>;
}
