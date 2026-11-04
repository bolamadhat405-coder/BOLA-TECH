"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowUpLeft, ArrowUpRight, Bot, BriefcaseBusiness, Check,
  CircleHelp, Code2, Globe2, LayoutDashboard, Menu, MessageCircle,
  Search, ShieldCheck, ShoppingBag, Sparkles, X, Zap, BarChart3,
  Users, Workflow, MonitorSmartphone, Plus,
} from "lucide-react";

type Product = {
  id: string; name: string; category: string; price: number; icon: typeof Bot;
  description: string; features: string[]; tag?: string;
};

const products: Product[] = [
  { id: "sites", name: "مواقع BOLA الاحترافية", category: "مواقع وتطوير", price: 0, icon: Code2, tag: "حسب الطلب", description: "موقع سريع ومتجاوب بهوية علامتك، مع صفحات واضحة وتجربة استخدام مدروسة.", features: ["تصميم متجاوب للموبايل والكمبيوتر", "صفحات مخصصة حسب نشاطك", "تهيئة أساسية لمحركات البحث", "تسليم بعد المراجعة والاختبار"] },
  { id: "crm", name: "BOLA CRM", category: "أنظمة الأعمال", price: 0, icon: Users, description: "نظام موحد لتنظيم العملاء والفرص ومتابعة فريق المبيعات.", features: ["ملفات العملاء وسجل التفاعلات", "مراحل متابعة قابلة للتخصيص", "مهام وتذكيرات", "تقارير أداء واضحة"] },
  { id: "finance", name: "BOLA Finance", category: "أنظمة الأعمال", price: 0, icon: BarChart3, description: "لوحة مالية لمتابعة الإيرادات والمصروفات والتدفقات النقدية.", features: ["تصنيف الإيرادات والمصروفات", "ملخصات مالية دورية", "تصدير التقارير", "صلاحيات حسب دور المستخدم"] },
  { id: "automation", name: "BOLA Automation", category: "ذكاء اصطناعي", price: 0, icon: Workflow, tag: "قريبًا", description: "أتمتة إجراءات العمل المتكررة وربط الخدمات في مسارات واضحة.", features: ["تصميم مسارات عمل", "تشغيل حسب أحداث محددة", "سجل تنفيذ وأخطاء", "مراجعة بشرية للخطوات الحساسة"] },
  { id: "assistant", name: "BOLA AI Assistant", category: "ذكاء اصطناعي", price: 0, icon: Bot, description: "مساعد ذكي يساعد فريقك في البحث والتلخيص وتنظيم المعرفة.", features: ["واجهة محادثة سهلة", "مساعدة في تلخيص المحتوى", "إجابات مرتبطة بمصادر العمل", "تحكم في الصلاحيات والبيانات"] },
  { id: "templates", name: "قوالب وأدوات رقمية", category: "منتجات رقمية", price: 0, icon: BriefcaseBusiness, description: "قوالب عملية قابلة للتخصيص لتبدأ مشروعك بخطوات منظمة.", features: ["قوالب قابلة للتحرير", "تعليمات استخدام واضحة", "ملفات منظمة", "تحديثات عند توفرها"] },
];

const categories = ["الكل", "مواقع وتطوير", "أنظمة الأعمال", "ذكاء اصطناعي", "منتجات رقمية"];

