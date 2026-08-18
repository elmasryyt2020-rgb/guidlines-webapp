# setup-host-nat.ps1
# Run this ON THE REMOTE WINDOWS HOST as Administrator.

# 1. Check Administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "Error: Please run this script as Administrator (Right-click PowerShell -> Run as Administrator)."
    Exit
}

Write-Host "=== Setting up VMware Port Forwarding on Host ===" -ForegroundColor Cyan

# 2. Prompt for parameters
$vmIp = Read-Host "Enter the Windows VM's internal IP address (e.g., 192.168.137.129)"
if ([string]::IsNullOrWhiteSpace($vmIp)) {
    Write-Error "Error: VM IP address cannot be empty."
    Exit
}

$hostPort = Read-Host "Enter the Host Port to use for SSH forwarding (Press Enter for default: 2222)"
if ([string]::IsNullOrWhiteSpace($hostPort)) {
    $hostPort = "2222"
}

# Validate IP format roughly
if (-not ($vmIp -match '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$')) {
    Write-Warning "Warning: '$vmIp' does not look like a valid IPv4 address. Proceeding anyway..."
}

$configPath = "C:\ProgramData\VMware\vmnetnat.conf"
if (-not (Test-Path $configPath)) {
    Write-Error "Error: Could not find VMware NAT configuration file at $configPath."
    Write-Host "Please ensure VMware Workstation/Player is installed on this host." -ForegroundColor Yellow
    Exit
}

# 3. Backup the configuration file
$backupPath = "$configPath.bak-$(Get-Date -Format 'yyyyMMddHHmmss')"
Write-Host "Creating backup of configuration at: $backupPath"
Copy-Item -Path $configPath -Destination $backupPath -Force

# 4. Modify vmnetnat.conf
Write-Host "Modifying $configPath..."
$lines = Get-Content -Path $configPath
$newLines = [System.Collections.Generic.List[string]]::new()
$inserted = $false

foreach ($line in $lines) {
    # Skip any existing line configuration for the same host port to prevent duplicates
    if ($line -match "^\s*$hostPort\s*=") {
        Write-Host "Replacing existing port mapping for host port $hostPort." -ForegroundColor Yellow
        continue
    }
    
    $newLines.Add($line)
    
    # Insert new mapping right after the [incomingtcp] section header
    if ($line -match '^\[incomingtcp\]') {
        $newLines.Add("$hostPort = ${vmIp}:22")
        $inserted = $true
    }
}

if (-not $inserted) {
    Write-Error "Error: Could not find '[incomingtcp]' section header in $configPath."
    Exit
}

# Save the updated configuration
$newLines | Set-Content -Path $configPath -Force
Write-Host "Successfully added port forwarding rule ($hostPort -> ${vmIp}:22) to config file." -ForegroundColor Green

# 5. Restart VMware NAT Service
Write-Host "Restarting VMware NAT Service to apply changes..."
$natService = Get-Service -Name "VMware NAT Service" -ErrorAction SilentlyContinue
if ($natService) {
    Restart-Service -Name "VMware NAT Service" -Force
    Write-Host "VMware NAT Service restarted successfully." -ForegroundColor Green
} else {
    Write-Warning "Could not find 'VMware NAT Service'. Please restart it manually in Services (services.msc) or restart your PC."
}

# 6. Configure Host Firewall
Write-Host "Configuring Windows Firewall on the Host..."
$ruleName = "VMware_SSH_Forward_$hostPort"
$firewallRule = Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue
if (-not $firewallRule) {
    New-NetFirewallRule -Name $ruleName -DisplayName "Allow Inbound SSH Port Forwarding (Port $hostPort)" -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort $hostPort | Out-Null
    Write-Host "Firewall rule created on the host for port $hostPort." -ForegroundColor Green
} else {
    Write-Host "Firewall rule on the host for port $hostPort already exists." -ForegroundColor Green
}

Write-Host "`n=== Host Setup Complete! ===" -ForegroundColor Green
Write-Host "You can now connect to this VM from your local PC using:" -ForegroundColor Cyan
Write-Host "ssh -p $hostPort <VM_Username>@<Host_IP>" -ForegroundColor Yellow
