"use client";
import {useEffect,useState} from "react";
import {loadActiveAuthSession} from "@/lib/auth-session";
import {findBaggage,updateBaggage,loadAllBaggage,type BaggagePiece,type BaggageStatusInput} from "@/lib/baggage-api";
import {resolveApiClientErrorMessage} from "@/lib/api-client";
import {pushToast} from "@/lib/toast";
export function BackofficeBaggagePanel(){
 const [bookingCode,setBookingCode]=useState("");const [tagCode,setTagCode]=useState("");
 const [flightCode,setFlightCode]=useState("");const [flightId,setFlightId]=useState("");
 const [status,setStatus]=useState("");const [pieces,setPieces]=useState<BaggagePiece[]>([]);
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function reload(){const accessToken=loadActiveAuthSession()?.accessToken;if(!accessToken)return;
  setBusy(true);setError("");try{
   const rows=await findBaggage(accessToken,Object.fromEntries(Object.entries({bookingCode,tagCode,flightCode,status}).filter(([,v])=>v)));
   setPieces(rows);
  }catch(e){setError(resolveApiClientErrorMessage(e,"Không tải được hành lý."));}finally{setBusy(false);}
 }
 useEffect(()=>{void reload();},[]);
 async function act(piece:BaggagePiece,action:BaggageStatusInput["action"]){
  const token=loadActiveAuthSession()?.accessToken;if(!token)return;
  const weight=action==="ACCEPT"?Number(window.prompt(`Cân nặng thực tế của ${piece.tagCode} (kg)`,String(piece.purchasedWeightKg))):undefined;
  if(action==="ACCEPT"&&(!weight||weight<=0))return;
  const over=action==="ACCEPT"&&(weight ?? 0)>piece.purchasedWeightKg;
  if(over&&!window.confirm("Cân nặng vượt gói đã mua. Xác nhận nhận kiện?"))return;
  try{await updateBaggage(piece.id,{action,expectedStatus:piece.status,weightKg:weight,
    confirmOverweight:over,note:action==="ACCEPT"?"Nhận tại quầy":undefined},token);
    pushToast({title:"Đã cập nhật hành lý",message:piece.tagCode,tone:"success"});await reload();
  }catch(e){setError(resolveApiClientErrorMessage(e,"Không thể cập nhật hành lý."));}
 }
 async function loadFlight(){const token=loadActiveAuthSession()?.accessToken;if(!token)return;
  const id=Number(flightId);if(!Number.isInteger(id)||id<=0)return;
  if(!window.confirm("Bốc xếp tất cả kiện đã nhận của chuyến này?"))return;
  try{const result=await loadAllBaggage(id,token);pushToast({title:"Đã bốc xếp",message:`${result.updated} kiện`,tone:"success"});await reload();}
  catch(e){setError(resolveApiClientErrorMessage(e,"Không thể bốc xếp toàn chuyến."));}
 }
 return <article id="operations-baggage" className="surface-card backoffice-operations-anchor">
  <h2>Quản lý hành lý ký gửi</h2><p>Tìm theo mã đặt chỗ, mã kiện, mã chuyến hoặc trạng thái.</p>
  <section className="baggage-search-section">
   <h3>Tìm kiếm hành lý</h3>
   <div className="field-grid compact-grid baggage-filter-grid">
   <label className="field"><span>PNR</span><input value={bookingCode} onChange={e=>setBookingCode(e.target.value)}/></label>
   <label className="field"><span>Mã kiện</span><input value={tagCode} onChange={e=>setTagCode(e.target.value)}/></label>
   <label className="field"><span>Mã chuyến</span><input value={flightCode} onChange={e=>setFlightCode(e.target.value)}/></label>
   <label className="field"><span>Trạng thái</span><select value={status} onChange={e=>setStatus(e.target.value)}>
    <option value="">Tất cả</option>{["REGISTERED","ACCEPTED","LOADED","DELIVERED","CANCELLED","RETURN_PENDING"].map(s=><option key={s}>{s}</option>)}
   </select></label>
   </div>
   <div className="baggage-search-actions">
    <button className="button button-primary" type="button" onClick={()=>void reload()} disabled={busy}>Tìm kiếm</button>
   </div>
  </section>
  <section className="baggage-bulk-load-section">
   <h3>Bốc xếp cả chuyến</h3>
   <p>Nhập ID chuyến bay để bốc xếp các kiện đã được nhận.</p>
   <div className="baggage-bulk-load-controls">
    <label className="field"><span>ID chuyến bay</span><input aria-label="ID chuyến bay" placeholder="Ví dụ: 123" value={flightId} onChange={e=>setFlightId(e.target.value)}/></label>
    <button type="button" className="button button-secondary" onClick={()=>void loadFlight()}>Bốc xếp cả chuyến</button>
   </div>
  </section>
  {error&&<p role="alert">{error}</p>}
  <div className="stack-list">{pieces.map(piece=><div key={piece.id} className="surface-card">
   <strong>{piece.tagCode} • {piece.passengerName}</strong>
   <p>{piece.bookingCode} • {piece.flightCode} • {piece.status} • Mua {piece.purchasedWeightKg} kg</p>
   {piece.weightKg!=null&&<p>Thực tế: {piece.weightKg} kg</p>}
   <div className="auth-action-row">
    {piece.status==="REGISTERED"&&<button type="button" className="button button-primary" onClick={()=>void act(piece,"ACCEPT")}>Nhận ký gửi</button>}
    {piece.status==="ACCEPTED"&&<button type="button" className="button button-secondary" onClick={()=>void act(piece,"LOAD")}>Đã bốc xếp</button>}
    {(piece.status==="LOADED"||piece.status==="RETURN_PENDING")&&<button type="button" className="button button-secondary" onClick={()=>void act(piece,"DELIVER")}>Đã trả hành lý</button>}
   </div></div>)}
  </div>
 </article>;
}
