package com.qlvmb.airticket.repository;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class VoucherStatsRepository {
  private final NamedParameterJdbcTemplate jdbc;

  public VoucherStatsRepository(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<IssuedVoucher> findIssued(OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {
    String sql = """
        select v.id, v.status, v.source, v.created_at, v.expires_at,
          (v.operations_hidden_at is not null) as operations_hidden,
          b.id as booking_id, b.discount_amount as actual_discount, b.currency as booking_currency
        from member_voucher v
        left join booking b on v.status = 'USED'
          and b.booking_code = v.booking_code and b.applied_voucher_code = v.voucher_code
        where 1 = 1
        """;
    var params = new MapSqlParameterSource();
    if (fromInclusive != null) {
      sql += " and v.created_at >= :fromTime";
      params.addValue("fromTime", fromInclusive);
    }
    if (toExclusive != null) {
      sql += " and v.created_at < :toTime";
      params.addValue("toTime", toExclusive);
    }
    return jdbc.query(sql + " order by v.id", params, (rows, index) -> new IssuedVoucher(
        rows.getLong("id"), rows.getString("status"), rows.getString("source"),
        rows.getObject("created_at", OffsetDateTime.class),
        rows.getObject("expires_at", OffsetDateTime.class), rows.getBoolean("operations_hidden"),
        rows.getObject("booking_id", Long.class), rows.getObject("actual_discount", Long.class),
        rows.getString("booking_currency")));
  }

  public record IssuedVoucher(long id, String status, String source,
      OffsetDateTime createdAt, OffsetDateTime expiresAt, boolean operationsHidden,
      Long bookingId, Long actualDiscount, String bookingCurrency) {}
}
