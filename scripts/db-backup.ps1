# Script sao lưu CSDL PostgreSQL định kỳ (Windows PowerShell)
$ErrorActionPreference = "Stop"

$DB_NAME = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "iq_kid_market" }
$DB_USER = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "iq_kid_admin" }
$DB_HOST = if ($env:POSTGRES_HOST) { $env:POSTGRES_HOST } else { "localhost" }
$DB_PORT = if ($env:POSTGRES_PORT) { $env:POSTGRES_PORT } else { "5432" }

$BACKUP_DIR = Join-Path $PSScriptRoot "..\backups"
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = Join-Path $BACKUP_DIR "iqkids_backup_$TIMESTAMP.sql"

Write-Host "📦 Đang thực hiện sao lưu CSDL '$DB_NAME'..." -ForegroundColor Cyan

try {
    # Thử pg_dump nếu có cài đặt
    & pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F p -f $BACKUP_FILE
    Write-Host "✅ Sao lưu thành công vào file: $BACKUP_FILE" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Không tìm thấy lệnh pg_dump cục bộ. Bạn có thể sử dụng Docker để backup:" -ForegroundColor Yellow
    Write-Host "   docker exec -t postgres_db pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE" -ForegroundColor Gray
}
