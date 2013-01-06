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

name:								"ptrlist",

classes:							"enyo-unselectable enyo-fit ptrlist",
kind:								"FittableRows",

published: {
	user:							null,
	resource:						'home'
},

components: [
	{
		name:						"list",
		kind:						enyo.PulldownList,
		fit:						true,

		onSetupItem:				"setupItem",
		onPullRelease:				"pullRelease",
		onPullComplete:				"pullComplete",

		horizontal:					"hidden",
		vertical:					"scroll",

		touch:						true,
		thumb:						true,

		components: [
			{
				components: [
					{
						name:		"text"
					}
				]
			}
		]
	}
],

create: function()
{
	this.inherited(arguments);
	this.twitter = new TwitterAPI(this.user);
},

rendered: function()
{
	this.inherited(arguments);

	this.results = [];

	/* Load cached tweets */
	var results = prefs.get('cachedtweets:' + this.user.user_id + ':' + this.resource) || [];

	// Testing... Remove the most recent entries from the cached results so that
	// we can immediately load them again as if they where new.
	// results.splice(0, 5);

	if (results && results.length) {
		this.log('Loaded ' + results.length + ' tweets from the cache', this.resource);
		this.gotTweets(true, results);
	} else {
		this.log('Refreshing', this.resource);
		this.refresh();
	}
	this.$.list.reset();
},

pullRelease: function()
{
	if (!this.pulled) {
		this.pulled = true;

		setTimeout(enyo.bind(this, function() {
			this.refresh();
		}), 500);
	}
},

pullComplete: function()
{
	this.$.list.reset();
	this.pulled = false;
},

refresh: function()
{
	if (this.loading) {
		return;
	}

	this.loading = true;

	var params = {
		include_entities:		true
	};

	if (this.results.length) {
		/* Request a bit of an overlap in order to try to detect gaps */
		for (var i = 4; i >= 0; i--) {
			if (this.results[i].id_str) {
				params.since_id = this.results[i].id_str;
				this.sinceIndex = i;
				break;
			}
		}

		if (!params.since_id) {
			/* Really? The most recent 5 items didn't have an id? Weird... */
			while (this.results.length && !this.results[0].id_str) {
				this.results.splice(0, 1);
			}

			if (this.results.length && this.results[0].id_str) {
				params.since_id = this.results[0].id_str;
			}
		}

		/* Load as many as possible to avoid gaps, max allowed is 200 */
		params.count = 200;
	} else {
		/* Load a reasonable amount */
		params.count = 50;
	}

	this.twitter.getTweets(this.resource, enyo.bind(this, this.gotTweets), params);
},

gotTweets: function(success, results)
{
	/* Remove the previous newcount indicator */
	if (this.newcount) {
		this.results.splice(this.newcount, 1);
		this.newcount = null;
	}

	if (!success) {
		/* Failed */
		this.$.list.refresh();
		this.$.list.completePull();

		// TODO	Display an error...
		this.loading = false;
		return;
	}

	/*
		Gap detection

		The results may include up to 5 overlapping tweets.
	*/
	if (this.results.length > 0 && results.length > 0) {
		var ot, nt;
		var match = false;

		for (var o = 0; o < 5; o++) {
			var ot = this.results[o];

			for (var n = 1; n <= 5; n++) {
				var nt = results[results.length - n];

				if (nt.id_str == ot.id_str) {
					match = true;
					break;
				}
			}

			if (match) {
				break;
			}
		}

		if (match) {
			/* We found our match, there is no gap */
			results.splice(results.length - n, n);
		} else {
			/* We have a gap! */
			this.results.unshift({
				gap: {
					before:	this.results[0].id_str,
					after:	results[results.length - 1].id_str
				}
			});
		}
	}


	/* Insert a new newcount indicator */
	if (results.length && this.results.length) {
		this.newcount = results.length;

		this.results.unshift({
			newcount:	this.newcount
		});
	}

	this.results = results.concat(this.results);
	this.$.list.setCount(this.results.length);

	this.$.list.refresh();
	this.$.list.completePull();

	setTimeout(enyo.bind(this, function() {
		if (this.newcount && this.newcount > 1) {
			this.$.list.scrollToRow(this.newcount - 1);
		} else {
			this.$.list.scrollToRow(0);
		}
	}), 500);

	/*
		Cache the 20 most recent items

		Do not include the new count indicator. Gap indicators are okay though.
	*/
	var cache = this.results.slice(0, 20);

	if (this.newcount) {
		cache.splice(this.newcount, 1);
	}

	prefs.set('cachedtweets:' + this.user.user_id + ':' + this.resource, cache);
	this.loading = false;
},

setupItem: function(sender, event)
{
	var i		= event.index;
	var item	= this.results[i];

	if (item.newcount) {
		if (item.newcount > 1) {
			this.$.text.setContent(item.newcount + ' new tweets');
		} else {
			this.$.text.setContent(item.newcount + ' new tweet');
		}

		this.$.text.setClasses('newcount');
		return;
	}

	if (item.gap) {
		// TODO	When tapped load the gap
		this.$.text.setContent('Tap to load missing tweets');
		return;
	}

	this.$.text.setContent(item.text);
	this.$.text.setClasses('tweet');
},

smartscroll: function()
{
	if (0 == this.$.list.getScrollTop()) {
		this.$.list.scrollToBottom();
	} else {
		this.$.list.scrollToTop();
	}
}

});
