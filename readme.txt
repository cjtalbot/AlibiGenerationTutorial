To generate the PPT as a webpage (doesn't work for chrome though):


Open the presentation that you want to export to HTML.
Press ALT+F11.
Press CTRL+G.
In the Immediate window type the following:
ActivePresentation.SaveAs "<Drive>:\users\<username>\desktop\<filename>.htm", ppSaveAsHTML, msoFalse
Press ENTER.