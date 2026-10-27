package com.qlvmb.airticket.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qlvmb.airticket.domain.entity.AuditLogEntity;
import com.qlvmb.airticket.domain.entity.UserAccountEntity;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.time.OffsetDateTime;
import java.util.function.Function;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class AuditLogSpecificationsTest {

  @Mock private Root<AuditLogEntity> root;
  @Mock private CriteriaQuery<?> query;
  @Mock private CriteriaBuilder builder;
  @Mock private Predicate predicate;

  @Test
  void visibilityExcludesHiddenOnlyWhenRequested() {
    Path<Object> hiddenAt = mock(Path.class);
    when(root.get("hiddenAt")).thenReturn(hiddenAt);
    when(builder.isNull(hiddenAt)).thenReturn(predicate);

    assertThat(AuditLogSpecifications.visibility(false).toPredicate(root, query, builder))
        .isSameAs(predicate);
    when(builder.conjunction()).thenReturn(predicate);
    assertThat(AuditLogSpecifications.visibility(true).toPredicate(root, query, builder))
        .isSameAs(predicate);
  }

  @Test
  void absentActorUsesIsNullWithoutAnInnerJoin() {
    Path<Object> actor = mock(Path.class);
    when(root.get("actorUserAccount")).thenReturn(actor);
    AuditLogSpecifications.withoutActor().toPredicate(root, query, builder);
    verify(builder).isNull(actor);
    verify(root, never()).join("actorUserAccount", JoinType.INNER);
  }

  @Test
  void actorIdMatchesTheRelatedAccountId() {
    Path<Object> actor = mock(Path.class);
    Path<Object> id = mock(Path.class);
    when(root.get("actorUserAccount")).thenReturn(actor);
    when(actor.get("id")).thenReturn(id);
    AuditLogSpecifications.actorId(42L).toPredicate(root, query, builder);
    verify(builder).equal(id, 42L);
  }

  static Stream<Arguments> literalContainsFilters() {
    return Stream.of(
        Arguments.of("detail", (Function<String, Specification<AuditLogEntity>>) AuditLogSpecifications::keyword),
        Arguments.of("targetId", (Function<String, Specification<AuditLogEntity>>) AuditLogSpecifications::targetId)
    );
  }

  @ParameterizedTest
  @MethodSource("literalContainsFilters")
  void containsFiltersEscapeWildcardsAndBackslashes(String field,
      Function<String, Specification<AuditLogEntity>> filter) {
    Path<String> path = mock(Path.class);
    Expression<String> lower = mock(Expression.class);
    when(root.<String>get(field)).thenReturn(path);
    when(builder.lower(path)).thenReturn(lower);

    filter.apply("VN%_\\' OR 1=1").toPredicate(root, query, builder);

    verify(builder).like(lower, "%vn\\%\\_\\\\' or 1=1%", '\\');
  }

  @Test
  void actorKeywordMatchesEmailOrNameWithAnEscapedLiteralAndLeftJoin() {
    Join<AuditLogEntity, UserAccountEntity> actor = mock(Join.class);
    Path<String> email = mock(Path.class);
    Path<String> name = mock(Path.class);
    Expression<String> lowerEmail = mock(Expression.class);
    Expression<String> lowerName = mock(Expression.class);
    Predicate emailMatch = mock(Predicate.class);
    Predicate nameMatch = mock(Predicate.class);
    when(root.<AuditLogEntity, UserAccountEntity>join("actorUserAccount", JoinType.LEFT)).thenReturn(actor);
    when(actor.<String>get("email")).thenReturn(email);
    when(actor.<String>get("displayName")).thenReturn(name);
    when(builder.lower(email)).thenReturn(lowerEmail);
    when(builder.lower(name)).thenReturn(lowerName);
    when(builder.like(lowerEmail, "%tên\\%\\_\\\\%", '\\')).thenReturn(emailMatch);
    when(builder.like(lowerName, "%tên\\%\\_\\\\%", '\\')).thenReturn(nameMatch);
    when(builder.or(emailMatch, nameMatch)).thenReturn(predicate);

    assertThat(AuditLogSpecifications.actorKeyword("TÊN%_\\").toPredicate(root, query, builder))
        .isSameAs(predicate);
  }

  static Stream<Arguments> actionPrefixes() {
    return Stream.of(
        Arguments.of("operations", "operations.%"),
        Arguments.of("operations.", "operations.%"),
        Arguments.of("operations%_\\", "operations\\%\\_\\\\.%"),
        Arguments.of("operations.%_\\", "operations.\\%\\_\\\\.%")
    );
  }

  @ParameterizedTest
  @MethodSource("actionPrefixes")
  void actionPrefixRequiresADotBoundaryAndEscapesLiterals(String prefix, String pattern) {
    Path<String> action = mock(Path.class);
    when(root.<String>get("action")).thenReturn(action);
    AuditLogSpecifications.actionPrefix(prefix).toPredicate(root, query, builder);
    verify(builder).like(action, pattern, '\\');
  }

  @Test
  void actionAndTargetTypeUseEquality() {
    Path<Object> action = mock(Path.class);
    Path<Object> targetType = mock(Path.class);
    when(root.get("action")).thenReturn(action);
    when(root.get("targetType")).thenReturn(targetType);
    AuditLogSpecifications.action("admin.user.roles.update").toPredicate(root, query, builder);
    AuditLogSpecifications.targetType("user_account").toPredicate(root, query, builder);
    verify(builder).equal(action, "admin.user.roles.update");
    verify(builder).equal(targetType, "user_account");
  }

  @Test
  void timeIntervalIncludesStartAndExcludesTheNextDay() {
    Path<OffsetDateTime> createdAt = mock(Path.class);
    when(root.<OffsetDateTime>get("createdAt")).thenReturn(createdAt);
    OffsetDateTime from = OffsetDateTime.parse("2026-10-01T00:00:00+07:00");
    OffsetDateTime before = from.plusDays(1);
    AuditLogSpecifications.createdFrom(from).toPredicate(root, query, builder);
    AuditLogSpecifications.createdBefore(before).toPredicate(root, query, builder);
    verify(builder).greaterThanOrEqualTo(createdAt, from);
    verify(builder).lessThan(createdAt, before);
  }
}
