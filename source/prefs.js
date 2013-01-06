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

		tabs: [
			{ "type": "timeline"	},
			{ "type": "mentions"	},
			{ "type": "messages"	},
			{ "type": "favorites"	},
			{ "type": "lists"		},
			{ "type": "search"		}
		],

		/*
			The order that toolbars should display. Either toolbar can be turned
			off by replacing it's name with "-".
		*/
		layout: [ "toolbar", "tabs" ]
		// layout: [ "tabs", "toolbar" ]
		// layout: [ "-", "toolbar" ]
		// layout: [ "toolbar", "-" ]
		// layout: [ "-", "tabs" ]
		// layout: [ "tabs", "-" ]
		// layout: [ "-", "-" ]
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

		if (!result) {
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
	}
};
