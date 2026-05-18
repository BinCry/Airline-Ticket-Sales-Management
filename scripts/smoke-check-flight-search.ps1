param(
  [string]$ApiBaseUrl = "http://localhost:8080"
)

$query = "from=SGN&to=HAN&departureDate=2026-05-23&returnDate=2026-05-26&tripType=round_trip&adultCount=1&childCount=0&infantCount=0"
$uri = "$ApiBaseUrl/api/flights/search?$query"

try {
  $response = Invoke-RestMethod -Uri $uri -Method Get
} catch {
  Write-Error "Không gọi được API tìm chuyến bay tại $uri"
  exit 1
}

$outboundCodes = @($response.outboundFlights | ForEach-Object { $_.code })
$returnCodes = @($response.returnFlights | ForEach-Object { $_.code })

if (-not ($outboundCodes -contains "VN5201")) {
  Write-Error "Thiếu chuyến chiều đi VN5201 trong dữ liệu local."
  exit 1
}

if (-not ($returnCodes -contains "VN5302")) {
  Write-Error "Thiếu chuyến chiều về VN5302 trong dữ liệu local."
  exit 1
}

Write-Output "Smoke check thành công."
Write-Output "Chiều đi: $($outboundCodes -join ', ')"
Write-Output "Chiều về: $($returnCodes -join ', ')"
