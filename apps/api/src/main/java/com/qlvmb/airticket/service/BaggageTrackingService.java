package com.qlvmb.airticket.service;

import com.qlvmb.airticket.domain.entity.*;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.exception.ConflictException;
import com.qlvmb.airticket.repository.*;
import com.qlvmb.airticket.security.AuthenticatedUser;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BaggageTrackingService {
  private static final char[] ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
  private final SecureRandom random=new SecureRandom();
  private final BaggageTrackingRepository repository;
  private final AuditLogRepository auditLogRepository;
  private final UserAccountRepository users;
  private final int cutoffMinutes;
  public BaggageTrackingService(BaggageTrackingRepository repository,AuditLogRepository auditLogRepository,
    UserAccountRepository users,@Value("${app.baggage.accept-cutoff-minutes:60}") int cutoffMinutes){
    this.repository=repository;this.auditLogRepository=auditLogRepository;this.users=users;this.cutoffMinutes=cutoffMinutes;
  }
  // Called only while new tickets are issued inside the payment transaction.
  public void attachPieces(BookingEntity booking,TicketEntity ticket,OffsetDateTime now){
    for(var ancillary:booking.getAncillaries()){
      if(!"BAGGAGE".equals(ancillary.getKind()) || ancillary.getPassenger()!=ticket.getPassenger()
          || ancillary.getSegment()!=ticket.getSegment())continue;
      int kg=Integer.parseInt(ancillary.getCode().substring(3));
      for(int n=1;n<=ancillary.getQuantity();n++)
        ticket.addBaggage(BaggageTrackingEntity.create(ticket,ancillary,n,uniqueTag(),kg,now));
    }
  }

  public long refundableAmount(BookingAncillaryEntity ancillary){
    var pieces=repository.findByAncillaryId(ancillary.getId());
    if(pieces.isEmpty())return ancillary.getSubtotalAmount();
    long deliveredAtDestination=pieces.stream().filter(piece->"DELIVERED".equals(piece.getStatus()))
      .filter(piece->!auditLogRepository.existsByTargetTypeAndTargetIdAndActionAndDetail(
        "baggage",piece.getTagCode(),"operations.baggage.deliver","RETURN_PENDING -> DELIVERED"))
      .count();
    long notRefundable=Math.min(ancillary.getSubtotalAmount(),deliveredAtDestination*ancillary.getUnitPrice());
    return Math.max(0L,ancillary.getSubtotalAmount()-notRefundable);
  }

  private String uniqueTag(){
    for(int retry=0;retry<30;retry++){
      var code=new StringBuilder("BG");
      for(int i=0;i<8;i++)code.append(ALPHABET[random.nextInt(ALPHABET.length)]);
      if(!repository.existsByTagCode(code.toString()))return code.toString();
    }
    throw new IllegalStateException("Không tạo được mã hành lý.");
  }
  public record BaggageItem(Long id,String tagCode,String bookingCode,String flightCode,String ticketNumber,
    String passengerName,String status,int purchasedWeightKg,BigDecimal weightKg,String note,
    OffsetDateTime acceptedAt,OffsetDateTime loadedAt,OffsetDateTime deliveredAt){}
  public record StatusRequest(String action,String expectedStatus,BigDecimal weightKg,String note,Boolean confirmOverweight){}
  public BaggageItem toDto(BaggageTrackingEntity b){
    var t=b.getTicket();return new BaggageItem(b.getId(),b.getTagCode(),t.getBooking().getBookingCode(),
      t.getSegment().getFlightCode(),t.getTicketNumber(),t.getPassenger().getFullName(),b.getStatus(),
      b.getPurchasedWeightKg(),b.getWeightKg(),b.getNote(),b.getAcceptedAt(),b.getLoadedAt(),b.getDeliveredAt());
  }
  @Transactional(readOnly=true)
  public List<BaggageItem> search(String code,String tag,String flight,String state){
    return repository.search(blank(tag),blank(code),blank(flight),blank(state)).stream().limit(200).map(this::toDto).toList();
  }
  @Transactional(readOnly=true)
  public List<BaggageItem> forBooking(Long bookingId){return repository.findByBookingId(bookingId).stream().map(this::toDto).toList();}
  @Transactional
  public BaggageItem changeStatus(AuthenticatedUser actor,Long id,StatusRequest request){
    var b=repository.lockById(id).orElseThrow(()->new BadRequestException("Không tìm thấy hành lý."));
    if(!b.getStatus().equals(request.expectedStatus()))throw new ConflictException("Trạng thái đã thay đổi, hãy tải lại.");
    var ticket=b.getTicket();var flight=ticket.getSegment().getInventory().getFlight();
    String next=switch(request.action()){
      case "ACCEPT" -> "ACCEPTED";case "LOAD" -> "LOADED";case "DELIVER" -> "DELIVERED";
      default -> throw new BadRequestException("Thao tác không hợp lệ.");
    };
    String old=b.getStatus();
    if(!(("REGISTERED".equals(old)&&"ACCEPTED".equals(next))||
      ("ACCEPTED".equals(old)&&"LOADED".equals(next))||
      ("LOADED".equals(old)&&"DELIVERED".equals(next))||
      ("RETURN_PENDING".equals(old)&&"DELIVERED".equals(next))))
      throw new BadRequestException("Chuyển trạng thái hành lý không hợp lệ.");
    var now=OffsetDateTime.now();
    if("ACCEPTED".equals(next)){
      if(!TicketEntity.STATUS_CHECKED_IN.equals(ticket.getStatus()))throw new BadRequestException("Khách chưa check-in.");
      if(flight.isCancelled()||!now.isBefore(flight.getDepartureAt().minusMinutes(cutoffMinutes)))
        throw new BadRequestException("Chuyến bay đã hủy hoặc quá giờ chốt hành lý.");
      if(request.weightKg()==null||request.weightKg().signum()<=0)throw new BadRequestException("Cần nhập cân nặng thực tế.");
      if(request.weightKg().compareTo(BigDecimal.valueOf(b.getPurchasedWeightKg()))>0&&!Boolean.TRUE.equals(request.confirmOverweight()))
        throw new BadRequestException("Vượt gói đã mua; cần xác nhận quá cân.");
    }
    if("LOADED".equals(next)&&(flight.isCancelled()||Set.of("departed","landed").contains(flight.getStatus())))
      throw new BadRequestException("Không thể bốc xếp lúc này.");
    if("DELIVERED".equals(next)&&"LOADED".equals(old)&&!"landed".equals(flight.getStatus()))
      throw new BadRequestException("Chuyến bay chưa hạ cánh.");
    b.transition(next,request.weightKg(),request.note(),actor.userId(),now);
    var account=users.findOneWithRolesById(actor.userId()).orElseThrow();
    auditLogRepository.save(AuditLogEntity.create(account,"operations.baggage."+request.action().toLowerCase(),
      "baggage",b.getTagCode(),old+" -> "+next,now));
    return toDto(b);
  }
  @Transactional
  public int loadAll(AuthenticatedUser actor,Long flightId){
    // Locks are acquired individually via changeStatus to maintain the same authorization/validation.
    var ids=repository.acceptedForFlight(flightId).stream().map(BaggageTrackingEntity::getId).sorted().toList();
    for(var id:ids)changeStatus(actor,id,new StatusRequest("LOAD","ACCEPTED",null,"Bốc xếp toàn chuyến",false));
    return ids.size();
  }
  private String blank(String s){return s==null||s.isBlank()?null:s.trim();}
}
