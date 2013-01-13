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

name:										"TweetDetails",
kind:										"Tweet",

classes:									"tweet tweetdetails",

handlers: {
	ontap:									"handleTap"
},

create: function()
{
	this.inherited(arguments);

	// TODO	Create the buttons and other needed bits
},

openProfile: function(user)
{
	var name;

	if (typeof(user) === "string") {
		name = user;
		user = null;

		// TODO	Load the user profile
	} else {
		name = user.screen_name;
	}

	if (0 == name.indexOf(".@")) {
		name = name.substr(2);
	} else if ('@' == name.charAt(0)) {
		name = name.substr(1);
	}

	this.log('Show the profile of @' + name, user);
},

openHashTag: function(tag)
{
	if ('#' == tag.charAt(0)) {
		tag = tag.substr(1);
	}

	this.log('Show tweets with the #' + tag + ' hashtag');
},

handleTap: function(sender, event)
{
	var classes;

	// TODO	Implement a preview toaster instead of opening all links in a new
	//		window

	/*
		An ID is set on links, mentions and hashtags to allow them to be
		identified when tapped on.
	*/
	if (event.target) {
		switch (event.target.id) {
			case "link":
				window.open(event.target.innerHTML, "_blank");
				return;

			case "user":
				this.openProfile(event.target.innerHTML);
				return;

			case "hashtag":
				this.openHashTag(event.target.innerHTML);
				return;
		}
	}

	/* A thumbnail node will have a link set with the original URL */

	try {
		if (event.originator.link) {
			window.open(event.originator.link, "_blank");
			return;
		}

		classes = event.originator.classes.split(' ');
	} catch (e) {
		classes = [];
	}

	if (-1 != classes.indexOf("rtavatar") ||
		-1 != classes.indexOf("byline")
	) {
		this.openProfile(this.item.real.user);
	} else if (	-1 != classes.indexOf("avatar") ||
				-1 != classes.indexOf("screenname") ||
				-1 != classes.indexOf("username")
	) {
		this.openProfile(this.item.user);
	}
}

});

