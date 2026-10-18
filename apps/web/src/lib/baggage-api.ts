import { requestApi } from "@/lib/api-client";
export interface BaggageOption { code: string; name: string; weightKg: number; price: number; }
export interface BaggagePiece { id:number; tagCode:string; bookingCode:string; flightCode:string; ticketNumber:string;
 passengerName:string; status:string; purchasedWeightKg:number; weightKg:number|null; note:string|null;
 acceptedAt:string|null; loadedAt:string|null; deliveredAt:string|null; }
export interface BaggageStatusInput { action:"ACCEPT"|"LOAD"|"DELIVER"; expectedStatus:string;
 weightKg?:number; note?:string; confirmOverweight?:boolean; }
export function fetchBaggageOptions(){return requestApi<BaggageOption[]>("/api/baggage/options", {showErrorToast:false});}
export function findBaggage(accessToken:string, query:Record<string,string>){
 const p=new URLSearchParams(query);return requestApi<BaggagePiece[]>(`/api/backoffice/operations/baggage?${p}`,{accessToken,showErrorToast:false});
}
export function updateBaggage(id:number,input:BaggageStatusInput,accessToken:string){
 return requestApi<BaggagePiece>(`/api/backoffice/operations/baggage/${id}/status`,{accessToken,json:input,method:"PATCH"});
}
export function loadAllBaggage(flightId:number,accessToken:string){
 return requestApi<{updated:number}>(`/api/backoffice/operations/baggage/flights/${flightId}/load-all`,{accessToken,method:"POST"});
}
