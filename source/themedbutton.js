/*
	Copyright (c) 2010, Micah N Gorrell
	All rights reserved.

	THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED
	WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
	MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
	EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
	PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
	OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
	WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
	OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
	ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
enyo.kind({

name:						"themedbutton",
classes:					"themedbutton enyo-image",
kind:						enyo.Image,
showing:					false,

handlers: {
	onerror:				"fixicon",
	onload:					"showicon"
},

published: {
	iconname:				null,
	theme:					null
},

/*
	By default we attempt to assign an image for the tabs from the theme, but
	not all themes provide their own images. If a theme does not then fall back
	to the default.
*/
fixicon: function()
{
	var src			= 'assets/icons/' + this.iconname;
	var active		= this.parent.hasClass('active');
	var was			= this.getSrc();
	var themed		= -1 == was.indexOf('assets/icons/');
	var wasactive	= -1 != was.indexOf('-active');

	if (themed) {
		wasactive = false;
	}

	if (active && !wasactive) {
		src += '-active';
	}
	src += '.png';

	this.setSrc(src);
},

showicon: function()
{
	this.setShowing(true);
},

themeChanged: function()
{
	/* The image will be set to showing once it has successfully loaded */
	this.setShowing(false);

	/* Try the theme's image first */
	if (this.iconname && this.theme) {
		this.setSrc('assets/' + this.theme + '/icons/' + this.iconname + '.png');
		return;
	}

	/* No theme, use the default */
	if (this.iconname) {
		this.fixicon();
	}
}

});


