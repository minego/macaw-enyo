/*
	Get a translated string.

	If the translated value contains variables in the form of {name} then those
	will be replaced by the values in the 'values' object.

	If values or or index is specified then .format will be applied to the
	string before it is returned.
*/
$L = function(key, values, index)
{
	var str		= null;
	var res		= $L.strings;
	var locale	= $L.getLocale();

	/* Find the most specific version of this string */
	for (var i = 0, l; l = locale[i]; i++) {
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

	return($L.format(str, values, index));
};
$L.strings = {};

/*
	If the translated string contains multiple versions then the value of index
	will be used to determine which one to use.
		Example:
			"0#None|1#just one|#{n} of em"

	The following values may be used in the string to specify what values of
	index will be matched:
		n		Match the provided index exactly
		>n		Match if the provided index is greater than n
		>=n		Match if the provided index is greater than or equal to n
		<n		Match if the provided index is less than n
		<=n		Match if the provided index is less than or equal to n
		n-y		Match if the provided index is between x and y (inclusive)
		true	Match if the provided index is truthy
		false	Match if the provided index is not truthy
				Match any index, if there is not a more exact match.
*/
$L.format = function(str, values, index)
{
	/* Find the correct value for this numeric value */
	if (!isNaN(index)) {
		var strs	= str.split('|');
		var match	= false;

		for (var i = 0, s; s = strs[i]; i++) {
			var h = s.indexOf('#');
			var v = s.slice(0, h);

			if (-1 == h) {
				continue;
			}

			switch (v.charAt(0)) {
				default:
					/* Most likely an integer */
					var a = parseInt(v);
					var b;

					if (-1 == (b = v.indexOf('-'))) {
						/* Single value */
						if (a == index) {
							match = true;
						}
					} else {
						/* Range */
						b = parseInt(v.slice(b + 1));

						if (index >= a && index <= b) {
							match = true;
						}
					}
					break;

				case '>':
					v = v.slice(1);
					if ('=' == v.charAt(0)) {
						v = v.slice(1);
						if (parseInt(v) >= index) {
							match = true;
						}
					} else if (parseInt(v) > index) {
						match = true;
					}
					break;

				case '<':
					v = v.slice(1);
					if ('=' == v.charAt(0)) {
						v = v.slice(1);
						if (parseInt(v) <= index) {
							match = true;
						}
					} else if (parseInt(v) < index) {
						match = true;
					}
					break;

				case 'T': case 't':
					if (v.toLowerCase() == "true" && index) {
						match = true;
					}
					break;
				case 'F': case 'f':
					if (v.toLowerCase() == "false" && !index) {
						match = true;
					}
					break;
				case '':
					/* Default match, set the string but don't stop looking */
					str = s.slice(h + 1);
					break;
			}

			if (match) {
				str = s.slice(h + 1);
				break;
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

$L.getLocale = function()
{
	if (!($L.locale)) {
		/* Try to find a sane default */
		if ('undefined' != typeof navigator) {
			$L.setLocale(window.navigator.language);
		}

		/* Was one specified in the query string? */
		if (window.location.search) {
			var fields = window.location.search.slice(1).split('&');

			for (var i = 0, field; field = fields[i]; i++) {
				fields[i] = field.split('=');
			}

			for (var i = 0, field; field = fields[i]; i++) {
				if (field[0] === "lang") {
					moment.lang(field[1]);
					$L.setLocale(field[1]);
				}
			}
		}

		if (!($L.locale)) {
			/* Fall back to english.. */
			$L.setLocale("en-us");
		}
	}

	return($L.locale);
};

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


/*
Simple Tests:

$L.setStrings("en", {
	"digits":			"0#zero|1#one|2#two|3#three|4#four|5#five|6#six|7#seven|8#eight|9#nine|#more",
	"description":		"0#none|1-3#a few|<11#a bunch|12#a dozen|>=13#oodles",
	"truth":			"true#yup|false#nope"
});

console.log('digits:');
for (var i = 0; i < 15; i++) {
	console.log('   ' + i + ' ' + $L("digits", null, i));
}

for (var i = 0; i < 15; i++) {
	console.log('   ' + i + ' ' + $L("description", null, i));
}

for (var i = 0; i < 3; i++) {
	console.log('   ' + i + ' ' + $L("truth", null, i));
}
*/

