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

var prefs =
{
	defaults: {
		accounts: [],

		panels: [
			{ "type": "timeline"	},
			{ "type": "mentions"	},
			{ "type": "messages"	},
			{ "type": "favorites"	},
			{ "type": "lists"		},
			{ "type": "search"		}
		],

		theme: "light",

		/*
			The order that toolbars should display. Either toolbar can be turned
			off by replacing it's name with "-".
		*/
		layout: [ "toolbar", "tabs" ],
		// layout: [ "tabs", "toolbar" ],
		// layout: [ "-", "toolbar" ],
		// layout: [ "toolbar", "-" ],
		// layout: [ "-", "tabs" ],
		// layout: [ "tabs", "-" ],
		// layout: [ "-", "-" ],

		showAvatar:			true,
		showUserName:		true,
		showScreenName:		true,
		showVia:			false,
		showTime:			"relative",

		fontSize:			"tiny"
	},

	get: function get(name, account)
	{
		var key		= name;
		var result	= null;
		var json;

		if (account) {
			name += account.id;
		}

		/* Load the recent domain list */
		if (window.localStorage) {
			json = window.localStorage.getItem(name);
		} else {
			json = enyo.getCookie(name);
		}

		try {
			if (json) {
				result = enyo.json.parse(json);
			} else {
				result = null;
			}
		} catch(e) {
			result = null;
		}

		if (result == null) {
			result = this.defaults[key];
		}

		return(result);
	},

	set: function set(name, value, account)
	{
		if (account) {
			name += account.id;
		}

		if (window.localStorage) {
			window.localStorage.setItem(name,
				enyo.json.stringify(value));
		} else {
			enyo.setCookie(name, enyo.json.stringify(value));
		}

		if ('undefined' != typeof(this.defaults[name])) {
			this.updateClasses();
		}
	},

	/* Add a class based on the name of each boolean option if enabled */
	updateClasses: function(component)
	{
		var value;
		var classes	= [];

		if (component) {
			/* Remember the component for future calls */
			this.component = component;
		} else {
			/* Use the remembered component */
			component = this.component;
		}

		if (!component) {
			return;
		}

		for (var key in this.defaults) {
			switch (typeof(this.defaults[key])) {
				case "boolean":
					if (this.get(key)) {
						classes.push(key);
					}
					break;

				case "string":
					if ((value = this.get(key))) {
						classes.push(key + enyo.cap(value));
					}
					break;
			}
		}

		component.setClasses(classes.join(' '));
		console.log('User option classes: ' + component.getClasses());

		/* Ensure that the correct theme stylesheet is loaded */
		if (this.get('theme')) {
			var e = document.createElement("link");

			e.setAttribute("rel",	"stylesheet");
			e.setAttribute("type",	"text/css");
			e.setAttribute("href",	"assets/" + this.get('theme') + ".css");

			if (this.themeElement) {
				document.getElementsByTagName("head")[0].replaceChild(e, this.themeElement);
			} else {
				document.getElementsByTagName("head")[0].appendChild(e);
			}
			this.themeElement = e;
		}
	}
};
