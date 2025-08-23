!macro customInstallMode
  # Force silent updates to run the app after installation
  ${ifThen} ${isUpdated} ${||}
    StrCpy $launchAppAfterSilentInstall "1"
  ${endIf}
!macroend

!macro customUnInstall
  # Kill any running RadPal processes during uninstall
  nsExec::Exec 'taskkill /F /IM radpal.exe'
  nsExec::Exec 'taskkill /F /IM RadPalHotkeys.exe'
  nsExec::Exec 'taskkill /F /IM llama-server.exe'
!macroend

!macro customInstall
  # Ensure app runs after silent install/update
  ${if} ${isUpdated}
    ${if} ${silent}
      # Force run app after silent update
      ExecShell "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    ${endif}
  ${endif}
!macroend