export default function Home() {
  const [category, setCategory] = useState("الكل");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [cart, setCart] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [english, setEnglish] = useState(false);
  const [notice, setNotice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const visible = useMemo(() => products.filter(p =>
    (category === "الكل" || p.category === category) &&
    (p.name + " " + p.description + " " + p.category).toLowerCase().includes(query.toLowerCase())
  ), [category, query]);

  const add = (id: string) => {
    setCart(items => items.includes(id) ? items : [...items, id]);
    setNotice("تمت إضافة المنتج إلى قائمة اهتمامك");
    window.setTimeout(() => setNotice(""), 2400);
  };
  const cartProducts = products.filter(p => cart.includes(p.id));
  const isEn = english;

  const submitInquiry = async () => {
    if (submitting || cartProducts.length === 0) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, email: customerEmail, phone: customerPhone, company: customerCompany, message: customerMessage, items: cartProducts.map(p => ({ id: p.id, name: p.name })), website: "" }),
      });
      const data: { ok?: boolean; reference?: string; error?: string } = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "تعذر إرسال الطلب");
      setNotice((isEn ? "Inquiry received: " : "تم استلام طلبك. رقم المتابعة: ") + data.reference);
      setCart([]); setCustomerName(""); setCustomerEmail(""); setCustomerPhone(""); setCustomerCompany(""); setCustomerMessage(""); setCartOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "حدث خطأ أثناء إرسال الطلب");
    } finally {
      setSubmitting(false);
      window.setTimeout(() => setNotice(""), 6000);
    }
  };

  return (
    <main className={isEn ? "site en" : "site"} dir={isEn ? "ltr" : "rtl"}>
      <header className="topbar">
        <a className="brand" href="#home" aria-label="BOLA TECH home"><span className="brand-mark">B</span><span><b>BOLA TECH</b><small>INNOVATE · AUTOMATE · GROW</small></span></a>
        <nav className={menuOpen ? "nav open" : "nav"}>
          <a href="#home" onClick={() => setMenuOpen(false)}>{isEn ? "Home" : "الرئيسية"}</a>
          <a href="#services" onClick={() => setMenuOpen(false)}>{isEn ? "Solutions" : "الحلول"}</a>
          <Link href="/digital-products" onClick={() => setMenuOpen(false)}>{isEn ? "Digital products" : "الأنظمة والتطبيقات"}</Link><Link href="/shop" onClick={() => setMenuOpen(false)}>{isEn ? "Shop" : "المتجر"}</Link>
          <a href="#about" onClick={() => setMenuOpen(false)}>{isEn ? "About" : "من نحن"}</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>{isEn ? "Contact" : "تواصل معنا"}</a><Link href="/track" onClick={() => setMenuOpen(false)}>{isEn ? "Track request" : "تابع طلبك"}</Link>
        </nav>
        <div className="top-actions">
          <button className="language" onClick={() => setEnglish(v => !v)}><Globe2 size={16}/>{isEn ? "العربية" : "English"}</button>
          <button className="icon-btn" aria-label="Open product list" onClick={() => setCartOpen(true)}><ShoppingBag size={19}/>{cart.length > 0 && <i>{cart.length}</i>}</button>
          <a className="admin-link" href="#contact"><LayoutDashboard size={16}/>{isEn ? "Get started" : "ابدأ مشروعك"}</a>
          <button className="mobile-menu" aria-label="Toggle menu" onClick={() => setMenuOpen(v => !v)}>{menuOpen ? <X/> : <Menu/>}</button>
        </div>
      </header>

      <section className="hero" id="home">
        <div className="hero-glow glow-one"/><div className="hero-glow glow-two"/>
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse"/> {isEn ? "DIGITAL PRODUCTS · SMART SYSTEMS · WEB" : "منتجات رقمية • أنظمة ذكية • مواقع احترافية"}</div>
          <h1>{isEn ? <>Build smarter.<br/><em>Grow faster.</em></> : <>نبني حلولك الرقمية<br/><em>لتنطلق بثقة.</em></>}</h1>
          <p>{isEn ? "Practical technology for businesses and ambitious ideas — designed to work, built to scale." : "تقنية عملية للشركات والأفكار الطموحة؛ حلول مصممة لتعمل بكفاءة، وقابلة للتطور مع نموك."}</p>
          <div className="hero-buttons"><a className="primary-btn" href="#products">{isEn ? "Explore solutions" : "استكشف الحلول"} <ArrowLeft size={18}/></a><a className="secondary-btn" href="#about">{isEn ? "Discover BOLA TECH" : "اكتشف BOLA TECH"} <ArrowUpRight size={17}/></a></div>
          <div className="hero-proof"><span><Check size={15}/> {isEn ? "Clear scope" : "نطاق عمل واضح"}</span><span><Check size={15}/> {isEn ? "Tested delivery" : "تسليم بعد الاختبار"}</span><span><Check size={15}/> {isEn ? "Human support" : "دعم بشري"}</span></div>
        </div>
        <div className="hero-art" aria-label="BOLA TECH digital planet and orbital network">
          <div className="planet-halo"/><img className="planet-visual" src="/visuals/planet-core.svg" alt="BOLA TECH luminous digital planet with orbital rings"/>
          <div className="float-card card-ai"><Bot size={22}/><span>AI SYSTEMS</span><b>01</b></div>
          <div className="float-card card-web"><MonitorSmartphone size={22}/><span>WEB PLATFORMS</span><b>02</b></div>
          <div className="float-card card-flow"><Workflow size={22}/><span>CONNECTED DATA</span><b>03</b></div>
          <div className="art-grid"/>
        </div>
        <div className="hero-bottom"><span><ShieldCheck/> {isEn ? "Security-minded design" : "تصميم يراعي الأمان"}</span><span><Zap/> {isEn ? "Efficient workflows" : "مسارات عمل فعّالة"}</span><span><Sparkles/> {isEn ? "Built around your needs" : "حلول حسب احتياجك"}</span></div>
      </section>

      <section className="section services" id="services">
        <div className="section-heading"><div><span className="section-kicker">WHAT WE BUILD</span><h2>{isEn ? "Technology with a purpose" : "تكنولوجيا لها هدف"}</h2><p>{isEn ? "Useful tools and systems that solve real business problems." : "أدوات وأنظمة عملية تعالج احتياجات حقيقية، بدلًا من مزايا شكلية لا تستخدمها."}</p></div><a href="#products" className="text-link">{isEn ? "View all solutions" : "شاهد كل الحلول"} <ArrowLeft size={16}/></a></div>
        <div className="service-grid">
          <article className="service-card"><span className="service-icon"><Code2/></span><h3>{isEn ? "Websites & platforms" : "المواقع والمنصات"}</h3><p>{isEn ? "Fast, responsive digital experiences built for your brand." : "مواقع ومنصات متجاوبة وسريعة بهوية تناسب نشاطك."}</p><a href="#products">{isEn ? "Explore" : "اكتشف"} <ArrowUpLeft size={15}/></a></article>
          <article className="service-card"><span className="service-icon"><BriefcaseBusiness/></span><h3>{isEn ? "Business systems" : "أنظمة إدارة الأعمال"}</h3><p>{isEn ? "Organize customers, projects, finance and daily operations." : "نظّم العملاء والمشروعات والماليات والعمليات اليومية."}</p><a href="#products">{isEn ? "Explore" : "اكتشف"} <ArrowUpLeft size={15}/></a></article>
          <article className="service-card"><span className="service-icon"><Bot/></span><h3>{isEn ? "AI & automation" : "الذكاء الاصطناعي والأتمتة"}</h3><p>{isEn ? "Reduce repetitive work with controlled, useful automation." : "قلّل الأعمال المتكررة بأتمتة مفيدة وتحت سيطرتك."}</p><a href="#products">{isEn ? "Explore" : "اكتشف"} <ArrowUpLeft size={15}/></a></article>
        </div>
      </section>

      <section className="section products-section" id="products">
        <div className="section-heading"><div><span className="section-kicker">THE BOLA CATALOG</span><h2>{isEn ? "Explore our solutions" : "اكتشف منتجاتنا وحلولنا"}</h2><p>{isEn ? "Browse the catalog, compare options and add items to your inquiry list." : "تصفّح الكتالوج، وابحث عن الحل المناسب، وأضفه لقائمة اهتمامك."}</p></div><div className="catalog-count">{visible.length} {isEn ? "solutions" : "حلول"}</div></div>
        <div className="catalog-tools"><div className="search-box"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder={isEn ? "Search solutions..." : "ابحث عن منتج أو خدمة..."}/>{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={16}/></button>}</div><div className="filters">{categories.map(c => <button key={c} className={category === c ? "filter active" : "filter"} onClick={() => setCategory(c)}>{isEn && c === "الكل" ? "All" : c}</button>)}</div></div>
        <div className="product-grid">{visible.map(p => { const Icon = p.icon; return <article className="product-card" key={p.id}><div className="product-top"><span className="product-icon"><Icon size={25}/></span>{p.tag && <span className={p.tag === "قريبًا" ? "product-tag soon" : "product-tag"}>{p.tag}</span>}</div><h3>{p.name}</h3><p>{p.description}</p><div className="product-meta"><span>{p.category}</span><b>{p.price === 0 ? (isEn ? "Request a quote" : "اطلب عرض سعر") : p.price}</b></div><div className="product-actions"><button className="details-btn" onClick={() => setSelected(p)}>{isEn ? "Details" : "التفاصيل"} <ArrowUpLeft size={15}/></button><button className="add-btn" onClick={() => add(p.id)} disabled={p.tag === "قريبًا"}>{cart.includes(p.id) ? <><Check size={16}/>{isEn ? "Added" : "تمت الإضافة"}</> : <><Plus size={16}/>{isEn ? "Add to list" : "أضف للقائمة"}</>}</button></div></article>; })}</div>
        {visible.length === 0 && <div className="empty-state"><CircleHelp size={28}/><b>{isEn ? "No matching solutions" : "لا توجد نتائج مطابقة"}</b><span>{isEn ? "Try another search or category." : "جرّب كلمة بحث أو تصنيفًا آخر."}</span></div>}
      </section>

      <section className="about-band" id="about"><div className="about-mark">B</div><div><span className="section-kicker">WHY BOLA TECH</span><h2>{isEn ? "Not just features. Real outcomes." : "مش مجرد مميزات… نتائج حقيقية."}</h2><p>{isEn ? "We focus on clear requirements, useful functionality, security and testing before delivery." : "نبدأ بفهم احتياجك، ونبني وظائف مفيدة، ونهتم بالأمان والاختبار قبل التسليم. لا نعتبر الشكل وحده دليلًا على نجاح المنتج."}</p></div><div className="about-points"><span><Check/> {isEn ? "Defined deliverables" : "متطلبات وتسليمات واضحة"}</span><span><Check/> {isEn ? "Responsive interfaces" : "واجهات متجاوبة"}</span><span><Check/> {isEn ? "Testing before release" : "اختبار قبل الإطلاق"}</span></div></section>

      <section className="section contact-section" id="contact"><div className="contact-copy"><span className="section-kicker">LET’S BUILD</span><h2>{isEn ? "Have an idea? Let's shape it." : "عندك فكرة؟ خلّينا نحوّلها لحل عملي."}</h2><p>{isEn ? "Tell us what you need. Prepare a short project brief and our team can follow up." : "جهّز وصفًا مختصرًا لفكرتك أو احتياجك، وحدد نوع الحل المطلوب."}</p></div><div className="contact-panel"><div className="contact-panel-icon"><MessageCircle/></div><div><b>{isEn ? "Start a project inquiry" : "ابدأ طلب مشروع جديد"}</b><span>{isEn ? "Choose a solution and prepare your inquiry list." : "اختار الحلول المناسبة من الكتالوج، ثم راجع قائمة اهتمامك."}</span></div><button onClick={() => setCartOpen(true)}>{isEn ? "Open inquiry list" : "افتح قائمة الاهتمام"} <ArrowLeft size={16}/></button></div></section>

      <footer className="footer"><a className="brand" href="#home"><span className="brand-mark">B</span><span><b>BOLA TECH</b><small>INNOVATE · AUTOMATE · GROW</small></span></a><span>© {new Date().getFullYear()} BOLA TECH. {isEn ? "All rights reserved." : "جميع الحقوق محفوظة."}</span><a href="#home">{isEn ? "Back to top" : "العودة للأعلى"} ↑</a></footer>

      {notice && <div className="toast"><Check size={17}/>{notice}</div>}
      {selected && <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}><div className="modal"><button className="close-btn" onClick={() => setSelected(null)} aria-label="Close"><X/></button><span className="section-kicker">SOLUTION DETAILS</span><div className="modal-title"><span className="product-icon"><selected.icon size={27}/></span><h2>{selected.name}</h2></div><p>{selected.description}</p><h4>{isEn ? "What's included" : "ماذا يتضمن الحل؟"}</h4><ul>{selected.features.map(f => <li key={f}><Check size={16}/>{f}</li>)}</ul><button className="primary-btn full" onClick={() => { add(selected.id); setSelected(null); }}>{isEn ? "Add to inquiry list" : "أضف لقائمة الاهتمام"} <ArrowLeft size={17}/></button></div></div>}
      {cartOpen && <div className="overlay drawer-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setCartOpen(false); }}><aside className="drawer"><div className="drawer-head"><div><span className="section-kicker">YOUR SHORTLIST</span><h2>{isEn ? "Inquiry list" : "قائمة الاهتمام"}</h2></div><button className="close-btn" onClick={() => setCartOpen(false)} aria-label="Close"><X/></button></div>{cartProducts.length === 0 ? <div className="empty-state"><ShoppingBag size={30}/><b>{isEn ? "Your list is empty" : "قائمة الاهتمام فارغة"}</b><span>{isEn ? "Add solutions from the catalog." : "أضف الحلول التي تريد الاستفسار عنها من الكتالوج."}</span></div> : <><div className="drawer-items">{cartProducts.map(p => <div className="drawer-item" key={p.id}><div><b>{p.name}</b><span>{p.category}</span></div><button onClick={() => setCart(items => items.filter(id => id !== p.id))} aria-label={"Remove " + p.name}><X size={17}/></button></div>)}</div><div className="drawer-foot"><p>{isEn ? "Send your selected solutions and contact details. Our team will review the request." : "ابعت المنتجات المختارة وبيانات التواصل. هنراجع الطلب ونتواصل معاك."}</p><div className="inquiry-form"><input aria-label="Customer name" required minLength={2} maxLength={100} placeholder={isEn ? "Your name *" : "اسمك *"} value={customerName} onChange={e => setCustomerName(e.target.value)}/><input aria-label="Email" type="email" required placeholder={isEn ? "Email address *" : "البريد الإلكتروني *"} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}/><input aria-label="Phone" type="tel" placeholder={isEn ? "Phone (optional)" : "رقم الهاتف (اختياري)"} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}/><input aria-label="Company" placeholder={isEn ? "Company (optional)" : "الشركة (اختياري)"} value={customerCompany} onChange={e => setCustomerCompany(e.target.value)}/><textarea aria-label="Project details" required minLength={5} maxLength={4000} placeholder={isEn ? "Tell us what you need *" : "اكتب تفاصيل احتياجك *"} value={customerMessage} onChange={e => setCustomerMessage(e.target.value)}/><button className="primary-btn full" disabled={submitting || !customerName.trim() || !customerEmail.trim() || customerMessage.trim().length < 5} onClick={() => void submitInquiry()}>{submitting ? (isEn ? "Sending..." : "جاري الإرسال...") : (isEn ? "Send inquiry" : "إرسال الطلب")} <ArrowLeft size={17}/></button></div></div></>}</aside></div>}
    </main>
  );
}