# Mayfield Advanced Chiro TV: one-time setup for the Windows mini PC behind the lobby TV.
# Run once: right-click this file > Run with PowerShell (no admin needed for steps 1-3).
# What it does:
#   1. Puts a "Mayfield TV" shortcut in this user's Startup folder, so Chrome opens the TV full screen at every sign-in.
#   2. Sets the display and PC to never sleep while plugged in.
#   3. Tells you how to turn on automatic sign-in (Windows needs you to do that one by hand).
# To undo: delete the shortcut from the Startup folder (Win+R, shell:startup).

$Url = "https://isomers-damask.github.io/mayfield-tv/?autostart"
$Chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
            "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
            "$env:LocalAppData\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $Chrome) { Write-Host "Google Chrome isn't installed. Install it from google.com/chrome, then run this again." -ForegroundColor Red; Read-Host "Press Enter to close"; exit 1 }

# A separate Chrome profile keeps the TV away from anyone's personal browsing and restore-tabs prompts.
$Profile = "$env:LocalAppData\MayfieldTV\ChromeProfile"
New-Item -ItemType Directory -Force -Path $Profile | Out-Null
$Args = "--kiosk --autoplay-policy=no-user-gesture-required --noerrdialogs --disable-session-crashed-bubble --disable-features=Translate --no-first-run --user-data-dir=`"$Profile`" `"$Url`""

$Startup = [Environment]::GetFolderPath("Startup")
$Shell = New-Object -ComObject WScript.Shell
foreach ($Path in @("$Startup\Mayfield TV.lnk", "$([Environment]::GetFolderPath('Desktop'))\Mayfield TV.lnk")) {
  $Lnk = $Shell.CreateShortcut($Path); $Lnk.TargetPath = $Chrome; $Lnk.Arguments = $Args; $Lnk.Description = "Mayfield Advanced Chiro TV"; $Lnk.Save()
}
Write-Host "Shortcut added to Startup and the desktop." -ForegroundColor Green

powercfg /change monitor-timeout-ac 0
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
Write-Host "Sleep turned off while plugged in." -ForegroundColor Green

Write-Host ""
Write-Host "Last step, by hand: automatic sign-in after a power outage."
Write-Host "  Settings > Accounts > Sign-in options: turn OFF 'For improved security, only allow Windows Hello sign-in'."
Write-Host "  Then press Win+R, type netplwiz, uncheck 'Users must enter a user name and password', and enter the password once."
Write-Host ""
Write-Host "Starting the TV now. To get out of full screen: Alt+F4."
Start-Process $Chrome -ArgumentList $Args
Read-Host "Press Enter to close this window"
