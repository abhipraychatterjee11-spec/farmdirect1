$ErrorActionPreference = 'Stop'
$securePassword = Read-Host 'Choose one temporary password for the Phase 9 Farmer, FPO, Consumer, and Bulk Buyer accounts' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $env:PHASE9_TEMP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  node "$PSScriptRoot/set-phase9-role-passwords.js"
} finally {
  Remove-Item Env:PHASE9_TEMP_PASSWORD -ErrorAction SilentlyContinue
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  Remove-Variable securePassword -ErrorAction SilentlyContinue
}
