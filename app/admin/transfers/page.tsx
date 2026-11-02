"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw, Truck, Plus, PackageCheck } from "lucide-react";

type Warehouse = { id:string; name:string; code:string };
type Product = { id:string; sku:string; nameAr:string; nameEn:string };
type Transfer = {
  id:string; reference:string; status:string; notes:string|null; createdAt:string;
  fromWarehouse:Warehouse; toWarehouse:Warehouse;
  items:{ id:string; quantity:number; product:{ sku:string; nameAr:string; nameEn:string } }[];
};
type Payload = { transfers:Transfer[]; warehouses:Warehouse[]; products:Product[] };
const labels:Record<string,string>={DRAFT:"مسودة",IN_TRANSIT:"في الطريق",RECEIVED:"تم الاستلام"};

export default function TransfersPage(){
  const [data,setData]=useState<Payload>({transfers:[],warehouses:[],products:[]});
  const [reference,setReference]=useState("");
  const [from,setFrom]=useState("");
  const [to,setTo]=useState("");
  const [product,setProduct]=useState("");
  const [quantity,setQuantity]=useState("1");
  const [notes,setNotes]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const load=useCallback(async()=>{
    setBusy(true);setError("");
    try{const r=await fetch("/api/admin/transfers",{cache:"no-store"});if(r.status===401){window.location.href="/admin";return;}const j=await r.json();if(!r.ok)throw new Error(j.error||"تعذر تحميل التحويلات");setData(j);if(!from&&j.warehouses[0])setFrom(j.warehouses[0].id);if(!to&&j.warehouses[1])setTo(j.warehouses[1].id);if(!product&&j.products[0])setProduct(j.products[0].id);}
    catch(e){setError(e instanceof Error?e.message:"حدث خطأ");}finally{setBusy(false);}
  },[from,to,product]);
  useEffect(()=>{void load();},[load]);
  async function create(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{const r=await fetch("/api/admin/transfers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference,fromWarehouseId:from,toWarehouseId:to,notes,items:[{productId:product,quantity:Number(quantity)}]})});const j=await r.json();if(!r.ok)throw new Error(j.error||"تعذر إنشاء التحويل");setReference("");setNotes("");await load();}
    catch(e){setError(e instanceof Error?e.message:"حدث خطأ");}finally{setBusy(false);}
  }
  async function action(id:string,action:"ship"|"receive"){
    setBusy(true);setError("");
    try{const r=await fetch("/api/admin/transfers",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action})});const j=await r.json();if(!r.ok)throw new Error(j.error||"تعذر تنفيذ الحركة");await load();}
    catch(e){setError(e instanceof Error?e.message:"حدث خطأ");}finally{setBusy(false);}
  }
  return <main className="workspace-shell" dir="rtl">
    <header className="workspace-header"><Link href="/admin" className="workspace-back"><ArrowRight size={17}/> العودة لمركز القيادة</Link><div><b>BOLA TECH</b><span>WAREHOUSE TRANSFERS</span></div></header>
    <section className="workspace-wrap">
      <div className="workspace-heading"><div><span className="section-kicker">INVENTORY LOGISTICS</span><h1>تحويلات المخزون بين المستودعات</h1><p>أنشئ التحويل، ثم أرسل البضاعة، وبعد وصولها سجّل الاستلام لتحديث رصيد المستودع الوجهة.</p></div><button onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/> تحديث</button></div>
      {error&&<div className="workspace-error">{error}</div>}
      <form className="workspace-panel" onSubmit={create}>
        <h2><Plus size={18}/> تحويل مخزون جديد</h2>
        <div className="workspace-form-grid">
          <label>رقم التحويل<input required minLength={3} maxLength={60} value={reference} onChange={e=>setReference(e.target.value)} placeholder="TR-2026-001"/></label>
          <label>المستودع المصدر<select required value={from} onChange={e=>setFrom(e.target.value)}><option value="">اختر</option>{data.warehouses.map(w=><option key={w.id} value={w.id}>{w.name} · {w.code}</option>)}</select></label>
          <label>المستودع الوجهة<select required value={to} onChange={e=>setTo(e.target.value)}><option value="">اختر</option>{data.warehouses.map(w=><option key={w.id} value={w.id}>{w.name} · {w.code}</option>)}</select></label>
          <label>المنتج<select required value={product} onChange={e=>setProduct(e.target.value)}><option value="">اختر</option>{data.products.map(p=><option key={p.id} value={p.id}>{p.nameAr} · {p.sku}</option>)}</select></label>
          <label>الكمية<input type="number" min="1" max="100000" step="1" required value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
          <label>ملاحظات<input maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
        </div>
        <button type="submit" disabled={busy||!data.warehouses.length||!data.products.length||from===to}><Plus size={16}/> إنشاء التحويل</button>
        {!data.warehouses.length&&<p className="workspace-muted">أضف مستودعين نشطين على الأقل من صفحة الموردين والمشتريات أولًا.</p>}
      </form>
      <div className="workspace-panel"><h2><Truck size={18}/> سجل التحويلات</h2>
        {!data.transfers.length?<p className="workspace-empty">لا توجد تحويلات مسجلة.</p>:<div className="workspace-order-list">{data.transfers.map(t=><article className="workspace-order-card" key={t.id}>
          <div className="workspace-order-head"><div><b>{t.reference}</b><small>{new Date(t.createdAt).toLocaleString("ar-EG")}</small></div><strong>{labels[t.status]||t.status}</strong></div>
          <p>{t.fromWarehouse.name} ← {t.toWarehouse.name}</p>
          <div className="workspace-order-items">{t.items.map(i=><span key={i.id}>{i.product.nameAr} · {i.product.sku} × {i.quantity}</span>)}</div>
          {t.notes&&<p>{t.notes}</p>}
          <div className="workspace-order-actions">
            {t.status==="DRAFT"&&<button disabled={busy} onClick={()=>void action(t.id,"ship")}><Truck size={15}/> إرسال من المصدر</button>}
            {t.status==="IN_TRANSIT"&&<button disabled={busy} onClick={()=>void action(t.id,"receive")}><PackageCheck size={15}/> تأكيد الاستلام</button>}
            {t.status==="RECEIVED"&&<span className="workspace-muted">اكتملت حركة التحويل</span>}
          </div>
        </article>)}</div>}
      </div>
    </section>
  </main>;
}
