$log = "D:\opencode-project\pet\backend\server.log"
$proc = Start-Process -NoNewWindow -FilePath "node" -ArgumentList "src/index.js" -WorkingDirectory "D:\opencode-project\pet\backend" -RedirectStandardOutput $log -RedirectStandardError $log -PassThru
$proc.Id | Out-File "D:\opencode-project\pet\backend\server.pid"
Write-Output "Started PID: $($proc.Id)"
