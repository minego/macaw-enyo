/*
	Get a translated string.

	If the translated value contains variables in the form of {name} then those
	will be replaced by the values in the 'values' object.

	If the translated string contains multiple versions then the value of count
	will be used to determine which one to use.
		Example:
			"0#None|1#just one|#{n} of em"

*/
$L = function(key, values, count)
{
	var str	= null;
	var res	= $L.strings;

	/* Find the most specific version of this string */
	for (var i = 0, l; l = $L.locale[i]; i++) {
		if (!(res = res[l])) {
			break;
		}

		if (res.strings && res.strings[key]) {
			/*
				Found a match, but keep going in case there is something more
				specific.
			*/
			str = res.strings[key];
		}
	}

	if (!str) {
		console.log('Missing translation:', key);
		str = key;
	}

	return($L.format(str, values, count));
};
$L.strings = {};

$L.format = function(str, values, count)
{
	/* Find the correct value for this numeric value */
	if (!isNaN(count)) {
		var strs = str.split('|');

		for (var i = 0, s; s = strs[i]; i++) {
			var h = s.indexOf('#');
			var c = parseInt(s);

			if (c == count) {
				str = s.slice(h + 1);
				break;
			}

			if (isNaN(c)) {
				str = s.slice(h + 1);
				/* do NOT break */
			}
		}
	}

	/* Replace any variables */
	if (values) {
		var keys = Object.keys(values);

		for (var i = 0, name; name = keys[i]; i++) {
			str = str.replace("{" + name + "}", values[name]);
		}
	}

	return(str);
};

$L.setLocale = function(lang)
{
	$L.locale = lang.toLowerCase().split('-');
};

/* Set the default locale */
$L.setLocale("en-us");
if ('undefined' != typeof navigator) {
	$L.setLocale(navigator.language);
}

/*
	Set the strings to use for a specific language. Example:

		$L.setStrings("en-us", {
			"translate":			"translate",
		});
		$L.setStrings("es", {
			"translate":			"traducir",
		});
*/
$L.setStrings = function(lang, strings)
{
	var locale	= lang.toLowerCase().split('-');
	var res		= $L.strings;

	for (var i = 0, l; l = locale[i]; i++) {
		if (!res[l]) {
			res[l] = {};
		}
		res = res[l];
	}

	res.strings = strings;
};


