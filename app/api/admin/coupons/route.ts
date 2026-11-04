import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
async function authorize(){const session=await getAdminSession();if(!session)return null;return prisma.adminUser.findFirst({where:{id:session.id,isActive:true},select:{id:true,role:true}});}
function sameOrigin(req:NextRequest){const origin=req.headers.get("origin");return !origin||origin===req.nextUrl.origin;}

export async function GET(){
 const admin=await authorize();if(!admin)return NextResponse.json({error:"غير مصرح"},{status:401});
 const coupons=await prisma.coupon.findMany({orderBy:{createdAt:"desc"},include:{_count:{select:{redemptions:true}}},take:300});
 return NextResponse.json({coupons});
}
const createSchema=z.object({
 code:z.string().trim().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/),
 type:z.enum(["PERCENT","FIXED"]),
 value:z.number().int().positive().max(100000000000),
 currency:z.string().trim().length(3).transform(v=>v.toUpperCase()).default("EGP"),
 minSubtotal:z.number().int().nonnegative().default(0),
 maxDiscount:z.number().int().positive().optional(),
 usageLimit:z.number().int().positive().optional(),
 perCustomerLimit:z.number().int().positive().max(100).default(1),
 startsAt:z.string().datetime().optional(),
 expiresAt:z.string().datetime().optional()
}).superRefine((v,ctx)=>{
 if(v.type==="PERCENT"&&v.value>100)ctx.addIssue({code:"custom",path:["value"],message:"النسبة يجب ألا تتجاوز 100."});
 if(v.expiresAt&&v.startsAt&&new Date(v.expiresAt)<=new Date(v.startsAt))ctx.addIssue({code:"custom",path:["expiresAt"],message:"تاريخ الانتهاء يجب أن يأتي بعد البداية."});
});
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:"طلب غير مسموح."},{status:403});
 const admin=await authorize();if(!admin)return NextResponse.json({error:"غير مصرح"},{status:401});
 const parsed=createSchema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"بيانات الكوبون غير صحيحة.",fields:parsed.error.flatten().fieldErrors},{status:400});
 const d=parsed.data;
 try{
  const coupon=await prisma.coupon.create({data:{code:d.code.toUpperCase(),type:d.type,value:d.value,currency:d.currency,minSubtotal:d.minSubtotal,maxDiscount:d.maxDiscount??null,usageLimit:d.usageLimit??null,perCustomerLimit:d.perCustomerLimit,startsAt:d.startsAt?new Date(d.startsAt):null,expiresAt:d.expiresAt?new Date(d.expiresAt):null}});
  await prisma.auditLog.create({data:{actorType:"ADMIN",actorId:admin.id,action:"COUPON_CREATED",entityType:"Coupon",entityId:coupon.id,metadata:{code:coupon.code,type:coupon.type,value:coupon.value}}});
  return NextResponse.json({coupon},{status:201});
 }catch(error){if(error&&typeof error==="object"&&"code" in error&&error.code==="P2002")return NextResponse.json({error:"كود الخصم مستخدم بالفعل."},{status:409});console.error(error);return NextResponse.json({error:"تعذر إنشاء الكوبون."},{status:500});}
}
const patchSchema=z.object({id:z.string().min(1),isActive:z.boolean()});
export async function PATCH(req:NextRequest){
 if(!sameOrigin(req))return NextResponse.json({error:"طلب غير مسموح."},{status:403});
 const admin=await authorize();if(!admin)return NextResponse.json({error:"غير مصرح"},{status:401});
 const parsed=patchSchema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"التعديل غير صالح."},{status:400});
 const coupon=await prisma.coupon.update({where:{id:parsed.data.id},data:{isActive:parsed.data.isActive}});
 await prisma.auditLog.create({data:{actorType:"ADMIN",actorId:admin.id,action:"COUPON_STATUS_CHANGED",entityType:"Coupon",entityId:coupon.id,metadata:{isActive:coupon.isActive}}});
 return NextResponse.json({coupon});
}
