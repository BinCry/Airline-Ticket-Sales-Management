param(
  [string]$ApiBaseUrl = "https://api.airplane.id.vn",
  [string]$JwtSecret = "dummy-secret-for-config-check"
)

$ErrorActionPreference = "Stop"

function LayLenhAzureCli {
  $lenh = Get-Command az -ErrorAction SilentlyContinue
  if ($null -ne $lenh) {
    return $lenh.Source
  }

  $duongDanWindows = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"
  if (Test-Path $duongDanWindows) {
    return $duongDanWindows
  }

  throw "Không tìm thấy Azure CLI để kiểm tra Bicep."
}

function ChayComposeConfig {
  if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    docker-compose -f docker-compose.prod.yml config | Out-Null
    return
  }

  if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker compose -f docker-compose.prod.yml config | Out-Null
    return
  }

  throw "Không tìm thấy Docker Compose để kiểm tra docker-compose.prod.yml."
}

$gocDuAn = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Push-Location $gocDuAn

try {
  $env:NEXT_PUBLIC_API_BASE_URL = $ApiBaseUrl
  $env:APP_AUTH_JWT_SECRET = $JwtSecret

  Write-Host "==> Kiểm tra cú pháp docker-compose.prod.yml"
  ChayComposeConfig

  Write-Host "==> Kiểm tra biên dịch Bicep"
  $lenhAz = LayLenhAzureCli
  & $lenhAz bicep build --file "infra/azure/main.bicep" | Out-Null

  Write-Host "==> Kiểm tra cấu hình production hoàn tất"
}
finally {
  Pop-Location
}
