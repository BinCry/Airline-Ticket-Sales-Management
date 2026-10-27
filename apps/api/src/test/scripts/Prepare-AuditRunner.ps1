param([switch]$Approved)

$ErrorActionPreference = 'Stop'
if (-not $Approved) {
    throw 'Chỉ chạy sau khi đã duyệt riêng bước tạo credential, role và schema.'
}

Set-Location -LiteralPath 'C:\Users\WIN10PRO\Airline-Ticket-Sales-Management\apps\api'
if ((git branch --show-current) -ne 'feat/audit-log' -or $LASTEXITCODE -ne 0) {
    throw 'Branch không đúng phạm vi đã duyệt.'
}
if ((git rev-parse HEAD) -ne 'e7395584300c49550b37229aa0f13ecda9b6874f' -or $LASTEXITCODE -ne 0) {
    throw 'HEAD không đúng baseline đã duyệt.'
}

$env:JAVA_HOME = 'C:\Users\WIN10PRO\AppData\Local\Programs\Java\temurin21'
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$maven = 'C:\Users\WIN10PRO\Downloads\apache-maven-3.9.16\bin\mvn.cmd'
$settings = 'C:\Users\WIN10PRO\AppData\Local\Temp\airline-maven-central-only-2b2.xml'
foreach ($required in @($maven, $settings, "$env:JAVA_HOME\bin\java.exe")) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
        throw 'Thiếu công cụ hoặc settings đã duyệt; không tự cài hoặc thay thế.'
    }
}

$credentialDirectory = 'C:\Users\WIN10PRO\AppData\Local\CodexTools\AirlineAuditPostgres15'
$credentialPath = Join-Path $credentialDirectory 'airline-audit-runner-password.txt'
$bootstrapPath = Join-Path $credentialDirectory 'postgres-password.txt'
$directory = Get-Item -LiteralPath $credentialDirectory
if (-not $directory.PSIsContainer -or ($directory.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'Thư mục credential không hợp lệ; không tự tạo hoặc sửa thư mục.'
}
if (-not (Test-Path -LiteralPath $bootstrapPath -PathType Leaf) -or (Test-Path -LiteralPath $credentialPath)) {
    throw 'Thiếu credential bootstrap hoặc file runner đã tồn tại; không ghi đè.'
}

# Tạo file rỗng độc quyền; chỉ ghi secret sau khi ACL đã được giới hạn và kiểm tra.
$empty = [IO.File]::Open($credentialPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
$empty.Dispose()
$account = [Security.Principal.WindowsIdentity]::GetCurrent().User
$systemAccount = [Security.Principal.SecurityIdentifier]::new('S-1-5-18')
$acl = [Security.AccessControl.FileSecurity]::new()
$acl.SetOwner($account)
$acl.SetAccessRuleProtection($true, $false)
$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($account, 'FullControl', 'Allow'))
$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($systemAccount, 'Read', 'Allow'))
Set-Acl -LiteralPath $credentialPath -AclObject $acl
$actualAcl = Get-Acl -LiteralPath $credentialPath
$rules = @($actualAcl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
if (-not $actualAcl.AreAccessRulesProtected -or $rules.Count -ne 2) {
    throw 'ACL không đúng; giữ file rỗng và dừng.'
}
foreach ($rule in $rules) {
    if ($rule.AccessControlType -ne 'Allow' -or
        ($rule.IdentityReference.Value -ne $account.Value -and $rule.IdentityReference.Value -ne $systemAccount.Value)) {
        throw 'ACL có tài khoản ngoài phạm vi; chưa ghi credential.'
    }
}

$random = [Security.Cryptography.RandomNumberGenerator]::Create()
$entropy = New-Object byte[] 48
$encoded = $null
$stream = $null
try {
    $random.GetBytes($entropy)
    $encoded = [Text.Encoding]::UTF8.GetBytes([Convert]::ToBase64String($entropy))
    $stream = [IO.File]::Open($credentialPath, [IO.FileMode]::Open, [IO.FileAccess]::Write, [IO.FileShare]::None)
    $stream.Write($encoded, 0, $encoded.Length)
    $stream.Flush($true)
} finally {
    if ($null -ne $stream) { $stream.Dispose() }
    $random.Dispose()
    [Array]::Clear($entropy, 0, $entropy.Length)
    if ($null -ne $encoded) { [Array]::Clear($encoded, 0, $encoded.Length) }
}

$env:AUDIT_TEST_DB_URL = 'jdbc:postgresql://127.0.0.1:55432/airline_audit_test'
$env:AUDIT_TEST_DB_USER = 'airline_audit_tester'
$env:AUDIT_TEST_DB_PASSWORD_FILE = $bootstrapPath
$env:AUDIT_TEST_SCHEMA = 'audit_it_20261025_01'
$env:AUDIT_TEST_PROVISION_RUNNER = 'true'
$env:AUDIT_TEST_ALLOW_MIGRATIONS = 'false'
$env:AUDIT_TEST_ALLOW_WRITES = 'false'
$env:AUDIT_TEST_JDBC_READ_ONLY = 'false'
& $maven -o -B -ntp -s $settings -gs $settings '-Dtest=AuditLogRunnerProvisioningTest' '-Dspring.flyway.enabled=false' test
if ($LASTEXITCODE -ne 0) {
    throw 'Provisioning thất bại; giữ file và tài nguyên hiện có để review, không tự thử lại.'
}
