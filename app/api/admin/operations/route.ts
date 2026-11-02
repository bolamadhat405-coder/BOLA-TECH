import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
async function adminId(){const session=await getAdminSession();if(!session)return null;const user=await prisma.adminUser.findFirst({where:{id:session.id,isActive:true},select:{id:true}});return user?.id??null;}
function originAllowed(req:NextRequest){const origin=req.headers.get("origin");return !origin||origin===req.nextUrl.origin;}

export async function GET(){
 const actor=await adminId();if(!actor)return NextResponse.json({error:"غير مصرح"},{status:401});
 const [employees,tickets,expenses,invoices,customers]=await Promise.all([
  prisma.employee.findMany({orderBy:{createdAt:"desc"},take:200}),
  prisma.supportTicket.findMany({orderBy:{updatedAt:"desc"},include:{customer:{select:{name:true,email:true,phone:true}}},take:200}),
  prisma.expense.findMany({orderBy:{incurredAt:"desc"},take:200}),
  prisma.invoice.findMany({orderBy:{createdAt:"desc"},include:{customer:{select:{name:true,email:true}}},take:200}),
  prisma.customer.findMany({where:{isActive:true},select:{id:true,name:true,email:true},orderBy:{name:"asc"},take:500})
 ]);
 const [expenseTotals,paidTotals,openTickets]=await Promise.all([
  prisma.expense.groupBy({by:["currency"],_sum:{amount:true}}),
  prisma.invoice.groupBy({by:["currency"],where:{status:{in:["PAID","PARTIALLY_PAID"]}},_sum:{paid:true,total:true}}),
  prisma.supportTicket.count({where:{status:{in:["OPEN","IN_PROGRESS","WAITING"]}}})
 ]);
 return NextResponse.json({employees,tickets,expenses,invoices,customers,summary:{expenseTotals,paidTotals,openTickets}});
}

const employeeSchema=z.object({type:z.literal("employee"),employeeNo:z.string().trim().min(2).max(40),name:z.string().trim().min(2).max(120),email:z.string().email().optional().or(z.literal("")),phone:z.string().max(40).optional(),jobTitle:z.string().trim().min(2).max(100),department:z.string().trim().min(2).max(100),hiredAt:z.string().datetime().optional()});
const expenseSchema=z.object({type:z.literal("expense"),title:z.string().trim().min(2).max(160),category:z.string().trim().min(2).max(80),amount:z.number().int().positive().max(100000000000),currency:z.string().length(3).default("EGP"),vendor:z.string().max(160).optional(),reference:z.string().max(100).optional(),notes:z.string().max(3000).optional(),incurredAt:z.string().datetime().optional()});
const ticketSchema=z.object({type:z.literal("ticket"),customerId:z.string().min(1),subject:z.string().trim().min(3).max(180),description:z.string().trim().min(5).max(5000),priority:z.enum(["LOW","NORMAL","HIGH","URGENT"]).default("NORMAL")});
const invoiceSchema=z.object({type:z.literal("invoice"),number:z.string().trim().min(3).max(60),customerId:z.string().min(1),subtotal:z.number().int().positive().max(100000000000),tax:z.number().int().nonnegative().max(100000000000).default(0),currency:z.string().length(3).default("EGP"),dueAt:z.string().datetime().optional()});
export async function POST(req:NextRequest){
 if(!originAllowed(req))return NextResponse.json({error:"Cross-origin request rejected."},{status:403});
 const actor=await adminId();if(!actor)return NextResponse.json({error:"غير مصرح"},{status:401});
 const raw=await req.json().catch(()=>null);const type=raw&&typeof raw==="object"?(raw as {type?:string}).type:"";
 const schema=type==="employee"?employeeSchema:type==="expense"?expenseSchema:type==="ticket"?ticketSchema:type==="invoice"?invoiceSchema:null;
 if(!schema)return NextResponse.json({error:"نوع السجل غير صحيح."},{status:400});
 const parsed=schema.safeParse(raw);if(!parsed.success)return NextResponse.json({error:"راجع البيانات المدخلة.",fields:parsed.error.flatten().fieldErrors},{status:400});
 try{
  const result=await prisma.$transaction(async tx=>{
   if(parsed.data.type==="employee"){const {type:_,...d}=parsed.data;return tx.employee.create({data:{...d,email:d.email||null,hiredAt:d.hiredAt?new Date(d.hiredAt):undefined}});}
   if(parsed.data.type==="expense"){const {type:_,...d}=parsed.data;return tx.expense.create({data:{...d,incurredAt:d.incurredAt?new Date(d.incurredAt):undefined}});}
   if(parsed.data.type==="ticket"){const {type:_,...d}=parsed.data;const customer=await tx.customer.findUnique({where:{id:d.customerId},select:{id:true}});if(!customer)throw new Error("CUSTOMER_MISSING");return tx.supportTicket.create({data:{...d,reference:"TK-"+Date.now().toString(36).toUpperCase()}});}
   const {type:_,...d}=parsed.data;const customer=await tx.customer.findUnique({where:{id:d.customerId},select:{id:true}});if(!customer)throw new Error("CUSTOMER_MISSING");const total=d.subtotal+d.tax;if(!Number.isSafeInteger(total))throw new Error("TOTAL_TOO_LARGE");return tx.invoice.create({data:{...d,total,dueAt:d.dueAt?new Date(d.dueAt):undefined}});
  });
  await prisma.auditLog.create({data:{actorType:"ADMIN",actorId:actor,action:"COMPANY_RECORD_CREATED",entityType:parsed.data.type,entityId:"id" in result?result.id:null}});
  return NextResponse.json({record:result},{status:201});
 }catch(error){
  if(error instanceof Error&&error.message==="CUSTOMER_MISSING")return NextResponse.json({error:"العميل غير موجود."},{status:404});
  if(error instanceof Error&&error.message==="TOTAL_TOO_LARGE")return NextResponse.json({error:"قيمة الفاتورة أكبر من الحد المسموح."},{status:400});
  if(error&&typeof error==="object"&&"code" in error&&error.code==="P2002")return NextResponse.json({error:"رقم الموظف أو الفاتورة مستخدم بالفعل."},{status:409});
  console.error("Company operation create failed",error);return NextResponse.json({error:"تعذر إنشاء السجل."},{status:500});
 }
}
const patchSchema=z.object({id:z.string().min(1),status:z.enum(["OPEN","IN_PROGRESS","WAITING","RESOLVED","CLOSED"]).optional(),priority:z.enum(["LOW","NORMAL","HIGH","URGENT"]).optional(),assignedTo:z.string().max(120).optional()}).refine(v=>v.status!==undefined||v.priority!==undefined||v.assignedTo!==undefined);
export async function PATCH(req:NextRequest){
 if(!originAllowed(req))return NextResponse.json({error:"Cross-origin request rejected."},{status:403});
 const actor=await adminId();if(!actor)return NextResponse.json({error:"غير مصرح"},{status:401});
 const parsed=patchSchema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"التعديل غير صالح."},{status:400});
 const {id,...data}=parsed.data;
 try{const ticket=await prisma.supportTicket.update({where:{id},data});await prisma.auditLog.create({data:{actorType:"ADMIN",actorId:actor,action:"SUPPORT_TICKET_UPDATED",entityType:"SupportTicket",entityId:id,metadata:data}});return NextResponse.json({ticket});}
 catch(error){if(error&&typeof error==="object"&&"code" in error&&error.code==="P2025")return NextResponse.json({error:"التذكرة غير موجودة."},{status:404});throw error;}
}
