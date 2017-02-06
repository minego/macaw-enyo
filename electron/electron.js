const electron		= require('electron');
const app			= electron.app;
const BrowserWindow	= electron.BrowserWindow;

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
		},
		frame: false
	});
	mainWindow.loadURL(`file://${__dirname}/index.html`);

	// mainWindow.webContents.openDevTools();

	mainWindow.on('closed', function () {
		mainWindow = null;
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

