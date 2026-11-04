import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {hash,compare} from "bcryptjs";
import {prisma} from "@/lib/prisma";
import {createCustomerSession,clearCustomerSession,getCustomerSession} from "@/lib/customer-auth";
export const runtime="nodejs";
function sameOrigin(req:NextRequest){const o=req.headers.get("origin");return !o||o===req.nextUrl.origin;}
const schema=z.object({action:z.enum(["register","login","logout"]),name:z.string().trim().min(2).max(100).optional(),email:z.string().trim().email().max(254),password:z.string().min(10).max(128),phone:z.string().trim().min(7).max(30).optional()});
export async function GET(){const session=await getCustomerSession();if(!session)return NextResponse.json({customer:null});const customer=await prisma.customer.findUnique({where:{id:session.id},select:{id:true,name:true,email:true,phone:true,createdAt:true}});if(!customer)return NextResponse.json({customer:null});return NextResponse.json({customer});}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:"طلب غير مسموح."},{status:403});
 const raw=await req.json().catch(()=>null);
 if(raw&&typeof raw==="object"&&(raw as {action?:string}).action==="logout"){await clearCustomerSession();return NextResponse.json({ok:true});}
 const p=schema.safeParse(raw);if(!p.success)return NextResponse.json({error:"راجع البريد وكلمة المرور. كلمة المرور يجب ألا تقل عن 10 أحرف."},{status:400});
 const email=p.data.email.toLowerCase();
 try{
  if(p.data.action==="register"){
   if(!p.data.name)return NextResponse.json({error:"الاسم مطلوب لإنشاء الحساب."},{status:400});
   const passwordHash=await hash(p.data.password,12);
   const customer=await prisma.customer.create({data:{name:p.data.name,email,passwordHash,phone:p.data.phone||null},select:{id:true,name:true,email:true,phone:true}});
   await createCustomerSession(customer.id);
   return NextResponse.json({customer},{status:201});
  }
  const customer=await prisma.customer.findUnique({where:{email},select:{id:true,name:true,email:true,phone:true,passwordHash:true,isActive:true}});
  if(!customer||!customer.passwordHash||!customer.isActive||!(await compare(p.data.password,customer.passwordHash)))return NextResponse.json({error:"بيانات الدخول غير صحيحة."},{status:401});
  await createCustomerSession(customer.id);
  return NextResponse.json({customer:{id:customer.id,name:customer.name,email:customer.email,phone:customer.phone}});
 }catch(error){
  if(error&&typeof error==="object"&&"code" in error&&error.code==="P2002")return NextResponse.json({error:"يوجد حساب مسجل بهذا البريد بالفعل."},{status:409});
  console.error("Customer authentication failed",error);return NextResponse.json({error:"تعذر إتمام العملية."},{status:500});
 }
}
