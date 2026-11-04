"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Package, Search, ShoppingBag, Truck } from "lucide-react";

type Product={id:string;sku:string;slug:string;nameAr:string;nameEn:string;descriptionAr:string;category:string;kind:string;priceMinor:number;currency:string;stockQuantity:number};
type CartLine={productId:string;quantity:number};
export default function ShopPage(){
  const [products,setProducts]=useState<Product[]>([]);
  const [cart,setCart]=useState<CartLine[]>([]);
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [name,setName]=useState("");const [phone,setPhone]=useState("");const [email,setEmail]=useState("");const [address,setAddress]=useState("");const [payment,setPayment]=useState("COD");
  useEffect(()=>{fetch("/api/catalog").then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"تعذر تحميل المتجر");setProducts(d.products);}).catch(e=>setError(e instanceof Error?e.message:"تعذر تحميل المنتجات")).finally(()=>setLoading(false));},[]);
  const visible=useMemo(()=>products.filter(p=>(p.nameAr+" "+p.nameEn+" "+p.category+" "+p.sku).toLowerCase().includes(query.toLowerCase())),[products,query]);
  const total=cart.reduce((sum,line)=>sum+(products.find(p=>p.id===line.productId)?.priceMinor||0)*line.quantity,0);
  function add(id:string){setCart(old=>{const found=old.find(x=>x.productId===id);return found?old.map(x=>x.productId===id?{...x,quantity:Math.min(20,x.quantity+1)}:x):[...old,{productId:id,quantity:1}];});}
  function quantity(id:string,value:number){setCart(old=>old.map(x=>x.productId===id?{...x,quantity:value}:x).filter(x=>x.quantity>0));}
  async function checkout(){
    setBusy(true);setError("");setSuccess("");
    try{const response=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customer:{name,email,phone},shippingAddress:address,paymentMethod:payment,couponCode,items:cart})});const data=await response.json();if(!response.ok)throw new Error(data.error||"تعذر إنشاء الطلب");setSuccess("تم تسجيل طلبك بنجاح. رقم الطلب: "+data.order.reference);setCart([]);setName("");setPhone("");setEmail("");setAddress("");setCouponCode("");}
    catch(e){setError(e instanceof Error?e.message:"حدث خطأ أثناء الطلب");}finally{setBusy(false);}
  }
  return <main className="shop-shell" dir="rtl"><header className="shop-header"><Link href="/" className="shop-brand"><span>B</span><b>BOLA TECH</b></Link><div><span>متجر BOLA TECH</span><Link href="/track">متابعة الطلبات</Link><Link href="/admin">إدارة الشركة</Link></div></header>
    <section className="shop-hero"><span className="section-kicker">THE BOLA MARKETPLACE</span><h1>تسوّق بذكاء. <em>اطلب بثقة.</em></h1><p>منتجات وخدمات مختارة، طلب واضح، ومتابعة من لحظة الشراء حتى التسليم.</p><div className="shop-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث عن منتج أو قسم أو SKU…"/></div></section>
    <section className="shop-layout"><div className="shop-products"><div className="shop-section-title"><h2>الكتالوج</h2><span>{visible.length} منتج منشور</span></div>{loading?<p className="shop-empty">جارٍ تحميل المنتجات…</p>:visible.length===0?<div className="shop-empty"><Package size={30}/><p>لا توجد منتجات منشورة حاليًا. تابعنا قريبًا.</p></div>:<div className="shop-grid">{visible.map(p=><article className="shop-product" key={p.id}><div className="shop-product-art"><Package size={35}/><small>{p.category}</small></div><div className="shop-product-body"><span className="shop-sku">{p.sku}</span><h3>{p.nameAr}</h3><p>{p.descriptionAr||"منتج من كتالوج BOLA TECH."}</p><div className="shop-product-bottom"><b>{(p.priceMinor/100).toLocaleString("ar-EG")} {p.currency}</b><span>{p.kind==="PHYSICAL"?(p.stockQuantity>0?"متاح: "+p.stockQuantity:"نفد المخزون"):"متاح للطلب"}</span></div><button disabled={p.kind==="PHYSICAL"&&p.stockQuantity<1} onClick={()=>add(p.id)}>أضف إلى السلة <ShoppingBag size={15}/></button></div></article>)}</div>}</div>
    <aside className="shop-cart"><div className="shop-section-title"><h2><ShoppingBag size={19}/> سلة الشراء</h2><span>{cart.reduce((s,x)=>s+x.quantity,0)} قطعة</span></div>{cart.length===0?<p className="shop-empty">السلة فارغة. أضف منتجات من الكتالوج.</p>:<><div className="shop-cart-lines">{cart.map(line=>{const p=products.find(x=>x.id===line.productId);if(!p)return null;return <div className="shop-cart-line" key={line.productId}><div><b>{p.nameAr}</b><small>{(p.priceMinor/100).toLocaleString("ar-EG")} ج.م</small></div><div className="shop-qty"><button onClick={()=>quantity(p.id,line.quantity-1)}>−</button><span>{line.quantity}</span><button onClick={()=>quantity(p.id,line.quantity+1)}>+</button></div></div>;})}</div><div className="shop-total"><span>الإجمالي قبل الشحن</span><b>{(total/100).toLocaleString("ar-EG")} ج.م</b></div>
    <div className="shop-checkout"><h3>بيانات الاستلام</h3><input maxLength={40} placeholder="كود الخصم (اختياري)" value={couponCode} onChange={e=>setCouponCode(e.target.value.toUpperCase())}/><input required placeholder="الاسم بالكامل" value={name} onChange={e=>setName(e.target.value)}/><input required type="tel" placeholder="رقم الهاتف" value={phone} onChange={e=>setPhone(e.target.value)}/><input type="email" placeholder="البريد الإلكتروني (اختياري)" value={email} onChange={e=>setEmail(e.target.value)}/><textarea required rows={3} placeholder="العنوان بالتفصيل" value={address} onChange={e=>setAddress(e.target.value)}/><label>طريقة الدفع<select value={payment} onChange={e=>setPayment(e.target.value)}><option value="COD">الدفع عند الاستلام</option><option value="WALLET_TRANSFER">تحويل محفظة (تأكيد يدوي)</option></select></label><button disabled={busy||name.trim().length<2||phone.trim().length<7||address.trim().length<8} onClick={()=>void checkout()}>{busy?"جارٍ تأكيد الطلب…":"تأكيد الطلب"} <ArrowRight size={16}/></button><small><Truck size={14}/> تكلفة الشحن يتم تأكيدها مع فريق المتجر.</small></div></>}</aside></section>
    {error&&<div className="shop-toast error">{error}</div>}{success&&<div className="shop-success"><CheckCircle2 size={22}/><b>{success}</b><p>احتفظ برقم الطلب لمتابعته من صفحة متابعة الطلبات.</p><Link href="/track">انتقل إلى متابعة الطلب</Link></div>}
    <footer className="shop-footer">© {new Date().getFullYear()} BOLA TECH · متجر رقمي قيد التوسع</footer>
  </main>;
}
