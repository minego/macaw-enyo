var prefs =
{
	defaults: {
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
			off by replacing it's name with null.
		*/
		// layout: [ "toolbar", "tabs" ]
		layout: [ "tabs", "toolbar" ]
	},

	get: function get(name)
	{
		var json;
		var result	= null;

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
			result = this.defaults[name];
		}

		return(result);
	},

	set: function set(name, value)
	{
		if (window.localStorage) {
			window.localStorage.setItem(name,
				enyo.json.stringify(value));
		} else {
			enyo.setCookie(name, enyo.json.stringify(value));
		}
	}
};
