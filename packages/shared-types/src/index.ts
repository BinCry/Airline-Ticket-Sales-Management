export const USER_ROLES = [
  "guest",
  "customer",
  "member",
  "customer_support",
  "operations_staff",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const STAFF_ROLES = [
  "customer_support",
  "operations_staff",
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const TRIP_TYPES = ["one_way", "round_trip"] as const;
export type TripType = (typeof TRIP_TYPES)[number];

export const PASSENGER_TYPES = ["adult", "child", "infant"] as const;
export type PassengerType = (typeof PASSENGER_TYPES)[number];

export const FARE_FAMILIES = [
  "pho_thong_tiet_kiem",
  "pho_thong_linh_hoat",
  "thuong_gia"
] as const;
export type FareFamily = (typeof FARE_FAMILIES)[number];

export const BOOKING_STATUSES = [
  "draft",
  "held",
  "awaiting_payment",
  "paid",
  "ticketed",
  "checked_in",
  "refund_pending",
  "changed",
  "cancelled",
  "refunded"
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "processing",
  "paid",
  "failed",
  "expired",
  "refunded"
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const TICKET_STATUSES = [
  "reserved",
  "issued",
  "checked_in",
  "changed",
  "cancelled"
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const FLIGHT_STATUSES = [
  "scheduled",
  "on_time",
  "boarding",
  "delayed",
  "departed",
  "landed",
  "cancelled"
] as const;
export type FlightStatus = (typeof FLIGHT_STATUSES)[number];

export const SUPPORT_TICKET_STATUSES = [
  "new",
  "open",
  "awaiting_customer",
  "escalated",
  "resolved",
  "closed"
] as const;
export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export const CONTENT_TYPES = [
  "banner",
  "blog",
  "faq",
  "promotion",
  "airport_guide",
  "policy_page"
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const NOTIFICATION_TYPES = [
  "booking_created",
  "payment_received",
  "flight_changed",
  "check_in_opened",
  "refund_processed",
  "support_updated"
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type LocaleCode = "vi" | "en";

export interface LocalizedText {
  vi: string;
  en: string;
}

export interface NavigationLink {
  label: string;
  href: string;
  description?: string;
}

export interface QuickService {
  title: string;
  subtitle: string;
  href: string;
}

export interface DestinationSpotlight {
  code: string;
  city: string;
  airport: string;
  priceFrom: number;
  highlights: string[];
}

export interface BlogPost {
  slug: string;
  category: string;
  title: string;
  summary: string;
  readTime: string;
}

export interface FlightResult {
  code: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  status: FlightStatus;
  fareFamily: FareFamily;
  price: number;
  seatsLeft: number;
}

export interface FareComparison {
  fareFamily: FareFamily;
  title: string;
  price: number;
  perks: string[];
}

export interface AncillaryService {
  code: string;
  name: string;
  description: string;
  price: number;
}

export interface RoleRule {
  role: UserRole;
  canAccess: string[];
  restrictedFrom: string[];
}

export interface SupportItem {
  title: string;
  description: string;
  channel: string;
}

export interface DashboardMetric {
  label: string;
  value: string;
  trend: string;
}

export interface BackofficeModule {
  key: string;
  title: string;
  summary: string;
  href: string;
  highlights: string[];
  roles: StaffRole[];
}

export interface AuditEntry {
  actor: string;
  action: string;
  target: string;
  time: string;
}

export interface AirportOption {
  code: string;
  cityName: string;
  airportName: string;
  terminalLabel: string;
}

export interface ApiFlightSearchCriteria {
  from: string;
  to: string;
  departureDate: string;
  returnDate: string | null;
  tripType: TripType;
  adultCount: number;
  childCount: number;
  infantCount: number;
}

export interface ApiFlightFareOption {
  inventoryId: number;
  fareFamily: FareFamily;
  title: string;
  price: number;
  seatsLeft: number;
  totalSeats: number;
}

export interface ApiFlightCard {
  flightId: number;
  code: string;
  from: string;
  to: string;
  originCode: string;
  destinationCode: string;
  departureAt: string;
  arrivalAt: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  status: FlightStatus;
  baseFare: number;
  fares: ApiFlightFareOption[];
}

export interface ApiFareCard {
  fareFamily: FareFamily;
  title: string;
  price: number;
  perks: string[];
}

export interface ApiFlightSearchResponse {
  tripType: TripType;
  from: string;
  to: string;
  filters: string[];
  flights: ApiFlightCard[];
  fares: ApiFareCard[];
  criteria: ApiFlightSearchCriteria;
  outboundFlights: ApiFlightCard[];
  returnFlights: ApiFlightCard[];
}

export interface ApiFlightStatusItem {
  flightId: number;
  code: string;
  from: string;
  to: string;
  originCode: string;
  destinationCode: string;
  departureAt: string;
  arrivalAt: string;
  departureTime: string;
  arrivalTime: string;
  status: FlightStatus;
  statusLabel: string;
  gate: string;
  note: string;
}

export interface ApiFlightStatusResponse {
  queryCode: string | null;
  queryDate: string | null;
  flights: ApiFlightStatusItem[];
}

export interface ApiBookingContactInput {
  fullName: string;
  email: string;
  phone: string;
}

export interface ApiBookingPassengerInput {
  fullName: string;
  passengerType: PassengerType;
  dateOfBirth: string;
  documentType: string;
  documentNumber: string;
}

export interface ApiBookingSegmentInput {
  inventoryId?: number | null;
  flightId?: number | null;
}

export interface ApiBookingAncillaryInput {
  code: string;
  quantity?: number | null;
}

export interface ApiBookingSeatSelectionInput {
  inventoryId: number;
  passengerIndex: number;
  segmentIndex?: number | null;
  seatNumber: string;
}

export interface ApiFlightBookingSeatItem {
  seatNumber: string;
  fareFamily: FareFamily;
  occupied: boolean;
}

export interface ApiFlightBookingFareOption {
  inventoryId: number;
  fareFamily: FareFamily;
  title: string;
  price: number;
  seatsLeft: number;
  totalSeats: number;
  rowStart: number;
  rowEnd: number;
}

export interface ApiFlightBookingOptionsResponse {
  flightId: number;
  code: string;
  originCode: string;
  destinationCode: string;
  from: string;
  to: string;
  departureAt: string;
  arrivalAt: string;
  baseFare: number;
  fareOptions: ApiFlightBookingFareOption[];
  seats: ApiFlightBookingSeatItem[];
}

export interface ApiCreateBookingHoldRequest {
  tripType: TripType;
  contact: ApiBookingContactInput;
  passengers: ApiBookingPassengerInput[];
  segments: ApiBookingSegmentInput[];
  ancillaries: ApiBookingAncillaryInput[];
  seatSelections: ApiBookingSeatSelectionInput[];
}

export interface ApiBookingPriceSummary {
  baseAmount: number;
  ancillaryAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: "VND";
  appliedVoucherCode: string | null;
}

export interface ApiBookingSelectedSegment {
  inventoryId: number;
  code: string;
  from: string;
  to: string;
  originCode: string;
  destinationCode: string;
  departureAt: string;
  arrivalAt: string;
  fareFamily: FareFamily;
  fareTitle: string;
  pricePerPassenger: number;
  passengerCount: number;
  subtotalAmount: number;
}

export interface ApiBookingSelectedAncillary {
  code: string;
  name: string;
  description: string;
  unitPrice: number;
  quantity: number;
  subtotalAmount: number;
}

export interface ApiBookingHoldResponse {
  bookingCode: string;
  status: Extract<BookingStatus, "held">;
  expiresAt: string;
  createdAt: string;
  tripType: TripType;
  contact: ApiBookingContactInput;
  passengers: ApiBookingPassengerInput[];
  selectedSegments: ApiBookingSelectedSegment[];
  selectedAncillaries: ApiBookingSelectedAncillary[];
  priceSummary: ApiBookingPriceSummary;
}

export interface ApiPaymentSessionResponse {
  bookingCode: string;
  provider: "sepay";
  sessionMode: "live" | "local";
  paymentUrl: string | null;
  paymentStatus: Extract<PaymentStatus, "pending" | "paid" | "failed" | "expired">;
  expiresAt: string;
  referenceCode: string;
  amount: number;
  bankName: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  qrCodeUrl: string | null;
  qrCodeDataUrl: string | null;
  discountAmount: number;
  appliedVoucherCode: string | null;
}

export interface ApiApplyVoucherRequest {
  voucherCode: string;
}

export interface ApiPaymentCallbackRequest {
  bookingCode: string;
  result?: "success" | "failed";
}

export interface ApiCheckinCompleteRequest {
  bookingCode: string;
  ticketNumbers: string[];
  seatSelections?: Array<{
    ticketNumber: string;
    seatNumber: string;
  }>;
}

export interface ApiBoardingPass {
  ticketNumber: string;
  passengerName: string;
  seatNumber: string;
  gate: string;
  boardingTime: string;
  barcode: string;
}

export interface ApiCheckinCompleteResponse {
  bookingCode: string;
  ticketNumbers: string[];
  boardingPasses: ApiBoardingPass[];
}

export interface ApiRefundRequest {
  reason: string;
}

export interface ApiManageBookingSegment {
  inventoryId: number;
  code: string;
  from: string;
  to: string;
  originCode: string;
  destinationCode: string;
  departureAt: string;
  arrivalAt: string;
  fareFamily: FareFamily;
  fareTitle: string;
  pricePerPassenger: number;
  passengerCount: number;
  subtotalAmount: number;
  status?: FlightStatus;
  statusLabel?: string;
  gate?: string;
  note?: string;
}

export interface ApiManageBookingContact {
  fullName: string;
  email: string;
  phone: string;
}

export interface ApiManageBookingPassenger {
  fullName: string;
  passengerType: PassengerType;
  dateOfBirth: string;
  documentType: string;
  documentNumber: string;
}

export interface ApiManageBookingAncillary {
  code: string;
  name: string;
  description: string;
  unitPrice: number;
  quantity: number;
  subtotalAmount: number;
}

export interface ApiManageBookingSeatSelection {
  inventoryId: number;
  flightCode: string;
  passengerName: string;
  seatNumber: string;
  unitPrice: number;
}

export interface ApiManageBookingTicket {
  ticketNumber: string;
  passengerName: string;
  status: Extract<TicketStatus, "issued" | "checked_in" | "cancelled">;
  issuedAt: string;
}

export interface ApiRefundRequestSummary {
  reason: string;
  refundAmount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export type ApiBackofficeRefundStatus = "pending" | "approved" | "rejected";

export interface ApiBackofficeRefundItem {
  id: number;
  bookingCode: string;
  bookingStatus: Extract<BookingStatus, "ticketed" | "refund_pending" | "cancelled">;
  contactName: string;
  reason: string;
  refundAmount: number;
  status: ApiBackofficeRefundStatus;
  createdAt: string;
}

export type ApiBackofficeRevenueGranularity = "day" | "month";

export interface ApiBackofficeRevenueBucket {
  key: string;
  label: string;
  paidAmount: number;
  refundedAmount: number;
  netRevenue: number;
  soldTicketCount: number;
  refundedTicketCount: number;
}

export interface ApiBackofficeRevenueDashboard {
  granularity: ApiBackofficeRevenueGranularity;
  periodLabel: string;
  generatedAt: string;
  totalRevenue: number;
  paidAmount: number;
  refundedAmount: number;
  soldTicketCount: number;
  refundedTicketCount: number;
  buckets: ApiBackofficeRevenueBucket[];
}

export interface ApiManageBookingPriceSummary {
  baseAmount: number;
  ancillaryAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: "VND";
  appliedVoucherCode: string | null;
}

export interface ApiManageBookingOverview {
  bookingCode: string;
  status: Extract<BookingStatus, "held" | "ticketed" | "refund_pending" | "cancelled">;
  paymentStatus: Extract<PaymentStatus, "pending" | "paid" | "failed" | "expired">;
  holdExpiresAt: string | null;
  ticketedAt: string | null;
  tripType: TripType;
  steps: string[];
  segments: ApiManageBookingSegment[];
  contact: ApiManageBookingContact | null;
  passengers: ApiManageBookingPassenger[];
  ancillaries: ApiManageBookingAncillary[];
  seatSelections: ApiManageBookingSeatSelection[];
  tickets: ApiManageBookingTicket[];
  boardingPasses: ApiBoardingPass[];
  refundRequest: ApiRefundRequestSummary | null;
  paymentMethods: string[];
  priceSummary: ApiManageBookingPriceSummary;
}
