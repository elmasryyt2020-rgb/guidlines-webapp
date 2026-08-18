# setup-vm-ssh.ps1
# Run this INSIDE the Windows VM (VPS) as Administrator.

# 1. Check Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Error: Please run this script as Administrator (Right-click PowerShell -> Run as Administrator)."
    Exit
}

Write-Host "=== Setting up SSH Server on Windows VM ===" -ForegroundColor Cyan

# 2. Check and Install OpenSSH Server capability
Write-Host "Checking OpenSSH Server status..."
$sshServer = Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
if ($sshServer.State -ne 'Installed') {
    Write-Host "Installing OpenSSH Server (this might take a minute)..." -ForegroundColor Yellow
    Add-WindowsCapability -Online -Name $sshServer.Name
} else {
    Write-Host "OpenSSH Server is already installed." -ForegroundColor Green
}

# 3. Configure and start SSHD service
Write-Host "Configuring SSHD Service..."
Set-Service -Name sshd -StartupType 'Automatic'
Start-Service sshd
Write-Host "SSHD Service Status: $( (Get-Service sshd).Status )" -ForegroundColor Green

# 4. Configure Firewall Rule inside VM
Write-Host "Configuring Windows Defender Firewall..."
$firewallRule = Get-NetFirewallRule -Name "sshd" -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    New-NetFirewallRule -Name "sshd" -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
    Write-Host "Firewall rule created for TCP port 22." -ForegroundColor Green
} else {
    Write-Host "Firewall rule for TCP port 22 already exists." -ForegroundColor Green
}

# 5. Set default shell to PowerShell for SSH sessions
Write-Host "Setting PowerShell as the default SSH shell..."
$registryPath = "HKLM:\SOFTWARE\OpenSSH"
if (-not (Test-Path $registryPath)) {
    New-Item -Path "HKLM:\SOFTWARE" -Name "OpenSSH" | Out-Null
}
New-ItemProperty -Path $registryPath -Name "DefaultShell" -Value "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" -PropertyType String -Force | Out-Null
Write-Host "Default SSH shell set to PowerShell." -ForegroundColor Green

# 6. Retrieve internal IP addresses
Write-Host "`n=== Installation Complete! ===" -ForegroundColor Green
Write-Host "Please note the internal IP address of this VM below. You will need to input it when setting up port forwarding on the Host:"
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" } | ForEach-Object {
    Write-Host "- $($_.IPAddress) ($($_.InterfaceAlias))" -ForegroundColor Yellow
}
