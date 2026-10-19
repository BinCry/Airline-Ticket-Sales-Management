package com.qlvmb.airticket.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

@Configuration
public class NotificationDeliveryConfig {
  @Bean(name="notificationDeliveryExecutor")
  public ThreadPoolTaskExecutor notificationDeliveryExecutor(){
    ThreadPoolTaskExecutor executor=new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(2);executor.setMaxPoolSize(4);executor.setQueueCapacity(500);
    executor.setThreadNamePrefix("notification-mail-");executor.initialize();return executor;
  }
}
