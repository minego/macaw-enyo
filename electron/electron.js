const electron		= require('electron');
const app			= electron.app;
const BrowserWindow	= electron.BrowserWindow;
const shell			= require('electron').shell;

/*
	Keep a global reference to the window object to keep it from being garbage
	collected which will close it.
*/
let mainWindow;

function createWindow()
{
	mainWindow = new BrowserWindow({
		webPreferences: {
			nodeIntegration: false
		}
	});
	mainWindow.setMenuBarVisibility(false);
	mainWindow.loadURL(`file://${__dirname}/index.html`);

	// mainWindow.webContents.openDevTools();

	mainWindow.on('closed', function () {
		mainWindow = null;
	});

	mainWindow.webContents.on('new-window', function(event, url, framename) {
		if (!framename || framename === "_blank") {
			event.preventDefault();
			shell.openExternal(url);
		}
	});
}

app.on('ready', createWindow);
app.on('window-all-closed', function ()
{
	app.quit();
});

app.on('activate', function ()
{
	if (!mainWindow) {
		createWindow();
	}
});


