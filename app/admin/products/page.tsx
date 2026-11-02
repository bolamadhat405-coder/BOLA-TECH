"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, PackagePlus, RefreshCw } from "lucide-react";

type Product = { id:string; sku:string; slug:string; nameAr:string; nameEn:string; category:string; kind:string; priceMinor:number; costMinor:number; stockQuantity:number; lowStockAt:number; isPublished:boolean; currency:string };
const blank = { sku:"",slug:"",nameAr:"",nameEn:"",category:"عام",kind:"PHYSICAL",price:"",cost:"",stock:"0",low:"3",published:false };

export default function ProductsPage() {
  const [products,setProducts]=useState<Product[]>([]);
  const [form,setForm]=useState(blank);
  const [busy,setBusy]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [query,setQuery]=useState("");
  const load=useCallback(async()=>{
    setBusy(true);setError("");
    try{const r=await fetch("/api/admin/products",{cache:"no-store"});if(r.status===401){window.location.href="/admin";return;}const d=await r.json();if(!r.ok)throw new Error(d.error||"تعذر تحميل المنتجات");setProducts(d.products);}
    catch(e){setError(e instanceof Error?e.message:"حدث خطأ");}finally{setBusy(false);}
  },[]);
  useEffect(()=>{void load();},[load]);
  async function create(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setSaving(true);setError("");
    try{
      const payload={sku:form.sku,slug:form.slug,nameAr:form.nameAr,nameEn:form.nameEn,descriptionAr:"",descriptionEn:"",category:form.category,kind:form.kind,priceMinor:Math.round(Number(form.price)*100),costMinor:Math.round(Number(form.cost||0)*100),stockQuantity:Number(form.stock),lowStockAt:Number(form.low),currency:"EGP",isPublished:form.published};
      const r=await fetch("/api/admin/products",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();if(!r.ok)throw new Error(d.error||"تعذر حفظ المنتج");setForm(blank);await load();
    }catch(e){setError(e instanceof Error?e.message:"حدث خطأ");}finally{setSaving(false);}
  }
  async function patch(id:string,values:Record<string,unknown>){
    setError("");try{const r=await fetch("/api/admin/products",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,...values})});const d=await r.json();if(!r.ok)throw new Error(d.error||"تعذر التحديث");await load();}catch(e){setError(e instanceof Error?e.message:"حدث خطأ");}
  }
  const visible=products.filter(p=>[p.sku,p.nameAr,p.nameEn,p.category].join(" ").toLowerCase().includes(query.toLowerCase()));
  return <main className="workspace-shell" dir="rtl"><header className="workspace-header"><Link href="/admin" className="workspace-back"><ArrowRight size={17}/> العودة لمركز القيادة</Link><div><b>BOLA TECH</b><span>PRODUCT & INVENTORY CONTROL</span></div></header>
    <section className="workspace-wrap"><div className="workspace-heading"><div><span className="section-kicker">CATALOG OPERATIONS</span><h1>المنتجات والمخزون</h1><p>إدارة الكتالوج والأسعار والنشر والكميات مع سجل لحركة المخزون.</p></div><button onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/> تحديث</button></div>
      {error&&<div className="workspace-error">{error}</div>}
      <div className="workspace-grid"><section className="workspace-panel"><div className="workspace-panel-title"><div><span className="section-kicker">NEW PRODUCT</span><h2>إضافة منتج</h2></div><PackagePlus size={20}/></div>
        <form className="workspace-form" onSubmit={create}>
          <label>اسم المنتج بالعربية<input required minLength={2} value={form.nameAr} onChange={e=>setForm({...form,nameAr:e.target.value})}/></label>
          <label>اسم المنتج بالإنجليزية<input required minLength={2} value={form.nameEn} onChange={e=>setForm({...form,nameEn:e.target.value})}/></label>
          <div className="workspace-form-row"><label>SKU<input required value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/></label><label>Slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})}/></label></div>
          <div className="workspace-form-row"><label>القسم<input required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label><label>النوع<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option value="PHYSICAL">منتج مادي</option><option value="DIGITAL">منتج رقمي</option><option value="SERVICE">خدمة</option></select></label></div>
          <div className="workspace-form-row"><label>السعر بالجنيه<input type="number" min="0" step=".01" required value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label><label>التكلفة بالجنيه<input type="number" min="0" step=".01" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/></label></div>
          <div className="workspace-form-row"><label>المخزون<input type="number" min="0" step="1" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></label><label>حد التنبيه<input type="number" min="0" step="1" value={form.low} onChange={e=>setForm({...form,low:e.target.value})}/></label></div>
          <label className="workspace-check"><input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})}/> نشر المنتج في المتجر</label>
          <button className="workspace-submit" disabled={saving}>{saving?"جارٍ الحفظ…":"حفظ المنتج"} <PackagePlus size={16}/></button>
        </form>
      </section>
      <section className="workspace-panel workspace-records"><div className="workspace-panel-title"><div><span className="section-kicker">LIVE CATALOG</span><h2>قائمة المنتجات</h2></div><span className="workspace-count">{products.length} منتج</span></div>
        <input className="workspace-search" placeholder="ابحث بالاسم أو SKU أو القسم…" value={query} onChange={e=>setQuery(e.target.value)}/>
        {busy&&!products.length?<p className="workspace-empty">جارٍ التحميل…</p>:visible.length===0?<p className="workspace-empty">لا توجد منتجات مطابقة.</p>:<div className="workspace-record-list">{visible.map(p=><article key={p.id}><div className="workspace-record-top"><b>{p.nameAr}</b><span>{p.isPublished?"منشور":"مسودة"}</span></div><p>{p.nameEn} · {p.sku} · {p.category}</p><div className="workspace-record-meta"><span>السعر: {(p.priceMinor/100).toLocaleString("ar-EG")} ج.م</span><span>المخزون: {p.stockQuantity}</span><span>هامش الوحدة: {((p.priceMinor-p.costMinor)/100).toLocaleString("ar-EG")} ج.م</span></div><div className="workspace-product-actions"><label>تعديل المخزون<input type="number" min="0" value={p.stockQuantity} onBlur={e=>{const n=Number(e.target.value);if(n!==p.stockQuantity)void patch(p.id,{stockQuantity:n});}}/></label><button onClick={()=>void patch(p.id,{isPublished:!p.isPublished})}>{p.isPublished?"إيقاف النشر":"نشر المنتج"}</button></div></article>)}</div>}
      </section></div>
    </section></main>;
}
