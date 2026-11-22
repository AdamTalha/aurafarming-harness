Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "D:\aurafarming-harness"
WshShell.Run "cmd.exe /c ""D:\aurafarming-harness\launch-aurafarming.cmd""", 0, False
