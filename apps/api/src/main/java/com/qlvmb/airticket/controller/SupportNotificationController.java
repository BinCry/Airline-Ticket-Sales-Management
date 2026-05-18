package com.qlvmb.airticket.controller;

import com.qlvmb.airticket.domain.dto.NotificationOutboxResponse;
import com.qlvmb.airticket.security.PermissionCode;
import com.qlvmb.airticket.service.NotificationOutboxService;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/backoffice/support/notifications")
@PreAuthorize("hasAuthority('" + PermissionCode.BACKOFFICE_SUPPORT + "')")
public class SupportNotificationController {

  private final NotificationOutboxService notificationOutboxService;

  public SupportNotificationController(NotificationOutboxService notificationOutboxService) {
    this.notificationOutboxService = notificationOutboxService;
  }

  @GetMapping
  public List<NotificationOutboxResponse> getNotifications() {
    return notificationOutboxService.getNotifications();
  }

  @PostMapping("/{id}/retry")
  public NotificationOutboxResponse retryNotification(@PathVariable Long id) {
    return notificationOutboxService.retryNotification(id);
  }
}
