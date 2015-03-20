function Utils(){
	this.timestamp = function(){
		var date  = new Date().toString(),
		    split = date.split(" "),
		    time  = split[4] + " " + split[1] + "/" + split[2];
		return time;
	};

	this.add_login_cookie = function(socket, username){
		var date = new Date();
		date.setTime(date.getTime() + (60 * 60 * 24 * 365 * 20 * 1000));

		var expires = "; expires=" + date.toGMTString();
		socket.emit("create_cookie", {
			name: "user",
			value: username,
			expires: expires
		});
	};
}

module.exports = new Utils();