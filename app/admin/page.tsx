"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, CheckCircle2, CircleAlert, ClipboardList, Image as ImageIcon, LayoutDashboard, LogOut, LockKeyhole, RefreshCw, Search, ShieldCheck, Sparkles, ArrowUpRight, ExternalLink, BriefcaseBusiness, ShoppingBag, ShoppingCart, Package, Users } from "lucide-react";

type Inquiry = { id:string; reference:string; customerName:string; email:string; phone:string|null; company:string|null; message:string; items:unknown; status:string; createdAt:string };
type Admin = { name:string; email:string; role:string };
type Metrics = { orders:number; openOrders:number; customers:number; activeProjects:number; openTickets:number; lowStock:number; products:number; completedRevenueMinor:number };
type Tab = "overview" | "inquiries" | "media";
const statuses = [["NEW","جديد"],["REVIEWING","قيد المراجعة"],["WAITING_FOR_CUSTOMER","بانتظار العميل"],["APPROVED","تمت الموافقة"],["IN_PROGRESS","قيد التنفيذ"],["READY_FOR_DELIVERY","جاهز للتسليم"],["COMPLETED","مكتمل"],["CANCELLED","ملغي"]] as const;
const media = [
  {src:"/visuals/planet-core.svg",title:"الكوكب الرئيسي",kind:"هوية الواجهة الرئيسية",alt:"كوكب BOLA TECH الرقمي والمدارات"},
  {src:"/visuals/orbital-network.svg",title:"شبكة المدارات",kind:"رسم شبكة الأنظمة والبيانات",alt:"شبكة مترابطة حول مركز رقمي"},
  {src:"/visuals/deep-space.svg",title:"فضاء BOLA TECH",kind:"خلفية فضائية للصفحات",alt:"كوكب أزرق بحلقات مضيئة في الفضاء"}
];

