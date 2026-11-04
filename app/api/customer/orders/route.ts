import {NextResponse} from "next/server";
import {prisma} from "@/lib/prisma";
import {getCustomerSession} from "@/lib/customer-auth";
export const runtime="nodejs";
export async function GET(){
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"يجب تسجيل الدخول."},{status:401});
 const orders=await prisma.order.findMany({where:{customerId:session.id},orderBy:{createdAt:"desc"},select:{id:true,reference:true,status:true,subtotal:true,discount:true,total:true,currency:true,paymentStatus:true,shippingCarrier:true,trackingNumber:true,trackingUrl:true,createdAt:true,items:{select:{title:true,quantity:true,lineTotal:true}}},take:100});
 return NextResponse.json({orders});
}
