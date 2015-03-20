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
	
	this.set_headers = function(res){
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Methods", "GET,POST");
		res.header("Access-Control-Allow-Header", "Content-Type");
	};

	this.cmd = function(cmd, args, end){
		var spawn = require("child_process").spawn,
		    child = spawn(cmd, args),
		    self = this;
		
		child.on("error", function(error){
			console.log("An error has occurred! Code: " + error.code);
		});
		child.stdout.on("data", function(buffer){
			self.stdout += buffer.toString();
		});
		child.stdout.on("end", function(){
			if (end){
				end(self);
			}
		});
		
		return child;
	};
}

module.exports = new Utils();