package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

@EnabledIfEnvironmentVariable(named="LOYALTY_TEST_DB_URL",matches=".+")
class SeatMapMigrationPostgresTest {
  private JdbcTemplate jdbc;
  private DriverManagerDataSource datasource;
  private String schema;
  private long flightId;

  @BeforeEach void beforeEach() {
    schema="seat_migration_"+UUID.randomUUID().toString().replace("-","");
    String url=System.getenv("LOYALTY_TEST_DB_URL");
    datasource=new DriverManagerDataSource(url+(url.contains("?")?"&":"?")+"currentSchema="+schema,
        System.getenv().getOrDefault("LOYALTY_TEST_DB_USER","loyalty_test"),System.getenv().getOrDefault("LOYALTY_TEST_DB_PASSWORD",""));
    Flyway.configure().dataSource(datasource).schemas(schema).target("31").load().migrate();
    jdbc=new JdbcTemplate(datasource);
    flightId=jdbc.queryForObject("select max(id) from flight",Long.class);
  }

  @Test void preservesLiveSelectionAndOldBoardingPassOutsideDefaultCabin() throws Exception {
    var ticketed=booking("pho_thong_linh_hoat","12A",true);
    long ticketId=jdbc.queryForObject("""
        insert into ticket(booking_id,booking_passenger_id,booking_segment_id,ticket_number,status,issued_at,created_at,updated_at)
        values (?,?,?,'MIGRATION-OLD-BP','CHECKED_IN',now(),now(),now()) returning id
        """,Long.class,ticketed.booking(),ticketed.passenger(),ticketed.segment());
    jdbc.update("""
        insert into boarding_pass(ticket_id,seat_number,gate,boarding_time,barcode,created_at,updated_at)
        values (?,'29H','G1',now(),'MIGRATION-OLD-BP',now(),now())
        """,ticketId);
    booking("pho_thong_tiet_kiem","15A",false);
    migrate();
    String json=jdbc.queryForObject("""
        select t.seat_layout_json::text from flight f join aircraft a on a.id=f.aircraft_id
        join aircraft_type t on t.id=a.aircraft_type_id where f.id=?
        """,String.class,flightId);
    var service=new SeatMapService(null,new ObjectMapper(),null,null,null,null);
    var layout=service.parseLayout(json,29);
    service.validateSeat(layout,"29H","pho_thong_linh_hoat");
    service.validateSeat(layout,"15A","pho_thong_tiet_kiem");
    assertThat(jdbc.queryForObject("select seat_number from boarding_pass where ticket_id=?",String.class,ticketId)).isEqualTo("29H");
    assertThat(jdbc.queryForObject("select seat_number from booking_seat_selection where booking_id=?",String.class,ticketed.booking())).isEqualTo("12A");
    assertThat(jdbc.queryForObject("select count(*) from flight where aircraft_id is null",Long.class)).isZero();
    assertThat(jdbc.queryForObject("select total_rows from aircraft_type where code='A321'",Integer.class)).isEqualTo(28);
  }

  @Test void rejectsHistoricalSeatsSharedByDifferentOwnersWithoutDeletingData() {
    booking("pho_thong_tiet_kiem","12A",false); booking("pho_thong_tiet_kiem","12A",false);
    assertThatThrownBy(this::migrate).hasStackTraceContaining("Ghế cũ đang bị nhiều hành khách giữ");
    assertThat(jdbc.queryForObject("""
        select count(*) from booking_seat_selection s join booking_segment bs on bs.id=s.booking_segment_id
        join flight_fare_inventory i on i.id=bs.inventory_id where i.flight_id=?
        """,Long.class,flightId)).isEqualTo(2L);
  }

  @Test void rejectsHistoricalMixedFareRowsWithActionableMessage() {
    booking("pho_thong_tiet_kiem","12A",false); booking("pho_thong_linh_hoat","12B",false);
    assertThatThrownBy(this::migrate).hasStackTraceContaining("Cabin cũ có hàng nhiều hạng");
  }

  // V33: hạng vé không còn hàng ghế nào trong cabin LEGACY phải về 0, hạng còn lại giữ nguyên.
  @Test void zeroesInventoryOfFareFamiliesMissingFromLegacyCabin() {
    booking("pho_thong_linh_hoat","1A",false); booking("pho_thong_linh_hoat","2A",false);
    migrate();
    assertThat(inventory("thuong_gia")).containsExactly(0,0);
    assertThat(inventory("pho_thong_linh_hoat").getFirst()).isPositive();
    assertThat(inventory("pho_thong_tiet_kiem").getFirst()).isPositive();
  }

  private java.util.List<Integer> inventory(String fare) {
    return jdbc.query("select total_seats,available_seats from flight_fare_inventory where flight_id=? and fare_family=?",
        (rs,n) -> java.util.List.of(rs.getInt(1),rs.getInt(2)),flightId,fare).getFirst();
  }

  private void migrate() { Flyway.configure().dataSource(datasource).schemas(schema).load().migrate(); }

  private Fixture booking(String fare,String seat,boolean ticketed) {
    String code=UUID.randomUUID().toString().replace("-","").substring(0,6).toUpperCase();
    long booking=jdbc.queryForObject("""
        insert into booking(booking_code,status,payment_status,trip_type,base_amount,ancillary_amount,total_amount,currency,expires_at,created_at,updated_at)
        values (?,?,?,'one_way',0,0,0,'VND',now()+interval '15 minutes',now(),now()) returning id
        """,Long.class,code,ticketed?"TICKETED":"HOLD",ticketed?"PAID":"PENDING");
    long passenger=jdbc.queryForObject("""
        insert into booking_passenger(booking_id,full_name,passenger_type,date_of_birth,document_type,document_number,created_at)
        values (?,'Khách cũ','adult','1990-01-01','CCCD','MIGRATION',now()) returning id
        """,Long.class,booking);
    long segment=jdbc.queryForObject("""
        insert into booking_segment(booking_id,inventory_id,flight_code,from_city,to_city,origin_code,destination_code,
          departure_at,arrival_at,fare_family,fare_title,price_per_passenger,passenger_count,subtotal_amount,created_at)
        select ?,i.id,f.code,'SGN','HAN','SGN','HAN',f.departure_at,f.arrival_at,i.fare_family,'Ghế cũ',0,1,0,now()
        from flight f join flight_fare_inventory i on i.flight_id=f.id where f.id=? and i.fare_family=? returning id
        """,Long.class,booking,flightId,fare);
    jdbc.update("""
        insert into booking_seat_selection(booking_id,booking_passenger_id,booking_segment_id,seat_number,unit_price,created_at)
        values (?,?,?,?,0,now())
        """,booking,passenger,segment,seat);
    return new Fixture(booking,passenger,segment);
  }
  private record Fixture(long booking,long passenger,long segment) {}
}
