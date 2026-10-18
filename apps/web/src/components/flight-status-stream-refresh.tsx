"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {getApiBaseUrl} from "@/lib/api-client";
export function FlightStatusStreamRefresh({codes}:{codes:string[]}){
 const router=useRouter();
 useEffect(()=>{
  if(!codes.length)return;
  const streams=codes.map(code=>{
   const source=new EventSource(`${getApiBaseUrl()}/api/flights/${encodeURIComponent(code)}/stream`);
   source.addEventListener("flight-change",()=>router.refresh());
   return source;
  });
  return ()=>streams.forEach(stream=>stream.close());
 },[router,codes.join("|")]);
 return null;
}
