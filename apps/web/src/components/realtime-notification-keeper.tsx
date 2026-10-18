"use client";
import {useEffect} from "react";
import {AUTH_SESSION_UPDATED_EVENT,loadValidAuthSession} from "@/lib/auth-session";
import {getApiBaseUrl} from "@/lib/api-client";
import {pushToast} from "@/lib/toast";

export const FLIGHT_NOTIFICATION_EVENT="airline-flight-notification";
/** Streaming fetch supports Authorization; native EventSource cannot set bearer headers. */
export function RealtimeNotificationKeeper(){
 useEffect(()=>{
  let disposed=false;let ctrl:AbortController|null=null;let retry:ReturnType<typeof setTimeout>|undefined;
  async function connect(){
   if(disposed)return;
   ctrl?.abort();ctrl=new AbortController();
   const session=loadValidAuthSession();
   if(!session?.accessToken)return;
   try{
    const res=await fetch(`${getApiBaseUrl()}/api/notifications/stream`,{
      headers:{Authorization:`Bearer ${session.accessToken}`,Accept:"text/event-stream"},
      signal:ctrl.signal,cache:"no-store"
    });
    if(res.status===401||res.status===403)return;
    if(!res.ok||!res.body)throw new Error("SSE not available");
    // Catch up after reconnect: notification outbox is authoritative.
    window.dispatchEvent(new Event(FLIGHT_NOTIFICATION_EVENT));
    const reader=res.body.getReader();const decoder=new TextDecoder();let buffer="";
    while(!disposed){const {done,value}=await reader.read();if(done)break;
     buffer+=decoder.decode(value,{stream:true}).replace(/\r/g,"");
     const events=buffer.split("\n\n");buffer=events.pop()??"";
     for(const event of events){
      if(!event.split("\n").some(line=>line.trim()==="event: notification"))continue;
      window.dispatchEvent(new Event(FLIGHT_NOTIFICATION_EVENT));
      pushToast({title:"Thông báo mới",message:"Có thông báo mới trong tài khoản của bạn.",tone:"info"});
     }
    }
   }catch(error){if(ctrl?.signal.aborted)return;}
   if(!disposed)retry=setTimeout(connect,3000);
  }
  function restart(){ctrl?.abort();if(retry)clearTimeout(retry);void connect();}
  void connect();window.addEventListener(AUTH_SESSION_UPDATED_EVENT,restart);window.addEventListener("storage",restart);
  return ()=>{disposed=true;ctrl?.abort();if(retry)clearTimeout(retry);
   window.removeEventListener(AUTH_SESSION_UPDATED_EVENT,restart);window.removeEventListener("storage",restart);};
 },[]);
 return null;
}
