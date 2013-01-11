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

name:									"TweetList",
classes:								"tweetlist enyo-fit",

published: {
	user:								null,
	resource:							"home",
    rowsPerPage:                        50 /* This is supposed to be overridden by webOSPhoneTweetList below... */
},

components: [
],

create: function()
{
	this.inherited(arguments);
	this.twitter = new TwitterAPI(this.user);

    this.createComponent({
		name:							"list",
		kind:							enyo.PulldownList,
		fit:							true,

		ontap:							"itemTap",
		onSetupItem:					"setupItem",
		onPullRelease:					"pullRelease",
		onPullComplete:					"pullComplete",

		horizontal:						"hidden",
		vertical:						"scroll",

		thumb:							true,
        touch:                          true,
        strategyKind:                   "TouchScrollStrategy",
		enableSwipe:					false,
		noSelect:						true,

        rowsPerPage:                    this.rowsPerPage,

		components: [{
			name:						"tweet",
			components: [
				{
					name:				"avatar",
					classes:			"avatar"
				},
				{
					name:				"screenname",
					classes:			"screenname"
				},
				{
					name:				"username",
					classes:			"username"
				},
				{
					tag:				"br"
				},
				{
					name:				"text",
                    classes:            "text",
					allowHtml:			true
				}
			]
		}, {
			name:						"msg",
			classes:					"hide"
		}]
	}, { owner: this });
},

importProps: function(inProps) {
    this.inherited(arguments);
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

	// TODO	Add a visual indicator that this panel is refreshing..
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

		ex("Refresh failed");
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

itemTap: function(sender, event)
{
	var item	= this.results[event.index];

	this.log('Open a toaster with details for:', item.id_str);
	global.toasters.push({
		kind:			"TweetDetails",
		item:			item,
		user:			this.user,
		twitter:		this.twitter
	}, { });
},

setupItem: function(sender, event)
{
	var item	= this.results[event.index];

	if (item.id_str && this.$.tweet.id_str === item.id_str) {
		/* Already setup */
		return;
	}

	this.$.tweet.id_str = item.id_str;

	if (item.newcount) {
		if (item.newcount > 1) {
			this.$.msg.setContent(item.newcount + ' new tweets');
		} else {
			this.$.msg.setContent(item.newcount + ' new tweet');
		}

		this.$.tweet.setClasses('hide');
		this.$.msg.setClasses('newcount');
		return;
	}

	if (item.gap) {
		// TODO	When tapped load the gap
		this.$.msg.setContent('Tap to load missing tweets');

		this.$.tweet.setClasses('hide');
		this.$.msg.setClasses('gap');
		return;
	}

	this.$.msg.setClasses('hide');
	this.$.msg.setContent('');

	this.$.tweet.setClasses('tweet');

	var user = item.user || item.sender;

	this.$.screenname.setContent('@' + user.screen_name);
	this.$.username.setContent(user.name);

	this.$.avatar.applyStyle('background-image', 'url(' + user.profile_image_url + ')');

	this.$.text.setContent(item.text);
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

/*
    Right now we are just generalizing. This should probably be tweaked based on
	screen size.  Then we can use the device name + TweetList

	(i.e. Pre3TweetList, VeerTweetList, PreTweetList.
 */
enyo.kind({
    name:                               "webOSPhoneTweetList",
    kind:                               "TweetList",

    rowsPerPage:                        2
});

