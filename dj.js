var request = require("request");

var queue   = require("./queue.js"),
    utils   = require("./utils.js"),
    config  = require("./config.json");

function dJ(users, io){
	this.send_queue = function(){
		utils.get_sockets(io).forEach(function(sock){
			sock.emit("dj_queue", {
				queue: queue.list,
				playlist: users.get_user(sock.user).playlist
			});
		});
	};

	this.add_song = function(socket, link){
		if (link.indexOf("youtu.be") > -1 || link.indexOf("youtube.com") > -1){
			this.get_youtube_data(link, function(success, title, permalink, duration, thumb){
				data_callback(socket, success, title, permalink, duration, thumb);
			});
		} else if (link.indexOf("soundcloud.com") > -1){
			this.get_soundcloud_data(link, function(success, title, permalink, duration, thumb){
				data_callback(socket, success, title, permalink, duration, thumb);
			});
		} else {
			socket.emit("dj_add", false);
		}
	};

	this.remove_song = function(socket){
		if (queue.get_request(socket.user)){
			if (queue.list[0] == queue.get_request(socket.user)){
				queue.kill();
			} else {
				queue.rem_request(socket.user);
			}
			socket.emit("dj_remove", true);
			this.send_queue();
			console.log("DJ: REMOVED REQUEST");
			console.log("- USERNAME: " + socket.user);
		} else {
			socket.emit("dj_remove", false);
		}
	};

	this.remove_playlist = function(socket, link){
		if (users.remove_request_playlist(socket.user, link)){
			socket.emit("dj_remove_playlist", true);
			console.log("DJ: REMOVED REQUEST FROM PLAYLIST");
			console.log("- USERNAME: " + socket.user);
		} else {
			socket.emit("dj_remove_playlist", false);
		}
	};

	this.veto_song = function(socket){
		if (queue.playing){
			queue.kill();
			socket.emit("dj_veto", true);
			this.send_queue();
			console.log("DJ: VETOED REQUEST");
			console.log("- USERNAME: " + socket.user);
		} else {
			socket.emit("dj_veto", false);
		}
	};

	this.get_id = function(link){
		var id = "";
		if (link.indexOf("youtu.be") > -1){
			id = link.split("youtu.be/")[1];
		} else {
			id = link.split("v=")[1];
			var pos = id.indexOf("&");
			if (pos > -1){
				id = id.substring(0, pos);
			}
		}
		return id;
	};

	this.get_youtube_data = function(link, callback){
		request({
			url: "https://www.googleapis.com/youtube/v3/videos?id=" + this.get_id(link) + "&key=" + config.yt_key + "&part=snippet,contentDetails",
			json: true
		}, function(error, response, data){
			if (!error && response.statusCode == 200 && data.items.length > 0){
				try {
					var title = data.items[0].snippet.title;
					var link = "https://www.youtube.com/watch?v=" + data.items[0].id;
					var duration = data.items[0].contentDetails.duration.replace("PT", "");
					var thumb = data.items[0].snippet.thumbnails.high.url;
					
					duration = duration.replace("H", " * 3600) + (");
					duration = duration.replace("M", " * 60) + (");

					if (duration.indexOf("S") > -1){
						duration = duration.replace("S", " * 1)");
					} else {
						duration = duration + "0)";
					}
					
					var secs = eval("(" + duration);
					
					callback(true, title, link, secs, thumb);
				} catch (error){
					console.log("DJ: ERROR PARSING REQUEST");
					console.log(error);
					callback(false);
				}
			} else {
				console.log("DJ: ERROR ADDING REQUEST");
				console.log(error);
				callback(false);
			}
		});
	};

	this.get_soundcloud_data = function(link, callback){
		request({
			url: "https://api.soundcloud.com/resolve.json?url=" + link + "&client_id=" + config.sc_key,
			json: true
		}, function(error, response, data){
			if (!error && response.statusCode == 200 && data.kind == "track"){
				try {
					var title = data.title;
					var link = data.permalink_url;
					var secs = Math.round(data.duration / 1000);
					var thumb = data.artwork_url;

					callback(true, title, link, secs, thumb);
				} catch (error){
					console.log("DJ: ERROR PARSING REQUEST");
					console.log(error);
					callback(false);
				}
			} else {
				console.log("DJ: ERROR ADDING REQUEST");
				console.log(error);
				callback(false);
			}
		});
	};

	function data_callback(socket, success, title, permalink, duration, thumb){
		if (success){
			if (queue.get_request(socket.user)){
				users.add_request_playlist(title, permalink, duration, socket.user, thumb);
				socket.emit("dj_add", false);
			} else {
				if (users.get_user(socket.user).playlist.length > 0){
					if (users.get_user(socket.user).playlist[0].link == permalink){
						users.remove_request_playlist(socket.user, permalink);
					}
				}
				queue.add_request(title, permalink, duration, socket.user, thumb);
				socket.emit("dj_add", true);
				this.send_queue();
				console.log("DJ: NEW REQUEST");
				console.log("- USERNAME: " + socket.user);
			}
		} else {
			socket.emit("dj_add", false);
		}
	}

	var that = this;

	setInterval(function(){
		if (!queue.playing){
			if (queue.list.length > 0){
				queue.playing = true;
				queue.process = utils.cmd("google-chrome", [queue.list[0].link]);
				queue.timeout = setTimeout(function(){
					queue.kill();
					that.send_queue();
				}, (queue.list[0].duration + 15) * 1000);
			}
		} else if (queue.list.length == 0){
			queue.playing = false;
		}
	}, 500);

	return this;
}

module.exports = dJ;