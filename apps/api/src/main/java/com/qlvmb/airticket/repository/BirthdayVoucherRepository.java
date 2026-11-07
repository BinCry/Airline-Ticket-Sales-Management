package com.qlvmb.airticket.repository;

import com.qlvmb.airticket.config.BirthdayVoucherPolicy;
import org.springframework.beans.factory.annotation.Autowired;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class BirthdayVoucherRepository {
  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
  private final NamedParameterJdbcTemplate jdbc;
  private final BirthdayVoucherPolicy policy;
  private static final String ELIGIBLE = """
      from user_account u join saved_passenger p on p.user_id=u.id and p.is_primary
      where u.status='active' and u.locked_at is null
        and exists (select 1 from user_role ur join auth_role r on r.id=ur.role_id
                    where ur.user_id=u.id and r.code='member')
        and (select count(*) from saved_passenger s where s.user_id=u.id and s.is_primary)=1
        and isfinite(p.date_of_birth)
        and p.date_of_birth between date '0001-01-01' and cast(:today as date)
      """;
  private static final String BIRTHDAY_MATCH = """
      p.date_of_birth<=d.birthday
      and extract(month from p.date_of_birth)=extract(month from d.birthday)
      and (extract(day from p.date_of_birth)=extract(day from d.birthday)
        or (extract(month from p.date_of_birth)=2 and extract(day from p.date_of_birth)=29
          and extract(day from d.birthday)=28
          and extract(day from (date_trunc('month',d.birthday)
                                 + interval '1 month' - interval '1 day'))=28))
      """;

  public BirthdayVoucherRepository(JdbcTemplate jdbc) {
    this(jdbc, new BirthdayVoucherPolicy(BirthdayVoucherPolicy.DEFAULT_DISCOUNT_AMOUNT,
        BirthdayVoucherPolicy.DEFAULT_VALID_DAYS));
  }

  @Autowired
  public BirthdayVoucherRepository(JdbcTemplate jdbc, BirthdayVoucherPolicy policy) {
    this.jdbc = new NamedParameterJdbcTemplate(jdbc);
    this.policy = java.util.Objects.requireNonNull(policy, "Thiếu cấu hình quà sinh nhật.");
  }

  public List<Candidate> findCandidates(long afterId, LocalDate today, int limit) {
    if (afterId < 0 || limit < 1 || limit > 200) {
      throw new IllegalArgumentException("Phân trang Birthday không hợp lệ.");
    }
    String sql = "select u.id,p.date_of_birth " + ELIGIBLE + """
        and u.id>:afterId and exists (
          select 1 from generate_series(0,3) offsets(days)
          cross join lateral (select cast(:today as date)-offsets.days as birthday) d
          where
        """ + BIRTHDAY_MATCH + ") order by u.id limit :limit";
    return jdbc.query(sql, Map.of("today", today, "afterId", afterId, "limit", limit),
        (rows, index) -> new Candidate(rows.getLong("id"),
            rows.getObject("date_of_birth", LocalDate.class)));
  }

  public Outcome issue(long userId, LocalDate birthday, Instant now) {
    LocalDate today = now.atZone(ZONE).toLocalDate();
    if (userId <= 0 || birthday == null || birthday.isAfter(today)
        || birthday.isBefore(today.minusDays(3)) || !expiresAt(birthday, policy.validDays()).toInstant().isAfter(now)) {
      return Outcome.SKIPPED;
    }
    String code = "BDAY-" + userId + "-" + birthday.getYear();
    var params = new MapSqlParameterSource().addValue("userId", userId)
        .addValue("today", today).addValue("birthday", birthday).addValue("code", code)
        .addValue("expires", expiresAt(birthday, policy.validDays()))
        .addValue("discountAmount", policy.discountAmount())
        .addValue("now", now.atOffset(java.time.ZoneOffset.UTC));
    String insert = """
        insert into member_voucher(user_id,voucher_code,title,description,discount_amount,
          currency,status,expires_at,source,condition_json,created_at,updated_at)
        select u.id,:code,'Quà sinh nhật',
          'Quà sinh nhật dựa trên ngày sinh tự khai của hồ sơ hành khách chính tại thời điểm xét cấp.',
          :discountAmount,'VND','AVAILABLE',:expires,'BIRTHDAY','{"minAmount":200000}'::jsonb,:now,:now
        """ + ELIGIBLE + """
        and u.id=:userId and :expires>:now
        and exists (select 1 from (values (cast(:birthday as date))) d(birthday) where
        """ + BIRTHDAY_MATCH + """
        ) and not exists (
          select 1 from member_voucher v where lower(v.voucher_code)=lower(:code))
        on conflict (voucher_code) do nothing returning id
        """;
    if (!jdbc.query(insert, params, (rows, index) -> rows.getLong("id")).isEmpty()) {
      return Outcome.ISSUED;
    }
    // Đọc sau INSERT ở READ COMMITTED để thấy giao dịch thắng unique conflict.
    var existing = jdbc.query("""
        select user_id,source,voucher_code from member_voucher
        where lower(voucher_code)=lower(:code)
        """, params, (rows, index) -> new Existing(rows.getLong("user_id"),
            rows.getString("source"), rows.getString("voucher_code")));
    if (existing.isEmpty()) {
      return Outcome.SKIPPED;
    }
    Existing found = existing.get(0);
    return existing.size() == 1 && found.userId() == userId
        && "BIRTHDAY".equals(found.source()) && code.equals(found.code())
        ? Outcome.ALREADY_ISSUED : Outcome.ANOMALY;
  }

  public static OffsetDateTime expiresAt(LocalDate birthday) {
    return expiresAt(birthday, BirthdayVoucherPolicy.DEFAULT_VALID_DAYS);
  }

  private static OffsetDateTime expiresAt(LocalDate birthday, int validDays) {
    return birthday.plusDays(validDays).atStartOfDay(ZONE).toOffsetDateTime();
  }

  public record Candidate(long userId, LocalDate dateOfBirth) {}
  private record Existing(long userId, String source, String code) {}
  public enum Outcome { ISSUED, ALREADY_ISSUED, SKIPPED, ANOMALY }
}
