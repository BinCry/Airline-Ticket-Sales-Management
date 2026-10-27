package com.qlvmb.airticket.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.dto.AuditLogFilterRequest;
import com.qlvmb.airticket.domain.dto.AuditLogPageResponse;
import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import com.qlvmb.airticket.exception.BadRequestException;
import com.qlvmb.airticket.repository.AuditLogRepository;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.TimeZone;
import java.util.function.BiConsumer;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class AuditLogQueryServiceTest {

  @Mock private AuditLogRepository repository;
  @Captor private ArgumentCaptor<Specification<AuditLogEntity>> specification;
  @Captor private ArgumentCaptor<Pageable> pageable;
  private AuditLogQueryService service;

  @BeforeEach
  void setUp() {
    service = new AuditLogQueryService(repository);
  }

  @Test
  void defaultsReturnAnEmptyPageWithStableOrderingAndNoImplicitDateRange() {
    AuditLogPageResponse response = search(new Filters());
    assertThat(response.items()).isEmpty();
    assertThat(response.page()).isZero();
    assertThat(response.size()).isEqualTo(20);
    assertThat(response.totalElements()).isZero();
    assertThat(response.totalPages()).isZero();
    assertThat(pageable.getValue().getSort()).isEqualTo(
        Sort.by(Sort.Direction.DESC, "createdAt", "id"));

    Root<AuditLogEntity> root = mock(Root.class, RETURNS_DEEP_STUBS);
    CriteriaBuilder builder = mock(CriteriaBuilder.class, RETURNS_DEEP_STUBS);
    specification.getValue().toPredicate(root, mock(CriteriaQuery.class), builder);
    verify(builder).isNull(root.get("hiddenAt"));
    verify(root, never()).get("createdAt");
    verify(root, never()).join("actorUserAccount", JoinType.LEFT);
  }

  @Test
  void mapsActorAndSystemRowsWithoutChangingAuditData() {
    UserAccountEntity actor = mock(UserAccountEntity.class);
    when(actor.getId()).thenReturn(42L);
    when(actor.getEmail()).thenReturn("admin@example.test");
    when(actor.getDisplayName()).thenReturn("Nguyễn An");
    OffsetDateTime time = OffsetDateTime.parse("2026-10-23T03:00:00Z");
    AuditLogEntity visible = AuditLogEntity.create(actor, "admin.user.roles.update", "user_account",
        "81", "Nội dung nguyên văn %_\\", time);
    ReflectionTestUtils.setField(visible, "id", 5L);
    AuditLogEntity hidden = AuditLogEntity.create(null, "member.loyalty.tier_upgrade",
        "member_loyalty_account", "91", "Tự động nâng hạng", time);
    ReflectionTestUtils.setField(hidden, "id", 4L);
    hidden.hideFromUi(time.plusMinutes(1));
    when(repository.findAll(any(Specification.class), any(Pageable.class)))
        .thenAnswer(invocation -> new PageImpl<>(List.of(visible, hidden), invocation.getArgument(1), 42));
    Filters filter = new Filters();
    filter.page = 2;
    filter.includeHidden = true;

    AuditLogPageResponse response = service.getAuditLogs(filter.build());

    assertThat(response.page()).isEqualTo(2);
    assertThat(response.size()).isEqualTo(20);
    assertThat(response.totalElements()).isEqualTo(42);
    assertThat(response.totalPages()).isEqualTo(3);
    assertThat(response.items()).hasSize(2);
    assertThat(response.items().getFirst().id()).isEqualTo(5L);
    assertThat(response.items().getFirst().actorId()).isEqualTo(42L);
    assertThat(response.items().getFirst().actorEmail()).isEqualTo("admin@example.test");
    assertThat(response.items().getFirst().actorName()).isEqualTo("Nguyễn An");
    assertThat(response.items().getFirst().action()).isEqualTo(visible.getAction());
    assertThat(response.items().getFirst().targetType()).isEqualTo("user_account");
    assertThat(response.items().getFirst().targetId()).isEqualTo("81");
    assertThat(response.items().getFirst().detail()).isEqualTo("Nội dung nguyên văn %_\\");
    assertThat(response.items().getFirst().createdAt()).isEqualTo(time);
    assertThat(response.items().getFirst().hidden()).isFalse();
    assertThat(response.items().getLast().actorId()).isNull();
    assertThat(response.items().getLast().actorEmail()).isNull();
    assertThat(response.items().getLast().actorName()).isNull();
    assertThat(response.items().getLast().hidden()).isTrue();
    assertThat(visible.getHiddenAt()).isNull();
    assertThat(hidden.getHiddenAt()).isEqualTo(time.plusMinutes(1));
    verify(repository).findAll(any(Specification.class), any(Pageable.class));
    verifyNoMoreInteractions(repository);
  }

  @Test
  void combinesAllFiltersWithAndAndUsesVietnamCalendarBoundaries() {
    Filters filter = new Filters();
    filter.actorId = "42";
    filter.actorKeyword = " An%_\\ ";
    filter.actionPrefix = " operations ";
    filter.action = "operations.flight.update";
    filter.targetType = "flight";
    filter.targetId = "VN%_\\";
    filter.keyword = " ĐỔI%_\\ ";
    filter.from = LocalDate.of(2026, 10, 1);
    filter.to = LocalDate.of(2026, 10, 23);
    search(filter);
    Root<AuditLogEntity> root = mock(Root.class, RETURNS_DEEP_STUBS);
    CriteriaBuilder builder = mock(CriteriaBuilder.class, RETURNS_DEEP_STUBS);

    specification.getValue().toPredicate(root, mock(CriteriaQuery.class), builder);

    verify(builder).equal(root.get("actorUserAccount").get("id"), 42L);
    verify(root).join("actorUserAccount", JoinType.LEFT);
    verify(builder).equal(root.get("action"), "operations.flight.update");
    verify(builder).like(root.get("action"), "operations.%", '\\');
    verify(builder).equal(root.get("targetType"), "flight");
    verify(builder).like(builder.lower(root.get("targetId")), "%vn\\%\\_\\\\%", '\\');
    verify(builder).like(builder.lower(root.get("detail")), "%đổi\\%\\_\\\\%", '\\');
    verify(builder).greaterThanOrEqualTo(root.get("createdAt"),
        OffsetDateTime.parse("2026-10-01T00:00:00+07:00"));
    verify(builder).lessThan(root.get("createdAt"),
        OffsetDateTime.parse("2026-10-24T00:00:00+07:00"));
    verify(builder, atLeastOnce()).and(any(Predicate.class), any(Predicate.class));
  }

  @Test
  void noneSelectsNullActorAndIncludeHiddenRemovesOnlyTheVisibilityCondition() {
    Filters filter = new Filters();
    filter.actorId = " none ";
    filter.includeHidden = true;
    search(filter);
    Root<AuditLogEntity> root = mock(Root.class, RETURNS_DEEP_STUBS);
    CriteriaBuilder builder = mock(CriteriaBuilder.class, RETURNS_DEEP_STUBS);
    specification.getValue().toPredicate(root, mock(CriteriaQuery.class), builder);
    verify(builder).isNull(root.get("actorUserAccount"));
    verify(root, never()).get("hiddenAt");
    verify(root, never()).join("actorUserAccount", JoinType.INNER);
  }

  @Test
  void blankFiltersAreIgnoredAndPositiveActorIdIsNormalized() {
    Filters filter = new Filters();
    filter.actorId = " 00042 ";
    filter.actorKeyword = "\t ";
    filter.actionPrefix = " ";
    filter.action = " ";
    filter.targetType = " ";
    filter.targetId = " ";
    filter.keyword = "\n ";
    AuditLogFilterRequest request = filter.build();
    assertThat(request.actorId()).isEqualTo("42");
    assertThat(request.actorKeyword()).isNull();
    assertThat(request.actionPrefix()).isNull();
    assertThat(request.action()).isNull();
    assertThat(request.targetType()).isNull();
    assertThat(request.targetId()).isNull();
    assertThat(request.keyword()).isNull();
  }

  @ParameterizedTest
  @ValueSource(ints = {101, Integer.MAX_VALUE})
  void clampsOversizedPagesToOneHundred(int size) {
    Filters filter = new Filters();
    filter.size = size;
    search(filter);
    assertThat(pageable.getValue().getPageSize()).isEqualTo(100);
  }

  @ParameterizedTest
  @ValueSource(strings = {"0", "-1", "+1", "nonee", "1.5", "9223372036854775808"})
  void rejectsInvalidActorIdsBeforeQuerying(String actorId) {
    Filters filter = new Filters();
    filter.actorId = actorId;
    assertThatThrownBy(() -> service.getAuditLogs(filter.build())).isInstanceOf(BadRequestException.class);
    verifyNoInteractions(repository);
  }

  @Test
  void rejectsInvalidPageSizeAndOffsetBeforeQuerying() {
    Filters filter = new Filters();
    filter.page = -1;
    assertThatThrownBy(filter::build).isInstanceOf(BadRequestException.class);
    filter.page = 0;
    for (int size : new int[] {0, -1}) {
      filter.size = size;
      assertThatThrownBy(filter::build).isInstanceOf(BadRequestException.class);
    }
    filter.page = Integer.MAX_VALUE;
    filter.size = 100;
    assertThatThrownBy(filter::build).isInstanceOf(BadRequestException.class);
    verifyNoInteractions(repository);
  }

  static Stream<Arguments> textLimits() {
    return Stream.of(
        Arguments.of("actorKeyword", 160, (BiConsumer<Filters, String>) (f, v) -> f.actorKeyword = v),
        Arguments.of("actionPrefix", 120, (BiConsumer<Filters, String>) (f, v) -> f.actionPrefix = v),
        Arguments.of("action", 120, (BiConsumer<Filters, String>) (f, v) -> f.action = v),
        Arguments.of("targetType", 80, (BiConsumer<Filters, String>) (f, v) -> f.targetType = v),
        Arguments.of("targetId", 120, (BiConsumer<Filters, String>) (f, v) -> f.targetId = v),
        Arguments.of("keyword", 1000, (BiConsumer<Filters, String>) (f, v) -> f.keyword = v)
    );
  }

  @ParameterizedTest(name = "{0}")
  @MethodSource("textLimits")
  void acceptsSchemaLengthAndRejectsLongerTextWithoutTruncating(String name, int maxLength,
      BiConsumer<Filters, String> setter) {
    Filters filter = new Filters();
    setter.accept(filter, "ấ".repeat(maxLength));
    assertThat(filter.build()).isNotNull();
    setter.accept(filter, "ấ".repeat(maxLength + 1));
    assertThatThrownBy(filter::build).isInstanceOf(BadRequestException.class);
  }

  @Test
  void rejectsReversedDatesAndAnUnrepresentableExclusiveEnd() {
    Filters filter = new Filters();
    filter.from = LocalDate.of(2026, 10, 23);
    filter.to = filter.from.minusDays(1);
    assertThatThrownBy(filter::build).isInstanceOf(BadRequestException.class);
    filter.to = LocalDate.MAX;
    assertThatThrownBy(filter::build).isInstanceOf(BadRequestException.class);
    verifyNoInteractions(repository);
  }

  @Test
  void listAllowsSingleSidedDatesAndDoesNotApplyTheCsvNinetyDayLimit() {
    Filters filter = new Filters();
    filter.from = LocalDate.of(2026, 1, 1);
    assertThat(filter.build().to()).isNull();
    filter.to = filter.from.plusDays(100);
    assertThat(filter.build().to()).isEqualTo(LocalDate.of(2026, 4, 11));
    filter.from = null;
    assertThat(filter.build().from()).isNull();
  }

  @ParameterizedTest
  @ValueSource(strings = {"from", "to", "same-day"})
  void queriesSingleSidedAndSameDayRangesAcrossLeapDay(String range) {
    Filters filter = new Filters();
    LocalDate leapDay = LocalDate.of(2024, 2, 29);
    filter.from = "to".equals(range) ? null : leapDay;
    filter.to = "from".equals(range) ? null : leapDay;
    search(filter);
    Root<AuditLogEntity> root = mock(Root.class, RETURNS_DEEP_STUBS);
    CriteriaBuilder builder = mock(CriteriaBuilder.class, RETURNS_DEEP_STUBS);
    specification.getValue().toPredicate(root, mock(CriteriaQuery.class), builder);

    if (filter.from != null) {
      verify(builder).greaterThanOrEqualTo(root.get("createdAt"),
          OffsetDateTime.parse("2024-02-29T00:00:00+07:00"));
    } else {
      verify(builder, never()).greaterThanOrEqualTo(any(), any(OffsetDateTime.class));
    }
    if (filter.to != null) {
      verify(builder).lessThan(root.get("createdAt"),
          OffsetDateTime.parse("2024-03-01T00:00:00+07:00"));
    } else {
      verify(builder, never()).lessThan(any(), any(OffsetDateTime.class));
    }
  }

  @Test
  void dateFiltersUseHoChiMinhZoneRulesForHistoricalDates() {
    Filters filter = new Filters();
    filter.from = LocalDate.of(1970, 1, 1);
    filter.to = filter.from;
    search(filter);
    Root<AuditLogEntity> root = mock(Root.class, RETURNS_DEEP_STUBS);
    CriteriaBuilder builder = mock(CriteriaBuilder.class, RETURNS_DEEP_STUBS);
    specification.getValue().toPredicate(root, mock(CriteriaQuery.class), builder);

    verify(builder).greaterThanOrEqualTo(root.get("createdAt"),
        OffsetDateTime.parse("1970-01-01T00:00:00+08:00"));
    verify(builder).lessThan(root.get("createdAt"),
        OffsetDateTime.parse("1970-01-02T00:00:00+08:00"));
  }

  @Test
  void dateFiltersAreIndependentOfTheJvmDefaultTimezone() {
    TimeZone previous = TimeZone.getDefault();
    try {
      TimeZone.setDefault(TimeZone.getTimeZone("Pacific/Honolulu"));
      Filters filter = new Filters();
      filter.from = LocalDate.of(2026, 10, 23);
      filter.to = filter.from;
      search(filter);
      Root<AuditLogEntity> root = mock(Root.class, RETURNS_DEEP_STUBS);
      CriteriaBuilder builder = mock(CriteriaBuilder.class, RETURNS_DEEP_STUBS);
      specification.getValue().toPredicate(root, mock(CriteriaQuery.class), builder);

      verify(builder).greaterThanOrEqualTo(root.get("createdAt"),
          OffsetDateTime.parse("2026-10-23T00:00:00+07:00"));
      verify(builder).lessThan(root.get("createdAt"),
          OffsetDateTime.parse("2026-10-24T00:00:00+07:00"));
    } finally {
      TimeZone.setDefault(previous);
    }
  }

  @Test
  void rejectsMissingRequestWithoutTouchingTheRepository() {
    assertThatThrownBy(() -> service.getAuditLogs(null)).isInstanceOf(BadRequestException.class);
    verifyNoInteractions(repository);
  }

  private AuditLogPageResponse search(Filters filter) {
    when(repository.findAll(any(Specification.class), any(Pageable.class)))
        .thenAnswer(invocation -> Page.empty(invocation.getArgument(1)));
    AuditLogPageResponse result = service.getAuditLogs(filter.build());
    verify(repository).findAll(specification.capture(), pageable.capture());
    verifyNoMoreInteractions(repository);
    return result;
  }

  @Test
  void actionsAreDistinctAndSortedWithoutAHardCodedGroupList() {
    when(repository.findDistinctActions()).thenReturn(List.of("new.action", "admin.audit.export", "new.action"));
    assertThat(service.getActions()).containsExactly("admin.audit.export", "new.action");
    verify(repository).findDistinctActions();
    verifyNoMoreInteractions(repository);
  }

  @Test
  void actionsCanBeEmpty() {
    when(repository.findDistinctActions()).thenReturn(List.of());
    assertThat(service.getActions()).isEmpty();
  }

  @Test
  void exportBatchesIgnoreTheUiPageAndMapNullActors() {
    Filters filter = new Filters();
    filter.page = 9;
    AuditLogEntity entity = AuditLogEntity.create(null, "system.example", "flight", "1", "Thử",
        OffsetDateTime.parse("2026-10-24T00:00:00Z"));
    when(repository.findAll(any(Specification.class), any(Pageable.class)))
        .thenAnswer(invocation -> new PageImpl<>(List.of(entity), invocation.getArgument(1), 1001));
    assertThat(service.getExportBatch(filter.build(), 2)).hasSize(1)
        .allSatisfy(item -> assertThat(item.actorId()).isNull());
    verify(repository).findAll(specification.capture(), pageable.capture());
    assertThat(pageable.getValue().getPageNumber()).isEqualTo(2);
    assertThat(pageable.getValue().getPageSize()).isEqualTo(500);
    assertThat(pageable.getValue().getSort()).isEqualTo(
        org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC,
            "createdAt", "id"));
  }

  private static final class Filters {
    private Integer page;
    private Integer size;
    private String actorId;
    private String actorKeyword;
    private String actionPrefix;
    private String action;
    private String targetType;
    private String targetId;
    private LocalDate from;
    private LocalDate to;
    private String keyword;
    private Boolean includeHidden;

    private AuditLogFilterRequest build() {
      return new AuditLogFilterRequest(page, size, actorId, actorKeyword, actionPrefix, action,
          targetType, targetId, from, to, keyword, includeHidden);
    }
  }
}
