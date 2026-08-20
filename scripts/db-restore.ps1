# Script phục hồi CSDL PostgreSQL từ file backup (Windows PowerShell)
param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

$DB_NAME = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "iq_kid_market" }
$DB_USER = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "iq_kid_admin" }
$DB_HOST = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "localhost" }
$DB_PORT = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5432" }

if (-not (Test-Path $BackupFile)) {
    Write-Error "Không tìm thấy file backup: $BackupFile"
    exit 1
}

Write-Host "🔄 Đang phục hồi CSDL '$DB_NAME' từ file $BackupFile..." -ForegroundColor Cyan

try {
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $BackupFile
    Write-Host "✅ Phục hồi CSDL thành công!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Lỗi khi chạy lệnh psql. Bạn có thể sử dụng Docker để restore:" -ForegroundColor Yellow
    Write-Host "   docker exec -i postgres_db psql -U $DB_USER $DB_NAME < $BackupFile" -ForegroundColor Gray
}
