package com.qlvmb.airticket.domain.entity;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
@Entity @Table(name="flight_change_event")
public class FlightChangeEventEntity {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="flight_id") private FlightEntity flight;
 @Column(name="field_name",nullable=false,length=32) private String fieldName;
 @Column(name="old_value",columnDefinition="text") private String oldValue;
 @Column(name="new_value",columnDefinition="text") private String newValue;
 @Column(name="actor_user_id") private Long actorUserId;
 @Column(name="created_at",nullable=false) private OffsetDateTime createdAt;
 protected FlightChangeEventEntity(){}
 public static FlightChangeEventEntity of(FlightEntity flight,String field,String oldValue,String newValue,Long actorId,OffsetDateTime now){
  var e=new FlightChangeEventEntity();e.flight=flight;e.fieldName=field;e.oldValue=oldValue;e.newValue=newValue;e.actorUserId=actorId;e.createdAt=now;return e;
 }
}
