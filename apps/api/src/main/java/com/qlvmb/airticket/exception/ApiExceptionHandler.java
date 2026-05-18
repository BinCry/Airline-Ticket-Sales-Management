package com.qlvmb.airticket.exception;

import com.qlvmb.airticket.domain.dto.ApiErrorResponse;
import jakarta.validation.ConstraintViolationException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class ApiExceptionHandler {

  private static final String BAD_REQUEST_MESSAGE =
      "D\u1eef li\u1ec7u g\u1eedi l\u00ean kh\u00f4ng h\u1ee3p l\u1ec7.";
  private static final String ACCESS_DENIED_MESSAGE =
      "B\u1ea1n kh\u00f4ng c\u00f3 quy\u1ec1n th\u1ef1c hi\u1ec7n thao t\u00e1c n\u00e0y.";
  private static final String NOT_FOUND_MESSAGE =
      "Kh\u00f4ng t\u00ecm th\u1ea5y \u0111\u01b0\u1eddng d\u1eabn ho\u1eb7c t\u00e0i nguy\u00ean y\u00eau c\u1ea7u.";
  private static final String SYSTEM_UNAVAILABLE_MESSAGE =
      "H\u1ec7 th\u1ed1ng t\u1ea1m th\u1eddi ch\u01b0a th\u1ec3 x\u1eed l\u00fd y\u00eau c\u1ea7u n\u00e0y.";
  private static final String SYSTEM_ERROR_MESSAGE =
      "H\u1ec7 th\u1ed1ng t\u1ea1m th\u1eddi g\u1eb7p s\u1ef1 c\u1ed1. Vui l\u00f2ng th\u1eed l\u1ea1i sau.";

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ApiErrorResponse> handleApiException(ApiException exception) {
    return buildErrorResponse(exception.getStatus(), exception.getMessage(), Map.of());
  }

  @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
  public ResponseEntity<ApiErrorResponse> handleValidationException(Exception exception) {
    Map<String, String> errors = new LinkedHashMap<>();

    if (exception instanceof MethodArgumentNotValidException methodArgumentNotValidException) {
      methodArgumentNotValidException.getBindingResult().getFieldErrors().forEach((fieldError) ->
          errors.put(fieldError.getField(), buildFieldMessage(fieldError))
      );
    }

    if (exception instanceof BindException bindException) {
      bindException.getBindingResult().getFieldErrors().forEach((fieldError) ->
          errors.put(fieldError.getField(), buildFieldMessage(fieldError))
      );
    }

    return buildErrorResponse(HttpStatus.BAD_REQUEST, BAD_REQUEST_MESSAGE, errors);
  }

  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiErrorResponse> handleConstraintViolation(ConstraintViolationException exception) {
    Map<String, String> errors = new LinkedHashMap<>();
    exception.getConstraintViolations().forEach((violation) -> {
      String rawPath = violation.getPropertyPath() == null ? "" : violation.getPropertyPath().toString();
      String fieldName = extractLeafFieldName(rawPath);
      String message = violation.getMessage() == null || violation.getMessage().isBlank()
          ? resolveFieldLabel(fieldName) + " kh\u00f4ng h\u1ee3p l\u1ec7."
          : violation.getMessage();
      errors.put(fieldName, message);
    });
    return buildErrorResponse(HttpStatus.BAD_REQUEST, BAD_REQUEST_MESSAGE, errors);
  }

  @ExceptionHandler(MissingServletRequestParameterException.class)
  public ResponseEntity<ApiErrorResponse> handleMissingRequestParameter(
      MissingServletRequestParameterException exception
  ) {
    return buildErrorResponse(
        HttpStatus.BAD_REQUEST,
        "Thi\u1ebfu tham s\u1ed1 b\u1eaft bu\u1ed9c '" + exception.getParameterName() + "'.",
        Map.of()
    );
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ResponseEntity<ApiErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
    return buildErrorResponse(
        HttpStatus.BAD_REQUEST,
        "Gi\u00e1 tr\u1ecb c\u1ee7a tham s\u1ed1 '" + exception.getName() + "' kh\u00f4ng h\u1ee3p l\u1ec7.",
        Map.of()
    );
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiErrorResponse> handleUnreadableBody(HttpMessageNotReadableException exception) {
    return buildErrorResponse(
        HttpStatus.BAD_REQUEST,
        "N\u1ed9i dung y\u00eau c\u1ea7u kh\u00f4ng \u0111\u00fang \u0111\u1ecbnh d\u1ea1ng JSON h\u1ee3p l\u1ec7.",
        Map.of()
    );
  }

  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ApiErrorResponse> handleMethodNotSupported(
      HttpRequestMethodNotSupportedException exception
  ) {
    return buildErrorResponse(
        HttpStatus.BAD_REQUEST,
        "Ph\u01b0\u01a1ng th\u1ee9c y\u00eau c\u1ea7u kh\u00f4ng \u0111\u01b0\u1ee3c h\u1ed7 tr\u1ee3 cho \u0111\u01b0\u1eddng d\u1eabn n\u00e0y.",
        Map.of()
    );
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException exception) {
    return buildErrorResponse(HttpStatus.FORBIDDEN, ACCESS_DENIED_MESSAGE, Map.of());
  }

  @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
  public ResponseEntity<ApiErrorResponse> handleNotFound(Exception exception) {
    return buildErrorResponse(HttpStatus.NOT_FOUND, NOT_FOUND_MESSAGE, Map.of());
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<ApiErrorResponse> handleIllegalState(IllegalStateException exception) {
    return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, SYSTEM_UNAVAILABLE_MESSAGE, Map.of());
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiErrorResponse> handleUnexpectedException(Exception exception) {
    return buildErrorResponse(
        HttpStatus.INTERNAL_SERVER_ERROR,
        SYSTEM_ERROR_MESSAGE,
        Map.of()
    );
  }

  private ResponseEntity<ApiErrorResponse> buildErrorResponse(
      HttpStatus status,
      String message,
      Map<String, String> errors
  ) {
    return ResponseEntity.status(status)
        .body(new ApiErrorResponse(
            status.value(),
            message,
            errors,
            OffsetDateTime.now()
        ));
  }

  private String buildFieldMessage(FieldError fieldError) {
    String defaultMessage = fieldError.getDefaultMessage();
    if (defaultMessage != null && containsVietnameseCharacter(defaultMessage)) {
      return defaultMessage;
    }

    String fieldLabel = resolveFieldLabel(fieldError.getField());
    String validationCode = fieldError.getCode();

    if ("NotBlank".equals(validationCode) || "NotNull".equals(validationCode)) {
      return fieldLabel + " kh\u00f4ng \u0111\u01b0\u1ee3c \u0111\u1ec3 tr\u1ed1ng.";
    }

    if ("Email".equals(validationCode)) {
      return fieldLabel + " ph\u1ea3i l\u00e0 \u0111\u1ecba ch\u1ec9 email h\u1ee3p l\u1ec7.";
    }

    if ("Pattern".equals(validationCode)) {
      String fieldName = extractLeafFieldName(fieldError.getField());
      if ("phone".equals(fieldName)) {
        return "S\u1ed1 \u0111i\u1ec7n tho\u1ea1i ph\u1ea3i g\u1ed3m t\u1eeb 9 \u0111\u1ebfn 15 ch\u1eef s\u1ed1 ho\u1eb7c k\u00fd t\u1ef1 + \u1edf \u0111\u1ea7u.";
      }
      if ("otp".equals(fieldName)) {
        return "M\u00e3 OTP ph\u1ea3i g\u1ed3m \u0111\u00fang 6 ch\u1eef s\u1ed1.";
      }
      return fieldLabel + " kh\u00f4ng \u0111\u00fang \u0111\u1ecbnh d\u1ea1ng.";
    }

    if ("Size".equals(validationCode)) {
      List<Integer> numbers = extractNumberArguments(fieldError.getArguments());
      if (numbers.size() >= 2) {
        int min = numbers.stream().min(Integer::compareTo).orElse(0);
        int max = numbers.stream().max(Integer::compareTo).orElse(0);
        if (min > 0) {
          return fieldLabel + " ph\u1ea3i c\u00f3 t\u1eeb " + min + " \u0111\u1ebfn " + max + " k\u00fd t\u1ef1.";
        }
        return fieldLabel + " kh\u00f4ng \u0111\u01b0\u1ee3c v\u01b0\u1ee3t qu\u00e1 " + max + " k\u00fd t\u1ef1.";
      }
      return fieldLabel + " kh\u00f4ng h\u1ee3p l\u1ec7 v\u1ec1 \u0111\u1ed9 d\u00e0i.";
    }

    return fieldLabel + " kh\u00f4ng h\u1ee3p l\u1ec7.";
  }

  private String resolveFieldLabel(String fieldName) {
    return switch (extractLeafFieldName(fieldName)) {
      case "displayName" -> "T\u00ean hi\u1ec3n th\u1ecb";
      case "email" -> "Email";
      case "phone" -> "S\u1ed1 \u0111i\u1ec7n tho\u1ea1i";
      case "password" -> "M\u1eadt kh\u1ea9u";
      case "currentPassword" -> "M\u1eadt kh\u1ea9u hi\u1ec7n t\u1ea1i";
      case "newPassword" -> "M\u1eadt kh\u1ea9u m\u1edbi";
      case "refreshToken" -> "M\u00e3 phi\u00ean \u0111\u0103ng nh\u1eadp";
      case "otp" -> "M\u00e3 OTP";
      case "fullName" -> "H\u1ecd t\u00ean";
      case "passengerType" -> "Lo\u1ea1i h\u00e0nh kh\u00e1ch";
      case "dateOfBirth" -> "Ng\u00e0y sinh";
      case "documentType" -> "Lo\u1ea1i gi\u1ea5y t\u1edd";
      case "documentNumber" -> "S\u1ed1 gi\u1ea5y t\u1edd";
      case "tripType" -> "Lo\u1ea1i h\u00e0nh tr\u00ecnh";
      case "bookingCode" -> "M\u00e3 \u0111\u1eb7t ch\u1ed7";
      default -> "Tr\u01b0\u1eddng '" + fieldName + "'";
    };
  }

  private String extractLeafFieldName(String fieldName) {
    int lastDotIndex = fieldName.lastIndexOf('.');
    if (lastDotIndex < 0 || lastDotIndex == fieldName.length() - 1) {
      return fieldName;
    }
    return fieldName.substring(lastDotIndex + 1);
  }

  private boolean containsVietnameseCharacter(String value) {
    return value.codePoints().anyMatch(codePoint -> codePoint > 127);
  }

  private List<Integer> extractNumberArguments(Object[] arguments) {
    List<Integer> numbers = new ArrayList<>();
    if (arguments == null) {
      return numbers;
    }
    for (Object argument : arguments) {
      if (argument instanceof Number number) {
        numbers.add(number.intValue());
      }
    }
    return numbers;
  }
}
