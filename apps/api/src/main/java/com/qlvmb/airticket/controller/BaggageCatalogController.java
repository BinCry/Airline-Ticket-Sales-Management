package com.qlvmb.airticket.controller;
import com.qlvmb.airticket.service.ProductCatalogService;
import java.util.List;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/baggage")
public class BaggageCatalogController {
 private final ProductCatalogService catalog;
 public BaggageCatalogController(ProductCatalogService catalog){this.catalog=catalog;}
 @GetMapping("/options") public List<ProductCatalogService.BaggageMeta> options(){return catalog.baggageOptions();}
}
