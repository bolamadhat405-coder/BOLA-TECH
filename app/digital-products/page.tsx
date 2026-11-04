"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpLeft, Bot, Building2, ChartNoAxesCombined, Code2, GraduationCap, Hospital, Layers3, Search, ShoppingCart, Smartphone, Store, Workflow } from "lucide-react";

const offers = [
  { id:"crm", name:"BOLA CRM", type:"أنظمة إدارية", icon:Building2, status:"نواة تشغيل موجودة", desc:"إدارة العملاء والفرص والمبيعات وسجل التواصل والمهام في مكان واحد.", features:["ملفات العملاء وسجل التعاملات","مراحل فرص البيع والمتابعة","مهام ومسؤوليات الفريق","تقارير العملاء والمبيعات"], fit:"شركات الخدمات وفرق المبيعات" },
  { id:"inventory-pos", name:"BOLA POS & Inventory", type:"أنظمة تجارية", icon:Store, status:"قيد البناء", desc:"نظام نقاط بيع ومخزون لإدارة المنتجات والفروع وحركة البيع والشراء.", features:["كتالوج وأكواد SKU","حركات المخزون والمستودعات","الموردون وأوامر الشراء","تقارير المبيعات والمخزون"], fit:"المتاجر ومحلات التجزئة" },
  { id:"ecommerce", name:"BOLA Commerce", type:"متاجر إلكترونية", icon:ShoppingCart, status:"متجر أساسي موجود", desc:"متجر إلكتروني قابل للتخصيص مع كتالوج وطلبات وكوبونات ولوحة إدارة.", features:["صفحات منتجات وتصنيفات","سلة وطلبات ومتابعة","كوبونات وعروض","إدارة الطلبات والمخزون"], fit:"العلامات التجارية والتجار" },
  { id:"school", name:"BOLA LMS", type:"منصات تعليمية", icon:GraduationCap, status:"قيد البناء", desc:"منصة تعليمية لإدارة الدورات والدروس والاختبارات ومتابعة تقدم المتعلمين.", features:["دورات ووحدات ودروس","اختبارات ودرجات","حسابات طلاب ومدرسين","متابعة التقدم"], fit:"مراكز التدريب والمدرسون" },
  { id:"clinic", name:"BOLA Clinic", type:"أنظمة متخصصة", icon:Hospital, status:"تصميم نطاق المنتج", desc:"تصور نظام لإدارة المواعيد والمرضى والفواتير وسير العمل الإداري للعيادات.", features:["ملفات ومواعيد","جدول الأطباء","الفواتير والمدفوعات","تقارير تشغيلية"], fit:"العيادات والمراكز الطبية" },
  { id:"websites", name:"BOLA Web Studio", type:"مواقع وتطبيقات", icon:Code2, status:"تنفيذ حسب الطلب", desc:"تصميم وتطوير مواقع تعريفية ولوحات تحكم وتطبيقات ويب متجاوبة.", features:["تصميم عربي وإنجليزي","توافق الهاتف والكمبيوتر","لوحة إدارة حسب الحاجة","اختبار وتسليم موثق"], fit:"الشركات والمشروعات الناشئة" },
  { id:"finance", name:"BOLA Finance", type:"أنظمة إدارية", icon:ChartNoAxesCombined, status:"أجزاء مالية موجودة", desc:"إدارة المصروفات والفواتير ومتابعة الإيرادات والتقارير المالية التشغيلية.", features:["تسجيل المصروفات","الفواتير وحالات السداد","ملخصات وتقارير","صلاحيات حسب الدور"], fit:"الشركات الصغيرة والمتوسطة" },
  { id:"mobile", name:"BOLA Mobile Apps", type:"مواقع وتطبيقات", icon:Smartphone, status:"تنفيذ حسب الطلب", desc:"تطبيقات موبايل مرتبطة بخدماتك وواجهات API ولوحة تحكم إدارية.", features:["واجهات Android وiOS حسب النطاق","تسجيل وحسابات مستخدمين","ربط API","اختبار وتجهيز للنشر"], fit:"الخدمات والمتاجر والمنصات" },
  { id:"automation", name:"BOLA Automation", type:"ذكاء اصطناعي وأتمتة", icon:Workflow, status:"قيد التصميم", desc:"أتمتة إجراءات متكررة وربط النماذج والتنبيهات ومراحل العمل.", features:["مسارات موافقات","تشغيل مهام تلقائية","سجل تنفيذ وأخطاء","مراجعة بشرية للعمليات الحساسة"], fit:"الفرق التي تريد تقليل العمل اليدوي" },
  { id:"ai", name:"BOLA AI Assistant", type:"ذكاء اصطناعي وأتمتة", icon:Bot, status:"قيد التصميم", desc:"مساعد معرفة داخلي للبحث والتلخيص والإجابة من مستندات العمل المصرح بها.", features:["بحث في مصادر العمل","تلخيص المستندات","إجابات مرتبطة بالمصادر","تحكم في الوصول للبيانات"], fit:"الشركات وفرق الدعم" },
  { id:"projects", name:"BOLA Projects", type:"أنظمة إدارية", icon:Layers3, status:"نواة تشغيل موجودة", desc:"إدارة المشروعات والمهام والمواعيد والمسؤوليات ومؤشرات الإنجاز.", features:["مشروعات ومهام","مسؤوليات ومواعيد","حالات وتقدم العمل","ملخصات تشغيلية"], fit:"الوكالات وفرق التنفيذ" },
];

