import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
import {getCustomerSession} from "@/lib/customer-auth";
export const runtime="nodejs";
type Context={params:Promise<{quizId:string}>};
export async function GET(_req:NextRequest,{params}:Context){
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"سجّل الدخول أولًا."},{status:401});
 const {quizId}=await params;
 const quiz=await prisma.courseQuiz.findFirst({where:{id:quizId,isPublished:true,course:{isPublished:true,enrollments:{some:{customerId:session.id,status:"APPROVED"}}}},include:{questions:{orderBy:{sortOrder:"asc"},select:{id:true,prompt:true,type:true,points:true,options:{select:{id:true,label:true}}}}}});
 if(!quiz)return NextResponse.json({error:"الاختبار غير متاح أو لم يتم اعتماد التحاقك بالدورة."},{status:403});
 return NextResponse.json({quiz});
}
const schema=z.object({answers:z.array(z.object({questionId:z.string().min(1),optionId:z.string().min(1)})).min(1).max(50)});
export async function POST(req:NextRequest,{params}:Context){
 const origin=req.headers.get("origin");if(origin&&origin!==req.nextUrl.origin)return NextResponse.json({error:"Cross-origin request rejected."},{status:403});
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"سجّل الدخول أولًا."},{status:401});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"الإجابات غير مكتملة."},{status:400});
 const {quizId}=await params;
 try{
  const result=await prisma.$transaction(async tx=>{
   const quiz=await tx.courseQuiz.findFirst({where:{id:quizId,isPublished:true,course:{isPublished:true,enrollments:{some:{customerId:session.id,status:"APPROVED"}}}},include:{questions:{include:{options:true}}}});
   if(!quiz)throw new Error("QUIZ_NOT_AVAILABLE");
   if(quiz.questions.some(q=>q.type==="ESSAY"))throw new Error("ESSAY_REQUIRES_MANUAL_REVIEW");
   const enrollment=await tx.courseEnrollment.findUnique({where:{courseId_customerId:{courseId:quiz.courseId,customerId:session.id}}});
   if(!enrollment||enrollment.status!=="APPROVED")throw new Error("ENROLLMENT_REQUIRED");
   const submitted=new Map(parsed.data.answers.map(a=>[a.questionId,a.optionId]));
   if(submitted.size!==parsed.data.answers.length||parsed.data.answers.some(a=>!quiz.questions.some(q=>q.id===a.questionId&&q.options.some(o=>o.id===a.optionId))))throw new Error("INVALID_ANSWER");
   let score=0;const maxScore=quiz.questions.reduce((n,q)=>n+q.points,0);
   const answerRows=quiz.questions.map(q=>{const optionId=submitted.get(q.id);const option=q.options.find(o=>o.id===optionId);const correct=!!option?.isCorrect;if(correct)score+=q.points;return {questionId:q.id,optionId:optionId!,isCorrect:correct,pointsAwarded:correct?q.points:0};});
   const percent=maxScore?Math.round(score/maxScore*100):0;
   const attempt=await tx.courseQuizAttempt.create({data:{quizId,enrollmentId:enrollment.id,score,maxScore,percent,passed:percent>=quiz.passPercent,answers:{create:answerRows}},select:{id:true,score:true,maxScore:true,percent:true,passed:true,submittedAt:true}});
   return attempt;
  },{isolationLevel:"Serializable"});
  return NextResponse.json({attempt:result});
 }catch(e){const message=e instanceof Error?e.message:"";if(message==="QUIZ_NOT_AVAILABLE"||message==="ENROLLMENT_REQUIRED")return NextResponse.json({error:"الاختبار غير متاح أو لم يتم اعتماد التحاقك."},{status:403});if(message==="ESSAY_REQUIRES_MANUAL_REVIEW")return NextResponse.json({error:"هذا الاختبار يحتوي على أسئلة مقالية وسيتم تفعيلها بعد إضافة المراجعة اليدوية."},{status:422});return NextResponse.json({error:"تعذر تصحيح الاختبار؛ راجع الإجابات وحاول مرة أخرى."},{status:400});}
}