export default function AdminPage() {
  const [admin,setAdmin]=useState<Admin|null>(null);
  const [items,setItems]=useState<Inquiry[]>([]);
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [query,setQuery]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState<Tab>("overview");
  const [metrics,setMetrics]=useState<Metrics|null>(null);

  const loadInquiries=useCallback(async()=>{
    const response=await fetch("/api/admin/inquiries",{cache:"no-store"});
    if(response.status===401){setAdmin(null);setItems([]);return;}
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"تعذر تحميل الطلبات");
    setItems(data.items as Inquiry[]);
    if(data.admin)setAdmin(data.admin as Admin);
  },[]);

  useEffect(()=>{
    let active=true;
    fetch("/api/admin/overview",{cache:"no-store"}).then(async response=>{if(response.ok){const data=await response.json();if(active)setMetrics(data.metrics as Metrics);}}).catch(()=>{});
    fetch("/api/admin/inquiries",{cache:"no-store"})
      .then(async response=>{if(response.status===401)return null;if(!response.ok)throw new Error("تعذر تحميل لوحة الإدارة");return response.json();})
      .then(data=>{if(active&&data){setItems(data.items as Inquiry[]);setAdmin(data.admin as Admin);}})
      .catch(err=>{if(active)setError(err instanceof Error?err.message:"حدث خطأ");})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[]);

  const filtered=useMemo(()=>items.filter(item=>[item.reference,item.customerName,item.email,item.company||"",item.message].join(" ").toLowerCase().includes(query.toLowerCase())),[items,query]);
  async function login(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");
    try{const response=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});const data=await response.json();if(!response.ok)throw new Error(data.error||"فشل تسجيل الدخول");setAdmin(data.admin as Admin);setPassword("");await loadInquiries();}
    catch(err){setError(err instanceof Error?err.message:"حدث خطأ");}finally{setBusy(false);}
  }
  async function updateStatus(id:string,status:string){
    setBusy(true);setError("");
    try{const response=await fetch("/api/admin/inquiries",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})});const data=await response.json();if(!response.ok)throw new Error(data.error||"تعذر تحديث الحالة");await loadInquiries();}
    catch(err){setError(err instanceof Error?err.message:"حدث خطأ");}finally{setBusy(false);}
  }
  async function logout(){await fetch("/api/admin/logout",{method:"POST"});setAdmin(null);setItems([]);}
  const countNew=items.filter(item=>item.status==="NEW").length;
  const countActive=items.filter(item=>["REVIEWING","APPROVED","IN_PROGRESS","READY_FOR_DELIVERY"].includes(item.status)).length;
  const countDone=items.filter(item=>item.status==="COMPLETED").length;

  if(loading)return <main className="admin-shell"><div className="admin-loading">BOLA TECH · جاري تحميل مركز القيادة…</div></main>;
  if(!admin)return <main className="admin-shell"><section className="admin-login"><div className="admin-brand"><span>B</span><div><b>BOLA TECH</b><small>ORBITAL OPERATIONS CENTER</small></div></div><div className="admin-login-icon"><LockKeyhole size={25}/></div><h1>تسجيل دخول الإدارة</h1><p>مساحة تشغيل خاصة بالشركة. سجّل الدخول بحساب الإدارة المعتمد.</p><form onSubmit={login}><label>البريد الإلكتروني<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com"/></label><label>كلمة المرور<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••"/></label>{error&&<div className="admin-error"><CircleAlert size={16}/>{error}</div>}<button className="admin-submit" disabled={busy}>{busy?"جارٍ التحقق…":"دخول آمن"} <ShieldCheck size={17}/></button></form><small className="admin-security-note">جلسة محمية · كلمات مرور مشفرة · تقييد محاولات الدخول</small></section></main>;

  return <main className="admin-shell"><header className="admin-top"><Link href="/" className="admin-brand"><span>B</span><div><b>BOLA TECH</b><small>ORBITAL OPERATIONS CENTER</small></div></Link><div className="admin-user"><span>{admin.name} · {admin.role}</span><button onClick={logout}><LogOut size={16}/> خروج</button></div></header>
    <div className="admin-layout">
      <aside className="admin-sidebar"><div className="admin-side-label">مركز الشركة</div>
        <Link href="/admin/workspace" className="admin-workspace-link"><BriefcaseBusiness size={17}/> مساحة تشغيل الشركة</Link>
        <Link href="/admin/orders" className="admin-workspace-link"><ShoppingCart size={17}/> إدارة التجارة والطلبات</Link><Link href="/admin/procurement" className="admin-workspace-link"><Package size={17}/> الموردون والمشتريات والمخازن</Link><Link href="/admin/orders" className="admin-workspace-link"><ShoppingBag size={17}/> إدارة الطلبات والشحن</Link><Link href="/admin/products" className="admin-workspace-link"><Package size={17}/> المنتجات والمخزون</Link>
        <button className={tab==="overview"?"active":""} onClick={()=>setTab("overview")}><LayoutDashboard size={17}/> نظرة عامة</button>
        <button className={tab==="inquiries"?"active":""} onClick={()=>setTab("inquiries")}><ClipboardList size={17}/> الطلبات والعملاء <i>{items.length}</i></button>
        <button className={tab==="media"?"active":""} onClick={()=>setTab("media")}><ImageIcon size={17}/> مكتبة الوسائط <i>{media.length}</i></button>
        <div className="admin-side-foot"><Sparkles size={16}/> DIGITAL UNIVERSE<br/><small>Connected company workspace</small></div>
      </aside>
      <section className="admin-main">
        <div className="admin-title-row"><div><span className="section-kicker">BOLA TECH · COMMAND CENTER</span><h1>{tab==="overview"?"مركز قيادة الشركة":tab==="inquiries"?"الطلبات والعملاء":"مكتبة الهوية البصرية"}</h1><p>{tab==="overview"?"متابعة تشغيل الشركة ومؤشرات الطلبات والهوية الرقمية.":tab==="inquiries"?"راجع طلبات العملاء وحدّث مراحل المراجعة والتنفيذ والتسليم.":"الأصول البصرية المعتمدة لهوية الكواكب والمدارات داخل الشركة."}</p></div><button className="admin-refresh" onClick={()=>void loadInquiries()}><RefreshCw size={16}/> تحديث البيانات</button></div>
        {error&&<div className="admin-error"><CircleAlert size={16}/>{error}</div>}
        {tab==="overview"&&<><div className="admin-stats admin-stats-four"><article><ClipboardList/><span>إجمالي الطلبات</span><b>{items.length}</b></article><article><Activity/><span>طلبات جديدة</span><b>{countNew}</b></article><article><RefreshCw/><span>قيد المتابعة والتنفيذ</span><b>{countActive}</b></article><article><CheckCircle2/><span>طلبات مكتملة</span><b>{countDone}</b></article><article><ShoppingBag/><span>إجمالي المبيعات</span><b>{metrics?.orders ?? "—"}</b></article><article><Users/><span>العملاء</span><b>{metrics?.customers ?? "—"}</b></article><article><BriefcaseBusiness/><span>مشروعات نشطة</span><b>{metrics?.activeProjects ?? "—"}</b></article><article><CircleAlert/><span>مخزون منخفض</span><b>{metrics?.lowStock ?? "—"}</b></article></div><div className="admin-overview-grid"><article className="admin-welcome"><span className="section-kicker">YOUR DIGITAL UNIVERSE</span><h2>كل أنظمة BOLA TECH في مركز واحد</h2><p>الواجهة الحالية تربط الطلبات الواردة بهوية بصرية موحدة. الأقسام التي لم يتم ربط عملياتها وقواعد بياناتها بعد ستظهر كأعمال قيد البناء، ولن تعرض بيانات تجريبية على أنها بيانات حقيقية.</p><button onClick={()=>setTab("media")}>استعراض أصول الهوية <ArrowUpRight size={16}/></button></article><article className="admin-quick"><h3>الوصول السريع</h3><button onClick={()=>setTab("inquiries")}><ClipboardList/> إدارة طلبات العملاء <ArrowUpRight/></button><button onClick={()=>setTab("media")}><ImageIcon/> مكتبة الصور والتصميمات <ArrowUpRight/></button><Link href="/track"><ExternalLink/> صفحة متابعة العميل <ArrowUpRight/></Link></article></div></>}
        {tab==="inquiries"&&<div className="admin-list-panel"><div className="admin-list-heading"><div><h2>الطلبات الواردة</h2><span>{filtered.length} طلب ظاهر</span></div><div className="admin-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث بالاسم أو رقم الطلب…"/></div></div>{filtered.length===0?<div className="admin-empty">لا توجد طلبات مطابقة حتى الآن.</div>:<div className="admin-inquiry-list">{filtered.map(item=>{const names=Array.isArray(item.items)?item.items.map(v=>typeof v==="object"&&v&&"name" in v?String(v.name):"").filter(Boolean):[];return <article className="admin-inquiry" key={item.id}><div className="admin-inquiry-main"><div className="admin-inquiry-ref"><b>{item.reference}</b><time>{new Date(item.createdAt).toLocaleString("ar-EG")}</time></div><h3>{item.customerName}</h3><div className="admin-contact-line">{item.email}{item.phone?" · "+item.phone:""}{item.company?" · "+item.company:""}</div><p>{item.message}</p><div className="admin-item-chips">{names.map((name,index)=><span key={index}>{name}</span>)}</div></div><label className="admin-status">حالة الطلب<select value={item.status} disabled={busy} onChange={e=>void updateStatus(item.id,e.target.value)}>{statuses.map(([value,title])=><option key={value} value={value}>{title}</option>)}</select></label></article>;})}</div>}</div>}
        {tab==="media"&&<><div className="media-library-intro"><div><ImageIcon size={20}/><div><b>أصول BOLA TECH البصرية</b><span>صور SVG أصلية محفوظة داخل المستودع، ويمكن معاينتها واستخدامها في واجهات الشركة.</span></div></div><span className="media-count">{media.length} أصول معتمدة</span></div><div className="media-grid">{media.map(asset=><article className="media-card" key={asset.src}><a href={asset.src} target="_blank" rel="noreferrer" className="media-preview"><img src={asset.src} alt={asset.alt}/><span><ExternalLink size={15}/> معاينة كاملة</span></a><div className="media-info"><div><b>{asset.title}</b><small>{asset.kind}</small></div><button onClick={()=>void navigator.clipboard.writeText(new URL(asset.src,window.location.origin).toString())}>نسخ الرابط</button></div></article>)}</div><p className="media-note">ملاحظة تشغيلية: هذه مكتبة الأصول البصرية الأولية المعتمدة. رفع ملفات جديدة وتخزينها سحابيًا يحتاج ربط خدمة تخزين آمنة قبل تفعيل الرفع الفعلي.</p></>}
      </section>
    </div>
  </main>;
}
