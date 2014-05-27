#!/usr/bin/env python

import cgi
import urllib
import os

form = cgi.FieldStorage()

session = form.getvalue("session")
token = form.getvalue("access_token")

# Usage:
#
#	This script is to be used as the redirect path for the ADN authentication
#	system. When authenticating to ADN pass the URL to this script with a
#	query string that includes a unique session ID.
#
#	After authentication is complete request this script directly with the same
#	session ID in the query string, and complete=1. This will return the user's
#	token.

# TODO
#	- Update macaw-enyo to open the auth request in a new window
#	- Make macaw-enyo keep trying to request this path with ?session=abcd until
#	  it gets an answer
#	- Deal with errors gracefully

if form.getvalue("complete"):
	if session:
		path = urllib.quote_plus(session)

		if token:
			# Write the token to a file using session as the filename, and then tell the
			# browser to close.

			out = file("/tmp/macaw-session-%s" % path, 'w')

			out.write(token)
			out.close()

			print "Content-Type: text/html;charset=utf-8"
			print

			print """
			<html>
				<body>
					<script>
						window.close();
					</script>
				</body>
			</html>
			"""

		else:
			# Load the token represented by this session, and return it (then delete it)
			print "Content-Type: text/plain;charset=utf-8"
			print

			for line in file("/tmp/macaw-session-%s" % path, 'r'):
				print line.strip()

			os.remove("/tmp/macaw-session-%s" %path)
	else:
		print "Content-Type: text/html;charset=utf-8"
		print

		print """
		<html>
			<body>
				Invalid session
			</body>
		</html>
		"""


else:
	# The browser has access to the token, but the server does not, so ask the
	# browser to move the value from the hash to the query string, and we'll
	# try again.

	print "Content-Type: text/html;charset=utf-8"
	print

	print """
	<html>
		<head>
		</head>
		<body>
			<script>
				function parseQueryString(query)
				{
					var params = {};

					if (query) {
						var items = query.split('&');

						for (var i = 0, param; param = items[i]; i++) {
							var pair = param.split('=');

							if (pair.length != 2) {
								continue;
							}

							params[pair[0]] = decodeURIComponent(pair[1]);
						}
					}

					return(params);
				}

				function buildQuery(params)
				{
					var p = [];

					for (var key in params) {
						p.push(key + '=' + encodeURIComponent(params[key]));
					}

					if (p.length > 0) {
						return('?' + p.join('&'));
					} else {
						return('');
					}
				}

				var params	= parseQueryString((window.location.search	|| '').slice(1));
				var hashes	= parseQueryString((window.location.hash	|| '').slice(1));

				if (hashes.access_token && !params.access_token) {
					params.access_token = hashes.access_token;
				}

				params.complete = 1;

				window.location.search = buildQuery(params);
			</script>
		</body>
	</html>
	"""

