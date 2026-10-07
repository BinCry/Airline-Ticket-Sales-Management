package com.qlvmb.airticket.controller;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.qlvmb.airticket.config.SecurityConfig;
import com.qlvmb.airticket.domain.dto.*;
import com.qlvmb.airticket.domain.entity.*;
import com.qlvmb.airticket.repository.UserAccountRepository;
import com.qlvmb.airticket.security.*;
import com.qlvmb.airticket.service.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers={SeatMapController.class,AircraftOperationsController.class})
@Import({SecurityConfig.class,JwtAuthenticationFilter.class,JwtTokenService.class})
class SeatMapSecurityTest {
  @Autowired MockMvc mvc;
  @Autowired JwtTokenService jwt;
  @MockitoBean SeatMapService seats;
  @MockitoBean AircraftOperationsService aircraft;
  @MockitoBean UserAccountRepository users;

  @Test void publicSeatMapOnlyContainsCabinAndStatus() throws Exception {
    var layout = new SeatMapResponse.Layout(List.of("A","C","D","F"),List.of("C"),
        List.of(new SeatMapResponse.Row(1,"thuong_gia",List.of("A","C","D","F"))),List.of());
    when(seats.getSeatMap(123L)).thenReturn(new SeatMapResponse(123,1,"VN-TEST","A321","Cabin thử",layout,
        List.of(new SeatMapResponse.Seat("1A","thuong_gia",true,false))));
    mvc.perform(get("/api/flights/123/seat-map")).andExpect(status().isOk())
        .andExpect(jsonPath("$.seats[0].occupied").value(true))
        .andExpect(jsonPath("$.bookingCode").doesNotExist())
        .andExpect(jsonPath("$.email").doesNotExist())
        .andExpect(jsonPath("$.seats[0].passengerName").doesNotExist());
  }

  @Test void guestCannotReadAircraftManagement() throws Exception {
    mvc.perform(get("/api/backoffice/operations/aircraft-types")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/backoffice/operations/aircraft")).andExpect(status().isUnauthorized());
    verifyNoInteractions(aircraft);
  }

  @Test void memberCannotReadOrWriteAircraftManagement() throws Exception {
    String token = token(false);
    for (String resource:List.of("aircraft-types","aircraft")) {
      String path = "/api/backoffice/operations/"+resource;
      mvc.perform(get(path).header("Authorization",token)).andExpect(status().isForbidden());
      mvc.perform(post(path).header("Authorization",token).contentType(MediaType.APPLICATION_JSON).content("{}"))
          .andExpect(status().isForbidden());
      mvc.perform(patch(path+"/1").header("Authorization",token).contentType(MediaType.APPLICATION_JSON).content("{}"))
          .andExpect(status().isForbidden());
    }
    verifyNoInteractions(aircraft);
  }

  @Test void operationsCanListAndSaveAircraftUsingExistingPermission() throws Exception {
    String token = token(true);
    when(aircraft.getTypes()).thenReturn(List.of()); when(aircraft.getAircraft()).thenReturn(List.of());
    mvc.perform(get("/api/backoffice/operations/aircraft-types").header("Authorization",token))
        .andExpect(status().isOk()).andExpect(jsonPath("$").isArray());
    mvc.perform(get("/api/backoffice/operations/aircraft").header("Authorization",token))
        .andExpect(status().isOk()).andExpect(jsonPath("$").isArray());
    when(aircraft.saveAircraft(isNull(),any())).thenReturn(new AircraftResponse(1,1,"VN-TEST","ACTIVE","A321","Cabin thử"));
    mvc.perform(post("/api/backoffice/operations/aircraft").header("Authorization",token).contentType(MediaType.APPLICATION_JSON)
        .content("{\"aircraftTypeId\":1,\"registrationCode\":\"VN-TEST\",\"status\":\"ACTIVE\"}"))
        .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(1));
  }

  @Test void operationsInvalidInputIsRejectedAtBoundary() throws Exception {
    mvc.perform(post("/api/backoffice/operations/aircraft").header("Authorization",token(true))
        .contentType(MediaType.APPLICATION_JSON).content("{\"aircraftTypeId\":-1,\"registrationCode\":\"\",\"status\":\"BROKEN\"}"))
        .andExpect(status().isBadRequest());
    verifyNoInteractions(aircraft);
  }

  private String token(boolean operations) {
    UserAccountEntity user = BeanUtils.instantiateClass(UserAccountEntity.class);
    ReflectionTestUtils.setField(user,"id",1L); ReflectionTestUtils.setField(user,"email","test@example.com");
    ReflectionTestUtils.setField(user,"displayName","Khách thử"); ReflectionTestUtils.setField(user,"status","active");
    RoleEntity role = BeanUtils.instantiateClass(RoleEntity.class);
    ReflectionTestUtils.setField(role,"code",operations?"operations_staff":"member");
    if (operations) {
      PermissionEntity permission = BeanUtils.instantiateClass(PermissionEntity.class);
      ReflectionTestUtils.setField(permission,"code",PermissionCode.BACKOFFICE_OPERATIONS);
      ReflectionTestUtils.setField(role,"permissions",new LinkedHashSet<>(List.of(permission)));
    }
    ReflectionTestUtils.setField(user,"roles",new LinkedHashSet<>(List.of(role)));
    when(users.findOneWithRolesById(1L)).thenReturn(Optional.of(user));
    return "Bearer "+jwt.issueTokenPair(user,"seat-test").accessToken();
  }
}
