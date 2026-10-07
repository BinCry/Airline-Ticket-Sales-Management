"use client";

import { useState } from "react";
import { SectionHeading } from "@/components/section-heading";
import { resolveApiClientErrorMessage } from "@/lib/api-client";
import { isAircraftSeatLayout, saveAircraft, saveAircraftType,
  type AircraftItem, type AircraftInput, type AircraftTypeItem } from "@/lib/seat-map-api";

interface Props {
  accessToken: string | null;
  aircraftTypes: AircraftTypeItem[];
  aircraft: AircraftItem[];
  onSaved: () => Promise<void>;
}

const emptyLayout = JSON.stringify({ columns: ["A", "B"], aislesAfter: ["A"],
  rows: [{ row: 1, fareFamily: "pho_thong_tiet_kiem", seats: ["A", "B"] }], disabledSeats: [] }, null, 2);

export function OperationsAircraftPanel({ accessToken, aircraftTypes, aircraft, onSaved }: Props) {
  const [typeId, setTypeId] = useState<number | undefined>();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [totalRows, setTotalRows] = useState(1);
  const [layout, setLayout] = useState(emptyLayout);
  const [aircraftId, setAircraftId] = useState<number | undefined>();
  const [aircraftForm, setAircraftForm] = useState<AircraftInput>({ aircraftTypeId: 0, registrationCode: "", status: "ACTIVE" });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveType(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken || pending) return;
    setPending(true); setMessage(null);
    try {
      const parsed: unknown = JSON.parse(layout);
      if (!isAircraftSeatLayout(parsed)) throw new Error("JSON cần columns, aislesAfter, rows (row/fareFamily/seats) và disabledSeats hợp lệ.");
      await saveAircraftType({ code: code.trim().toUpperCase(), name: name.trim(), totalRows, seatLayout: parsed }, accessToken, typeId);
      await onSaved(); setMessage("Đã lưu loại tàu và layout.");
    } catch (error) { setMessage(resolveApiClientErrorMessage(error, "Không thể lưu loại tàu.")); }
    finally { setPending(false); }
  }
  async function savePhysicalAircraft(event: React.FormEvent) {
    event.preventDefault();
    if (!accessToken || pending) return;
    setPending(true); setMessage(null);
    try {
      await saveAircraft({ ...aircraftForm, registrationCode: aircraftForm.registrationCode.trim().toUpperCase() }, accessToken, aircraftId);
      await onSaved(); setMessage("Đã lưu tàu bay.");
    } catch (error) { setMessage(resolveApiClientErrorMessage(error, "Không thể lưu tàu bay.")); }
    finally { setPending(false); }
  }
  return (
    <article id="operations-aircraft" className="surface-card backoffice-operations-anchor">
      <SectionHeading eyebrow="Đội tàu" title="Loại tàu, layout và tàu bay vật lý"
        description="Layout dùng chung cho đặt vé và check-in. Các thay đổi làm mất ghế đang giữ sẽ bị chặn; chỉ tàu ACTIVE được gán mới." />
      {message ? <p role="status">{message}</p> : null}
      <div className="section-split">
        <form onSubmit={saveType} className="stack-list">
          <label className="field"><span>Chọn loại tàu để sửa</span>
            <select value={typeId ?? ""} disabled={pending} onChange={(event) => {
              const type = aircraftTypes.find((item) => item.id === Number(event.target.value));
              setTypeId(type?.id); setCode(type?.code ?? ""); setName(type?.name ?? "");
              setTotalRows(type?.totalRows ?? 1); setLayout(type ? JSON.stringify(type.seatLayout, null, 2) : emptyLayout);
            }}><option value="">Tạo loại tàu mới</option>
              {aircraftTypes.map((type) => <option key={type.id} value={type.id}>{type.code} • {type.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Mã loại tàu</span><input required maxLength={16} value={code} disabled={pending} onChange={(event) => setCode(event.target.value)} /></label>
          <label className="field"><span>Tên loại tàu</span><input required maxLength={120} value={name} disabled={pending} onChange={(event) => setName(event.target.value)} /></label>
          <label className="field"><span>Tổng số hàng</span><input required type="number" min={1} value={totalRows} disabled={pending} onChange={(event) => setTotalRows(Number(event.target.value))} /></label>
          <label className="field"><span>Layout JSON</span><textarea className="booking-textarea" rows={14} required spellCheck={false} value={layout} disabled={pending} onChange={(event) => setLayout(event.target.value)} />
            <small>columns: cột; aislesAfter: lối đi sau cột; rows: vùng hạng vé và ghế từng hàng; disabledSeats: ghế vô hiệu hóa.</small>
          </label>
          <button className="button button-primary" disabled={!accessToken || pending}>{pending ? "Đang lưu..." : "Lưu loại tàu và layout"}</button>
        </form>
        <form onSubmit={savePhysicalAircraft} className="stack-list">
          <label className="field"><span>Chọn tàu bay để sửa</span>
            <select value={aircraftId ?? ""} disabled={pending} onChange={(event) => {
              const item = aircraft.find((candidate) => candidate.id === Number(event.target.value));
              setAircraftId(item?.id);
              setAircraftForm(item ? { aircraftTypeId: item.aircraftTypeId, registrationCode: item.registrationCode, status: item.status }
                : { aircraftTypeId: 0, registrationCode: "", status: "ACTIVE" });
            }}><option value="">Tạo tàu bay mới</option>
              {aircraft.map((item) => <option key={item.id} value={item.id}>{item.registrationCode} • {item.status}</option>)}
            </select>
          </label>
          <label className="field"><span>Loại tàu của tàu bay</span>
            <select required value={aircraftForm.aircraftTypeId || ""} disabled={pending} onChange={(event) => setAircraftForm({ ...aircraftForm, aircraftTypeId: Number(event.target.value) })}>
              <option value="">Chọn loại tàu</option>{aircraftTypes.map((item) => <option key={item.id} value={item.id}>{item.code} • {item.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Số đăng ký tàu bay</span><input required maxLength={20} value={aircraftForm.registrationCode} disabled={pending} onChange={(event) => setAircraftForm({ ...aircraftForm, registrationCode: event.target.value })} /></label>
          <label className="field"><span>Trạng thái tàu bay</span>
            <select value={aircraftForm.status} disabled={pending} onChange={(event) => setAircraftForm({ ...aircraftForm, status: event.target.value as AircraftInput["status"] })}>
              <option value="ACTIVE">ACTIVE • Hoạt động</option><option value="MAINTENANCE">MAINTENANCE • Bảo trì</option><option value="INACTIVE">INACTIVE • Ngừng hoạt động</option>
            </select>
          </label>
          <button className="button button-primary" disabled={!accessToken || pending}>{pending ? "Đang lưu..." : "Lưu tàu bay"}</button>
        </form>
      </div>
    </article>
  );
}
