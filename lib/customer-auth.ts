import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
const COOKIE="bola_customer_session";
const TTL=60*60*24*14;
function secret(){const v=process.env.AUTH_SECRET;if(!v||new TextEncoder().encode(v).length<32)throw new Error("AUTH_SECRET must contain at least 32 bytes.");return new TextEncoder().encode(v);}
export async function createCustomerSession(id:string){const token=await new SignJWT({kind:"customer"}).setProtectedHeader({alg:"HS256"}).setSubject(id).setIssuedAt().setExpirationTime(`${TTL}s`).sign(secret());(await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:TTL});}
export async function getCustomerSession(){const token=(await cookies()).get(COOKIE)?.value;if(!token)return null;try{const {payload}=await jwtVerify(token,secret(),{algorithms:["HS256"]});if(payload.kind!=="customer"||!payload.sub)return null;return {id:payload.sub};}catch{return null;}}
export async function clearCustomerSession(){(await cookies()).set(COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});}
