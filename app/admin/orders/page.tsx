"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw, ShoppingBag, Truck } from "lucide-react";

type Order = {
  id: string; reference: string; status: string; total: number; currency: string;
  paymentMethod: string; paymentStatus: string; shippingAddress: string | null; createdAt: string;
  customer: { name: string; email: string | null; phone: string | null };
  items: { id: string; title: string; quantity: number; lineTotal: number }[];
};

const statusLabels: Record<string,string> = {
  PENDING:"جديد", CONFIRMED:"مؤكد", PROCESSING:"قيد التجهيز", READY:"جاهز", SHIPPED:"تم الشحن",
  COMPLETED:"مكتمل", CANCELLED:"ملغي", REFUNDED:"مسترد",
};

export default function OrdersPage() {
  const [orders,setOrders] = useState<Order[]>([]);
  const [busy,setBusy] = useState(true);
  const [error,setError] = useState("");
  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/orders",{cache:"no-store"});
      if (response.status===401) { window.location.href="/admin"; return; }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحميل الطلبات");
      setOrders(data.orders);
    } catch(e) { setError(e instanceof Error?e.message:"حدث خطأ"); }
    finally { setBusy(false); }
  },[]);
  useEffect(()=>{void load();},[load]);

  async function update(id:string, values:Record<string,string>) {
    setError("");
    try {
      const response = await fetch("/api/admin/orders",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,...values})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحديث الطلب");
      await load();
    } catch(e) { setError(e instanceof Error?e.message:"حدث خطأ"); }
  }

  return <main className="workspace-shell" dir="rtl">
    <header className="workspace-header">
      <Link href="/admin" className="workspace-back"><ArrowRight size={17}/> العودة لمركز القيادة</Link>
      <div><b>BOLA TECH</b><span>COMMERCE OPERATIONS</span></div>
    </header>
    <section className="workspace-wrap">
      <div className="workspace-heading"><div><span className="section-kicker">ORDER MANAGEMENT</span><h1>إدارة الطلبات والشحن</h1><p>متابعة طلبات العملاء وحالة التجهيز والدفع من لوحة تشغيل واحدة.</p></div><button onClick={()=>void load()} disabled={busy}><RefreshCw size={16}/> تحديث</button></div>
      {error&&<div className="workspace-error">{error}</div>}
      {busy&&!orders.length?<p className="workspace-empty">جارٍ تحميل الطلبات…</p>:orders.length===0?<div className="workspace-panel workspace-empty"><ShoppingBag size={30}/><p>لا توجد طلبات بعد.</p></div>:
      <div className="workspace-order-list">{orders.map(order=><article className="workspace-order-card" key={order.id}>
        <div className="workspace-order-head"><div><b>{order.reference}</b><small>{new Date(order.createdAt).toLocaleString("ar-EG")}</small></div><strong>{(order.total/100).toLocaleString("ar-EG",{style:"currency",currency:order.currency})}</strong></div>
        <div className="workspace-order-customer"><b>{order.customer.name}</b><span>{order.customer.phone}</span>{order.customer.email&&<span>{order.customer.email}</span>}</div>
        <div className="workspace-order-items">{order.items.map(item=><span key={item.id}>{item.title} × {item.quantity}</span>)}</div>
        {order.shippingAddress&&<p className="workspace-order-address"><Truck size={15}/>{order.shippingAddress}</p>}
        <div className="workspace-order-actions">
          <label>حالة الطلب<select value={order.status} onChange={e=>void update(order.id,{status:e.target.value})}>{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label>حالة الدفع<select value={order.paymentStatus} onChange={e=>void update(order.id,{paymentStatus:e.target.value})}><option value="UNPAID">غير مدفوع</option><option value="PENDING_REVIEW">بانتظار المراجعة</option><option value="PAID">مدفوع ومؤكد</option><option value="FAILED">فشل الدفع</option><option value="REFUNDED">مسترد</option></select></label>
          <span className="workspace-payment-method">{order.paymentMethod==="COD"?"الدفع عند الاستلام":"تحويل محفظة"}</span>
        </div>
      </article>)}</div>}
    </section>
  </main>;
}
