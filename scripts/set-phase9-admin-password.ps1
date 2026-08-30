$ErrorActionPreference = 'Stop'
$securePassword = Read-Host 'Choose a temporary password for phase9.manual.admin@example.com' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
  $env:PHASE9_TEMP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  node "$PSScriptRoot/set-phase9-admin-password.js"
} finally {
  Remove-Item Env:PHASE9_TEMP_PASSWORD -ErrorAction SilentlyContinue
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  Remove-Variable securePassword -ErrorAction SilentlyContinue
}