const types = ["الكل", ...Array.from(new Set(offers.map(x=>x.type)))];

export default function DigitalProductsPage() {
  const [query,setQuery] = useState("");
  const [type,setType] = useState("الكل");
  const visible = useMemo(()=>offers.filter(x=>(type==="الكل"||x.type===type)&&[x.name,x.desc,x.fit,x.type].join(" ").toLowerCase().includes(query.toLowerCase())),[query,type]);
  return <main className="digital-page" dir="rtl">
    <header className="digital-header"><Link href="/" className="digital-brand"><span>B</span><b>BOLA TECH</b></Link><nav><Link href="/">الرئيسية</Link><Link href="/shop">المتجر</Link><Link href="/admin">لوحة الإدارة</Link></nav></header>
    <section className="digital-hero"><span className="digital-kicker">BOLA TECH · DIGITAL PRODUCT FACTORY</span><h1>أنظمة ومواقع وتطبيقات<br/><em>تنمو مع مشروعك</em></h1><p>كتالوج حلول رقمية قابلة للتخصيص. نحدد نطاق كل مشروع بوضوح، ثم نبني ونختبر ونسلّم وفق اتفاق مكتوب.</p><a href="/#contact" className="digital-cta">اطلب تنفيذ حلّك <ArrowUpLeft size={17}/></a><div className="digital-orbit">B</div></section>
    <section className="digital-catalog"><div className="digital-title"><div><span className="digital-kicker">PRODUCT CATALOG</span><h2>منتجات BOLA TECH</h2><p>اختار نوع الحل واستعرض نطاقه وحالة تطويره الحالية.</p></div><div className="digital-count">{visible.length} حل</div></div>
      <div className="digital-filters"><div className="digital-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث عن نظام أو تطبيق…"/></div><div className="digital-types">{types.map(t=><button key={t} className={type===t?"active":""} onClick={()=>setType(t)}>{t}</button>)}</div></div>
      <div className="digital-grid">{visible.map(item=>{const Icon=item.icon;return <article className="digital-card" key={item.id}><div className="digital-card-top"><span className="digital-icon"><Icon size={23}/></span><small>{item.type}</small></div><h3>{item.name}</h3><p>{item.desc}</p><div className="digital-status">{item.status}</div><ul>{item.features.map(f=><li key={f}>{f}</li>)}</ul><div className="digital-fit">مناسب لـ: {item.fit}</div><Link href={`/#contact`} className="digital-link">اطلب تفاصيل وتنفيذ <ArrowUpLeft size={16}/></Link></article>})}</div>
      {visible.length===0&&<p className="digital-empty">لا توجد نتائج مطابقة. جرّب كلمة بحث أخرى.</p>}
    </section>
    <section className="digital-note"><h2>كل مشروع يبدأ بنطاق واضح</h2><p>السعر ومدة التنفيذ يتحددان بعد معرفة المتطلبات والتكاملات والاستضافة. لا نعرض منتجًا على أنه مكتمل قبل اجتياز الاختبارات وتسليمه فعليًا.</p><Link href="/#contact">تواصل مع BOLA TECH <ArrowUpLeft size={16}/></Link></section>
    <footer className="digital-footer">© BOLA TECH · حلول رقمية عملية</footer>
  </main>;
}
