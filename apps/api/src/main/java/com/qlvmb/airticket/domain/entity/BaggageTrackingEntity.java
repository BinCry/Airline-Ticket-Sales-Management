package com.qlvmb.airticket.domain.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity @Table(name = "baggage_tracking")
public class BaggageTrackingEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
  @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="ticket_id",nullable=false) private TicketEntity ticket;
  @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="booking_ancillary_id",nullable=false) private BookingAncillaryEntity ancillary;
  @Column(name="piece_no",nullable=false) private int pieceNo;
  @Column(name="tag_code",nullable=false,unique=true,length=10) private String tagCode;
  @Column(nullable=false,length=24) private String status;
  @Column(name="purchased_weight_kg",nullable=false) private int purchasedWeightKg;
  @Column(name="weight_kg",precision=6,scale=2) private BigDecimal weightKg;
  @Column(length=500) private String note;
  @Column(name="accepted_at") private OffsetDateTime acceptedAt;
  @Column(name="loaded_at") private OffsetDateTime loadedAt;
  @Column(name="delivered_at") private OffsetDateTime deliveredAt;
  @Column(name="created_at",nullable=false) private OffsetDateTime createdAt;
  @Column(name="updated_at",nullable=false) private OffsetDateTime updatedAt;
  @Column(name="updated_by_user_id") private Long updatedByUserId;
  protected BaggageTrackingEntity() {}
  public static BaggageTrackingEntity create(TicketEntity ticket,BookingAncillaryEntity ancillary,int pieceNo,String tag,int kg,OffsetDateTime now){
    var b=new BaggageTrackingEntity();b.ticket=ticket;b.ancillary=ancillary;b.pieceNo=pieceNo;b.tagCode=tag;b.status="REGISTERED";b.purchasedWeightKg=kg;b.createdAt=now;b.updatedAt=now;return b;
  }
  public Long getId(){return id;} public TicketEntity getTicket(){return ticket;} public String getTagCode(){return tagCode;}
  public String getStatus(){return status;} public int getPurchasedWeightKg(){return purchasedWeightKg;}
  public BigDecimal getWeightKg(){return weightKg;} public String getNote(){return note;}
  public OffsetDateTime getAcceptedAt(){return acceptedAt;} public OffsetDateTime getLoadedAt(){return loadedAt;}
  public OffsetDateTime getDeliveredAt(){return deliveredAt;}
  public void transition(String next,BigDecimal actualWeight,String note,Long actorId,OffsetDateTime now){
    this.status=next;this.note=note;this.updatedByUserId=actorId;this.updatedAt=now;
    if("ACCEPTED".equals(next)){this.weightKg=actualWeight;this.acceptedAt=now;}
    if("LOADED".equals(next))this.loadedAt=now;
    if("DELIVERED".equals(next))this.deliveredAt=now;
  }
  public void cancelWithTicket(OffsetDateTime now){
    if("REGISTERED".equals(status)){status="CANCELLED";updatedAt=now;}
    else if("ACCEPTED".equals(status)||"LOADED".equals(status)){status="RETURN_PENDING";updatedAt=now;}
  }
}
