package com.qlvmb.airticket.service;
import java.io.IOException;
import java.util.Set;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class RealtimeFlightStreamService {
 private static final long TTL=9L*60_000;
 private static final int MAX_CLIENTS=2000;
 private final ConcurrentHashMap<String,Set<SseEmitter>> members=new ConcurrentHashMap<>();
 private final ConcurrentHashMap<String,Set<SseEmitter>> publicFlights=new ConcurrentHashMap<>();
 private final AtomicInteger count=new AtomicInteger();
 public SseEmitter privateStream(String email){return register(members,email.toLowerCase(Locale.ROOT));}
 public SseEmitter publicStream(String flightCode){return register(publicFlights,flightCode.toUpperCase(Locale.ROOT));}
 private SseEmitter register(ConcurrentHashMap<String,Set<SseEmitter>> registry,String key){
  if(count.incrementAndGet()>MAX_CLIENTS){count.decrementAndGet();throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"Too many streams");}
  var stream=new SseEmitter(TTL);var set=registry.computeIfAbsent(key,k->ConcurrentHashMap.newKeySet());set.add(stream);
  Runnable cleanup=()->{if(set.remove(stream))count.decrementAndGet();if(set.isEmpty())registry.remove(key,set);};
  stream.onCompletion(cleanup);stream.onTimeout(cleanup);stream.onError(error->cleanup.run());
  try{stream.send(SseEmitter.event().name("connected").data("ok"));}catch(IOException e){cleanup.run();stream.completeWithError(e);}
  return stream;
 }
 public void pushPrivate(String email,Long id){broadcast(members,email.toLowerCase(Locale.ROOT),"notification",String.valueOf(id));}
 public void pushFlight(String flightCode,String payload){broadcast(publicFlights,flightCode.toUpperCase(Locale.ROOT),"flight-change",payload);}
 private void broadcast(ConcurrentHashMap<String,Set<SseEmitter>> registry,String key,String event,String payload){
  for(var emitter:registry.getOrDefault(key,Set.of()))try{emitter.send(SseEmitter.event().name(event).data(payload));}
  catch(Exception e){emitter.complete();}
 }
 @Scheduled(fixedDelay=25000)
 public void heartbeat(){for(var registry:java.util.List.of(members,publicFlights))
   for(var set:registry.values())for(var emitter:set)try{emitter.send(SseEmitter.event().comment("heartbeat"));}
     catch(Exception e){emitter.complete();}
 }
}
