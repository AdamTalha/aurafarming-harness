Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
desktopDir = scriptDir & "\apps\desktop"
electronExe = desktopDir & "\node_modules\electron\dist\electron.exe"
Set WshShell = CreateObject("WScript.Shell")
Set procEnv = WshShell.Environment("PROCESS")
procEnv.Remove("ELECTRON_RUN_AS_NODE")
WshShell.CurrentDirectory = desktopDir
WshShell.Run """" & electronExe & """ ""dist-electron\boot.cjs""", 1, False
